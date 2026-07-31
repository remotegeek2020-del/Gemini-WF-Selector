export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { assessLeadHotness } from '@/lib/ai/hot-assessment'
import type { AIConfig, HotLeadCriteria } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const { accountId } = params
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, account_id')
    .eq('user_id', user.id)
    .single()

  if (!roleData) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (roleData.role === 'sub_account' && roleData.account_id !== accountId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { leadId: string; criteria: HotLeadCriteria }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { leadId, criteria } = body
  if (!leadId) return NextResponse.json({ error: 'leadId is required' }, { status: 400 })

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*, personas(id, name, color, description, who_they_are, industry_experience, what_they_want, decision_trigger, is_default)')
    .eq('id', leadId)
    .eq('account_id', accountId)
    .single()

  if (leadError || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const admin = createAdminClient()

  const { data: agencySettingsRows } = await admin
    .from('agency_settings')
    .select('key, value')
    .in('key', ['enrichment_ai'])

  const agencySettings: Record<string, unknown> = {}
  for (const row of agencySettingsRows || []) agencySettings[row.key] = row.value
  const agencyEnrichAi = agencySettings['enrichment_ai'] as { provider: string; model: string; api_key: string } | undefined

  const { data: apiKeysData } = await supabase
    .from('api_keys')
    .select('service, key_value, extra_data')
    .eq('account_id', accountId)
    .in('service', ['ai_model', 'gemini'])

  const keyMap = Object.fromEntries((apiKeysData || []).map((k) => [k.service, k]))

  let aiConfig: AIConfig
  if (agencyEnrichAi?.api_key) {
    aiConfig = { provider: agencyEnrichAi.provider as AIConfig['provider'], model: agencyEnrichAi.model || 'gemini-2.5-flash', apiKey: agencyEnrichAi.api_key }
  } else if (keyMap['ai_model']) {
    const entry = keyMap['ai_model']
    const extra = (entry.extra_data || {}) as Record<string, string>
    aiConfig = { provider: (extra.provider || 'gemini') as AIConfig['provider'], model: extra.model || 'gemini-2.5-flash', apiKey: entry.key_value }
  } else if (keyMap['gemini']) {
    aiConfig = { provider: 'gemini', model: 'gemini-2.5-flash', apiKey: keyMap['gemini'].key_value }
  } else {
    return NextResponse.json({ error: 'AI model not configured for this account' }, { status: 400 })
  }

  const persona = lead.personas || null
  // Match the exact logic used in enrich/webhook routes:
  // only flagged as default-fallback when there was NO direct persona match AND the assigned persona is the default
  const isDefaultFallback = !lead.assigned_persona_id && !!(persona as Record<string, unknown> | null)?.is_default

  const result = await assessLeadHotness(aiConfig, {
    enrichedData: (lead.enriched_data || {}) as Record<string, unknown>,
    persona,
    isDefaultFallback,
    source: lead.source,
    criteria,
  })

  return NextResponse.json(result)
}
