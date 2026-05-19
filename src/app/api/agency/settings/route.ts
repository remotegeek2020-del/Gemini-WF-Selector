export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

async function requireAgencyAdmin() {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!roleData || roleData.role !== 'agency_admin') {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, error: null }
}

export async function GET() {
  const { error } = await requireAgencyAdmin()
  if (error) return error

  const admin = createAdminClient()
  const { data, error: dbError } = await admin
    .from('agency_settings')
    .select('key, value')

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const settings: Record<string, unknown> = {}
  for (const row of data ?? []) {
    settings[row.key] = row.value
  }

  return NextResponse.json({ settings })
}

export async function POST(request: NextRequest) {
  const { error } = await requireAgencyAdmin()
  if (error) return error

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email_config } = body
  if (!email_config) {
    return NextResponse.json({ error: 'email_config is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error: upsertError } = await admin.from('agency_settings').upsert(
    { key: 'email_config', value: email_config, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
