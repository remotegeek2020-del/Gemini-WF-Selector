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
  pipeline?: 'main' | 'nurture'
}

interface FormData {
  name: string
  description: string
  characteristics: string
  sample_person: string
  state: string
  county: string
  highlevel_workflow_id: string
  highlevel_workflow_name: string
  color: string
  is_default: boolean
}

interface HLWorkflow {
  id: string
  name: string
  status: string
}

export default function PersonaForm({ isOpen, onClose, onSave, persona, accountId, pipeline = 'main' }: PersonaFormProps) {
  const [workflows, setWorkflows] = useState<HLWorkflow[]>([])
  const [workflowsLoading, setWorkflowsLoading] = useState(false)
  const [workflowsError, setWorkflowsError] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>({
    name: '',
    description: '',
    characteristics: '',
    sample_person: '',
    state: '',
    county: '',
    highlevel_workflow_id: '',
    highlevel_workflow_name: '',
    color: '#6366f1',
    is_default: false,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [isSaving, setIsSaving] = useState(false)

  // AI text generation state
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

  useEffect(() => {
    if (persona) {
      setForm({
        name: persona.name || '',
        description: persona.description || '',
        characteristics: persona.characteristics || '',
        sample_person: persona.sample_person || '',
        state: persona.state || '',
        county: persona.county || '',
        highlevel_workflow_id: persona.highlevel_workflow_id || '',
        highlevel_workflow_name: persona.highlevel_workflow_name || '',
        color: persona.color || '#6366f1',
        is_default: persona.is_default || false,
      })
      setAvatarUrl(persona.avatar_url || null)
    } else {
      setForm({
        name: '',
        description: '',
        characteristics: '',
        sample_person: '',
        state: '',
        county: '',
        highlevel_workflow_id: '',
        highlevel_workflow_name: '',
        color: '#6366f1',
        is_default: false,
      })
      setAvatarUrl(null)
    }
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

    fetch(`/api/agency/persona-gen-ai?accountId=${accountId}`)
      .then((r) => r.json())
      .then((data) => setAiEnabled(data.enabled === true))
      .catch(() => setAiEnabled(false))
  }, [isOpen, accountId])

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (!form.description.trim()) newErrors.description = 'Description is required'
    if (!form.characteristics.trim()) newErrors.characteristics = 'Characteristics are required'
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
        description: form.description.trim(),
        characteristics: form.characteristics.trim(),
        sample_person: form.sample_person.trim() || null,
        state: form.state.trim() || null,
        county: form.county.trim() || null,
        highlevel_workflow_id: form.highlevel_workflow_id.trim() || null,
        highlevel_workflow_name: form.highlevel_workflow_name.trim() || null,
        color: form.color,
        is_default: form.is_default,
        pipeline: persona?.pipeline ?? pipeline,
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
        sample_person: data.sample_person || prev.sample_person,
        description: data.description || prev.description,
        characteristics: data.characteristics || prev.characteristics,
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
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
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
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Avatar section */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {/* Avatar preview */}
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={form.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow"
                style={{ backgroundColor: form.color }}
              >
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
            <p className="text-sm font-medium text-gray-700 mb-1">Avatar</p>
            {persona ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar || isGeneratingAvatar}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload
                </button>
                {aiEnabled && (
                  <button
                    type="button"
                    onClick={handleAvatarGenerate}
                    disabled={isUploadingAvatar || isGeneratingAvatar}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    {isGeneratingAvatar ? 'Generating…' : 'Generate with AI'}
                  </button>
                )}
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleAvatarRemove}
                    disabled={isUploadingAvatar || isGeneratingAvatar}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    Remove
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
            ) : (
              <p className="text-xs text-gray-400">Save the persona first, then come back to add an avatar.</p>
            )}
            {avatarError && (
              <p className="text-xs text-red-600 mt-1">{avatarError}</p>
            )}
          </div>
        </div>

        {/* AI Generate panel */}
        {aiEnabled && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 overflow-hidden">
            <button
              type="button"
              onClick={() => setAiPanelOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-indigo-800 hover:bg-indigo-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Generate with AI
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${aiPanelOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {aiPanelOpen && (
              <div className="px-4 pb-4 space-y-3">
                <p className="text-xs text-indigo-600">
                  Describe your target audience and the AI will generate the persona name, description, and characteristics for you.
                </p>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. VP-level executives at mid-size SaaS companies evaluating HR software, usually have 50-500 employees, need to justify ROI to the CFO..."
                  rows={3}
                  className="w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
                {aiError && (
                  <p className="text-xs text-red-600">{aiError}</p>
                )}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGenerate}
                    isLoading={isGenerating}
                    disabled={!aiPrompt.trim()}
                  >
                    {isGenerating ? 'Generating…' : 'Generate'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <Input
          label="Name *"
          value={form.name}
          onChange={handleChange('name')}
          placeholder="e.g. Enterprise Decision Maker"
          error={errors.name}
        />

        <Textarea
          label="Description *"
          value={form.description}
          onChange={handleChange('description')}
          placeholder="Briefly describe who this persona is..."
          rows={2}
          error={errors.description}
        />

        <Textarea
          label="Characteristics *"
          value={form.characteristics}
          onChange={handleChange('characteristics')}
          placeholder="List key characteristics: job titles, seniority levels, company size, industry, buying behavior..."
          rows={4}
          error={errors.characteristics}
        />

        <Input
          label="Sample Person"
          value={form.sample_person}
          onChange={handleChange('sample_person')}
          placeholder="e.g. VP of Marketing at a 500-person SaaS company"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="State (optional)"
            value={form.state}
            onChange={handleChange('state')}
            placeholder="e.g. TX, CA, FL"
          />
          <Input
            label="County (optional)"
            value={form.county}
            onChange={handleChange('county')}
            placeholder="e.g. Harris County"
          />
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Highlevel Workflow</h4>
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
                <option value="">
                  {workflowsLoading ? 'Loading workflows…' : '— No workflow —'}
                </option>
                {workflows
                  .filter((w) => w.status === 'published')
                  .map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                {workflows.some((w) => w.status !== 'published') && (
                  <>
                    <option disabled>── Drafts ──</option>
                    {workflows
                      .filter((w) => w.status !== 'published')
                      .map((w) => (
                        <option key={w.id} value={w.id}>{w.name} (draft)</option>
                      ))}
                  </>
                )}
              </select>
            </div>
          )}
        </div>

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
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              form.is_default ? 'bg-amber-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.is_default ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, color }))}
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
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {persona ? 'Save Changes' : 'Create Persona'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
