export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { runEnrichmentAgent } from '@/lib/gemini/agent'
import { assignWorkflow } from '@/lib/highlevel/client'

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
    return NextResponse.json({ error: 'Lead is already being enriched' }, { status: 409 })
  }

  // Mark as enriching
  await supabase
    .from('leads')
    .update({ status: 'enriching', updated_at: new Date().toISOString() })
    .eq('id', leadId)

  try {
    // Fetch API keys for this account
    const { data: apiKeysData, error: keysError } = await supabase
      .from('api_keys')
      .select('service, key_value, extra_data')
      .eq('account_id', accountId)
      .in('service', ['gemini', 'apollo', 'highlevel'])

    if (keysError) throw new Error(`Failed to fetch API keys: ${keysError.message}`)

    const keyMap = Object.fromEntries(
      (apiKeysData || []).map((k) => [k.service, k])
    )

    const geminiKey = keyMap['gemini']?.key_value
    const apolloKey = keyMap['apollo']?.key_value
    const highlevelKey = keyMap['highlevel']?.key_value

    if (!geminiKey) throw new Error('Gemini API key not configured. Please add it in Settings.')
    if (!apolloKey) throw new Error('Apollo API key not configured. Please add it in Settings.')

    // Fetch personas for this account
    const { data: personas, error: personasError } = await supabase
      .from('personas')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true })

    if (personasError) throw new Error(`Failed to fetch personas: ${personasError.message}`)

    // Run Gemini enrichment agent
    const result = await runEnrichmentAgent(
      geminiKey,
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

    const finalStatus = result.persona_id ? 'assigned' : 'no_persona'

    await supabase
      .from('leads')
      .update({
        enriched_data: result.enriched_data,
        assigned_persona_id: result.persona_id,
        persona_reasoning: result.reasoning,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)

    // Trigger Highlevel workflow if persona assigned
    if (result.persona_id && highlevelKey && lead.highlevel_contact_id) {
      const matchedPersona = (personas || []).find((p) => p.id === result.persona_id)
      if (matchedPersona?.highlevel_workflow_id) {
        const workflowResult = await assignWorkflow(
          highlevelKey,
          lead.highlevel_contact_id,
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
