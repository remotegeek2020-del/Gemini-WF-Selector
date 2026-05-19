import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow webhook endpoints without auth
  if (pathname.startsWith('/api/webhook/')) {
    return NextResponse.next()
  }

  // Allow login page
  if (pathname === '/login') {
    return NextResponse.next()
  }

  // Allow account setup via invite token (page + the two APIs it calls)
  if (
    pathname === '/setup' ||
    pathname === '/api/agency/invites/verify' ||
    pathname === '/api/agency/invites/accept'
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Fetch user role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, account_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role
  const accountId = roleData?.account_id

  // Root path → redirect based on role
  if (pathname === '/') {
    if (role === 'agency_admin') {
      return NextResponse.redirect(new URL('/accounts', request.url))
    }
    if (role === 'sub_account' && accountId) {
      return NextResponse.redirect(
        new URL(`/accounts/${accountId}/dashboard`, request.url)
      )
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Agency admin-only pages
  if (
    (pathname.startsWith('/agency-settings') || pathname.startsWith('/agency-users')) &&
    role !== 'agency_admin'
  ) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // sub_account restrictions: redirect /accounts (list) to their own account
  if (role === 'sub_account' && accountId) {
    if (pathname === '/accounts') {
      return NextResponse.redirect(
        new URL(`/accounts/${accountId}/dashboard`, request.url)
      )
    }
    // Block access to other accounts
    const accountMatch = pathname.match(/^\/accounts\/([^/]+)/)
    if (accountMatch && accountMatch[1] !== accountId) {
      return NextResponse.redirect(
        new URL(`/accounts/${accountId}/dashboard`, request.url)
      )
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
