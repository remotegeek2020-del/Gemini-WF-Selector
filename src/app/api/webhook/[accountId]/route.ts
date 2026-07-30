export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createAdminClient } from '@/lib/supabase/server'
import { runPersonaAssignment } from '@/lib/ai/agent'
import { runEnrichmentPipeline } from '@/lib/enrichment/pipeline'
import { assignWorkflow, updateContactProfile, lookupContactByEmail, extractLinkedinFromHLPayload, extractAttributionFromHLPayload } from '@/lib/highlevel/client'
import { runPostEnrichmentHLActions } from '@/lib/highlevel/post-enrichment'
import { sendLeadNotification } from '@/lib/email/postmark'
import { assessLeadHotness } from '@/lib/ai/hot-assessment'
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

  // The secret is the first 16 chars of accountId with hyphens removed
  // Validate if provided (optional extra security)
  const expectedSecret = accountId.replace(/-/g, '').substring(0, 16)
  if (secret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify account exists
  const supabase = createAdminClient()
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Extract contact data from Highlevel webhook payload
  const contactId = (body.contactId || body.id || body.contact_id) as string | undefined
  const firstName = (body.firstName || body.first_name) as string | undefined
  const lastName = (body.lastName || body.last_name) as string | undefined
  const email = body.email as string | undefined
  const phone = (body.phone || body.phoneRaw) as string | undefined

  // Extract attribution first — UTM source takes priority over tags
  const attribution = extractAttributionFromHLPayload(body)

  // Source: prefer UTM/session source from HL attribution, fall back to tags
  let source = 'other'
  const hlSource = attribution?.utmSource || attribution?.sessionSource || attribution?.source
  if (hlSource) {
    source = hlSource.toLowerCase()
  } else {
    const rawTags = body.tags
    const tags = Array.isArray(rawTags) ? rawTags : typeof rawTags === 'string' ? [rawTags] : []
    const tagsLower = tags.map((t: string) => t.toLowerCase())
    if (tagsLower.some((t) => t.includes('facebook') || t.includes('fb'))) source = 'facebook'
    else if (tagsLower.some((t) => t.includes('linkedin'))) source = 'linkedin'
    else if (tagsLower.some((t) => t.includes('google'))) source = 'google'

    const customFields = body.customFields as Record<string, unknown>[] | undefined
    if (customFields && Array.isArray(customFields)) {
      for (const field of customFields) {
        const fieldValue = String(field.value || '').toLowerCase()
        if (fieldValue.includes('facebook')) source = 'facebook'
        else if (fieldValue.includes('linkedin')) source = 'linkedin'
        else if (fieldValue.includes('google')) source = 'google'
      }
    }
  }

  // Create lead record scoped to this account
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
      ...(attribution ? { attribution } : {}),
    })
    .select()
    .single()

  if (insertError) {
    console.error('Failed to insert lead:', insertError)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  // Fetch main pipeline notification emails
  const { data: mainPipeline } = await supabase
    .from('pipelines')
    .select('notification_emails')
    .eq('account_id', accountId)
    .eq('slug', 'main')
    .single()
  const mainPipelineEmails: string[] = mainPipeline?.notification_emails || []

  waitUntil(enrichLead(accountId, lead.id, mainPipelineEmails).catch((err) => {
    console.error('Failed to trigger enrichment:', err)
  }))

  return NextResponse.json({ success: true, leadId: lead.id }, { status: 200 })
}

