export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!roleData || roleData.role !== 'agency_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: userRoles, error } = await admin
    .from('user_roles')
    .select('user_id')
    .eq('role', 'agency_admin')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!userRoles || userRoles.length === 0) {
    return NextResponse.json({ users: [] })
  }
  const users = await Promise.all(
    userRoles.map(async ({ user_id }) => {
      const { data } = await admin.auth.admin.getUserById(user_id)
      if (!data.user) return null
      return {
        user_id,
        email: data.user.email ?? '',
        created_at: data.user.created_at,
        last_sign_in_at: data.user.last_sign_in_at ?? null,
      }
    })
  )

  return NextResponse.json({ users: users.filter(Boolean) })
}
