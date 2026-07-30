'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const next = searchParams.get('next') || '/'
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function handleCallback() {
      // Parse the hash fragment — Supabase implicit flow puts tokens here
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (sessionError) {
          console.error('[callback] setSession error:', sessionError.message)
          setError(sessionError.message)
          return
        }
        // Clear the hash from the URL and navigate to destination
        router.replace(next)
        return
      }

      // No hash tokens — check if we already have a session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace(next)
        return
      }

      // Nothing worked — send to login
      console.error('[callback] no tokens in hash and no existing session')
      router.replace('/login')
    }

    handleCallback()
  }, [next, router])

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', gap: '12px' }}>
        <p style={{ color: '#e53e3e', fontSize: '1rem' }}>Sign-in failed: {error}</p>
        <a href="/login" style={{ color: '#3182ce', textDecoration: 'underline' }}>Go to login</a>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#666', fontSize: '1rem' }}>Signing you in…</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#666', fontSize: '1rem' }}>Loading…</p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
