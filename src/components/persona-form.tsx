'use client'

import { useState, useEffect, useRef } from 'react'
import type { Persona } from '@/types'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'

const PRESET_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#ef4444',
  '#f97316',
]

interface PersonaFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Persona>) => Promise<void>
  persona?: Persona | null
  accountId: string
  pipeline?: string
}

interface FormData {
  name: string
  // Sample Person
  full_name: string
  title_role: string
  age: string
  location: string
  current_income: string
  income_goal: string
  background_story: string
  core_frustration: string
  // Characteristics
  who_they_are: string
  industry_experience: string
  primary_frustration: string
  what_they_want: string
  decision_trigger: string
  trust_barrier: string
  engagement_style: string
  best_contact_method: string
  sells_into: string
  // Geography & HL
  state: string
  county: string
  highlevel_workflow_id: string
  highlevel_workflow_name: string
  highlevel_pipeline_id: string
  highlevel_pipeline_name: string
  highlevel_stage_id: string
  highlevel_stage_name: string
  color: string
  is_default: boolean
}

interface HLWorkflow {
  id: string
  name: string
  status: string
}

interface HLPipelineStage {
  id: string
  name: string
}

interface HLPipeline {
  id: string
  name: string
  stages: HLPipelineStage[]
}

const emptyForm: FormData = {
  name: '',
  full_name: '',
  title_role: '',
  age: '',
  location: '',
  current_income: '',
  income_goal: '',
  background_story: '',
  core_frustration: '',
  who_they_are: '',
  industry_experience: '',
  primary_frustration: '',
  what_they_want: '',
  decision_trigger: '',
  trust_barrier: '',
  engagement_style: '',
  best_contact_method: '',
  sells_into: '',
  state: '',
  county: '',
  highlevel_workflow_id: '',
  highlevel_workflow_name: '',
  highlevel_pipeline_id: '',
  highlevel_pipeline_name: '',
  highlevel_stage_id: '',
  highlevel_stage_name: '',
  color: '#6366f1',
  is_default: false,
}

