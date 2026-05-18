export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

async function checkAccess(supabase: ReturnType<typeof createServerClient>, accountId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401, user: null, role: null }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, account_id')
    .eq('user_id', user.id)
    .single()

  if (!roleData) return { error: 'Forbidden', status: 403, user: null, role: null }

  if (roleData.role === 'sub_account' && roleData.account_id !== accountId) {
    return { error: 'Forbidden', status: 403, user: null, role: null }
  }

  return { error: null, status: 200, user, role: roleData.role }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const supabase = createServerClient()
  const access = await checkAccess(supabase, params.accountId)
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status })

  const { data: account, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', params.accountId)
    .single()

  if (error || !account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  return NextResponse.json({ account })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const supabase = createServerClient()
  const access = await checkAccess(supabase, params.accountId)
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status })

  if (access.role !== 'agency_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, slug } = body
  const { data: account, error } = await supabase
    .from('accounts')
    .update({ name, slug, updated_at: new Date().toISOString() })
    .eq('id', params.accountId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ account })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const supabase = createServerClient()
  const access = await checkAccess(supabase, params.accountId)
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status })

  if (access.role !== 'agency_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', params.accountId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
