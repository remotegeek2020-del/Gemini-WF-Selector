export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const email = searchParams.get('email')
  const redirect = searchParams.get('redirect')

  const fallback = redirect || origin

  if (!email) {
    console.error('[email-link] missing email param')
    return NextResponse.redirect(fallback)
  }

  // If the user already has a valid session in this browser, skip magic link
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      console.log('[email-link] user already logged in, redirecting directly')
      return NextResponse.redirect(fallback)
    }
  } catch (err) {
    console.error('[email-link] session check error:', err)
  }

  const admin = createAdminClient()

  // Try magic link first — works for existing Supabase users
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: fallback },
    })

    if (error) {
      console.warn('[email-link] magiclink failed for', email, ':', error.message)
    } else if (data?.properties?.action_link) {
      console.log('[email-link] magic link generated for', email)
      return NextResponse.redirect(data.properties.action_link)
    }
  } catch (err) {
    console.error('[email-link] magiclink exception:', err)
  }

  // Fallback: user doesn't exist yet — generate a signup link (creates the account)
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      password: crypto.randomUUID(),
      options: { redirectTo: fallback },
    })

    if (error) {
      console.error('[email-link] signup link failed for', email, ':', error.message)
    } else if (data?.properties?.action_link) {
      console.log('[email-link] signup link generated for', email)
      return NextResponse.redirect(data.properties.action_link)
    }
  } catch (err) {
    console.error('[email-link] signup link exception:', err)
  }

  // Last resort: redirect to login page
  console.error('[email-link] all attempts failed for', email, '— redirecting to login')
  return NextResponse.redirect(`${origin}/login`)
}
