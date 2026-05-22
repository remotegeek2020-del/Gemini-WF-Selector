'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { AIProvider } from '@/types'

interface ApiKeyEntry {
  id: string
  service: string
  key_value: string
  extra_data: Record<string, unknown> | null
  updated_at: string
}

interface ServiceConfig {
  service: string
  label: string
  description: string
  placeholder: string
  fields?: { name: string; label: string; placeholder: string }[]
}

const PROVIDER_MODELS: Record<AIProvider, { value: string; label: string }[]> = {
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    { value: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
  ],
  openrouter: [
    { value: 'openai/gpt-4o', label: 'OpenAI GPT-4o' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'Anthropic Claude 3.5 Sonnet' },
    { value: 'google/gemini-flash-1.5', label: 'Google Gemini Flash 1.5' },
    { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Meta Llama 3.1 70B' },
  ],
}

const PROVIDER_OPTIONS: { value: AIProvider; label: string }[] = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'openrouter', label: 'OpenRouter' },
]

const PROVIDER_KEY_LABELS: Record<AIProvider, string> = {
  gemini: 'Gemini API Key',
  openai: 'OpenAI API Key',
  anthropic: 'Anthropic API Key',
  openrouter: 'OpenRouter API Key',
}

const SERVICE_CONFIGS: ServiceConfig[] = [
  {
    service: 'apollo',
    label: 'Apollo.io',
    description: 'Used to enrich leads with professional data. Find your key in Apollo Settings > Integrations.',
    placeholder: 'your-apollo-api-key',
  },
  {
    service: 'lusha',
    label: 'Lusha (Optional)',
    description: 'Secondary enrichment after Apollo. Lusha specializes in direct emails and phone numbers — especially useful when leads use alternate emails. Triggered automatically when configured.',
    placeholder: 'your-lusha-api-key',
  },
  {
    service: 'highlevel',
    label: 'Highlevel (GHL)',
    description: 'Used to trigger workflows for assigned leads. Use your Private Integration API Key.',
    placeholder: 'your-highlevel-api-key',
    fields: [{ name: 'location_id', label: 'Location ID', placeholder: 'your-location-id' }],
  },
]

