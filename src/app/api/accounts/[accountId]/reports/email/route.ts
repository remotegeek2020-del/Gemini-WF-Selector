export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateLeadsCSV } from '@/lib/reports/csv'
import { buildReportEmailContent } from '@/lib/reports/email-template'
import type { Lead } from '@/types'

function getPipelineLabel(slug: string): string {
  const labels: Record<string, string> = { main: 'Main (LinkedIn)', nurture: 'Nurture' }
  return labels[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, account_id')
    .eq('user_id', user.id)
    .single()

  if (!roleData) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (roleData.role === 'sub_account' && roleData.account_id !== params.accountId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    recipients: string[]
    dateFrom?: string
    dateTo?: string
    hotOnly?: boolean
    pipeline?: string
    personaId?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { recipients, dateFrom, dateTo, hotOnly, pipeline, personaId } = body

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: 'At least one recipient email is required' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const invalid = recipients.filter((r) => !emailRegex.test(r))
  if (invalid.length > 0) {
    return NextResponse.json({ error: `Invalid email address${invalid.length > 1 ? 'es' : ''}: ${invalid.join(', ')}` }, { status: 400 })
  }

  // Load Postmark config
  const keysResult = await supabase
    .from('api_keys')
    .select('key_value, extra_data')
    .eq('account_id', params.accountId)
    .eq('service', 'postmark')
    .single()

  if (!keysResult.data?.key_value) {
    return NextResponse.json({ error: 'Postmark API key not configured. Add it in Settings → Notifications.' }, { status: 400 })
  }

  const postmarkKey = keysResult.data.key_value
  const extra = keysResult.data.extra_data as Record<string, string> | null
  const fromEmail = extra?.from_email
  const fromName = extra?.from_name || 'Lead Router'

  if (!fromEmail) {
    return NextResponse.json({ error: 'Postmark From Email not configured. Add it in Settings → Notifications.' }, { status: 400 })
  }

  // Fetch all matching leads
  const allLeads: Lead[] = []
  const BATCH = 1000
  let offset = 0
  const resolvedPipeline = pipeline || 'all'

  while (true) {
    let query = supabase
      .from('leads')
      .select('*, personas(id, name, color)')
      .eq('account_id', params.accountId)
      .order('created_at', { ascending: false })
      .range(offset, offset + BATCH - 1)

    if (resolvedPipeline !== 'all') query = query.eq('pipeline', resolvedPipeline)
    if (hotOnly) query = query.eq('is_hot', true)
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`)
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59.999Z`)
    if (personaId && personaId !== 'unassigned') query = query.eq('assigned_persona_id', personaId)
    if (personaId === 'unassigned') query = query.is('assigned_persona_id', null)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const batch = (data || []) as Lead[]
    allLeads.push(...batch)
    if (batch.length < BATCH) break
    offset += BATCH
  }

  if (allLeads.length === 0) {
    return NextResponse.json({ error: 'No leads found for the selected filters and date range.' }, { status: 404 })
  }

  // Sort hot leads first
  allLeads.sort((a, b) => {
    if (a.is_hot && !b.is_hot) return -1
    if (!a.is_hot && b.is_hot) return 1
    return 0
  })

  // Build date label
  const dateLabel = dateFrom && dateTo
    ? `${dateFrom} – ${dateTo}`
    : dateFrom ? `From ${dateFrom}`
    : dateTo ? `Through ${dateTo}`
    : 'All Time'

  // Build rich email
  const { html, text, subject } = buildReportEmailContent({
    leads: allLeads,
    pipeline: resolvedPipeline,
    dateLabel,
    hotOnly: hotOnly ?? false,
    generatedAt: new Date(),
  })

  // Generate CSV attachment
  const csvContent = generateLeadsCSV(allLeads)
  const csvBase64 = Buffer.from(csvContent, 'utf-8').toString('base64')
  const pipelineLabel = getPipelineLabel(resolvedPipeline)
  const fileName = `leads-${pipelineLabel.toLowerCase().replace(/\s+/g, '-')}-${dateFrom || 'all'}-to-${dateTo || 'now'}.csv`

  // Send to all recipients in parallel
  const results = await Promise.all(
    recipients.map((to) =>
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
      }).then(async (r) => {
        const rb = await r.json().catch(() => ({}))
        return { to, ok: r.ok, error: r.ok ? null : rb }
      }).catch((e) => ({ to, ok: false, error: String(e) }))
    )
  )

  const succeeded = results.filter((r) => r.ok)
  const hotCount = allLeads.filter((l) => l.is_hot).length

  if (succeeded.length === 0) {
    return NextResponse.json({
      error: 'Failed to send report — check your Postmark configuration.',
      details: results[0]?.error,
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Report sent to ${succeeded.length} recipient${succeeded.length !== 1 ? 's' : ''} — ${allLeads.length} lead${allLeads.length !== 1 ? 's' : ''}${hotCount > 0 ? `, ${hotCount} hot` : ''} attached.`,
    leadCount: allLeads.length,
    hotCount,
    recipientCount: succeeded.length,
  })
}
