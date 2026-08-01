export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateLeadsCSV } from '@/lib/reports/csv'
import { buildReportEmailContent } from '@/lib/reports/email-template'
import { computeNextRunAt } from '@/lib/reports/schedule'
import type { ReportSchedule } from '@/lib/reports/schedule'
import type { Lead } from '@/types'

function getPipelineLabel(slug: string): string {
  const labels: Record<string, string> = { main: 'Main (LinkedIn)', nurture: 'Nurture' }
  return labels[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

async function fetchLeadsForSchedule(
  supabase: ReturnType<typeof createServerClient>,
  schedule: ReportSchedule
): Promise<Lead[]> {
  const allLeads: Lead[] = []
  const BATCH = 1000
  let offset = 0

  // Compute date range
  let dateFrom: string | undefined
  let dateTo: string | undefined
  if (schedule.date_range_days) {
    const to = new Date()
    const from = new Date(to.getTime() - schedule.date_range_days * 24 * 60 * 60 * 1000)
    dateFrom = from.toISOString().slice(0, 10)
    dateTo = to.toISOString().slice(0, 10)
  }

  while (true) {
    let query = supabase
      .from('leads')
      .select('*, personas(id, name, color)')
      .eq('account_id', schedule.account_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + BATCH - 1)

    if (schedule.pipeline !== 'all') query = query.eq('pipeline', schedule.pipeline)
    if (schedule.hot_only) query = query.eq('is_hot', true)
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`)
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59.999Z`)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    const batch = (data || []) as Lead[]
    allLeads.push(...batch)
    if (batch.length < BATCH) break
    offset += BATCH
  }

  allLeads.sort((a, b) => {
    if (a.is_hot && !b.is_hot) return -1
    if (!a.is_hot && b.is_hot) return 1
    return 0
  })

  return allLeads
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const now = new Date().toISOString()

  // Fetch all due schedules
  const { data: schedules, error: schedError } = await supabase
    .from('report_schedules')
    .select('*')
    .eq('is_active', true)
    .lte('next_run_at', now)

  if (schedError) {
    return NextResponse.json({ error: schedError.message }, { status: 500 })
  }

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No scheduled reports due' })
  }

  const results: { scheduleId: string; success: boolean; error?: string; leadCount?: number }[] = []

  for (const schedule of schedules as ReportSchedule[]) {
    try {
      // Load Postmark config for this account
      const keysResult = await supabase
        .from('api_keys')
        .select('key_value, extra_data')
        .eq('account_id', schedule.account_id)
        .eq('service', 'postmark')
        .single()

      if (!keysResult.data?.key_value) {
        results.push({ scheduleId: schedule.id, success: false, error: 'Postmark not configured' })
        continue
      }

      const postmarkKey = keysResult.data.key_value
      const extra = keysResult.data.extra_data as Record<string, string> | null
      const fromEmail = extra?.from_email
      const fromName = extra?.from_name || 'Lead Router'

      if (!fromEmail) {
        results.push({ scheduleId: schedule.id, success: false, error: 'Postmark from email not configured' })
        continue
      }

      // Fetch leads
      const leads = await fetchLeadsForSchedule(supabase, schedule)

      if (leads.length === 0) {
        // Still advance next_run_at even if no leads
        const next = computeNextRunAt(
          schedule.frequency,
          schedule.hour_utc,
          schedule.day_of_week,
          schedule.day_of_month
        )
        await supabase
          .from('report_schedules')
          .update({ last_sent_at: now, next_run_at: next.toISOString() })
          .eq('id', schedule.id)

        results.push({ scheduleId: schedule.id, success: true, leadCount: 0 })
        continue
      }

      // Build date label
      const dateLabel = schedule.date_range_days
        ? `Last ${schedule.date_range_days} day${schedule.date_range_days !== 1 ? 's' : ''}`
        : 'All Time'

      // Build email
      const { html, text, subject } = buildReportEmailContent({
        leads,
        pipeline: schedule.pipeline,
        dateLabel,
        hotOnly: schedule.hot_only,
        generatedAt: new Date(),
        scheduleLabel: schedule.label ?? undefined,
      })

      // Build CSV attachment
      const csvContent = generateLeadsCSV(leads)
      const csvBase64 = Buffer.from(csvContent, 'utf-8').toString('base64')
      const pipelineLabel = getPipelineLabel(schedule.pipeline)
      const today = new Date().toISOString().slice(0, 10)
      const fileName = `leads-${pipelineLabel.toLowerCase().replace(/\s+/g, '-')}-${today}.csv`

      // Send emails
      const sendResults = await Promise.all(
        schedule.recipients.map((to) =>
          fetch('https://api.postmarkapp.com/email', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'X-Postmark-Server-Token': postmarkKey,
            },
            body: JSON.stringify({
              From: `${fromName} <${fromEmail}>`,
              To: to,
              Subject: subject,
              HtmlBody: html,
              TextBody: text,
              MessageStream: 'outbound',
              Attachments: [{ Name: fileName, Content: csvBase64, ContentType: 'text/csv' }],
            }),
          }).then((r) => r.ok).catch(() => false)
        )
      )

      const anySucceeded = sendResults.some(Boolean)

      // Advance next_run_at
      const next = computeNextRunAt(
        schedule.frequency,
        schedule.hour_utc,
        schedule.day_of_week,
        schedule.day_of_month
      )

      await supabase
        .from('report_schedules')
        .update({ last_sent_at: now, next_run_at: next.toISOString() })
        .eq('id', schedule.id)

      results.push({ scheduleId: schedule.id, success: anySucceeded, leadCount: leads.length })
    } catch (err) {
      results.push({ scheduleId: schedule.id, success: false, error: String(err) })

      // Still advance the schedule so it doesn't hammer on error
      const next = computeNextRunAt(
        schedule.frequency,
        schedule.hour_utc,
        schedule.day_of_week,
        schedule.day_of_month
      )
      await supabase
        .from('report_schedules')
        .update({ next_run_at: next.toISOString() })
        .eq('id', schedule.id)
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
