'use client'

import { useState, useEffect } from 'react'
import AgencySidebar from '@/components/agency-sidebar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { EmailProvider } from '@/lib/email'

interface EmailConfig {
  provider: EmailProvider
  apiKey: string
  senderName: string
  senderEmail: string
}

export default function AgencySettingsPage() {
  const [provider, setProvider] = useState<EmailProvider>('postmark')
  const [apiKey, setApiKey] = useState('')
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [configured, setConfigured] = useState<EmailProvider | null>(null)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/agency/settings')
        if (res.status === 403) {
          setForbidden(true)
          return
        }
        if (!res.ok) throw new Error('Failed to load settings')
        const data = await res.json()
        const cfg = data.settings?.email_config as EmailConfig | undefined
        if (cfg) {
          setProvider(cfg.provider)
          setApiKey(cfg.apiKey)
          setSenderName(cfg.senderName)
          setSenderEmail(cfg.senderEmail)
          setConfigured(cfg.provider)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch('/api/agency/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_config: { provider, apiKey, senderName, senderEmail },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save settings')
      }
      setConfigured(provider)
      setSuccessMsg('Settings saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (forbidden) {
    return (
      <div className="flex min-h-screen">
        <AgencySidebar />
        <main className="flex-1 p-8 overflow-auto bg-gray-50">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            You do not have permission to access this page.
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <AgencySidebar />
      <main className="flex-1 p-8 overflow-auto bg-gray-50">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Agency Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure email and other agency-level settings.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <Card className="max-w-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Email Configuration</CardTitle>
                {configured && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Configured: {configured === 'postmark' ? 'Postmark' : 'SendGrid'}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="provider" className="text-sm font-medium text-gray-700">
                    Provider
                  </label>
                  <select
                    id="provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as EmailProvider)}
                    className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  >
                    <option value="postmark">Postmark</option>
                    <option value="sendgrid">SendGrid</option>
                  </select>
                </div>

                <Input
                  label="API Key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key"
                  required
                  autoComplete="off"
                />

                <Input
                  label="Sender Name"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Lead Router"
                  required
                />

                <Input
                  label="Sender Email"
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="no-reply@example.com"
                  required
                />

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    {successMsg}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button type="submit" isLoading={isSaving}>
                    Save Settings
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
