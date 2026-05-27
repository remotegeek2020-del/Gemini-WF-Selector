export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
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

  if (!roleData) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (roleData.role === 'sub_account' && roleData.account_id !== params.accountId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const pipeline = searchParams.get('pipeline')

  let query = supabase
    .from('personas')
    .select('*')
    .eq('account_id', params.accountId)
    .order('created_at', { ascending: true })

  if (pipeline === 'main' || pipeline === 'nurture') {
    query = query.eq('pipeline', pipeline)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ personas: data })
}

export async function POST(
  request: NextRequest,
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
    pipeline,
  } = body

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const resolvedPipeline = pipeline === 'nurture' ? 'nurture' : 'main'

  if (is_default) {
    await supabase
      .from('personas')
      .update({ is_default: false })
      .eq('account_id', params.accountId)
      .eq('pipeline', resolvedPipeline)
      .eq('is_default', true)
  }

  const { data, error } = await supabase
    .from('personas')
    .insert({
      account_id: params.accountId,
      name,
      description: description || null,
      characteristics: characteristics || null,
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
      color: color || '#6366f1',
      is_default: is_default === true,
      pipeline: resolvedPipeline,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ persona: data }, { status: 201 })
}
