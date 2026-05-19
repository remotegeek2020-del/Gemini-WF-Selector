export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ valid: false, error: 'Token is required' })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: invite, error } = await admin
    .from('agency_invites')
    .select('email, accepted_at, expires_at')
    .eq('token', token)
    .single()

  if (error || !invite) {
    return NextResponse.json({ valid: false, error: 'Invalid invite token' })
  }

  if (invite.accepted_at) {
    return NextResponse.json({ valid: false, error: 'This invite has already been used' })
  }

  if (invite.expires_at < now) {
    return NextResponse.json({ valid: false, error: 'This invite has expired' })
  }

  return NextResponse.json({ valid: true, email: invite.email })
}
