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
    highlevel_workflow_id,
    highlevel_workflow_name,
    color,
  } = body

  const { data, error } = await supabase
    .from('personas')
    .update({
      name,
      description,
      characteristics,
      sample_person: sample_person || null,
      highlevel_workflow_id: highlevel_workflow_id || null,
      highlevel_workflow_name: highlevel_workflow_name || null,
      color,
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
