export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
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

  const { data, error } = await supabase
    .from('leads')
    .select('*, personas(id, name, color)')
    .eq('id', leadId)
    .eq('account_id', accountId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  return NextResponse.json({ lead: data })
}

export async function DELETE(
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
  if (roleData.role === 'sub_account') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId)
    .eq('account_id', accountId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
