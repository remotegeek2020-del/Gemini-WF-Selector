'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

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

const SERVICE_CONFIGS: ServiceConfig[] = [
  {
    service: 'gemini',
    label: 'Google Gemini AI',
    description: 'Used for lead analysis and persona assignment.',
    placeholder: 'AIzaSy...',
  },
  {
    service: 'apollo',
    label: 'Apollo.io',
    description: 'Used to enrich leads with professional data.',
    placeholder: 'your-apollo-api-key',
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
  const [formValues, setFormValues] = useState<
    Record<string, { key_value: string; extra_data: Record<string, string> }>
  >({})

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
        setExistingKeys(data.apiKeys || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }
    fetchKeys()
  }, [accountId])

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
