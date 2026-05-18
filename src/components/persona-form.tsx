'use client'

import { useState, useEffect } from 'react'
import type { Persona } from '@/types'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#ef4444', // red
  '#f97316', // orange
]

interface PersonaFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Persona>) => Promise<void>
  persona?: Persona | null
}

interface FormData {
  name: string
  description: string
  characteristics: string
  sample_person: string
  highlevel_workflow_id: string
  highlevel_workflow_name: string
  color: string
}

export default function PersonaForm({ isOpen, onClose, onSave, persona }: PersonaFormProps) {
  const [form, setForm] = useState<FormData>({
    name: '',
    description: '',
    characteristics: '',
    sample_person: '',
    highlevel_workflow_id: '',
    highlevel_workflow_name: '',
    color: '#6366f1',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (persona) {
      setForm({
        name: persona.name || '',
        description: persona.description || '',
        characteristics: persona.characteristics || '',
        sample_person: persona.sample_person || '',
        highlevel_workflow_id: persona.highlevel_workflow_id || '',
        highlevel_workflow_name: persona.highlevel_workflow_name || '',
        color: persona.color || '#6366f1',
      })
    } else {
      setForm({
        name: '',
        description: '',
        characteristics: '',
        sample_person: '',
        highlevel_workflow_id: '',
        highlevel_workflow_name: '',
        color: '#6366f1',
      })
    }
    setErrors({})
  }, [persona, isOpen])

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
        highlevel_workflow_id: form.highlevel_workflow_id.trim() || null,
        highlevel_workflow_name: form.highlevel_workflow_name.trim() || null,
        color: form.color,
      })
      onClose()
    } catch (err) {
      console.error('Failed to save persona:', err)
    } finally {
      setIsSaving(false)
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={persona ? 'Edit Persona' : 'New Persona'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Highlevel Workflow</h4>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Workflow ID"
              value={form.highlevel_workflow_id}
              onChange={handleChange('highlevel_workflow_id')}
              placeholder="hl_workflow_xxx"
            />
            <Input
              label="Workflow Name"
              value={form.highlevel_workflow_name}
              onChange={handleChange('highlevel_workflow_name')}
              placeholder="e.g. Enterprise Follow-up"
            />
          </div>
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
