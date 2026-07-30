export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const email = searchParams.get('email')
  const redirect = searchParams.get('redirect')

  // Where to send the user after all this
  const destination = redirect || `${origin}/`

  if (!email) {
    console.error('[email-link] missing email param')
    return NextResponse.redirect(destination)
  }

  // If the user already has a valid session in this browser, go straight to the lead
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      console.log('[email-link] already logged in, redirecting to', destination)
      return NextResponse.redirect(destination)
    }
  } catch (err) {
    console.error('[email-link] session check error:', err)
  }

  // Build the redirectTo URL for Supabase: use /auth/callback so only one URL
  // needs to be in the Supabase allowlist. The lead path goes in ?next=
  const leadPath = redirect ? new URL(redirect).pathname + new URL(redirect).search : '/'
  const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(leadPath)}`

  const admin = createAdminClient()

  // Only generate a magic link for existing Lead Router users.
  // Non-users are sent to /login — we never create accounts via this route.
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: callbackUrl },
    })
    if (error) {
      // User not found in Supabase — not a Lead Router user
      console.warn('[email-link] magiclink failed (not a user?):', error.message)
    } else if (data?.properties?.action_link) {
      console.log('[email-link] magic link generated for', email)
      return NextResponse.redirect(data.properties.action_link)
    }
  } catch (err) {
    console.error('[email-link] magiclink exception:', err)
  }

  console.warn('[email-link] no account found for', email, '— redirecting to login')
  return NextResponse.redirect(`${origin}/login?error=no-account`)
}
