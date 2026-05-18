export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ personas: data })
}

export async function POST(request: NextRequest) {
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
    .insert({
      name,
      description,
      characteristics,
      sample_person: sample_person || null,
      highlevel_workflow_id: highlevel_workflow_id || null,
      highlevel_workflow_name: highlevel_workflow_name || null,
      color: color || '#6366f1',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ persona: data }, { status: 201 })
}
