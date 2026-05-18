'use client'

import { useState, useEffect } from 'react'
import type { Persona } from '@/types'
import PersonaForm from '@/components/persona-form'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchPersonas = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/personas')
      if (!res.ok) throw new Error('Failed to fetch personas')
      const data = await res.json()
      setPersonas(data.personas || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load personas')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPersonas()
  }, [])

  const handleSave = async (data: Partial<Persona>) => {
    const url = editingPersona ? `/api/personas/${editingPersona.id}` : '/api/personas'
    const method = editingPersona ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const errData = await res.json()
      throw new Error(errData.error || 'Failed to save persona')
    }

    await fetchPersonas()
    setEditingPersona(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this persona? Leads assigned to it will become unassigned.')) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/personas/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(`Failed to delete: ${data.error}`)
        return
      }
      await fetchPersonas()
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (persona: Persona) => {
    setEditingPersona(persona)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingPersona(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define personas to classify and route incoming leads
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Persona
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : personas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <h3 className="mt-3 text-sm font-semibold text-gray-500">No personas yet</h3>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Create personas to classify your leads automatically
          </p>
          <Button onClick={() => setIsFormOpen(true)} size="sm">
            Create your first persona
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {personas.map((persona) => (
            <Card key={persona.id} className="flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: persona.color }}
                />
                <h3 className="font-semibold text-gray-900 flex-1 truncate">{persona.name}</h3>
              </div>
              <div className="px-5 py-4 flex-1 space-y-3">
                <div>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Description
                  </span>
                  <p className="text-sm text-gray-700 mt-1 line-clamp-2">{persona.description}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Characteristics
                  </span>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-3">{persona.characteristics}</p>
                </div>
                {persona.sample_person && (
                  <div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Sample
                    </span>
                    <p className="text-sm text-gray-600 mt-1 italic">{persona.sample_person}</p>
                  </div>
                )}
                {persona.highlevel_workflow_name && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 rounded px-2 py-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {persona.highlevel_workflow_name}
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleEdit(persona)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  isLoading={deletingId === persona.id}
                  onClick={() => handleDelete(persona.id)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PersonaForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSave}
        persona={editingPersona}
      />
    </div>
  )
}
