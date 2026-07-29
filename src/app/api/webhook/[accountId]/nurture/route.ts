export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createAdminClient } from '@/lib/supabase/server'
import { runPersonaAssignment } from '@/lib/ai/agent'
import { runEnrichmentPipeline } from '@/lib/enrichment/pipeline'
import { assignWorkflow, extractLinkedinFromHLPayload } from '@/lib/highlevel/client'
import { runPostEnrichmentHLActions } from '@/lib/highlevel/post-enrichment'
import type { AIConfig } from '@/types'

export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const { accountId } = params
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  const expectedSecret = accountId.replace(/-/g, '').substring(0, 16)
  if (secret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, nurture_enabled')
    .eq('id', accountId)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  if (!account.nurture_enabled) {
    return NextResponse.json({ error: 'Nurture pipeline not enabled for this account' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const contactId = (body.contactId || body.id || body.contact_id) as string | undefined
  const firstName = (body.firstName || body.first_name) as string | undefined
  const lastName = (body.lastName || body.last_name) as string | undefined
  const email = body.email as string | undefined
  const phone = (body.phone || body.phoneRaw) as string | undefined

  let source = 'other'
  const rawTags = body.tags
  const tags = Array.isArray(rawTags) ? rawTags : typeof rawTags === 'string' ? [rawTags] : []
  const tagsLower = tags.map((t: string) => t.toLowerCase())

  if (tagsLower.some((t) => t.includes('facebook') || t.includes('fb'))) {
    source = 'facebook'
  } else if (tagsLower.some((t) => t.includes('linkedin'))) {
    source = 'linkedin'
  } else if (tagsLower.some((t) => t.includes('google'))) {
    source = 'google'
  }

  const customFields = body.customFields as Record<string, unknown>[] | undefined
  if (customFields && Array.isArray(customFields)) {
    for (const field of customFields) {
      const fieldValue = String(field.value || '').toLowerCase()
      if (fieldValue.includes('facebook')) source = 'facebook'
      else if (fieldValue.includes('linkedin')) source = 'linkedin'
      else if (fieldValue.includes('google')) source = 'google'
    }
  }

  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert({
      account_id: accountId,
      highlevel_contact_id: contactId || null,
      first_name: firstName || null,
      last_name: lastName || null,
      email: email || null,
      phone: phone || null,
      source,
      raw_data: body,
      status: 'pending',
      pipeline: 'nurture',
    })
    .select()
    .single()

  if (insertError) {
    console.error('Failed to insert nurture lead:', insertError)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  waitUntil(enrichNurtureLead(accountId, lead.id).catch((err) => {
    console.error('Failed to trigger nurture enrichment:', err)
  }))

  return NextResponse.json({ success: true, leadId: lead.id }, { status: 200 })
}

async function enrichNurtureLead(accountId: string, leadId: string) {
  const supabase = createAdminClient()

  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()
  if (!lead) return

  await supabase.from('leads').update({ status: 'enriching', updated_at: new Date().toISOString() }).eq('id', leadId)

  // Fetch agency-level AI + enrichment key settings
  const { data: agencySettingsRows } = await supabase
    .from('agency_settings')
    .select('key, value')
    .in('key', ['enrichment_ai', 'enrichment_keys'])

  const agencySettings: Record<string, unknown> = {}
  for (const row of agencySettingsRows || []) agencySettings[row.key] = row.value
  const agencyEnrichAi = agencySettings['enrichment_ai'] as { provider: string; model: string; api_key: string } | undefined
  const agencyEnrichKeys = agencySettings['enrichment_keys'] as Record<string, string> | undefined

  // Per-account keys: HighLevel, postmark, legacy AI fallback
  const ACCOUNT_SERVICES = ['ai_model', 'gemini', 'highlevel', 'highlevel_custom_fields', 'postmark']
  const { data: apiKeysData } = await supabase
    .from('api_keys')
    .select('service, key_value, extra_data')
    .eq('account_id', accountId)
    .in('service', ACCOUNT_SERVICES)

  const keyMap = Object.fromEntries((apiKeysData || []).map((k) => [k.service, k]))
  const highlevelKey = keyMap['highlevel']?.key_value
  const locationId = (keyMap['highlevel']?.extra_data as Record<string, string> | null)?.location_id || ''

  // Resolve AI config: agency > per-account ai_model > per-account gemini
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
    await supabase.from('leads').update({ status: 'failed', error_message: 'AI model API key not configured. Set it in Agency Settings.', updated_at: new Date().toISOString() }).eq('id', leadId)
    return
  }

  const ek = (service: string) => agencyEnrichKeys?.[service] || undefined

  const { data: personas } = await supabase
    .from('personas')
    .select('*')
    .eq('account_id', accountId)
    .eq('pipeline', 'nurture')
    .order('created_at', { ascending: true })

  const hlLinkedinUrl = extractLinkedinFromHLPayload((lead.raw_data || {}) as Record<string, unknown>)

  const pipelineResult = await runEnrichmentPipeline(
    { firstName: lead.first_name, lastName: lead.last_name, email: lead.email, phone: lead.phone, linkedinUrl: hlLinkedinUrl, rawData: lead.raw_data },
    {
      apollo: ek('apollo'),
      lusha: ek('lusha'),
      pdl: ek('pdl'),
      datagma: ek('datagma'),
      bettercontact: ek('bettercontact'),
      kaspr: ek('kaspr'),
      cognism: ek('cognism'),
      contactout: ek('contactout'),
      hunter: ek('hunter'),
      dropcontact: ek('dropcontact'),
      findymail: ek('findymail'),
      enrow: ek('enrow'),
    }
  )

  const enrichedDataRaw = pipelineResult.enriched_data
  enrichedDataRaw.sources_used = pipelineResult.sources_used
  enrichedDataRaw.sources_skipped = pipelineResult.sources_skipped

  if (hlLinkedinUrl && !enrichedDataRaw.linkedin_url) {
    enrichedDataRaw.linkedin_url = hlLinkedinUrl
    enrichedDataRaw.hl_linkedin_url = hlLinkedinUrl
  }

  const leadInput = { firstName: lead.first_name, lastName: lead.last_name, email: lead.email, phone: lead.phone, source: lead.source }
  const assignment = await runPersonaAssignment(aiConfig, leadInput, enrichedDataRaw, personas || [])

  let assignedPersonaId = assignment.persona_id
  let reasoning = assignment.reasoning

  if (!assignedPersonaId) {
    const defaultPersona = (personas || []).find((p) => p.is_default)
    if (defaultPersona) {
      assignedPersonaId = defaultPersona.id
      reasoning = `${reasoning}\n\n[Assigned to default persona "${defaultPersona.name}" as no specific persona matched.]`
    }
  }

  const finalStatus = assignedPersonaId ? 'assigned' : 'no_persona'

  await supabase.from('leads').update({
    enriched_data: enrichedDataRaw,
    assigned_persona_id: assignedPersonaId,
    persona_reasoning: reasoning,
    status: finalStatus,
    updated_at: new Date().toISOString(),
  }).eq('id', leadId)

  if (assignedPersonaId && highlevelKey && lead.highlevel_contact_id) {
    const matched = (personas || []).find((p) => p.id === assignedPersonaId)
    const fieldIds = keyMap['highlevel_custom_fields']?.extra_data as {
      persona_field_id: string; score_field_id: string; reasoning_field_id: string
    } | null

    if (matched?.highlevel_workflow_id) {
      const wf = await assignWorkflow(highlevelKey, lead.highlevel_contact_id, matched.highlevel_workflow_id)
      if (wf.success) {
        await supabase.from('leads').update({ workflow_triggered: true, updated_at: new Date().toISOString() }).eq('id', leadId)
      }
    }

    if (matched) {
      const isDefaultFallback = !assignment.persona_id && !!matched.is_default
      await runPostEnrichmentHLActions({
        apiKey: highlevelKey,
        locationId,
        contactId: lead.highlevel_contact_id,
        persona: matched,
        reasoning,
        isDefaultFallback,
        fieldIds,
      })
    }
  }
}
