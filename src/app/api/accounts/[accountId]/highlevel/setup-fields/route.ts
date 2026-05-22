export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { getCustomFields, createCustomField } from '@/lib/highlevel/client'

const FIELDS = [
  { key: 'persona_field_id', name: 'Lead Router - Persona', fieldKey: 'lead_router_persona' },
  { key: 'score_field_id', name: 'Lead Router - Score', fieldKey: 'lead_router_score' },
  { key: 'reasoning_field_id', name: 'Lead Router - Reasoning', fieldKey: 'lead_router_reasoning' },
] as const

async function getHLConfig(accountId: string) {
  const admin = createAdminClient()
  const { data: hlKey } = await admin
    .from('api_keys')
    .select('key_value, extra_data')
    .eq('account_id', accountId)
    .eq('service', 'highlevel')
    .single()

  const locationId = (hlKey?.extra_data as Record<string, string> | null)?.location_id
  return { apiKey: hlKey?.key_value || null, locationId: locationId || null }
}

// GET — check if fields are set up
export async function GET(
  _request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('api_keys')
    .select('extra_data')
    .eq('account_id', params.accountId)
    .eq('service', 'highlevel_custom_fields')
    .single()

  if (!existing?.extra_data) {
    return NextResponse.json({ configured: false, fields: null })
  }

  return NextResponse.json({ configured: true, fields: existing.extra_data })
}

// POST — create the 3 custom fields in HL and store their IDs
export async function POST(
  _request: NextRequest,
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

  if (!roleData || roleData.role !== 'agency_admin') {
    return NextResponse.json({ error: 'Agency admin access required' }, { status: 403 })
  }

  const { apiKey, locationId } = await getHLConfig(params.accountId)
  if (!apiKey || !locationId) {
    return NextResponse.json(
      { error: 'Highlevel API key and Location ID must be configured first' },
      { status: 400 }
    )
  }

  try {
    // Fetch existing custom fields to avoid duplicates
    const existing = await getCustomFields(apiKey, locationId)
    const fieldIds: Record<string, string> = {}

    for (const field of FIELDS) {
      const found = existing.find(
        (f) => f.fieldKey === field.fieldKey || f.name === field.name
      )
      if (found) {
        fieldIds[field.key] = found.id
      } else {
        const created = await createCustomField(apiKey, locationId, field.name, field.fieldKey)
        fieldIds[field.key] = created.id
      }
    }

    // Persist field IDs in api_keys
    const admin = createAdminClient()
    await admin.from('api_keys').upsert(
      {
        account_id: params.accountId,
        service: 'highlevel_custom_fields',
        key_value: 'configured',
        extra_data: fieldIds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'account_id,service' }
    )

    return NextResponse.json({ success: true, fields: fieldIds })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
