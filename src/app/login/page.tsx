'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !data.user) {
        setError(authError?.message || 'Invalid email or password')
        return
      }

      // Fetch role to determine redirect
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, account_id')
        .eq('user_id', data.user.id)
        .single()

      if (!roleData) {
        setError('User role not configured. Please contact your administrator.')
        return
      }

      if (roleData.role === 'agency_admin') {
        router.push('/accounts')
      } else if (roleData.role === 'sub_account' && roleData.account_id) {
        router.push(`/accounts/${roleData.account_id}/dashboard`)
      } else {
        setError('Account not configured. Please contact your administrator.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Lead Router</h1>
          <p className="text-sm text-gray-500 mt-1">AI Enrichment & Routing</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  )
}
