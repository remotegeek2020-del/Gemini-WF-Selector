export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

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

  const { libraryId, pipeline } = await request.json()
  if (!libraryId || !pipeline) {
    return NextResponse.json({ error: 'libraryId and pipeline are required' }, { status: 400 })
  }

  const { data: template, error: tErr } = await supabase
    .from('persona_library')
    .select('*')
    .eq('id', libraryId)
    .single()

  if (tErr || !template) {
    return NextResponse.json({ error: 'Library template not found' }, { status: 404 })
  }

  // Copy the template into the account's personas
  const { id: _id, created_at: _ca, updated_at: _ua, category: _cat, ...fields } = template
  const { data, error } = await supabase
    .from('personas')
    .insert({
      ...fields,
      account_id: params.accountId,
      pipeline,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ persona: data }, { status: 201 })
}
