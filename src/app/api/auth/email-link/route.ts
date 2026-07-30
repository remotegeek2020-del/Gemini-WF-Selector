export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const email = searchParams.get('email')
  const redirect = searchParams.get('redirect')

  // If no redirect destination, fall back to app root
  const fallback = redirect || origin

  if (!email) return NextResponse.redirect(fallback)

  // If the user already has a valid session, skip magic link and go straight to the lead
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return NextResponse.redirect(fallback)
  } catch {
    // session check failed — proceed to magic link
  }

  // Generate a fresh magic link for this recipient
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: fallback },
    })

    if (!error && data?.properties?.action_link) {
      return NextResponse.redirect(data.properties.action_link)
    }
  } catch {
    // magic link generation failed — fall through to login page
  }

  // Last resort: send them to the login page
  return NextResponse.redirect(`${origin}/login`)
}
