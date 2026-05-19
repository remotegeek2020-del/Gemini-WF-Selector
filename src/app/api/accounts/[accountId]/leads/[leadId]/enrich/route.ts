export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { runEnrichmentAgent } from '@/lib/ai/agent'
import { assignWorkflow } from '@/lib/highlevel/client'
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
      .in('service', ['ai_model', 'gemini', 'apollo', 'highlevel'])

    if (keysError) throw new Error(`Failed to fetch API keys: ${keysError.message}`)

    const keyMap = Object.fromEntries(
      (apiKeysData || []).map((k) => [k.service, k])
    )

    const apolloKey = keyMap['apollo']?.key_value
    const highlevelKey = keyMap['highlevel']?.key_value

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

    // Fetch personas for this account
    const { data: personas, error: personasError } = await supabase
      .from('personas')
      .select('*')
      .eq('account_id', accountId)
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
      personas || []
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

    await supabase
      .from('leads')
      .update({
        enriched_data: result.enriched_data,
        assigned_persona_id: assignedPersonaId,
        persona_reasoning: reasoning,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)

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
