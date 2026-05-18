import { createServerClient as createSSRServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createServerClient() {
  const cookieStore = cookies()

  return createSSRServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}

// Service role client for admin operations (user creation, etc.)
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createSSRServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      getAll() { return [] },
      setAll() {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