export default function PersonaForm({ isOpen, onClose, onSave, persona, accountId, pipeline = 'main' }: PersonaFormProps) {
  const [workflows, setWorkflows] = useState<HLWorkflow[]>([])
  const [workflowsLoading, setWorkflowsLoading] = useState(false)
  const [workflowsError, setWorkflowsError] = useState<string | null>(null)
  const [pipelines, setPipelines] = useState<HLPipeline[]>([])
  const [pipelinesLoading, setPipelinesLoading] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [isSaving, setIsSaving] = useState(false)

  // AI generation state
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [notificationEmails, setNotificationEmails] = useState<string[]>([])
  const [notifEmailInput, setNotifEmailInput] = useState('')

  useEffect(() => {
    if (persona) {
      setForm({
        name: persona.name || '',
        full_name: persona.full_name || '',
        title_role: persona.title_role || '',
        age: persona.age || '',
        location: persona.location || '',
        current_income: persona.current_income || '',
        income_goal: persona.income_goal || '',
        background_story: persona.background_story || '',
        core_frustration: persona.core_frustration || '',
        who_they_are: persona.who_they_are || '',
        industry_experience: persona.industry_experience || '',
        primary_frustration: persona.primary_frustration || '',
        what_they_want: persona.what_they_want || '',
        decision_trigger: persona.decision_trigger || '',
        trust_barrier: persona.trust_barrier || '',
        engagement_style: persona.engagement_style || '',
        best_contact_method: persona.best_contact_method || '',
        sells_into: persona.sells_into || '',
        state: persona.state || '',
        county: persona.county || '',
        highlevel_workflow_id: persona.highlevel_workflow_id || '',
        highlevel_workflow_name: persona.highlevel_workflow_name || '',
        highlevel_pipeline_id: persona.highlevel_pipeline_id || '',
        highlevel_pipeline_name: persona.highlevel_pipeline_name || '',
        highlevel_stage_id: persona.highlevel_stage_id || '',
        highlevel_stage_name: persona.highlevel_stage_name || '',
        color: persona.color || '#6366f1',
        is_default: persona.is_default || false,
      })
      setAvatarUrl(persona.avatar_url || null)
      setNotificationEmails(persona.notification_emails || [])
    } else {
      setForm(emptyForm)
      setAvatarUrl(null)
      setNotificationEmails([])
    }
    setNotifEmailInput('')
    setErrors({})
    setAiPrompt('')
    setAiError(null)
    setAiPanelOpen(false)
    setAvatarError(null)
  }, [persona, isOpen])

  useEffect(() => {
    if (!isOpen) return

    setWorkflowsLoading(true)
    setWorkflowsError(null)
    fetch(`/api/accounts/${accountId}/highlevel/workflows`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setWorkflowsError(data.error)
        else setWorkflows(data.workflows || [])
      })
      .catch(() => setWorkflowsError('Failed to load workflows'))
      .finally(() => setWorkflowsLoading(false))

    setPipelinesLoading(true)
    fetch(`/api/accounts/${accountId}/highlevel/pipelines`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setPipelines(data.pipelines || []) })
      .catch(() => {})
      .finally(() => setPipelinesLoading(false))

    fetch(`/api/agency/persona-gen-ai?accountId=${accountId}`)
      .then((r) => r.json())
      .then((data) => setAiEnabled(data.enabled === true))
      .catch(() => setAiEnabled(false))
  }, [isOpen, accountId])

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (!form.name.trim()) newErrors.name = 'Persona name is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSaving(true)
    try {
      await onSave({
        name: form.name.trim(),
        // Sample Person
        full_name: form.full_name.trim() || null,
        title_role: form.title_role.trim() || null,
        age: form.age.trim() || null,
        location: form.location.trim() || null,
        current_income: form.current_income.trim() || null,
        income_goal: form.income_goal.trim() || null,
        background_story: form.background_story.trim() || null,
        core_frustration: form.core_frustration.trim() || null,
        // Characteristics
        who_they_are: form.who_they_are.trim() || null,
        industry_experience: form.industry_experience.trim() || null,
        primary_frustration: form.primary_frustration.trim() || null,
        what_they_want: form.what_they_want.trim() || null,
        decision_trigger: form.decision_trigger.trim() || null,
        trust_barrier: form.trust_barrier.trim() || null,
        engagement_style: form.engagement_style.trim() || null,
        best_contact_method: form.best_contact_method.trim() || null,
        sells_into: form.sells_into.trim() || null,
        // Geography
        state: form.state.trim() || null,
        county: form.county.trim() || null,
        // HL
        highlevel_workflow_id: form.highlevel_workflow_id.trim() || null,
        highlevel_workflow_name: form.highlevel_workflow_name.trim() || null,
        highlevel_pipeline_id: form.highlevel_pipeline_id.trim() || null,
        highlevel_pipeline_name: form.highlevel_pipeline_name.trim() || null,
        highlevel_stage_id: form.highlevel_stage_id.trim() || null,
        highlevel_stage_name: form.highlevel_stage_name.trim() || null,
        color: form.color,
        is_default: form.is_default,
        pipeline: persona?.pipeline ?? pipeline,
        notification_emails: notificationEmails,
      })
      onClose()
    } catch (err) {
      console.error('Failed to save persona:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return
    setIsGenerating(true)
    setAiError(null)
    try {
      const res = await fetch(`/api/accounts/${accountId}/personas/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setForm((prev) => ({
        ...prev,
        name: data.name || prev.name,
        full_name: data.full_name || prev.full_name,
        title_role: data.title_role || prev.title_role,
        age: data.age || prev.age,
        location: data.location || prev.location,
        current_income: data.current_income || prev.current_income,
        income_goal: data.income_goal || prev.income_goal,
        background_story: data.background_story || prev.background_story,
        core_frustration: data.core_frustration || prev.core_frustration,
        who_they_are: data.who_they_are || prev.who_they_are,
        industry_experience: data.industry_experience || prev.industry_experience,
        primary_frustration: data.primary_frustration || prev.primary_frustration,
        what_they_want: data.what_they_want || prev.what_they_want,
        decision_trigger: data.decision_trigger || prev.decision_trigger,
        trust_barrier: data.trust_barrier || prev.trust_barrier,
        engagement_style: data.engagement_style || prev.engagement_style,
        best_contact_method: data.best_contact_method || prev.best_contact_method,
        sells_into: data.sells_into || prev.sells_into,
        state: data.state || prev.state,
        county: data.county || prev.county,
      }))
      setAiPanelOpen(false)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !persona) return
    setIsUploadingAvatar(true)
    setAvatarError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/accounts/${accountId}/personas/${persona.id}/avatar`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setAvatarUrl(`${data.avatar_url}?t=${Date.now()}`)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAvatarGenerate = async () => {
    if (!persona) return
    setIsGeneratingAvatar(true)
    setAvatarError(null)
    try {
      const res = await fetch(`/api/accounts/${accountId}/personas/${persona.id}/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generate: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setAvatarUrl(`${data.avatar_url}?t=${Date.now()}`)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Avatar generation failed')
    } finally {
      setIsGeneratingAvatar(false)
    }
  }

  const handleAvatarRemove = async () => {
    if (!persona) return
    setAvatarError(null)
    try {
      await fetch(`/api/accounts/${accountId}/personas/${persona.id}/avatar`, { method: 'DELETE' })
      setAvatarUrl(null)
    } catch {
      setAvatarError('Failed to remove avatar')
    }
  }

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const initials = form.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={persona ? 'Edit Persona' : 'New Persona'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Avatar + Name row */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={form.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow" />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow" style={{ backgroundColor: form.color }}>
                {initials}
              </div>
            )}
            {(isUploadingAvatar || isGeneratingAvatar) && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Input
              label="Persona Name *"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="e.g. Independent ISO Agent"
              error={errors.name}
            />
            {persona ? (
              <div className="flex flex-wrap gap-2 mt-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar || isGeneratingAvatar}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload Avatar
                </button>
                {aiEnabled && (
                  <button type="button" onClick={handleAvatarGenerate} disabled={isUploadingAvatar || isGeneratingAvatar}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    {isGeneratingAvatar ? 'Generating…' : 'AI Avatar'}
                  </button>
                )}
                {avatarUrl && (
                  <button type="button" onClick={handleAvatarRemove} disabled={isUploadingAvatar || isGeneratingAvatar}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors">
                    Remove
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1">Save first, then add an avatar.</p>
            )}
            {avatarError && <p className="text-xs text-red-600 mt-1">{avatarError}</p>}
          </div>
        </div>

        {/* AI Generate panel */}
        {aiEnabled && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 overflow-hidden">
            <button type="button" onClick={() => setAiPanelOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-indigo-800 hover:bg-indigo-100 transition-colors">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Generate Full Persona with AI
              </span>
              <svg className={`w-4 h-4 transition-transform ${aiPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {aiPanelOpen && (
              <div className="px-4 pb-4 space-y-3">
                <p className="text-xs text-indigo-600">
                  Describe your target audience and AI will populate all Sample Person and Characteristics fields.
                </p>
                <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Independent ISO agent in the payments industry, around 35-45 years old, self-employed, struggling with low residuals and no upline support..."
                  rows={3}
                  className="w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
                {aiError && <p className="text-xs text-red-600">{aiError}</p>}
                <div className="flex justify-end">
                  <Button type="button" size="sm" onClick={handleGenerate} isLoading={isGenerating} disabled={!aiPrompt.trim()}>
                    {isGenerating ? 'Generating…' : 'Generate'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SAMPLE PERSON section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-2">Sample Person</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Full Name" value={form.full_name} onChange={handleChange('full_name')} placeholder="e.g. Brian Castillo" />
            <Input label="Title / Role" value={form.title_role} onChange={handleChange('title_role')} placeholder="e.g. Independent ISO Agent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Age" value={form.age} onChange={handleChange('age')} placeholder="e.g. 38 or 35–45" />
            <Input label="Location" value={form.location} onChange={handleChange('location')} placeholder="e.g. Houston, TX" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Current Income" value={form.current_income} onChange={handleChange('current_income')} placeholder="e.g. $4,200/month residual" />
            <Input label="Income Goal" value={form.income_goal} onChange={handleChange('income_goal')} placeholder="e.g. $8,000–$12,000/month within 18 months" />
          </div>
          <Textarea label="Background Story" value={form.background_story} onChange={handleChange('background_story')}
            placeholder="Describe their career background, how they got here, and what their day-to-day looks like..."
            rows={3} />
          <Textarea label="Core Frustration" value={form.core_frustration} onChange={handleChange('core_frustration')}
            placeholder="The single biggest frustration driving them to look for a solution..."
            rows={2} />
        </div>

        {/* CHARACTERISTICS section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-2">Characteristics</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <Textarea label="Who They Are" value={form.who_they_are} onChange={handleChange('who_they_are')}
            placeholder="A self-employed merchant services agent who builds their own book of business..."
            rows={2} />
          <Input label="Industry Experience" value={form.industry_experience} onChange={handleChange('industry_experience')}
            placeholder="e.g. High — understands interchange, residuals, and ISO agreements" />
          <Textarea label="Primary Frustration" value={form.primary_frustration} onChange={handleChange('primary_frustration')}
            placeholder="e.g. Underpaid residual split, no upline support, merchant attrition they can't control..."
            rows={2} />
          <Textarea label="What They Want" value={form.what_they_want} onChange={handleChange('what_they_want')}
            placeholder="e.g. Better residual split, reliable upline support, a partner who invests in their growth..."
            rows={2} />
          <Textarea label="Decision Trigger" value={form.decision_trigger} onChange={handleChange('decision_trigger')}
            placeholder="e.g. Hard proof that your program pays better with a side-by-side residual comparison..."
            rows={2} />
          <Textarea label="Trust Barrier" value={form.trust_barrier} onChange={handleChange('trust_barrier')}
            placeholder="e.g. Has been burned by ISO promises before. Needs to see real numbers and talk to active agents..."
            rows={2} />
          <Textarea label="Engagement Style" value={form.engagement_style} onChange={handleChange('engagement_style')}
            placeholder="e.g. Direct, skeptical, and experienced. Skip the pitch — lead with data and peer stories..."
            rows={2} />
          <Input label="Best Contact Method" value={form.best_contact_method} onChange={handleChange('best_contact_method')}
            placeholder="e.g. Phone or LinkedIn. Responds to direct messages with specific value propositions" />
          <Input label="Sells Into" value={form.sells_into} onChange={handleChange('sells_into')}
            placeholder="e.g. Restaurants, retail, auto, and service businesses under $1M revenue" />
        </div>

        {/* Geography */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="State Target (optional)" value={form.state} onChange={handleChange('state')} placeholder="e.g. TX, CA, FL" />
          <Input label="County Target (optional)" value={form.county} onChange={handleChange('county')} placeholder="e.g. Harris County" />
        </div>

        {/* HighLevel Actions */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Highlevel Actions</h4>
          {workflowsError ? (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              {workflowsError} — configure your Highlevel key &amp; Location ID in Settings.
            </p>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workflow</label>
              <select
                value={form.highlevel_workflow_id}
                onChange={(e) => {
                  const selected = workflows.find((w) => w.id === e.target.value)
                  setForm((prev) => ({
                    ...prev,
                    highlevel_workflow_id: e.target.value,
                    highlevel_workflow_name: selected?.name || '',
                  }))
                }}
                disabled={workflowsLoading}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">{workflowsLoading ? 'Loading workflows…' : '— No workflow —'}</option>
                {workflows.filter((w) => w.status === 'published').map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
                {workflows.some((w) => w.status !== 'published') && (
                  <>
                    <option disabled>── Drafts ──</option>
                    {workflows.filter((w) => w.status !== 'published').map((w) => (
                      <option key={w.id} value={w.id}>{w.name} (draft)</option>
                    ))}
                  </>
                )}
              </select>
            </div>
          )}

          {pipelines.length > 0 && (
            <div className="mt-3 space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Create Opportunity in Pipeline</label>
                <select
                  value={form.highlevel_pipeline_id}
                  onChange={(e) => {
                    const selected = pipelines.find((p) => p.id === e.target.value)
                    setForm((prev) => ({
                      ...prev,
                      highlevel_pipeline_id: e.target.value,
                      highlevel_pipeline_name: selected?.name || '',
                      highlevel_stage_id: '',
                      highlevel_stage_name: '',
                    }))
                  }}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">{pipelinesLoading ? 'Loading…' : '— No pipeline —'}</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {form.highlevel_pipeline_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                  <select
                    value={form.highlevel_stage_id}
                    onChange={(e) => {
                      const pl = pipelines.find((p) => p.id === form.highlevel_pipeline_id)
                      const stage = pl?.stages.find((s) => s.id === e.target.value)
                      setForm((prev) => ({
                        ...prev,
                        highlevel_stage_id: e.target.value,
                        highlevel_stage_name: stage?.name || '',
                      }))
                    }}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">— Select stage —</option>
                    {pipelines.find((p) => p.id === form.highlevel_pipeline_id)?.stages.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <p className="text-xs text-gray-400">When a lead matches this persona, an opportunity will be created in this pipeline stage.</p>
            </div>
          )}
        </div>

        {/* Default toggle */}
        <div className="flex items-center justify-between py-2 px-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div>
            <p className="text-sm font-medium text-amber-900">Default fallback persona</p>
            <p className="text-xs text-amber-700 mt-0.5">Leads with no persona match will be assigned here</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.is_default}
            onClick={() => setForm((prev) => ({ ...prev, is_default: !prev.is_default }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.is_default ? 'bg-amber-500' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_default ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Notification Emails */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notification Emails</label>
          <p className="text-xs text-gray-500 mb-2">Email addresses to notify when a lead is assigned to this persona</p>
          <div className="flex gap-2 mb-2">
            <input
              type="email"
              value={notifEmailInput}
              onChange={(e) => setNotifEmailInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  const email = notifEmailInput.trim()
                  if (email && !notificationEmails.includes(email)) {
                    setNotificationEmails((prev) => [...prev, email])
                    setNotifEmailInput('')
                  }
                }
              }}
              placeholder="email@example.com"
              className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => {
                const email = notifEmailInput.trim()
                if (email && !notificationEmails.includes(email)) {
                  setNotificationEmails((prev) => [...prev, email])
                  setNotifEmailInput('')
                }
              }}
              className="px-3 py-2 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100"
            >
              Add
            </button>
          </div>
          {notificationEmails.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {notificationEmails.map((email) => (
                <span key={email} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  {email}
                  <button type="button" onClick={() => setNotificationEmails((prev) => prev.filter((e) => e !== email))} className="text-gray-400 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((color) => (
              <button key={color} type="button" onClick={() => setForm((prev) => ({ ...prev, color }))}
                className="w-7 h-7 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: color,
                  borderColor: form.color === color ? '#111827' : 'transparent',
                  transform: form.color === color ? 'scale(1.2)' : 'scale(1)',
                }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSaving}>
            {persona ? 'Save Changes' : 'Create Persona'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
