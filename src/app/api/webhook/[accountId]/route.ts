export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createAdminClient } from '@/lib/supabase/server'
import { runEnrichmentAgent } from '@/lib/ai/agent'
import { assignWorkflow, updateContactProfile, lookupContactByEmail } from '@/lib/highlevel/client'
import { runPostEnrichmentHLActions } from '@/lib/highlevel/post-enrichment'
import { sendLeadNotification } from '@/lib/email/postmark'
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

  // Determine source from tags or custom fields
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
    })
    .select()
    .single()

  if (insertError) {
    console.error('Failed to insert lead:', insertError)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  waitUntil(enrichLead(accountId, lead.id).catch((err) => {
    console.error('Failed to trigger enrichment:', err)
  }))

  return NextResponse.json({ success: true, leadId: lead.id }, { status: 200 })
}

async function enrichLead(accountId: string, leadId: string) {
  const supabase = createAdminClient()

  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()
  if (!lead) return

  await supabase.from('leads').update({ status: 'enriching', updated_at: new Date().toISOString() }).eq('id', leadId)

  const [apiKeysResult, accountResult] = await Promise.all([
    supabase
      .from('api_keys')
      .select('service, key_value, extra_data')
      .eq('account_id', accountId)
      .in('service', ['ai_model', 'gemini', 'apollo', 'highlevel', 'lusha', 'highlevel_custom_fields', 'postmark']),
    supabase
      .from('accounts')
      .select('notification_emails')
      .eq('id', accountId)
      .single(),
  ])

  const keyMap = Object.fromEntries((apiKeysResult.data || []).map((k) => [k.service, k]))
  const apolloKey = keyMap['apollo']?.key_value
  const highlevelKey = keyMap['highlevel']?.key_value
  const lushaKey = keyMap['lusha']?.key_value || undefined
  const postmarkKey = keyMap['postmark']?.key_value
  const postmarkExtra = keyMap['postmark']?.extra_data as Record<string, string> | null
  const postmarkFromEmail = postmarkExtra?.from_email || ''
  const postmarkFromName = postmarkExtra?.from_name || ''
  const postmarkFrom = postmarkFromName && postmarkFromEmail ? `${postmarkFromName} <${postmarkFromEmail}>` : postmarkFromEmail
  const globalEmails: string[] = accountResult.data?.notification_emails || []

  if (!apolloKey) {
    await supabase.from('leads').update({ status: 'failed', error_message: 'Apollo API key not configured.', updated_at: new Date().toISOString() }).eq('id', leadId)
    return
  }

  let aiConfig: AIConfig
  if (keyMap['ai_model']) {
    const entry = keyMap['ai_model']
    const extra = (entry.extra_data || {}) as Record<string, string>
    aiConfig = { provider: (extra.provider || 'gemini') as AIConfig['provider'], model: extra.model || 'gemini-2.5-flash', apiKey: entry.key_value }
  } else if (keyMap['gemini']) {
    aiConfig = { provider: 'gemini', model: 'gemini-2.5-flash', apiKey: keyMap['gemini'].key_value }
  } else {
    await supabase.from('leads').update({ status: 'failed', error_message: 'AI model API key not configured.', updated_at: new Date().toISOString() }).eq('id', leadId)
    return
  }

  const { data: personas } = await supabase.from('personas').select('*').eq('account_id', accountId).eq('pipeline', 'main').order('created_at', { ascending: true })

  const result = await runEnrichmentAgent(aiConfig, apolloKey, {
    firstName: lead.first_name, lastName: lead.last_name, email: lead.email,
    phone: lead.phone, source: lead.source, rawData: lead.raw_data,
  }, personas || [], lushaKey)

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
  const enrichedLinkedin = (ed.linkedin_url as string | undefined) || (apolloRaw.linkedin_url as string | undefined) || undefined

  // Build lead update — backfill name/email/phone if the lead arrived with blanks
  const leadUpdate: Record<string, unknown> = {
    enriched_data: result.enriched_data,
    assigned_persona_id: assignedPersonaId,
    persona_reasoning: reasoning,
    status: finalStatus,
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

  if (assignedPersonaId && highlevelKey) {
    const matched = (personas || []).find((p) => p.id === assignedPersonaId)
    const fieldIds = keyMap['highlevel_custom_fields']?.extra_data as {
      persona_field_id: string; score_field_id: string; reasoning_field_id: string
    } | null
    const contactId = lead.highlevel_contact_id

    if (matched?.highlevel_workflow_id && contactId) {
      const wf = await assignWorkflow(highlevelKey, contactId, matched.highlevel_workflow_id)
      if (wf.success) {
        await supabase.from('leads').update({ workflow_triggered: true, updated_at: new Date().toISOString() }).eq('id', leadId)
      }
    }

    if (matched && contactId) {
      const isDefaultFallback = !result.persona_id && !!matched.is_default
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
        },
      })
    }
  }

  // Send email notifications
  const matched = assignedPersonaId ? (personas || []).find((p) => p.id === assignedPersonaId) : null
  if (postmarkKey && postmarkFrom && matched) {
    const personaEmails: string[] = matched.notification_emails || []
    const toEmails = Array.from(new Set([...globalEmails, ...personaEmails])).filter(Boolean)
    if (toEmails.length > 0) {
      const isDefaultFallback = !result.persona_id && !!matched.is_default
      sendLeadNotification(postmarkKey, toEmails, postmarkFrom, {
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
        pipeline: 'main',
        source: lead.source || undefined,
        rawData: lead.raw_data || undefined,
        enrichedData: result.enriched_data || undefined,
      }).catch((e) => console.error('[Email] notification failed:', e))
    }
  }
}