async function enrichLead(accountId: string, leadId: string, pipelineEmails: string[]) {
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

  // Per-account fallback keys (HighLevel, email, legacy AI key)
  const ACCOUNT_SERVICES = ['ai_model', 'gemini', 'highlevel', 'highlevel_custom_fields', 'postmark']
  const { data: apiKeysData } = await supabase
    .from('api_keys')
    .select('service, key_value, extra_data')
    .eq('account_id', accountId)
    .in('service', ACCOUNT_SERVICES)

  const keyMap = Object.fromEntries((apiKeysData || []).map((k) => [k.service, k]))
  const highlevelKey = keyMap['highlevel']?.key_value
  const postmarkKey = keyMap['postmark']?.key_value
  const postmarkExtra = keyMap['postmark']?.extra_data as Record<string, string> | null
  const postmarkFromEmail = postmarkExtra?.from_email || ''
  const postmarkFromName = postmarkExtra?.from_name || ''
  const postmarkFrom = postmarkFromName && postmarkFromEmail ? `${postmarkFromName} <${postmarkFromEmail}>` : postmarkFromEmail

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

  // Resolve enrichment key: agency-level first, no per-account fallback needed for enrichment tools
  const ek = (service: string) => agencyEnrichKeys?.[service] || undefined

  const { data: personas } = await supabase.from('personas').select('*').eq('account_id', accountId).eq('pipeline', 'main').order('created_at', { ascending: true })

  const hlLinkedinUrl = extractLinkedinFromHLPayload((lead.raw_data || {}) as Record<string, unknown>)

  // Run waterfall enrichment pipeline
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

  const result = { persona_id: assignment.persona_id, reasoning: assignment.reasoning, enriched_data: enrichedDataRaw }

  let assignedPersonaId = result.persona_id
  let reasoning = result.reasoning

  if (!assignedPersonaId) {
    const defaultPersona = (personas || []).find((p) => p.is_default)
    if (defaultPersona) {
      assignedPersonaId = defaultPersona.id
      reasoning = `${reasoning}\n\n[Assigned to default persona "${defaultPersona.name}" as no specific persona matched.]`
    }
  }

  const finalStatus = assignedPersonaId ? 'assigned' : 'no_persona'

  // Extract enriched name/phone/company from Apollo data
  const ed = (result.enriched_data || {}) as Record<string, unknown>
  const apolloRaw = (ed.apollo_raw || {}) as Record<string, unknown>
  const enrichedFirstName = (ed.first_name as string | undefined) || (apolloRaw.first_name as string | undefined) || undefined
  const enrichedLastName = (ed.last_name as string | undefined) || (apolloRaw.last_name as string | undefined) || undefined
  const enrichedEmail = (ed.email as string | undefined) || (apolloRaw.email as string | undefined) || undefined
  const enrichedPhone =
    (ed.lusha_phone_numbers as { number?: string }[] | undefined)?.[0]?.number ||
    (ed.phone_numbers as { sanitized_number?: string }[] | undefined)?.[0]?.sanitized_number ||
    undefined
  const org = (apolloRaw.organization || ed.organization) as Record<string, unknown> | undefined
  const enrichedCompany = (ed.current_company as string | undefined) || (org?.name as string | undefined) || undefined
  const enrichedTitle = (ed.title as string | undefined) || (apolloRaw.title as string | undefined) || undefined
  const enrichedLinkedin = (ed.linkedin_url as string | undefined) || (apolloRaw.linkedin_url as string | undefined) || (ed.hl_linkedin_url as string | undefined) || undefined

  const matched = assignedPersonaId ? (personas || []).find((p) => p.id === assignedPersonaId) : null
  const isDefaultFallback = !result.persona_id && !!matched?.is_default
  const hotAssessment = await assessLeadHotness(aiConfig, {
    enrichedData: result.enriched_data || {},
    persona: matched || null,
    isDefaultFallback,
    source: lead.source,
  })

  // Build lead update — backfill name/email/phone if the lead arrived with blanks
  const leadUpdate: Record<string, unknown> = {
    enriched_data: result.enriched_data,
    assigned_persona_id: assignedPersonaId,
    persona_reasoning: reasoning,
    status: finalStatus,
    is_hot: hotAssessment.is_hot,
    hot_reasoning: hotAssessment.hot_reasoning,
    updated_at: new Date().toISOString(),
  }
  if (enrichedFirstName && !lead.first_name) leadUpdate.first_name = enrichedFirstName
  if (enrichedLastName && !lead.last_name) leadUpdate.last_name = enrichedLastName
  if (enrichedEmail && !lead.email) leadUpdate.email = enrichedEmail
  if (enrichedPhone && !lead.phone) leadUpdate.phone = enrichedPhone

  await supabase.from('leads').update(leadUpdate).eq('id', leadId)

  const locationId = (keyMap['highlevel']?.extra_data as Record<string, string> | null)?.location_id || ''

  // Push enriched contact data back to HighLevel
  if (highlevelKey) {
    let contactId = lead.highlevel_contact_id

    // If no contact ID stored, look up by email in HL
    if (!contactId && locationId && (lead.email || enrichedEmail)) {
      const lookupEmail = (lead.email || enrichedEmail)!
      const foundId = await lookupContactByEmail(highlevelKey, locationId, lookupEmail)
      if (foundId) {
        contactId = foundId
        supabase.from('leads')
          .update({ highlevel_contact_id: foundId, updated_at: new Date().toISOString() })
          .eq('id', leadId)
          .then(({ error }) => { if (error) console.error('[HL] failed to store contact_id:', error) })
      }
    }

    if (contactId) {
      updateContactProfile(highlevelKey, contactId, {
        firstName: enrichedFirstName,
        lastName: enrichedLastName,
        email: enrichedEmail,
        phone: enrichedPhone,
        companyName: enrichedCompany,
      }).catch((e) => console.error('[HL] contact profile update failed:', e))
    } else {
      console.warn('[HL] no HL contact found for lead', leadId, 'email:', lead.email)
    }
  }

  if (matched && highlevelKey) {
    const fieldIds = keyMap['highlevel_custom_fields']?.extra_data as {
      persona_field_id: string; score_field_id: string; reasoning_field_id: string
    } | null
    const contactId = lead.highlevel_contact_id

    if (matched.highlevel_workflow_id && contactId) {
      const wf = await assignWorkflow(highlevelKey, contactId, matched.highlevel_workflow_id)
      if (wf.success) {
        await supabase.from('leads').update({ workflow_triggered: true, updated_at: new Date().toISOString() }).eq('id', leadId)
      }
    }

    if (contactId) {
      await runPostEnrichmentHLActions({
        apiKey: highlevelKey,
        locationId,
        contactId,
        persona: matched,
        reasoning,
        isDefaultFallback,
        fieldIds,
        leadData: {
          firstName: enrichedFirstName || lead.first_name || undefined,
          lastName: enrichedLastName || lead.last_name || undefined,
          email: enrichedEmail || lead.email || undefined,
          company: enrichedCompany,
          title: enrichedTitle,
          source: lead.source || undefined,
        },
      })
    }
  }

  // Send email notifications — pipeline emails always fire; persona emails are additive
  if (postmarkKey && postmarkFrom && matched) {
    const personaEmails: string[] = (matched.notification_emails || []).filter(Boolean)
    const toEmails = Array.from(new Set([...pipelineEmails, ...personaEmails])).filter(Boolean)
    if (toEmails.length > 0) {
      try {
        await sendLeadNotification(postmarkKey, toEmails, postmarkFrom, {
          firstName: enrichedFirstName || lead.first_name || undefined,
          lastName: enrichedLastName || lead.last_name || undefined,
          email: enrichedEmail || lead.email || undefined,
          phone: enrichedPhone || lead.phone || undefined,
          company: enrichedCompany,
          title: enrichedTitle,
          linkedinUrl: enrichedLinkedin,
          personaName: matched.name,
          personaColor: matched.color,
          reasoning,
          isDefaultFallback,
          isHot: hotAssessment.is_hot,
          hotReasoning: hotAssessment.hot_reasoning,
          pipeline: 'main',
          source: lead.source || undefined,
          rawData: lead.raw_data || undefined,
          enrichedData: result.enriched_data || undefined,
          leadId: leadId,
          accountId: accountId,
          appBaseUrl: process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''),
        })
      } catch (e) {
        console.error('[Email] notification failed:', e)
      }
    }
  }
}
