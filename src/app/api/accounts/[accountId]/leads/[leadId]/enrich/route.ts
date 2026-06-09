export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { runEnrichmentAgent } from '@/lib/ai/agent'
import { assignWorkflow, updateContactProfile, lookupContactByEmail } from '@/lib/highlevel/client'
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

  // Fetch the lead (verify it belongs to this account)
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
    const stuckThreshold = 5 * 60 * 1000
    if (Date.now() - updatedAt < stuckThreshold) {
      return NextResponse.json({ error: 'Lead is already being enriched' }, { status: 409 })
    }
  }

  // Mark as enriching
  await supabase
    .from('leads')
    .update({ status: 'enriching', updated_at: new Date().toISOString() })
    .eq('id', leadId)

  try {
    // Fetch API keys for this account (ai_model, apollo, highlevel; also gemini for fallback)
    const { data: apiKeysData, error: keysError } = await supabase
      .from('api_keys')
      .select('service, key_value, extra_data')
      .eq('account_id', accountId)
      .in('service', ['ai_model', 'gemini', 'apollo', 'highlevel', 'lusha'])

    if (keysError) throw new Error(`Failed to fetch API keys: ${keysError.message}`)

    const keyMap = Object.fromEntries(
      (apiKeysData || []).map((k) => [k.service, k])
    )

    const apolloKey = keyMap['apollo']?.key_value
    const highlevelKey = keyMap['highlevel']?.key_value
    const highlevelLocationId = (keyMap['highlevel']?.extra_data as Record<string, string> | null)?.location_id || null
    const lushaKey = keyMap['lusha']?.key_value || undefined

    if (!apolloKey) throw new Error('Apollo API key not configured. Please add it in Settings.')

    // Build AIConfig — prefer 'ai_model' entry, fall back to legacy 'gemini' entry
    let aiConfig: AIConfig

    if (keyMap['ai_model']) {
      const entry = keyMap['ai_model']
      const extraData = (entry.extra_data || {}) as Record<string, string>
      const provider = (extraData.provider || 'gemini') as AIConfig['provider']
      const model = extraData.model || getDefaultModel(provider)

      aiConfig = {
        provider,
        model,
        apiKey: entry.key_value,
      }
    } else if (keyMap['gemini']) {
      // Backward-compatible fallback
      aiConfig = {
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        apiKey: keyMap['gemini'].key_value,
      }
    } else {
      throw new Error(
        'AI model API key not configured. Please add it in Settings.'
      )
    }

    // Fetch personas for this account, scoped to the lead's pipeline
    const { data: personas, error: personasError } = await supabase
      .from('personas')
      .select('*')
      .eq('account_id', accountId)
      .eq('pipeline', lead.pipeline || 'main')
      .order('created_at', { ascending: true })

    if (personasError) throw new Error(`Failed to fetch personas: ${personasError.message}`)

    // Run enrichment agent with the selected provider
    const result = await runEnrichmentAgent(
      aiConfig,
      apolloKey,
      {
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        rawData: lead.raw_data,
      },
      personas || [],
      lushaKey
    )

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

    // Extract enriched name/phone/email from Apollo or Lusha
    const ed = (result.enriched_data || {}) as Record<string, unknown>
    const org = ed.organization as Record<string, unknown> | undefined
    const enrichedFirstName = (ed.first_name as string | undefined) || undefined
    const enrichedLastName = (ed.last_name as string | undefined) || undefined
    const enrichedEmail = (ed.email as string | undefined) || undefined
    const enrichedPhone =
      (ed.lusha_phone_numbers as { number?: string }[] | undefined)?.[0]?.number ||
      (ed.phone_numbers as { sanitized_number?: string }[] | undefined)?.[0]?.sanitized_number ||
      undefined
    const enrichedCompany =
      (org?.name as string | undefined) ||
      (ed.lusha_company_name as string | undefined) ||
      undefined

    // Build lead update — always refresh enriched_data; also backfill
    // first_name/last_name/email/phone from Apollo if the lead arrived with blanks
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

    // Write enriched contact data back to HighLevel (name, email, phone, company)
    if (highlevelKey) {
      let contactId = lead.highlevel_contact_id

      // If no contact ID stored, look up by email in HL
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
      } else {
        console.warn('[HL] no HL contact found for lead', leadId, 'email:', lead.email)
      }
    }

    // Trigger Highlevel workflow only if a persona was matched or defaulted
    if (assignedPersonaId && finalStatus === 'assigned' && highlevelKey && lead.highlevel_contact_id) {
      const matchedPersona = (personas || []).find((p) => p.id === assignedPersonaId)
      if (matchedPersona?.highlevel_workflow_id) {
        const workflowResult = await assignWorkflow(
          highlevelKey,
          lead.highlevel_contact_id!,
          matchedPersona.highlevel_workflow_id
        )

        if (workflowResult.success) {
          await supabase
            .from('leads')
            .update({ workflow_triggered: true, updated_at: new Date().toISOString() })
            .eq('id', leadId)
        } else {
          console.error('Failed to trigger workflow:', workflowResult.error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      leadId,
      personaId: result.persona_id,
      status: finalStatus,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown enrichment error'
    console.error('Enrichment error:', errorMessage)

    await supabase
      .from('leads')
      .update({
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

function getDefaultModel(provider: AIConfig['provider']): string {
  switch (provider) {
    case 'gemini':
      return 'gemini-1.5-flash'
    case 'openai':
      return 'gpt-4o'
    case 'anthropic':
      return 'claude-sonnet-4-5'
    case 'openrouter':
      return 'openai/gpt-4o'
    default:
      return 'gemini-1.5-flash'
  }
}
