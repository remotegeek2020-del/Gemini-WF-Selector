export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { accountId: string; personaId: string } }
) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, account_id')
    .eq('user_id', user.id)
    .single()

  if (!roleData) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (roleData.role === 'sub_account' && roleData.account_id !== params.accountId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    name,
    description,
    characteristics,
    sample_person,
    state,
    county,
    // Structured Sample Person
    full_name,
    title_role,
    age,
    location,
    current_income,
    income_goal,
    background_story,
    core_frustration,
    // Structured Characteristics
    who_they_are,
    industry_experience,
    primary_frustration,
    what_they_want,
    decision_trigger,
    trust_barrier,
    engagement_style,
    best_contact_method,
    sells_into,
    highlevel_workflow_id,
    highlevel_workflow_name,
    highlevel_pipeline_id,
    highlevel_pipeline_name,
    highlevel_stage_id,
    highlevel_stage_name,
    color,
    is_default,
    notification_emails,
    opportunity_name_template,
    crm_actions,
  } = body

  const { data: existingPersona } = await supabase
    .from('personas')
    .select('pipeline')
    .eq('id', params.personaId)
    .eq('account_id', params.accountId)
    .single()

  if (is_default && existingPersona) {
    await supabase
      .from('personas')
      .update({ is_default: false })
      .eq('account_id', params.accountId)
      .eq('pipeline', existingPersona.pipeline)
      .eq('is_default', true)
      .neq('id', params.personaId)
  }

  const { data, error } = await supabase
    .from('personas')
    .update({
      name,
      description: description || '',
      characteristics: characteristics || '',
      sample_person: sample_person || null,
      state: state || null,
      county: county || null,
      full_name: full_name || null,
      title_role: title_role || null,
      age: age || null,
      location: location || null,
      current_income: current_income || null,
      income_goal: income_goal || null,
      background_story: background_story || null,
      core_frustration: core_frustration || null,
      who_they_are: who_they_are || null,
      industry_experience: industry_experience || null,
      primary_frustration: primary_frustration || null,
      what_they_want: what_they_want || null,
      decision_trigger: decision_trigger || null,
      trust_barrier: trust_barrier || null,
      engagement_style: engagement_style || null,
      best_contact_method: best_contact_method || null,
      sells_into: sells_into || null,
      highlevel_workflow_id: highlevel_workflow_id || null,
      highlevel_workflow_name: highlevel_workflow_name || null,
      highlevel_pipeline_id: highlevel_pipeline_id || null,
      highlevel_pipeline_name: highlevel_pipeline_name || null,
      highlevel_stage_id: highlevel_stage_id || null,
      highlevel_stage_name: highlevel_stage_name || null,
      color,
      is_default: is_default === true,
      notification_emails: Array.isArray(notification_emails) ? notification_emails : [],
      opportunity_name_template: (opportunity_name_template as string) || null,
      crm_actions: crm_actions || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.personaId)
    .eq('account_id', params.accountId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ persona: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { accountId: string; personaId: string } }
) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, account_id')
    .eq('user_id', user.id)
    .single()

  if (!roleData) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (roleData.role === 'sub_account' && roleData.account_id !== params.accountId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('personas')
    .delete()
    .eq('id', params.personaId)
    .eq('account_id', params.accountId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
