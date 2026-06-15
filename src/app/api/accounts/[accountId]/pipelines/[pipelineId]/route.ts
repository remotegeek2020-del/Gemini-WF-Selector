export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { accountId: string; pipelineId: string } }
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
  const name = (body.name as string || '').trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('pipelines')
    .update({ name })
    .eq('id', params.pipelineId)
    .eq('account_id', params.accountId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })

  return NextResponse.json({ pipeline: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { accountId: string; pipelineId: string } }
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

  // Prevent deleting 'main'
  const { data: pipeline } = await supabase
    .from('pipelines')
    .select('slug')
    .eq('id', params.pipelineId)
    .eq('account_id', params.accountId)
    .single()

  if (pipeline?.slug === 'main') {
    return NextResponse.json({ error: 'Cannot delete the main pipeline' }, { status: 400 })
  }

  const { error } = await supabase
    .from('pipelines')
    .delete()
    .eq('id', params.pipelineId)
    .eq('account_id', params.accountId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
