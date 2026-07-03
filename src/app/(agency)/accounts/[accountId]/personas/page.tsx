'use client'

import { useState, useEffect } from 'react'
import type { Persona, Pipeline } from '@/types'
import PersonaForm from '@/components/persona-form'
import PersonaLibraryModal from '@/components/persona-library-modal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function AccountPersonasPage({ params }: { params: { accountId: string } }) {
  const { accountId } = params
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [activePipeline, setActivePipeline] = useState<string>('main')
  const [personas, setPersonas] = useState<Persona[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/accounts/${accountId}/pipelines`)
      .then((r) => r.json())
      .then((d) => {
        const list: Pipeline[] = d.pipelines || []
        setPipelines(list)
        if (list.length > 0 && !list.find((p) => p.slug === activePipeline)) {
          setActivePipeline(list[0].slug)
        }
      })
      .catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  const fetchPersonas = async (pipeline: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/accounts/${accountId}/personas?pipeline=${pipeline}`)
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
    fetchPersonas(activePipeline)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, activePipeline])

  const handleSave = async (data: Partial<Persona>) => {
    const url = editingPersona
      ? `/api/accounts/${accountId}/personas/${editingPersona.id}`
      : `/api/accounts/${accountId}/personas`
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

    await fetchPersonas(activePipeline)
    setEditingPersona(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this persona? Leads assigned to it will become unassigned.')) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/accounts/${accountId}/personas/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(`Failed to delete: ${data.error}`)
        return
      }
      await fetchPersonas(activePipeline)
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

  const activePipelineName = pipelines.find((p) => p.slug === activePipeline)?.name || activePipeline

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define personas to classify and route incoming leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLibraryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            Import from Library
          </button>
          <Button onClick={() => setIsFormOpen(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Persona
          </Button>
        </div>
      </div>

      {/* Pipeline tabs */}
      {pipelines.length > 1 && (
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-6 flex-wrap">
          {pipelines.map((p) => (
            <button
              key={p.slug}
              onClick={() => setActivePipeline(p.slug)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activePipeline === p.slug
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

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
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="mt-3 text-sm font-semibold text-gray-500">
            No personas yet for {activePipelineName}
          </h3>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Create personas to classify leads in this pipeline automatically
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
                {persona.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={persona.avatar_url}
                    alt={persona.name}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-gray-200"
                  />
                ) : (
                  <span
                    className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold"
                    style={{ backgroundColor: persona.color }}
                  >
                    {persona.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'}
                  </span>
                )}
                <h3 className="font-semibold text-gray-900 flex-1 truncate">{persona.name}</h3>
                {persona.is_default && (
                  <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex-shrink-0">
                    Default
                  </span>
                )}
              </div>
              <div className="px-5 py-4 flex-1 space-y-3">
                {/* Sample Person snapshot */}
                {(persona.full_name || persona.title_role) && (
                  <div className="bg-gray-50 rounded-md px-3 py-2 space-y-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sample Person</span>
                    {persona.full_name && (
                      <p className="text-sm font-medium text-gray-800">{persona.full_name}</p>
                    )}
                    {persona.title_role && (
                      <p className="text-xs text-gray-500">{persona.title_role}</p>
                    )}
                    {(persona.age || persona.location) && (
                      <p className="text-xs text-gray-400">
                        {[persona.age && `Age ${persona.age}`, persona.location].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {persona.core_frustration && (
                      <p className="text-xs text-gray-500 line-clamp-2 italic mt-1">{persona.core_frustration}</p>
                    )}
                  </div>
                )}

                {/* Key characteristics */}
                {persona.who_they_are && (
                  <div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Who They Are</span>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{persona.who_they_are}</p>
                  </div>
                )}
                {persona.what_they_want && (
                  <div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">What They Want</span>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{persona.what_they_want}</p>
                  </div>
                )}

                {/* Legacy description fallback */}
                {!persona.who_they_are && persona.description && (
                  <div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Description</span>
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2">{persona.description}</p>
                  </div>
                )}

                {persona.sells_into && (
                  <div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Sells Into</span>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{persona.sells_into}</p>
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
        accountId={accountId}
        pipeline={activePipeline}
      />

      {isLibraryOpen && (
        <PersonaLibraryModal
          accountId={accountId}
          pipelines={pipelines}
          currentPipeline={activePipeline}
          onClose={() => setIsLibraryOpen(false)}
          onImported={() => fetchPersonas(activePipeline)}
        />
      )}
    </div>
  )
}
