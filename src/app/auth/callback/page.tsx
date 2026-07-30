'use client'
import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const next = searchParams.get('next') || '/'

  useEffect(() => {
    const supabase = createClient()

    // Check if we already have a session (hash was already processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(next)
      }
    })

    // Listen for the SIGNED_IN event triggered when Supabase JS processes the hash token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace(next)
      }
    })

    return () => subscription.unsubscribe()
  }, [next, router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#666', fontSize: '1rem' }}>Signing you in…</p>
    </div>
  )
}
