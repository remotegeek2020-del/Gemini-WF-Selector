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

  const body = await request.json()
  const pipeline: string = body.pipeline
  // Support both single (libraryId) and bulk (libraryIds)
  const ids: string[] = body.libraryIds ?? (body.libraryId ? [body.libraryId] : [])

  if (!pipeline || ids.length === 0) {
    return NextResponse.json({ error: 'pipeline and libraryId(s) are required' }, { status: 400 })
  }

  const { data: templates, error: tErr } = await supabase
    .from('persona_library')
    .select('*')
    .in('id', ids)

  if (tErr || !templates?.length) {
    return NextResponse.json({ error: 'No library templates found' }, { status: 404 })
  }

  const rows = templates.map((template) => {
    const { id: _id, created_at: _ca, updated_at: _ua, category: _cat, ...fields } = template
    return { ...fields, account_id: params.accountId, pipeline }
  })

  const { data, error } = await supabase
    .from('personas')
    .insert(rows)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ personas: data, count: data?.length ?? 0 }, { status: 201 })
}