export default function AccountSettingsPage({ params }: { params: { accountId: string } }) {
  const { accountId } = params
  const [existingKeys, setExistingKeys] = useState<ApiKeyEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingService, setSavingService] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [webhookSecret, setWebhookSecret] = useState<string>('')
  const [nurtureEnabled, setNurtureEnabled] = useState(false)
  const [togglingNurture, setTogglingNurture] = useState(false)
  const [personaGenAiEnabled, setPersonaGenAiEnabled] = useState(false)
  const [togglingPersonaGenAi, setTogglingPersonaGenAi] = useState(false)
  const [personaGenAiConfigured, setPersonaGenAiConfigured] = useState(false)
  const [hlFieldsConfigured, setHlFieldsConfigured] = useState(false)
  const [hlFieldsSetupLoading, setHlFieldsSetupLoading] = useState(false)
  const [hlFieldsCheckDone, setHlFieldsCheckDone] = useState(false)
  const [formValues, setFormValues] = useState<
    Record<string, { key_value: string; extra_data: Record<string, string> }>
  >({})

  // AI Model state
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini')
  const [aiModel, setAiModel] = useState<string>('gemini-1.5-flash')
  const [aiApiKey, setAiApiKey] = useState<string>('')

  useEffect(() => {
    setWebhookSecret(accountId.replace(/-/g, '').substring(0, 16))

    const fetchKeys = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/accounts/${accountId}/settings`)
        if (!res.ok) throw new Error('Failed to fetch settings')
        const data = await res.json()
        const keys: ApiKeyEntry[] = data.apiKeys || []
        setExistingKeys(keys)
        setNurtureEnabled(data.nurtureEnabled ?? false)
        setPersonaGenAiEnabled(data.personaGenAiEnabled ?? false)

        // Check if agency AI persona gen is globally configured
        fetch('/api/agency/persona-gen-ai?accountId=' + accountId)
          .then((r) => r.json())
          .then((d) => setPersonaGenAiConfigured(d.configured === true))
          .catch(() => {})

        // Check HL custom fields setup status
        fetch(`/api/accounts/${accountId}/highlevel/setup-fields`)
          .then((r) => r.json())
          .then((d) => { setHlFieldsConfigured(d.configured === true); setHlFieldsCheckDone(true) })
          .catch(() => setHlFieldsCheckDone(true))

        // Pre-populate AI model settings if they exist
        const aiModelEntry = keys.find((k) => k.service === 'ai_model')
        if (aiModelEntry?.extra_data) {
          const ed = aiModelEntry.extra_data as Record<string, string>
          if (ed.provider) setAiProvider(ed.provider as AIProvider)
          if (ed.model) setAiModel(ed.model)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }
    fetchKeys()
  }, [accountId])

  // When provider changes, reset model to first option
  const handleProviderChange = (provider: AIProvider) => {
    setAiProvider(provider)
    setAiModel(PROVIDER_MODELS[provider][0].value)
  }

  const getExistingKey = (service: string): ApiKeyEntry | undefined =>
    existingKeys.find((k) => k.service === service)

  const getFormValue = (service: string) =>
    formValues[service] || { key_value: '', extra_data: {} }

  const handleKeyChange = (service: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [service]: { ...getFormValue(service), key_value: value },
    }))
  }

  const handleExtraDataChange = (service: string, field: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [service]: {
        ...getFormValue(service),
        extra_data: { ...getFormValue(service).extra_data, [field]: value },
      },
    }))
  }

  const handleSaveAiModel = async () => {
    if (!aiApiKey.trim()) {
      setError('Please enter an API key for the selected AI provider')
      return
    }

    setSavingService('ai_model')
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/accounts/${accountId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'ai_model',
          key_value: aiApiKey.trim(),
          extra_data: { provider: aiProvider, model: aiModel },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSuccess('AI model settings saved successfully')
      setAiApiKey('')

      const refreshRes = await fetch(`/api/accounts/${accountId}/settings`)
      const refreshData = await refreshRes.json()
      setExistingKeys(refreshData.apiKeys || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save AI model settings')
    } finally {
      setSavingService(null)
    }
  }

  const handleSave = async (service: string) => {
    const { key_value, extra_data } = getFormValue(service)

    if (!key_value.trim()) {
      setError(`Please enter an API key for ${service}`)
      return
    }

    setSavingService(service)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/accounts/${accountId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service,
          key_value: key_value.trim(),
          extra_data: Object.keys(extra_data).length > 0 ? extra_data : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSuccess(`${service} API key saved successfully`)
      setFormValues((prev) => ({ ...prev, [service]: { key_value: '', extra_data: {} } }))

      const refreshRes = await fetch(`/api/accounts/${accountId}/settings`)
      const refreshData = await refreshRes.json()
      setExistingKeys(refreshData.apiKeys || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key')
    } finally {
      setSavingService(null)
    }
  }

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhook/${accountId}?secret=${webhookSecret}`
      : `https://your-app.com/api/webhook/${accountId}?secret=${webhookSecret}`

  const nurtureWebhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhook/${accountId}/nurture?secret=${webhookSecret}`
      : `https://your-app.com/api/webhook/${accountId}/nurture?secret=${webhookSecret}`

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl).catch(() => {})
  }

  const handleCopyNurtureWebhook = () => {
    navigator.clipboard.writeText(nurtureWebhookUrl).catch(() => {})
  }

  const handleToggleNurture = async (enabled: boolean) => {
    setTogglingNurture(true)
    setError(null)
    try {
      const res = await fetch(`/api/accounts/${accountId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nurture_enabled: enabled }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update')
      }
      setNurtureEnabled(enabled)
      setSuccess(`Nurture pipeline ${enabled ? 'enabled' : 'disabled'}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle nurture pipeline')
    } finally {
      setTogglingNurture(false)
    }
  }

  const handleTogglePersonaGenAi = async (enabled: boolean) => {
    setTogglingPersonaGenAi(true)
    setError(null)
    try {
      const res = await fetch(`/api/accounts/${accountId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_gen_ai_enabled: enabled }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update')
      }
      setPersonaGenAiEnabled(enabled)
      setSuccess(`AI Persona Generator ${enabled ? 'enabled' : 'disabled'} for this account`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle AI Persona Generator')
    } finally {
      setTogglingPersonaGenAi(false)
    }
  }

  const handleSetupHLFields = async () => {
    setHlFieldsSetupLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/accounts/${accountId}/highlevel/setup-fields`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Setup failed')
      setHlFieldsConfigured(true)
      setSuccess('HL custom fields created successfully. They will now be updated on every enriched lead.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up HL fields')
    } finally {
      setHlFieldsSetupLoading(false)
    }
  }

  const existingAiModel = getExistingKey('ai_model')

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure API keys and webhook for this account.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Webhook Endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-2">
            Configure this URL in Highlevel to receive lead webhooks for this account:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-xs text-gray-800 font-mono break-all">
              {webhookUrl}
            </code>
            <Button variant="secondary" size="sm" onClick={handleCopyWebhook}>
              Copy
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            The account ID acts as the secret. Keep this URL private.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Persona Generator</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Allow this account to generate persona content with AI</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={personaGenAiEnabled}
              disabled={togglingPersonaGenAi || !personaGenAiConfigured}
              onClick={() => handleTogglePersonaGenAi(!personaGenAiEnabled)}
              title={!personaGenAiConfigured ? 'Configure AI Persona Generator in Agency Settings first' : undefined}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 ${
                personaGenAiEnabled ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  personaGenAiEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {!personaGenAiConfigured ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              No AI model configured yet. Go to <strong>Agency Settings</strong> and set up the AI Persona Generator first.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              When enabled, users in this account see a <strong>Generate with AI</strong> button inside the persona form. They describe their target audience and the AI writes the description and characteristics automatically.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Nurture Pipeline</CardTitle>
            <button
              type="button"
              role="switch"
              aria-checked={nurtureEnabled}
              disabled={togglingNurture}
              onClick={() => handleToggleNurture(!nurtureEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                nurtureEnabled ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  nurtureEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">
            Enable a separate pipeline for cold and limbo leads. When enabled, a dedicated menu and webhook become active. Nurture leads have their own personas and workflow routing.
          </p>
          {nurtureEnabled && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Nurture webhook URL:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded text-xs text-indigo-800 font-mono break-all">
                  {nurtureWebhookUrl}
                </code>
                <Button variant="secondary" size="sm" onClick={handleCopyNurtureWebhook}>
                  Copy
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* HL Contact Write-back */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Highlevel Contact Write-back</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Auto-tag contacts, add AI notes, and fill custom fields on every enriched lead</p>
            </div>
            {hlFieldsCheckDone && (
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                hlFieldsConfigured
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {hlFieldsConfigured ? 'Fields configured' : 'Not set up'}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-600 space-y-1.5">
            <p className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Tags</strong> — persona name added as a tag automatically (no setup needed)</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Notes</strong> — AI reasoning posted as a contact note automatically (no setup needed)</span>
            </p>
            <p className="flex items-start gap-2">
              <span className={hlFieldsConfigured ? 'text-green-500 mt-0.5' : 'text-gray-400 mt-0.5'}>
                {hlFieldsConfigured ? '✓' : '○'}
              </span>
              <span>
                <strong>Custom Fields</strong> — creates <code className="text-xs bg-gray-100 px-1 rounded">Lead Router - Persona</code>,{' '}
                <code className="text-xs bg-gray-100 px-1 rounded">Lead Router - Score</code>, and{' '}
                <code className="text-xs bg-gray-100 px-1 rounded">Lead Router - Reasoning</code> fields in HL
              </span>
            </p>
          </div>
          {!hlFieldsConfigured && (
            <div className="pt-1">
              <Button
                size="sm"
                onClick={handleSetupHLFields}
                isLoading={hlFieldsSetupLoading}
                disabled={!getExistingKey('highlevel')}
              >
                Setup HL Custom Fields
              </Button>
              {!getExistingKey('highlevel') && (
                <p className="text-xs text-amber-600 mt-1">Save your Highlevel API key below first.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div className="space-y-4">
          {/* AI Model Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>AI Model</CardTitle>
                {existingAiModel && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Configured
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-500">
                Select the AI provider and model used for lead analysis and persona assignment.
              </p>

              {existingAiModel && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-gray-500">Current:</span>
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-700">
                    {String(existingAiModel.extra_data?.provider || 'gemini')} / {String(existingAiModel.extra_data?.model || 'gemini-1.5-flash')}
                  </code>
                  <span className="text-xs text-gray-400">
                    Updated {new Date(existingAiModel.updated_at).toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <select
                    value={aiProvider}
                    onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {PROVIDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
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
                    {PROVIDER_MODELS[aiProvider].map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label={existingAiModel ? `Update ${PROVIDER_KEY_LABELS[aiProvider]}` : PROVIDER_KEY_LABELS[aiProvider]}
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="Enter your API key"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleSaveAiModel}
                  isLoading={savingService === 'ai_model'}
                  size="sm"
                >
                  {existingAiModel ? 'Update AI Settings' : 'Save AI Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Apollo and Highlevel sections */}
          {SERVICE_CONFIGS.map((config) => {
            const existing = getExistingKey(config.service)
            const formVal = getFormValue(config.service)

            return (
              <Card key={config.service}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{config.label}</CardTitle>
                    {existing && (
                      <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Configured
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-500">{config.description}</p>

                  {existing && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Current key:</span>
                      <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-700">
                        {existing.key_value.substring(0, 8)}••••••••
                      </code>
                      <span className="text-xs text-gray-400">
                        Updated {new Date(existing.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {existing?.extra_data && (
                    <div className="text-sm">
                      <span className="text-gray-500">Extra data:</span>
                      {Object.entries(existing.extra_data).map(([k, v]) => (
                        <span key={k} className="ml-2 text-gray-700">
                          {k}: <code className="bg-gray-100 px-1 rounded text-xs">{String(v)}</code>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <Input
                      label={existing ? 'Update API Key' : 'API Key'}
                      type="password"
                      value={formVal.key_value}
                      onChange={(e) => handleKeyChange(config.service, e.target.value)}
                      placeholder={config.placeholder}
                    />

                    {config.fields?.map((field) => (
                      <Input
                        key={field.name}
                        label={field.label}
                        value={formVal.extra_data[field.name] || ''}
                        onChange={(e) =>
                          handleExtraDataChange(config.service, field.name, e.target.value)
                        }
                        placeholder={field.placeholder}
                      />
                    ))}
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      onClick={() => handleSave(config.service)}
                      isLoading={savingService === config.service}
                      size="sm"
                    >
                      {existing ? 'Update Key' : 'Save Key'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
