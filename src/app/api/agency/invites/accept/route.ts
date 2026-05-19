export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { token, name, password } = body

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: invite, error: lookupError } = await admin
    .from('agency_invites')
    .select('id, email, accepted_at, expires_at')
    .eq('token', token)
    .single()

  if (lookupError || !invite) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 })
  }

  if (!invite.expires_at || new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 400 })
  }

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name.trim() },
  })

  if (createError || !newUser.user) {
    return NextResponse.json(
      { error: createError?.message ?? 'Failed to create user' },
      { status: 500 }
    )
  }

  const { error: roleError } = await admin.from('user_roles').insert({
    user_id: newUser.user.id,
    role: 'agency_admin',
    account_id: null,
  })

  if (roleError) {
    await admin.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: roleError.message }, { status: 500 })
  }

  const { error: acceptError } = await admin
    .from('agency_invites')
    .update({ accepted_at: now })
    .eq('token', token)

  if (acceptError) {
    return NextResponse.json({ error: acceptError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
