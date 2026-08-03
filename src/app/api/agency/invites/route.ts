export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import type { EmailConfig } from '@/lib/email'

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
  const now = new Date().toISOString()

  const { data: invites, error } = await admin
    .from('agency_invites')
    .select('id, email, created_at, expires_at, invited_by')
    .is('accepted_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Exclude invites for emails that already have an active user_roles entry
  const { data: existingRoles } = await admin
    .from('user_roles')
    .select('user_id')

  if (existingRoles && existingRoles.length > 0) {
    const activeUserIds = new Set(existingRoles.map((r: { user_id: string }) => r.user_id))

    // Get emails of active users
    const { data: { users: activeUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const activeEmails = new Set(
      activeUsers
        .filter((u) => activeUserIds.has(u.id))
        .map((u) => u.email?.toLowerCase())
        .filter(Boolean)
    )

    const filtered = (invites ?? []).filter(
      (inv: { email: string }) => !activeEmails.has(inv.email.toLowerCase())
    )
    return NextResponse.json({ invites: filtered })
  }

  return NextResponse.json({ invites: invites ?? [] })
}

export async function POST(request: NextRequest) {
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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email } = body
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const admin = createAdminClient()

  const { error: insertError } = await admin.from('agency_invites').insert({
    email,
    token,
    invited_by: user.id,
    expires_at: expiresAt,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { data: settingsRow } = await admin
    .from('agency_settings')
    .select('value')
    .eq('key', 'email_config')
    .single()

  if (!settingsRow?.value) {
    return NextResponse.json(
      { error: 'Email not configured. Set up email in Agency Settings first.' },
      { status: 422 }
    )
  }

  const emailConfig = settingsRow.value as EmailConfig

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${request.nextUrl.protocol}//${request.nextUrl.host}`
  const setupLink = `${appUrl}/setup?token=${token}`

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #111827;">
      <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">You've been invited to Lead Router</h1>
      <p style="font-size: 15px; color: #374151; margin-bottom: 32px;">
        You've been invited to join Lead Router as an agency admin. Click the button below to set up your account.
      </p>
      <a href="${setupLink}" style="display: inline-block; background: #4f46e5; color: #fff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
        Set up your account
      </a>
      <p style="margin-top: 32px; font-size: 13px; color: #6b7280;">
        This link expires in 7 days. If you did not expect this invitation, you can safely ignore this email.
      </p>
      <p style="margin-top: 8px; font-size: 12px; color: #9ca3af;">
        Or copy this link: ${setupLink}
      </p>
    </div>
  `

  const result = await sendEmail(emailConfig, {
    to: email,
    subject: "You've been invited to Lead Router",
    html,
    text: `You've been invited to Lead Router. Set up your account here: ${setupLink}\n\nThis link expires in 7 days.`,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Failed to send invite email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
