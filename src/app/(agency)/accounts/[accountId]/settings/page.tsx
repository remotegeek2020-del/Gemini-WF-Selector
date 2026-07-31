'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import HotLeadCriteriaSection from '@/components/hot-lead-criteria-section'

interface ApiKeyEntry {
  id: string
  service: string
  key_value: string
  extra_data: Record<string, unknown> | null
  updated_at: string
}

interface CrmConfig {
  service: string
  label: string
  isPrimary?: boolean
  description: string
  placeholder: string
  fields?: { name: string; label: string; placeholder: string }[]
}

const CRM_CONFIGS: CrmConfig[] = [
  {
    service: 'highlevel',
    label: 'GoHighLevel',
    isPrimary: true,
    description: 'Primary CRM — triggers workflows, updates contact profiles, and writes persona data to custom fields after each lead is enriched.',
    placeholder: 'your-highlevel-private-integrations-key',
    fields: [
      { name: 'location_id', label: 'Location ID', placeholder: 'your-location-id' },
    ],
  },
  {
    service: 'hubspot',
    label: 'HubSpot',
    description: 'Sync enriched contact data and persona assignments to HubSpot CRM. Coming soon — API key stored for future push integration.',
    placeholder: 'your-hubspot-private-app-token',
  },
  {
    service: 'zoho',
    label: 'Zoho CRM',
    description: 'Push enriched contacts and persona tags to Zoho CRM. Coming soon — API key stored for future push integration.',
    placeholder: 'your-zoho-oauth-token',
    fields: [
      { name: 'org_id', label: 'Organization ID (optional)', placeholder: 'your-zoho-org-id' },
    ],
  },
  {
    service: 'pipedrive',
    label: 'Pipedrive',
    description: 'Create or update persons in Pipedrive with enriched data and persona labels. Coming soon — API key stored for future push integration.',
    placeholder: 'your-pipedrive-api-token',
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

  const [pipelinesList, setPipelinesList] = useState<{ id: string; name: string; slug: string; notification_emails: string[] }[]>([])
  const [newPipelineName, setNewPipelineName] = useState('')
  const [addingPipeline, setAddingPipeline] = useState(false)
  const [renamingPipelineId, setRenamingPipelineId] = useState<string | null>(null)
  const [renamePipelineValue, setRenamePipelineValue] = useState('')
  const [pipelineEmailInputs, setPipelineEmailInputs] = useState<Record<string, string>>({})

  const [postmarkKey, setPostmarkKey] = useState('')
  const [postmarkFrom, setPostmarkFrom] = useState('')
  const [postmarkFromName, setPostmarkFromName] = useState('')
  const [savingPostmark, setSavingPostmark] = useState(false)
  const [globalEmails, setGlobalEmails] = useState<string[]>([])
  const [globalEmailInput, setGlobalEmailInput] = useState('')
  const [savingGlobalEmails, setSavingGlobalEmails] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testEmailResult, setTestEmailResult] = useState<{ ok: boolean; message: string } | null>(null)

  const [personasList, setPersonasList] = useState<{ id: string; name: string; notification_emails: string[] }[]>([])
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<Set<string>>(new Set())
  const [bulkEmailInput, setBulkEmailInput] = useState('')
  const [bulkEmails, setBulkEmails] = useState<string[]>([])
  const [applyingBulk, setApplyingBulk] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ ok: boolean; message: string } | null>(null)

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
        setGlobalEmails(data.notificationEmails ?? [])

        const postmarkEntry = keys.find((k) => k.service === 'postmark')
        if (postmarkEntry) {
          setPostmarkKey(postmarkEntry.key_value || '')
          setPostmarkFrom((postmarkEntry.extra_data as Record<string, string> | null)?.from_email || '')
          setPostmarkFromName((postmarkEntry.extra_data as Record<string, string> | null)?.from_name || '')
        }

        fetch(`/api/accounts/${accountId}/pipelines`)
          .then((r) => r.json())
          .then((d) => setPipelinesList(d.pipelines || []))
          .catch(() => {})

        fetch(`/api/accounts/${accountId}/personas`)
          .then((r) => r.json())
          .then((d) => setPersonasList(d.personas || []))
          .catch(() => {})

        fetch('/api/agency/persona-gen-ai?accountId=' + accountId)
          .then((r) => r.json())
          .then((d) => setPersonaGenAiConfigured(d.configured === true))
          .catch(() => {})

        fetch(`/api/accounts/${accountId}/highlevel/setup-fields`)
          .then((r) => r.json())
          .then((d) => { setHlFieldsConfigured(d.configured === true); setHlFieldsCheckDone(true) })
          .catch(() => setHlFieldsCheckDone(true))
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

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure CRM integrations, pipelines, and email notifications for this account.
        </p>
      </div>

      {/* Agency-managed notice */}
      <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-lg mb-6">
        <svg className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-indigo-800">Enrichment API keys managed at agency level</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            API keys for all enrichment tools are set in Agency Settings and apply automatically. Use the 3-dot menu on the Accounts list to configure which enrichment tools are active for this account.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>
      )}

      {/* Webhook URLs */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Webhook URLs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Paste each URL into the corresponding ad platform or CRM. Each channel has its own personas and lead routing.
          </p>
          <div className="space-y-2">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">LinkedIn / Default (Main)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2 rounded text-xs text-gray-800 font-mono break-all">
                  {webhookUrl}
                </code>
                <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(webhookUrl).catch(() => {})}>Copy</Button>
              </div>
            </div>

            {pipelinesList.filter((p) => p.slug !== 'main').map((p) => (
              <div key={p.slug}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{p.name}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2 rounded text-xs text-gray-800 font-mono break-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/${accountId}/${p.slug}` : ''}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhook/${accountId}/${p.slug}`).catch(() => {})}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            ))}

            {nurtureEnabled && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nurture (Cold / Limbo Leads)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded text-xs text-indigo-800 font-mono break-all">
                    {nurtureWebhookUrl}
                  </code>
                  <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(nurtureWebhookUrl).catch(() => {})}>Copy</Button>
                </div>
              </div>
            )}

            {pipelinesList.filter((p) => p.slug !== 'main').length === 0 && (
              <p className="text-xs text-gray-400 italic">
                Add pipelines below to get their webhook URLs here.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Persona Generator toggle */}
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
              When enabled, users in this account see a <strong>Generate with AI</strong> button inside the persona form.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Nurture Pipeline toggle */}
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
          <p className="text-sm text-gray-600">
            Enable a separate pipeline for cold and limbo leads. A dedicated webhook appears in the Webhook URLs section above.
          </p>
        </CardContent>
      </Card>

      {/* Pipelines */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Pipelines</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">Manage lead routing pipelines. Each pipeline has its own personas and webhook URL.</p>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                {pipelinesList.map((pl) => (
                  <div key={pl.id} className="px-4 py-3 bg-white space-y-3">
                    {renamingPipelineId === pl.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={renamePipelineValue}
                          onChange={(e) => setRenamePipelineValue(e.target.value)}
                          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            if (!renamePipelineValue.trim()) return
                            await fetch(`/api/accounts/${accountId}/pipelines/${pl.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name: renamePipelineValue.trim() }),
                            })
                            setPipelinesList((prev) => prev.map((p) => p.id === pl.id ? { ...p, name: renamePipelineValue.trim() } : p))
                            setRenamingPipelineId(null)
                          }}
                          className="text-xs text-indigo-600 font-medium hover:underline"
                        >Save</button>
                        <button onClick={() => setRenamingPipelineId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{pl.name}</p>
                          <p className="text-xs text-gray-400 font-mono">slug: {pl.slug}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => { setRenamingPipelineId(pl.id); setRenamePipelineValue(pl.name) }} className="text-xs text-indigo-600 hover:underline">Rename</button>
                          {pl.slug !== 'main' && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Delete pipeline "${pl.name}"? This cannot be undone.`)) return
                                await fetch(`/api/accounts/${accountId}/pipelines/${pl.id}`, { method: 'DELETE' })
                                setPipelinesList((prev) => prev.filter((p) => p.id !== pl.id))
                              }}
                              className="text-xs text-red-500 hover:underline"
                            >Delete</button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notification Emails</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(pl.notification_emails || []).map((email) => (
                          <span key={email} className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                            {email}
                            <button
                              onClick={async () => {
                                const updated = (pl.notification_emails || []).filter((e) => e !== email)
                                await fetch(`/api/accounts/${accountId}/pipelines/${pl.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ notification_emails: updated }),
                                })
                                setPipelinesList((prev) => prev.map((p) => p.id === pl.id ? { ...p, notification_emails: updated } : p))
                              }}
                              className="text-indigo-400 hover:text-red-500 ml-0.5"
                            >×</button>
                          </span>
                        ))}
                        {(pl.notification_emails || []).length === 0 && (
                          <p className="text-xs text-gray-400 italic">No emails yet</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={pipelineEmailInputs[pl.id] || ''}
                          onChange={(e) => setPipelineEmailInputs((prev) => ({ ...prev, [pl.id]: e.target.value }))}
                          placeholder="email@example.com"
                          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          onKeyDown={async (e) => {
                            const val = pipelineEmailInputs[pl.id] || ''
                            if (e.key === 'Enter' && val.trim()) {
                              const updated = [...(pl.notification_emails || []), val.trim()]
                              await fetch(`/api/accounts/${accountId}/pipelines/${pl.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ notification_emails: updated }),
                              })
                              setPipelinesList((prev) => prev.map((p) => p.id === pl.id ? { ...p, notification_emails: updated } : p))
                              setPipelineEmailInputs((prev) => ({ ...prev, [pl.id]: '' }))
                            }
                          }}
                        />
                        <button
                          onClick={async () => {
                            const val = pipelineEmailInputs[pl.id] || ''
                            if (!val.trim()) return
                            const updated = [...(pl.notification_emails || []), val.trim()]
                            await fetch(`/api/accounts/${accountId}/pipelines/${pl.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ notification_emails: updated }),
                            })
                            setPipelinesList((prev) => prev.map((p) => p.id === pl.id ? { ...p, notification_emails: updated } : p))
                            setPipelineEmailInputs((prev) => ({ ...prev, [pl.id]: '' }))
                          }}
                          className="text-xs text-indigo-600 font-medium border border-indigo-300 rounded px-3 py-1 hover:bg-indigo-50"
                        >Add</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  placeholder="New pipeline name…"
                  className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button
                  size="sm"
                  isLoading={addingPipeline}
                  onClick={async () => {
                    if (!newPipelineName.trim()) return
                    setAddingPipeline(true)
                    try {
                      const res = await fetch(`/api/accounts/${accountId}/pipelines`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newPipelineName.trim() }),
                      })
                      const d = await res.json()
                      if (d.pipeline) { setPipelinesList((prev) => [...prev, d.pipeline]); setNewPipelineName('') }
                      else setError(d.error || 'Failed to create pipeline')
                    } finally {
                      setAddingPipeline(false)
                    }
                  }}
                >
                  Add Pipeline
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Email Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Postmark Settings</p>
            <p className="text-xs text-gray-500">Used to send email alerts when leads are enriched and assigned.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                <input
                  type="password"
                  value={postmarkKey}
                  onChange={(e) => setPostmarkKey(e.target.value)}
                  placeholder="Postmark server API key"
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sender Name</label>
                <input
                  type="text"
                  value={postmarkFromName}
                  onChange={(e) => setPostmarkFromName(e.target.value)}
                  placeholder="e.g. Lead Router"
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">From Email</label>
                <input
                  type="email"
                  value={postmarkFrom}
                  onChange={(e) => setPostmarkFrom(e.target.value)}
                  placeholder="notifications@yourdomain.com"
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {postmarkFromName && postmarkFrom && (
                  <p className="text-xs text-gray-400 mt-1">Emails will show from: <strong>{postmarkFromName} &lt;{postmarkFrom}&gt;</strong></p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              isLoading={savingPostmark}
              onClick={async () => {
                setSavingPostmark(true)
                try {
                  await fetch(`/api/accounts/${accountId}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ service: 'postmark', key_value: postmarkKey, extra_data: { from_email: postmarkFrom, from_name: postmarkFromName } }),
                  })
                  setSuccess('Postmark settings saved')
                } finally {
                  setSavingPostmark(false)
                }
              }}
            >
              Save Postmark Settings
            </Button>
          </div>

          <div className="space-y-2 border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700">Global Notification Emails</p>
            <p className="text-xs text-gray-500">These addresses receive an email on every enriched lead, regardless of persona.</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={globalEmailInput}
                onChange={(e) => setGlobalEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    const em = globalEmailInput.trim()
                    if (em && !globalEmails.includes(em)) setGlobalEmails((prev) => [...prev, em])
                    setGlobalEmailInput('')
                  }
                }}
                placeholder="email@example.com"
                className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  const em = globalEmailInput.trim()
                  if (em && !globalEmails.includes(em)) setGlobalEmails((prev) => [...prev, em])
                  setGlobalEmailInput('')
                }}
                className="px-3 py-2 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100"
              >Add</button>
            </div>
            {globalEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {globalEmails.map((em) => (
                  <span key={em} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                    {em}
                    <button type="button" onClick={() => setGlobalEmails((prev) => prev.filter((e) => e !== em))} className="text-gray-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
            <Button
              size="sm"
              isLoading={savingGlobalEmails}
              onClick={async () => {
                setSavingGlobalEmails(true)
                try {
                  await fetch(`/api/accounts/${accountId}/settings`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notification_emails: globalEmails }),
                  })
                  setSuccess('Notification emails saved')
                } finally {
                  setSavingGlobalEmails(false)
                }
              }}
            >
              Save Notification Emails
            </Button>
            <Button
              size="sm"
              variant="secondary"
              isLoading={testingEmail}
              onClick={async () => {
                setTestingEmail(true)
                setTestEmailResult(null)
                try {
                  const res = await fetch(`/api/accounts/${accountId}/settings/test-email`, { method: 'POST' })
                  const data = await res.json()
                  if (res.ok) {
                    setTestEmailResult({ ok: true, message: data.message })
                  } else {
                    const detail = data.details ? JSON.stringify(data.details) : ''
                    setTestEmailResult({ ok: false, message: `${data.error}${detail ? ` — ${detail}` : ''}` })
                  }
                } catch (e) {
                  setTestEmailResult({ ok: false, message: e instanceof Error ? e.message : 'Request failed' })
                } finally {
                  setTestingEmail(false)
                }
              }}
            >
              Send Test Email
            </Button>
            {testEmailResult && (
              <p className={`text-xs mt-1 ${testEmailResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                {testEmailResult.message}
              </p>
            )}
          </div>

          {personasList.length > 0 && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700">Bulk Persona Notification Emails</p>
              <p className="text-xs text-gray-500">Select personas and add emails to all of them at once.</p>
              <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-56 overflow-y-auto">
                <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={selectedPersonaIds.size === personasList.length && personasList.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedPersonaIds(new Set(personasList.map((p) => p.id)))
                      else setSelectedPersonaIds(new Set())
                    }}
                    className="rounded"
                  />
                  <span className="text-xs font-semibold text-gray-600">Select All ({personasList.length})</span>
                </label>
                {personasList.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedPersonaIds.has(p.id)}
                      onChange={(e) => {
                        setSelectedPersonaIds((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(p.id)
                          else next.delete(p.id)
                          return next
                        })
                      }}
                      className="rounded"
                    />
                    <span className="text-xs text-gray-700 flex-1">{p.name}</span>
                    {p.notification_emails?.length > 0 && (
                      <span className="text-xs text-indigo-500">{p.notification_emails.length} email{p.notification_emails.length > 1 ? 's' : ''}</span>
                    )}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={bulkEmailInput}
                  onChange={(e) => setBulkEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      const em = bulkEmailInput.trim()
                      if (em && !bulkEmails.includes(em)) setBulkEmails((prev) => [...prev, em])
                      setBulkEmailInput('')
                    }
                  }}
                  placeholder="email@example.com"
                  className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="button" onClick={() => {
                  const em = bulkEmailInput.trim()
                  if (em && !bulkEmails.includes(em)) setBulkEmails((prev) => [...prev, em])
                  setBulkEmailInput('')
                }} className="px-3 py-2 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100">Add</button>
              </div>
              {bulkEmails.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {bulkEmails.map((em) => (
                    <span key={em} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {em}
                      <button type="button" onClick={() => setBulkEmails((prev) => prev.filter((e) => e !== em))} className="text-gray-400 hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
              )}
              <Button
                size="sm"
                isLoading={applyingBulk}
                disabled={selectedPersonaIds.size === 0 || bulkEmails.length === 0}
                onClick={async () => {
                  setApplyingBulk(true)
                  setBulkResult(null)
                  try {
                    const selected = personasList.filter((p) => selectedPersonaIds.has(p.id))
                    await Promise.all(selected.map((p) => {
                      const merged = Array.from(new Set([...(p.notification_emails || []), ...bulkEmails]))
                      return fetch(`/api/accounts/${accountId}/personas/${p.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...p, notification_emails: merged }),
                      })
                    }))
                    const refreshed = await fetch(`/api/accounts/${accountId}/personas`).then((r) => r.json())
                    setPersonasList(refreshed.personas || [])
                    setSelectedPersonaIds(new Set())
                    setBulkEmails([])
                    setBulkResult({ ok: true, message: `Emails added to ${selected.length} persona${selected.length > 1 ? 's' : ''}` })
                  } catch (e) {
                    setBulkResult({ ok: false, message: e instanceof Error ? e.message : 'Failed' })
                  } finally {
                    setApplyingBulk(false)
                  }
                }}
              >
                Apply to {selectedPersonaIds.size > 0 ? `${selectedPersonaIds.size} Selected` : 'Selected'} Persona{selectedPersonaIds.size !== 1 ? 's' : ''}
              </Button>
              {bulkResult && (
                <p className={`text-xs ${bulkResult.ok ? 'text-green-600' : 'text-red-600'}`}>{bulkResult.message}</p>
              )}
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
                hlFieldsConfigured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
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
              <span><strong>Tags</strong> — persona name added as a tag automatically</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Notes</strong> — AI reasoning posted as a contact note automatically</span>
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
                <p className="text-xs text-amber-600 mt-1">Save your GoHighLevel API key in CRM Integrations below first.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CRM Integrations */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">CRM Integrations</h2>
        <div className="space-y-4">
          {CRM_CONFIGS.map((config) => {
            const existing = getExistingKey(config.service)
            const formVal = getFormValue(config.service)

            return (
              <Card key={config.service}>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CardTitle>{config.label}</CardTitle>
                      {config.isPrimary && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white uppercase tracking-wide">
                          Primary
                        </span>
                      )}
                    </div>
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
                  {existing?.extra_data && Object.keys(existing.extra_data).length > 0 && (
                    <div className="text-sm flex flex-wrap gap-2">
                      {Object.entries(existing.extra_data).map(([k, v]) => (
                        <span key={k} className="text-gray-500">
                          {k}: <code className="bg-gray-100 px-1 rounded text-xs text-gray-700">{String(v)}</code>
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
                        onChange={(e) => handleExtraDataChange(config.service, field.name, e.target.value)}
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
      </div>

      {/* Hot Lead Criteria */}
      <div className="mt-8">
        <HotLeadCriteriaSection accountId={accountId} />
      </div>
    </div>
  )
}
