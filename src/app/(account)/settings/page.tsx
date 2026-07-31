'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import HotLeadCriteriaSection from '@/components/hot-lead-criteria-section'
import type { Pipeline } from '@/types'

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

export default function SubAccountSettingsPage() {
  const [accountId, setAccountId] = useState<string | null>(null)
  const [existingKeys, setExistingKeys] = useState<ApiKeyEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingService, setSavingService] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nurtureEnabled, setNurtureEnabled] = useState(false)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [isComplimentary, setIsComplimentary] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>(null)
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
        const keys: ApiKeyEntry[] = data.apiKeys || []
        setExistingKeys(keys)
        setNurtureEnabled(data.nurtureEnabled ?? false)
        setIsComplimentary(data.isComplimentary ?? false)
        setActivePreset((data.toolConfig as { bundle_preset?: string } | null)?.bundle_preset ?? null)

        fetch(`/api/accounts/${accountId}/pipelines`)
          .then((r) => r.json())
          .then((d) => setPipelines(d.pipelines || []))
          .catch(console.error)
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

      setSuccess(`${service} settings saved successfully`)
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
        <p className="text-sm text-gray-500 mt-1">Configure CRM integrations and webhook URLs for this account.</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>
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

          {/* Agency-managed notice */}
          <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
            <svg className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-indigo-800">AI &amp; Enrichment managed at agency level</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                AI model, persona assignment, and all enrichment tool API keys (Apollo, Lusha, PDL, etc.) are configured centrally in Agency Settings. They apply automatically to all sub-accounts.
              </p>
            </div>
          </div>

          {/* Account Type */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Account Type</CardTitle>
                {isComplimentary ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    Complimentary
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    Paying
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isComplimentary ? (
                <p className="text-sm text-gray-600">
                  Your agency covers all enrichment costs for this account. All tools and AI models run at no charge to you.
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  This is a paying account. Enrichment tools are enabled based on your active bundle. Contact your agency to upgrade or change your bundle.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Enrichment Bundles — Coming Soon */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Enrichment Bundle</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">Select a preset that matches your lead volume and budget</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide border border-gray-200">
                  Coming Soon
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500 mb-4">
                Bundle subscriptions are coming soon. Your agency currently manages tool access directly. The presets below show what each bundle includes.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'identity_only', name: 'Identity Only', desc: 'Apollo lookup + email verification. Minimum viable enrichment.', cost: '$0.04/lead', color: 'bg-gray-50 border-gray-200' },
                  { key: 'contact_builder', name: 'Contact Builder', desc: 'Identity + PDL profile depth + Enrow email. Best for outbound.', cost: '$0.08/lead', color: 'bg-blue-50 border-blue-200' },
                  { key: 'phone_focus', name: 'Phone Focus', desc: 'Identity + Lusha + PhantomBuster phone waterfall.', cost: '$0.12/lead', color: 'bg-violet-50 border-violet-200' },
                  { key: 'email_focus', name: 'Email Focus', desc: 'Identity + Hunter + Clearbit email + MillionVerifier.', cost: '$0.10/lead', color: 'bg-sky-50 border-sky-200' },
                  { key: 'eu_gdpr', name: 'EU / GDPR', desc: 'Skymem + Proxycurl only — GDPR-safe data sources.', cost: '$0.09/lead', color: 'bg-emerald-50 border-emerald-200' },
                  { key: 'full_waterfall', name: 'Full Waterfall', desc: 'All 12 tools in sequence. Maximum data coverage.', cost: '$0.18/lead', color: 'bg-indigo-50 border-indigo-200' },
                ].map((bundle) => (
                  <div
                    key={bundle.key}
                    className={`relative p-3 rounded-lg border-2 ${bundle.color} ${
                      activePreset === bundle.key ? 'ring-2 ring-indigo-400 ring-offset-1' : 'opacity-60'
                    }`}
                  >
                    {activePreset === bundle.key && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-600 text-white uppercase tracking-wide">
                        Active
                      </span>
                    )}
                    <p className="text-sm font-semibold text-gray-800">{bundle.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{bundle.desc}</p>
                    <p className="text-xs font-medium text-gray-700 mt-2">{bundle.cost}</p>
                    <button
                      disabled
                      className="mt-2 w-full text-xs font-medium py-1.5 rounded border border-gray-300 bg-white text-gray-400 cursor-not-allowed"
                    >
                      Subscribe — Coming Soon
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Nurture pipeline info */}
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
                  Nurture webhook URL — use this in GoHighLevel for cold or limbo lead automations:
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
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Main (LinkedIn / Default)</p>
                    <code className="block bg-gray-50 border border-gray-200 px-3 py-2 rounded text-xs text-gray-700 font-mono break-all">
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/${accountId}` : ''}
                    </code>
                  </div>
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
        </div>
      )}

      {/* Hot Lead Criteria */}
      {accountId && (
        <div className="mt-8">
          <HotLeadCriteriaSection accountId={accountId} />
        </div>
      )}
    </div>
  )
}
