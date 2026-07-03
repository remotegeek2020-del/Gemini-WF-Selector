'use client'

import { useState, useEffect, useRef } from 'react'
import AgencySidebar from '@/components/agency-sidebar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { EmailProvider } from '@/lib/email'
import type { PersonaLibraryEntry } from '@/types'

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

  // Persona Library state
  const [libraryEntries, setLibraryEntries] = useState<PersonaLibraryEntry[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryCatFilter, setLibraryCatFilter] = useState('all')
  const [libraryFormOpen, setLibraryFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PersonaLibraryEntry | null>(null)
  const [libraryError, setLibraryError] = useState<string | null>(null)
  const [librarySaving, setLibrarySaving] = useState(false)
  const [deletingLibraryId, setDeletingLibraryId] = useState<string | null>(null)

  // Library form fields
  const [libName, setLibName] = useState('')
  const [libCategory, setLibCategory] = useState('general')
  const [libColor, setLibColor] = useState('#6366f1')
  const [libDescription, setLibDescription] = useState('')
  const [libTitleRole, setLibTitleRole] = useState('')
  const [libWhoTheyAre, setLibWhoTheyAre] = useState('')
  const [libIndustryExp, setLibIndustryExp] = useState('')
  const [libPrimaryFrustration, setLibPrimaryFrustration] = useState('')
  const [libWhatTheyWant, setLibWhatTheyWant] = useState('')
  const [libDecisionTrigger, setLibDecisionTrigger] = useState('')
  const [libTrustBarrier, setLibTrustBarrier] = useState('')
  const [libEngagementStyle, setLibEngagementStyle] = useState('')
  const [libBestContact, setLibBestContact] = useState('')
  const [libSellsInto, setLibSellsInto] = useState('')
  const [libCoreFrustration, setLibCoreFrustration] = useState('')
  const libraryFormRef = useRef<HTMLDivElement>(null)

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

  const loadLibrary = async () => {
    setLibraryLoading(true)
    try {
      const res = await fetch('/api/agency/persona-library')
      if (res.ok) {
        const d = await res.json()
        setLibraryEntries(d.entries || [])
      }
    } finally {
      setLibraryLoading(false)
    }
  }

  useEffect(() => { loadLibrary() }, [])

  const openNewLibraryEntry = () => {
    setEditingEntry(null)
    setLibName(''); setLibCategory('general'); setLibColor('#6366f1')
    setLibDescription(''); setLibTitleRole(''); setLibWhoTheyAre('')
    setLibIndustryExp(''); setLibPrimaryFrustration(''); setLibWhatTheyWant('')
    setLibDecisionTrigger(''); setLibTrustBarrier(''); setLibEngagementStyle('')
    setLibBestContact(''); setLibSellsInto(''); setLibCoreFrustration('')
    setLibraryError(null)
    setLibraryFormOpen(true)
    setTimeout(() => libraryFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const openEditLibraryEntry = (e: PersonaLibraryEntry) => {
    setEditingEntry(e)
    setLibName(e.name || ''); setLibCategory(e.category || 'general'); setLibColor(e.color || '#6366f1')
    setLibDescription(e.description || ''); setLibTitleRole(e.title_role || '')
    setLibWhoTheyAre(e.who_they_are || ''); setLibIndustryExp(e.industry_experience || '')
    setLibPrimaryFrustration(e.primary_frustration || ''); setLibWhatTheyWant(e.what_they_want || '')
    setLibDecisionTrigger(e.decision_trigger || ''); setLibTrustBarrier(e.trust_barrier || '')
    setLibEngagementStyle(e.engagement_style || ''); setLibBestContact(e.best_contact_method || '')
    setLibSellsInto(e.sells_into || ''); setLibCoreFrustration(e.core_frustration || '')
    setLibraryError(null)
    setLibraryFormOpen(true)
    setTimeout(() => libraryFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const handleSaveLibraryEntry = async () => {
    if (!libName.trim()) { setLibraryError('Name is required'); return }
    setLibrarySaving(true); setLibraryError(null)
    const payload = {
      name: libName.trim(), category: libCategory, color: libColor,
      description: libDescription.trim() || null, title_role: libTitleRole.trim() || null,
      who_they_are: libWhoTheyAre.trim() || null, industry_experience: libIndustryExp.trim() || null,
      primary_frustration: libPrimaryFrustration.trim() || null, what_they_want: libWhatTheyWant.trim() || null,
      decision_trigger: libDecisionTrigger.trim() || null, trust_barrier: libTrustBarrier.trim() || null,
      engagement_style: libEngagementStyle.trim() || null, best_contact_method: libBestContact.trim() || null,
      sells_into: libSellsInto.trim() || null, core_frustration: libCoreFrustration.trim() || null,
    }
    try {
      const url = editingEntry
        ? `/api/agency/persona-library/${editingEntry.id}`
        : '/api/agency/persona-library'
      const method = editingEntry ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Save failed') }
      await loadLibrary()
      setLibraryFormOpen(false)
      setEditingEntry(null)
    } catch (e) {
      setLibraryError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setLibrarySaving(false)
    }
  }

  const handleDeleteLibraryEntry = async (id: string) => {
    if (!confirm('Remove this template from the library?')) return
    setDeletingLibraryId(id)
    try {
      await fetch(`/api/agency/persona-library/${id}`, { method: 'DELETE' })
      await loadLibrary()
    } finally {
      setDeletingLibraryId(null)
    }
  }

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

            {/* ── Persona Library ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Persona Library</CardTitle>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Create reusable persona templates. Sub-accounts can import these into any pipeline (LinkedIn, Facebook, Google, etc.)
                    </p>
                  </div>
                  <button
                    onClick={openNewLibraryEntry}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Template
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category filter */}
                <div className="flex flex-wrap gap-1.5">
                  {['all', 'general', 'linkedin', 'facebook', 'google'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setLibraryCatFilter(cat)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        libraryCatFilter === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat === 'all' ? 'All' : cat === 'linkedin' ? 'LinkedIn Ads' : cat === 'facebook' ? 'Facebook Ads' : cat === 'google' ? 'Google Ads' : 'General'}
                    </button>
                  ))}
                </div>

                {libraryLoading ? (
                  <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
                ) : libraryEntries.filter(e => libraryCatFilter === 'all' || e.category === libraryCatFilter).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No templates yet. Click &ldquo;New Template&rdquo; to create one.</p>
                ) : (
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {libraryEntries
                      .filter(e => libraryCatFilter === 'all' || e.category === libraryCatFilter)
                      .map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{entry.name}</p>
                          {entry.title_role && <p className="text-xs text-gray-500 truncate">{entry.title_role}</p>}
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                          entry.category === 'linkedin' ? 'bg-blue-100 text-blue-700' :
                          entry.category === 'facebook' ? 'bg-indigo-100 text-indigo-700' :
                          entry.category === 'google' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {entry.category === 'linkedin' ? 'LinkedIn' : entry.category === 'facebook' ? 'Facebook' : entry.category === 'google' ? 'Google' : 'General'}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openEditLibraryEntry(entry)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteLibraryEntry(entry.id)}
                            disabled={deletingLibraryId === entry.id}
                            className="p-1 text-gray-400 hover:text-red-500 rounded"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline create/edit form */}
                {libraryFormOpen && (
                  <div ref={libraryFormRef} className="border border-indigo-200 rounded-lg p-4 bg-indigo-50 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">{editingEntry ? 'Edit Template' : 'New Template'}</h3>
                    {libraryError && <p className="text-xs text-red-600">{libraryError}</p>}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                        <input value={libName} onChange={e => setLibName(e.target.value)} placeholder="e.g. Independent Insurance Agent" className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                        <select value={libCategory} onChange={e => setLibCategory(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="general">General</option>
                          <option value="linkedin">LinkedIn Ads</option>
                          <option value="facebook">Facebook Ads</option>
                          <option value="google">Google Ads</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={libColor} onChange={e => setLibColor(e.target.value)} className="w-8 h-8 rounded border border-gray-300 p-0.5 cursor-pointer" />
                          <span className="text-xs text-gray-500 font-mono">{libColor}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                        <input value={libDescription} onChange={e => setLibDescription(e.target.value)} placeholder="Brief description of this persona type" className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Title / Role</label>
                        <input value={libTitleRole} onChange={e => setLibTitleRole(e.target.value)} placeholder="e.g. Independent Insurance Agent, 1099 Rep" className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Who They Are</label>
                        <textarea value={libWhoTheyAre} onChange={e => setLibWhoTheyAre(e.target.value)} rows={2} placeholder="Describe their professional identity…" className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Industry Experience</label>
                        <input value={libIndustryExp} onChange={e => setLibIndustryExp(e.target.value)} placeholder="e.g. 5-10 years in insurance / fintech" className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Primary Frustration</label>
                        <textarea value={libPrimaryFrustration} onChange={e => setLibPrimaryFrustration(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">What They Want</label>
                        <textarea value={libWhatTheyWant} onChange={e => setLibWhatTheyWant(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Decision Trigger</label>
                        <input value={libDecisionTrigger} onChange={e => setLibDecisionTrigger(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Trust Barrier</label>
                        <input value={libTrustBarrier} onChange={e => setLibTrustBarrier(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Engagement Style</label>
                        <input value={libEngagementStyle} onChange={e => setLibEngagementStyle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Best Contact Method</label>
                        <input value={libBestContact} onChange={e => setLibBestContact(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Sells Into</label>
                        <input value={libSellsInto} onChange={e => setLibSellsInto(e.target.value)} placeholder="e.g. SMBs, enterprise, real estate brokerages" className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Core Frustration</label>
                        <textarea value={libCoreFrustration} onChange={e => setLibCoreFrustration(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button onClick={() => { setLibraryFormOpen(false); setEditingEntry(null) }} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg">
                        Cancel
                      </button>
                      <button onClick={handleSaveLibraryEntry} disabled={librarySaving} className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">
                        {librarySaving ? 'Saving…' : editingEntry ? 'Update Template' : 'Add to Library'}
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
