export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { computeNextRunAt } from '@/lib/reports/schedule'

async function authorise(supabase: ReturnType<typeof createServerClient>, accountId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, account_id')
    .eq('user_id', user.id)
    .single()
  if (!roleData) return false
  if (roleData.role === 'sub_account' && roleData.account_id !== accountId) return false
  return true
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { accountId: string; scheduleId: string } }
) {
  const supabase = createServerClient()
  if (!await authorise(supabase, params.accountId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // If frequency/timing fields are changing, recompute next_run_at
  const updates: Record<string, unknown> = { ...body }
  if (body.frequency || body.hour_utc !== undefined || body.day_of_week !== undefined || body.day_of_month !== undefined) {
    const { data: existing } = await supabase
      .from('report_schedules')
      .select('frequency, hour_utc, day_of_week, day_of_month')
      .eq('id', params.scheduleId)
      .eq('account_id', params.accountId)
      .single()

    if (existing) {
      const frequency = (body.frequency ?? existing.frequency) as 'daily' | 'weekly' | 'monthly'
      const hourUtc = (body.hour_utc ?? existing.hour_utc) as number
      const dayOfWeek = frequency === 'weekly' ? ((body.day_of_week ?? existing.day_of_week) as number | null) : null
      const dayOfMonth = frequency === 'monthly' ? ((body.day_of_month ?? existing.day_of_month) as number | null) : null
      updates.next_run_at = computeNextRunAt(frequency, hourUtc, dayOfWeek, dayOfMonth).toISOString()
    }
  }

  const { data, error } = await supabase
    .from('report_schedules')
    .update(updates)
    .eq('id', params.scheduleId)
    .eq('account_id', params.accountId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedule: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { accountId: string; scheduleId: string } }
) {
  const supabase = createServerClient()
  if (!await authorise(supabase, params.accountId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('report_schedules')
    .delete()
    .eq('id', params.scheduleId)
    .eq('account_id', params.accountId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
