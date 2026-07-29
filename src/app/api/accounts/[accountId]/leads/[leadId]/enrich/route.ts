export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { runPersonaAssignment } from '@/lib/ai/agent'
import { runEnrichmentPipeline } from '@/lib/enrichment/pipeline'
import { assignWorkflow, updateContactProfile, lookupContactByEmail, extractLinkedinFromHLPayload, extractAttributionFromHLPayload } from '@/lib/highlevel/client'
import { runPostEnrichmentHLActions } from '@/lib/highlevel/post-enrichment'
import { sendLeadNotification } from '@/lib/email/postmark'
import type { AIConfig } from '@/types'

export async function POST(
  _request: NextRequest,
  { params }: { params: { accountId: string; leadId: string } }
) {
  const { accountId, leadId } = params
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

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('account_id', accountId)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  if (lead.status === 'enriching') {
    const updatedAt = new Date(lead.updated_at).getTime()
    if (Date.now() - updatedAt < 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Lead is already being enriched' }, { status: 409 })
    }
  }

  await supabase
    .from('leads')
    .update({ status: 'enriching', updated_at: new Date().toISOString() })
    .eq('id', leadId)

  const admin = createAdminClient()

  try {
    // Agency-level AI + enrichment keys
    const { data: agencySettingsRows } = await admin
      .from('agency_settings')
      .select('key, value')
      .in('key', ['enrichment_ai', 'enrichment_keys'])

    const agencySettings: Record<string, unknown> = {}
    for (const row of agencySettingsRows || []) agencySettings[row.key] = row.value
    const agencyEnrichAi = agencySettings['enrichment_ai'] as { provider: string; model: string; api_key: string } | undefined
    const agencyEnrichKeys = agencySettings['enrichment_keys'] as Record<string, string> | undefined

    // Per-account keys: HL, postmark, legacy AI fallback
    const ACCOUNT_SERVICES = ['ai_model', 'gemini', 'highlevel', 'highlevel_custom_fields', 'postmark']
    const { data: apiKeysData } = await supabase
      .from('api_keys')
      .select('service, key_value, extra_data')
      .eq('account_id', accountId)
      .in('service', ACCOUNT_SERVICES)

    const keyMap = Object.fromEntries((apiKeysData || []).map((k) => [k.service, k]))
    const highlevelKey = keyMap['highlevel']?.key_value
    const highlevelLocationId = (keyMap['highlevel']?.extra_data as Record<string, string> | null)?.location_id || null
    const postmarkKey = keyMap['postmark']?.key_value
    const postmarkExtra = keyMap['postmark']?.extra_data as Record<string, string> | null
    const postmarkFromEmail = postmarkExtra?.from_email || ''
    const postmarkFromName = postmarkExtra?.from_name || ''
    const postmarkFrom = postmarkFromName && postmarkFromEmail ? `${postmarkFromName} <${postmarkFromEmail}>` : postmarkFromEmail

    // Pipeline-level notification emails fallback
    const { data: pipelineData } = await admin
      .from('pipelines')
      .select('notification_emails')
      .eq('account_id', accountId)
      .eq('slug', lead.pipeline || 'main')
      .single()
    const pipelineEmails: string[] = pipelineData?.notification_emails || []

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
      throw new Error('AI model API key not configured. Set it in Agency Settings.')
    }

    const ek = (service: string) => agencyEnrichKeys?.[service] || undefined

    // Fetch personas scoped to this lead's pipeline
    const { data: personas, error: personasError } = await supabase
      .from('personas')
      .select('*')
      .eq('account_id', accountId)
      .eq('pipeline', lead.pipeline || 'main')
      .order('created_at', { ascending: true })

    if (personasError) throw new Error(`Failed to fetch personas: ${personasError.message}`)

    const hlLinkedinUrl = extractLinkedinFromHLPayload((lead.raw_data || {}) as Record<string, unknown>)

    // Run full 12-tool enrichment waterfall
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

    // AI persona assignment
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

    // Extract enriched contact fields for HL write-back and email
    const ed = enrichedDataRaw as Record<string, unknown>
    const apolloRaw = (ed.apollo_raw || {}) as Record<string, unknown>
    const org = (apolloRaw.organization || ed.organization) as Record<string, unknown> | undefined
    const enrichedFirstName = (ed.first_name as string | undefined) || (apolloRaw.first_name as string | undefined) || undefined
    const enrichedLastName = (ed.last_name as string | undefined) || (apolloRaw.last_name as string | undefined) || undefined
    const enrichedEmail = (ed.email as string | undefined) || (apolloRaw.email as string | undefined) || undefined
    const enrichedPhone = (ed.lusha_phones as string[] | undefined)?.[0] || (ed.phone_numbers as { sanitized_number?: string }[] | undefined)?.[0]?.sanitized_number || undefined
    const enrichedCompany = (org?.name as string | undefined) || (ed.current_company as string | undefined) || (ed.lusha_company_name as string | undefined) || undefined
    const enrichedTitle = (ed.title as string | undefined) || (apolloRaw.title as string | undefined) || undefined
    const enrichedLinkedin = (ed.linkedin_url as string | undefined) || (apolloRaw.linkedin_url as string | undefined) || (ed.hl_linkedin_url as string | undefined) || undefined

    const attribution = extractAttributionFromHLPayload((lead.raw_data || {}) as Record<string, unknown>)

    const leadUpdate: Record<string, unknown> = {
      enriched_data: enrichedDataRaw,
      assigned_persona_id: assignedPersonaId,
      persona_reasoning: reasoning,
      status: finalStatus,
      updated_at: new Date().toISOString(),
      ...(attribution && !lead.attribution ? { attribution } : {}),
    }
    if (enrichedFirstName && !lead.first_name) leadUpdate.first_name = enrichedFirstName
    if (enrichedLastName && !lead.last_name) leadUpdate.last_name = enrichedLastName
    if (enrichedEmail && !lead.email) leadUpdate.email = enrichedEmail
    if (enrichedPhone && !lead.phone) leadUpdate.phone = enrichedPhone

    await supabase.from('leads').update(leadUpdate).eq('id', leadId)

    // HL contact write-back
    if (highlevelKey) {
      let contactId = lead.highlevel_contact_id

      if (!contactId && highlevelLocationId && (lead.email || enrichedEmail)) {
        const lookupEmail = (lead.email || enrichedEmail)!
        const foundId = await lookupContactByEmail(highlevelKey, highlevelLocationId, lookupEmail)
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
      }
    }

    // HL workflow + post-enrichment actions
    if (assignedPersonaId && finalStatus === 'assigned' && highlevelKey && lead.highlevel_contact_id) {
      const matchedPersona = (personas || []).find((p) => p.id === assignedPersonaId)
      const fieldIds = keyMap['highlevel_custom_fields']?.extra_data as {
        persona_field_id: string; score_field_id: string; reasoning_field_id: string
      } | null

      if (matchedPersona?.highlevel_workflow_id) {
        const workflowResult = await assignWorkflow(highlevelKey, lead.highlevel_contact_id!, matchedPersona.highlevel_workflow_id)
        if (workflowResult.success) {
          await supabase.from('leads').update({ workflow_triggered: true, updated_at: new Date().toISOString() }).eq('id', leadId)
        }
      }

      if (matchedPersona) {
        const isDefaultFallback = !assignment.persona_id && !!matchedPersona.is_default
        await runPostEnrichmentHLActions({
          apiKey: highlevelKey,
          locationId: highlevelLocationId || '',
          contactId: lead.highlevel_contact_id!,
          persona: matchedPersona,
          reasoning,
          isDefaultFallback,
          fieldIds,
        })
      }
    }

    // Email notifications
    const matchedPersonaForEmail = assignedPersonaId ? (personas || []).find((p) => p.id === assignedPersonaId) : null
    if (postmarkKey && postmarkFrom && matchedPersonaForEmail) {
      const personaEmails: string[] = (matchedPersonaForEmail.notification_emails || []).filter(Boolean)
      const toEmails = Array.from(new Set([...pipelineEmails, ...personaEmails])).filter(Boolean)
      if (toEmails.length > 0) {
        const isDefaultFallback = !assignment.persona_id && !!matchedPersonaForEmail.is_default
        try {
          await sendLeadNotification(postmarkKey, toEmails, postmarkFrom, {
            firstName: enrichedFirstName || lead.first_name || undefined,
            lastName: enrichedLastName || lead.last_name || undefined,
            email: enrichedEmail || lead.email || undefined,
            phone: enrichedPhone || lead.phone || undefined,
            company: enrichedCompany,
            title: enrichedTitle,
            linkedinUrl: enrichedLinkedin,
            personaName: matchedPersonaForEmail.name,
            personaColor: matchedPersonaForEmail.color,
            reasoning,
            isDefaultFallback,
            pipeline: lead.pipeline || 'main',
            source: lead.source || undefined,
            rawData: lead.raw_data || undefined,
            enrichedData: enrichedDataRaw,
          })
        } catch (e) {
          console.error('[Email] notification failed:', e)
        }
      }
    }

    return NextResponse.json({
      success: true,
      leadId,
      personaId: assignment.persona_id,
      status: finalStatus,
      sourcesUsed: pipelineResult.sources_used,
      sourcesSkipped: pipelineResult.sources_skipped,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown enrichment error'
    console.error('Enrichment error:', errorMessage)

    await supabase
      .from('leads')
      .update({ status: 'failed', error_message: errorMessage, updated_at: new Date().toISOString() })
      .eq('id', leadId)

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
