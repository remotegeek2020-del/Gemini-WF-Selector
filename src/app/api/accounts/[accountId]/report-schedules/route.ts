export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { computeNextRunAt } from '@/lib/reports/schedule'
import type { ScheduleFrequency } from '@/lib/reports/schedule'

async function authorise(supabase: ReturnType<typeof createServerClient>, accountId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, account_id')
    .eq('user_id', user.id)
    .single()
  if (!roleData) return null
  if (roleData.role === 'sub_account' && roleData.account_id !== accountId) return null
  return user
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const supabase = createServerClient()
  if (!await authorise(supabase, params.accountId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('report_schedules')
    .select('*')
    .eq('account_id', params.accountId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedules: data || [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const supabase = createServerClient()
  if (!await authorise(supabase, params.accountId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    label?: string
    pipeline?: string
    hot_only?: boolean
    frequency: ScheduleFrequency
    hour_utc?: number
    day_of_week?: number
    day_of_month?: number
    date_range_days?: number | null
    recipients: string[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.frequency || !['daily', 'weekly', 'monthly'].includes(body.frequency)) {
    return NextResponse.json({ error: 'frequency must be daily, weekly, or monthly' }, { status: 400 })
  }
  if (!Array.isArray(body.recipients) || body.recipients.length === 0) {
    return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const invalid = body.recipients.filter((r) => !emailRegex.test(r))
  if (invalid.length > 0) {
    return NextResponse.json({ error: `Invalid email addresses: ${invalid.join(', ')}` }, { status: 400 })
  }

  const hourUtc = body.hour_utc ?? 8
  const dayOfWeek = body.frequency === 'weekly' ? (body.day_of_week ?? 1) : null
  const dayOfMonth = body.frequency === 'monthly' ? (body.day_of_month ?? 1) : null
  const nextRunAt = computeNextRunAt(body.frequency, hourUtc, dayOfWeek, dayOfMonth)

  const { data, error } = await supabase
    .from('report_schedules')
    .insert({
      account_id: params.accountId,
      label: body.label || null,
      pipeline: body.pipeline || 'all',
      hot_only: body.hot_only ?? false,
      frequency: body.frequency,
      hour_utc: hourUtc,
      day_of_week: dayOfWeek,
      day_of_month: dayOfMonth,
      date_range_days: body.date_range_days ?? null,
      recipients: body.recipients,
      is_active: true,
      next_run_at: nextRunAt.toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedule: data })
}
