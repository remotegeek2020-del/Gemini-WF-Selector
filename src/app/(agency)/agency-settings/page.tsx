'use client'

import { useState, useEffect } from 'react'
import AgencySidebar from '@/components/agency-sidebar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { EmailProvider } from '@/lib/email'

type AiProvider = 'gemini' | 'openai' | 'anthropic' | 'openrouter'

interface EmailConfig {
  provider: EmailProvider
  apiKey: string
  senderName: string
  senderEmail: string
}

interface PersonaGenAI {
  provider: AiProvider
  model: string
  api_key: string
}

const AI_PROVIDER_OPTIONS: { value: AiProvider; label: string }[] = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'openrouter', label: 'OpenRouter' },
]

const AI_PROVIDER_MODELS: Record<AiProvider, { value: string; label: string }[]> = {
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ],
  openrouter: [
    { value: 'openai/gpt-4o', label: 'OpenAI GPT-4o' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5' },
  ],
}

const AI_PROVIDER_KEY_LABELS: Record<AiProvider, string> = {
  gemini: 'Gemini API Key',
  openai: 'OpenAI API Key',
  anthropic: 'Anthropic API Key',
  openrouter: 'OpenRouter API Key',
}

export default function AgencySettingsPage() {
  // Email config state
  const [provider, setProvider] = useState<EmailProvider>('postmark')
  const [apiKey, setApiKey] = useState('')
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [isSavingEmail, setIsSavingEmail] = useState(false)
  const [configuredEmail, setConfiguredEmail] = useState<EmailProvider | null>(null)

  // AI Persona Gen state
  const [aiProvider, setAiProvider] = useState<AiProvider>('gemini')
  const [aiModel, setAiModel] = useState('gemini-2.5-flash')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiConfigured, setAiConfigured] = useState(false)
  const [isSavingAi, setIsSavingAi] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
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

        const emailCfg = data.settings?.email_config as EmailConfig | undefined
        if (emailCfg) {
          setProvider(emailCfg.provider)
          setApiKey(emailCfg.apiKey)
          setSenderName(emailCfg.senderName)
          setSenderEmail(emailCfg.senderEmail)
          setConfiguredEmail(emailCfg.provider)
        }

        const aiCfg = data.settings?.persona_gen_ai as PersonaGenAI | undefined
        if (aiCfg) {
          setAiProvider(aiCfg.provider || 'gemini')
          setAiModel(aiCfg.model || 'gemini-2.5-flash')
          setAiConfigured(!!aiCfg.api_key)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleAiProviderChange = (p: AiProvider) => {
    setAiProvider(p)
    setAiModel(AI_PROVIDER_MODELS[p][0].value)
  }

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingEmail(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch('/api/agency/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_config: { provider, apiKey, senderName, senderEmail } }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      setConfiguredEmail(provider)
      setSuccessMsg('Email settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSavingEmail(false)
    }
  }

  const handleSaveAi = async () => {
    if (!aiApiKey.trim() && !aiConfigured) {
      setError('Please enter an API key for the selected AI provider')
      return
    }
    setIsSavingAi(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const payload: Record<string, unknown> = {
        provider: aiProvider,
        model: aiModel,
      }
      if (aiApiKey.trim()) payload.api_key = aiApiKey.trim()

      const res = await fetch('/api/agency/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_gen_ai: payload }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      setAiConfigured(true)
      setAiApiKey('')
      setSuccessMsg('AI Persona Generator settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save AI settings')
    } finally {
      setIsSavingAi(false)
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
          <p className="text-sm text-gray-500 mt-1">Configure agency-level features and integrations.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <div className="max-w-xl space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}
            {successMsg && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{successMsg}</div>
            )}

            {/* AI Persona Generator */}
            <Card>
              <CardHeader>
                <CardTitle>AI Persona Generator</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure the AI model used for persona generation. Enable per-account access inside each account&apos;s Settings page.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">
                  Set up the AI provider and API key here. Then go to each account&apos;s Settings to turn the feature on or off for that specific account — giving you full control over who gets access.
                </p>

                {aiConfigured && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Current:</span>
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-700">
                      {aiProvider} / {aiModel}
                    </code>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Configured
                    </span>
                  </div>
                )}

                <div className="space-y-3 pt-1 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AI Provider</label>
                    <select
                      value={aiProvider}
                      onChange={(e) => handleAiProviderChange(e.target.value as AiProvider)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {AI_PROVIDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <select
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {AI_PROVIDER_MODELS[aiProvider].map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label={aiConfigured ? `Update ${AI_PROVIDER_KEY_LABELS[aiProvider]}` : AI_PROVIDER_KEY_LABELS[aiProvider]}
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder={aiConfigured ? 'Leave blank to keep existing key' : 'Enter API key'}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveAi} isLoading={isSavingAi} size="sm">
                    {aiConfigured ? 'Update Configuration' : 'Save Configuration'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Email Configuration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Email Configuration</CardTitle>
                  {configuredEmail && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Configured: {configuredEmail === 'postmark' ? 'Postmark' : 'SendGrid'}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveEmail} className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="provider" className="text-sm font-medium text-gray-700">Provider</label>
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
                  <div className="flex justify-end pt-2">
                    <Button type="submit" isLoading={isSavingEmail}>Save Settings</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
