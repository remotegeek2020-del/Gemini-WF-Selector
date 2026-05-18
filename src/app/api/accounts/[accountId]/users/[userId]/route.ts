export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { accountId: string; userId: string } }
) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!roleData || roleData.role !== 'agency_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify the user belongs to this account
  const { data: targetRole } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('user_id', params.userId)
    .eq('account_id', params.accountId)
    .eq('role', 'sub_account')
    .single()

  if (!targetRole) {
    return NextResponse.json({ error: 'User not found in this account' }, { status: 404 })
  }

  // Delete via admin API (cascades to user_roles via FK)
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(params.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
