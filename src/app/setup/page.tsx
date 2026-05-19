'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function SetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isVerifying, setIsVerifying] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setTokenError('This invite link is invalid or has expired.')
      setIsVerifying(false)
      return
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/agency/invites/verify?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (data.valid) {
          setEmail(data.email)
          setTokenValid(true)
        } else {
          setTokenError(data.error ?? 'This invite link is invalid or has expired.')
        }
      } catch {
        setTokenError('This invite link is invalid or has expired.')
      } finally {
        setIsVerifying(false)
      }
    }

    verify()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/agency/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create account')
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Lead Router</h1>
          <p className="text-sm text-gray-500 mt-1">Set up your account</p>
        </div>

        {isVerifying && (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {!isVerifying && tokenError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center">
            {tokenError}
          </div>
        )}

        {!isVerifying && tokenValid && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              readOnly
              className="bg-gray-50 text-gray-500 cursor-default"
            />

            <Input
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              autoFocus
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              autoComplete="new-password"
            />

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {formError}
              </div>
            )}

            <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
              Create Account
            </Button>
          </form>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 text-center">
            Account created! Redirecting to login...
          </div>
        )}
      </div>
    </div>
  )
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      }
    >
      <SetupForm />
    </Suspense>
  )
}
