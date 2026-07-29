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

  const { email_config, persona_gen_ai, enrichment_ai, enrichment_keys } = body as {
    email_config?: unknown
    persona_gen_ai?: unknown
    enrichment_ai?: unknown
    enrichment_keys?: Record<string, string>
  }

  if (!email_config && !persona_gen_ai && !enrichment_ai && !enrichment_keys) {
    return NextResponse.json({ error: 'Nothing to save' }, { status: 400 })
  }

  const admin = createAdminClient()
  const upserts: { key: string; value: unknown }[] = []

  if (email_config) upserts.push({ key: 'email_config', value: email_config })

  // For AI configs: merge with existing so that omitting api_key preserves the stored key
  if (persona_gen_ai !== undefined) {
    const { data: existingPga } = await admin.from('agency_settings').select('value').eq('key', 'persona_gen_ai').single()
    const merged = { ...((existingPga?.value as Record<string, unknown>) || {}), ...(persona_gen_ai as Record<string, unknown>) }
    upserts.push({ key: 'persona_gen_ai', value: merged })
  }
  if (enrichment_ai !== undefined) {
    const { data: existingEai } = await admin.from('agency_settings').select('value').eq('key', 'enrichment_ai').single()
    const merged = { ...((existingEai?.value as Record<string, unknown>) || {}), ...(enrichment_ai as Record<string, unknown>) }
    upserts.push({ key: 'enrichment_ai', value: merged })
  }

  // Merge partial enrichment_keys into existing blob
  if (enrichment_keys && Object.keys(enrichment_keys).length > 0) {
    const { data: existing } = await admin
      .from('agency_settings')
      .select('value')
      .eq('key', 'enrichment_keys')
      .single()
    const merged = { ...((existing?.value as Record<string, string>) || {}), ...enrichment_keys }
    upserts.push({ key: 'enrichment_keys', value: merged })
  }

  for (const row of upserts) {
    const { error: upsertError } = await admin.from('agency_settings').upsert(
      { key: row.key, value: row.value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
