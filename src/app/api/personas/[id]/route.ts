export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, description, characteristics, sample_person, highlevel_workflow_id, highlevel_workflow_name, color } = body

  if (!name || !description || !characteristics) {
    return NextResponse.json(
      { error: 'Name, description, and characteristics are required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('personas')
    .update({
      name,
      description,
      characteristics,
      sample_person: sample_person || null,
      highlevel_workflow_id: highlevel_workflow_id || null,
      highlevel_workflow_name: highlevel_workflow_name || null,
      color: color || '#6366f1',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ persona: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()

  // Check if any leads are assigned to this persona
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_persona_id', params.id)

  if (count && count > 0) {
    // Unassign leads from this persona before deleting
    await supabase
      .from('leads')
      .update({ assigned_persona_id: null, status: 'no_persona' })
      .eq('assigned_persona_id', params.id)
  }

  const { error } = await supabase.from('personas').delete().eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
