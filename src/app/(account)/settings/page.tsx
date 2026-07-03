'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { AIProvider, Pipeline } from '@/types'

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
    description: 'Used to enrich leads with professional data.',
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
    description: 'Used to trigger workflows for assigned leads.',
    placeholder: 'your-highlevel-api-key',
    fields: [{ name: 'location_id', label: 'Location ID', placeholder: 'your-location-id' }],
  },
]

export default function SubAccountSettingsPage() {
  const [accountId, setAccountId] = useState<string | null>(null)
  const [existingKeys, setExistingKeys] = useState<ApiKeyEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingService, setSavingService] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nurtureEnabled, setNurtureEnabled] = useState(false)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [formValues, setFormValues] = useState<
    Record<string, { key_value: string; extra_data: Record<string, string> }>
  >({})

  // AI Model state
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini')
  const [aiModel, setAiModel] = useState<string>('gemini-1.5-flash')
  const [aiApiKey, setAiApiKey] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('account_id')
        .eq('user_id', user.id)
        .single()
      if (roleData?.account_id) setAccountId(roleData.account_id)
    }
    init()
  }, [])

  useEffect(() => {
    if (!accountId) return
    const fetchKeys = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/accounts/${accountId}/settings`)
        if (!res.ok) throw new Error('Failed to fetch settings')
        const data = await res.json()
        const keys: ApiKeyEntry[] = data.apiKeys || []
        setExistingKeys(keys)
        setNurtureEnabled(data.nurtureEnabled ?? false)

        // Fetch pipelines
        fetch(`/api/accounts/${accountId}/pipelines`)
          .then((r) => r.json())
          .then((d) => setPipelines(d.pipelines || []))
          .catch(console.error)

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
    if (!accountId) return
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
    if (!accountId) return
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

  const existingAiModel = getExistingKey('ai_model')

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure API keys for your account.</p>
      </div>

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

          {/* Nurture pipeline info (read-only for sub-accounts) */}
          {nurtureEnabled && accountId && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Nurture Pipeline</CardTitle>
                  <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Enabled</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">
                  Nurture webhook URL — use this in Highlevel for cold or limbo lead automations:
                </p>
                <code className="block bg-indigo-50 border border-indigo-100 px-3 py-2 rounded text-xs text-indigo-800 font-mono break-all">
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}/api/webhook/${accountId}/nurture?secret=${accountId.replace(/-/g, '').substring(0, 16)}`
                    : ''}
                </code>
              </CardContent>
            </Card>
          )}

          {/* Webhook URLs */}
          {accountId && (
            <Card>
              <CardHeader>
                <CardTitle>Webhook URLs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-500">
                  Use these URLs in your ad platforms and CRM to send leads for enrichment. Each pipeline has its own URL so personas and routing stay separate.
                </p>
                <div className="space-y-2">
                  {/* Main pipeline always shown */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Main (LinkedIn / Default)</p>
                    <code className="block bg-gray-50 border border-gray-200 px-3 py-2 rounded text-xs text-gray-700 font-mono break-all">
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/${accountId}` : ''}
                    </code>
                  </div>
                  {/* Additional pipelines */}
                  {pipelines.filter((p) => p.slug !== 'main').map((p) => (
                    <div key={p.slug}>
                      <p className="text-xs font-medium text-gray-500 mb-1">{p.name}</p>
                      <code className="block bg-gray-50 border border-gray-200 px-3 py-2 rounded text-xs text-gray-700 font-mono break-all">
                        {typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/${accountId}/${p.slug}` : ''}
                      </code>
                    </div>
                  ))}
                  {pipelines.filter((p) => p.slug !== 'main').length === 0 && (
                    <p className="text-xs text-gray-400 italic">
                      Additional pipelines (Facebook, Google, etc.) will appear here once created by your agency.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
