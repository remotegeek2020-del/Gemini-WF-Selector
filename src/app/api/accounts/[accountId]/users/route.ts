export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { accountId: string } }
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

  // Get user_roles for this account
  const { data: userRoles, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('account_id', params.accountId)
    .eq('role', 'sub_account')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!userRoles || userRoles.length === 0) {
    return NextResponse.json({ users: [] })
  }

  // Get user details from admin client
  const adminClient = createAdminClient()
  const userIds = userRoles.map((r) => r.user_id)

  const users = await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await adminClient.auth.admin.getUserById(userId)
      if (!data.user) return null
      return {
        user_id: userId,
        email: data.user.email || '',
        created_at: data.user.created_at,
      }
    })
  )

  return NextResponse.json({ users: users.filter(Boolean) })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
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

  // Verify the account exists
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', params.accountId)
    .single()

  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  if (typeof password === 'string' && password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  // Create user via admin API
  const adminClient = createAdminClient()
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: email as string,
    password: password as string,
    email_confirm: true,
  })

  if (createError || !newUser.user) {
    return NextResponse.json(
      { error: createError?.message || 'Failed to create user' },
      { status: 500 }
    )
  }

  // Insert user role
  const { error: roleInsertError } = await supabase
    .from('user_roles')
    .insert({
      user_id: newUser.user.id,
      role: 'sub_account',
      account_id: params.accountId,
    })

  if (roleInsertError) {
    // Clean up the created user
    await adminClient.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: roleInsertError.message }, { status: 500 })
  }

  return NextResponse.json({
    user: {
      user_id: newUser.user.id,
      email: newUser.user.email,
      created_at: newUser.user.created_at,
    },
  }, { status: 201 })
}
