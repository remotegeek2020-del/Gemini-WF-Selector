'use client'

import { useState, useEffect } from 'react'
import type { PersonaLibraryEntry, Pipeline } from '@/types'

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  linkedin: 'LinkedIn Ads',
  facebook: 'Facebook Ads',
  google: 'Google Ads',
}

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-gray-100 text-gray-700',
  linkedin: 'bg-blue-100 text-blue-700',
  facebook: 'bg-indigo-100 text-indigo-700',
  google: 'bg-red-100 text-red-700',
}

interface Props {
  accountId: string
  pipelines: Pipeline[]
  currentPipeline: string
  onClose: () => void
  onImported: () => void
}

export default function PersonaLibraryModal({ accountId, pipelines, currentPipeline, onClose, onImported }: Props) {
  const [entries, setEntries] = useState<PersonaLibraryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [targetPipeline, setTargetPipeline] = useState(currentPipeline)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/agency/persona-library')
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []))
      .catch(() => setError('Failed to load library'))
      .finally(() => setLoading(false))
  }, [])

  const categories = ['all', ...Array.from(new Set(entries.map((e) => e.category)))]

  const filtered = entries.filter((e) => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        e.name.toLowerCase().includes(q) ||
        (e.title_role || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const selected = entries.find((e) => e.id === selectedId)

  const handleImport = async () => {
    if (!selectedId) return
    setImporting(true)
    setError(null)
    try {
      const res = await fetch(`/api/accounts/${accountId}/personas/from-library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libraryId: selectedId, pipeline: targetPipeline }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Import failed')
      }
      onImported()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Persona Library</h2>
            <p className="text-xs text-gray-500 mt-0.5">Browse and import template personas into your account</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left: list */}
          <div className="flex-1 flex flex-col border-r border-gray-200 min-h-0">
            {/* Search + filters */}
            <div className="p-4 border-b border-gray-100 space-y-3">
              <input
                type="text"
                placeholder="Search personas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      categoryFilter === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat === 'all' ? 'All' : (CATEGORY_LABELS[cat] || cat)}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-12">
                  {entries.length === 0 ? 'No templates in the library yet.' : 'No templates match your search.'}
                </p>
              ) : (
                filtered.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedId(entry.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedId === entry.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                      <span className="font-medium text-sm text-gray-900 flex-1 text-left">{entry.name}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[entry.category] || 'bg-gray-100 text-gray-600'}`}>
                        {CATEGORY_LABELS[entry.category] || entry.category}
                      </span>
                    </div>
                    {entry.title_role && (
                      <p className="text-xs text-gray-500 mt-1 ml-5">{entry.title_role}</p>
                    )}
                    {entry.description && (
                      <p className="text-xs text-gray-400 mt-0.5 ml-5 line-clamp-1">{entry.description}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: preview */}
          <div className="w-80 flex flex-col min-h-0">
            {selected ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: selected.color }} />
                  <h3 className="font-semibold text-gray-900">{selected.name}</h3>
                </div>
                {selected.title_role && <p className="text-sm text-gray-600">{selected.title_role}</p>}
                {selected.description && (
                  <p className="text-sm text-gray-500 italic">{selected.description}</p>
                )}

                {selected.who_they_are && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Who They Are</p>
                    <p className="text-xs text-gray-700">{selected.who_they_are}</p>
                  </div>
                )}
                {selected.primary_frustration && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Primary Frustration</p>
                    <p className="text-xs text-gray-700">{selected.primary_frustration}</p>
                  </div>
                )}
                {selected.what_they_want && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">What They Want</p>
                    <p className="text-xs text-gray-700">{selected.what_they_want}</p>
                  </div>
                )}
                {selected.decision_trigger && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Decision Trigger</p>
                    <p className="text-xs text-gray-700">{selected.decision_trigger}</p>
                  </div>
                )}
                {selected.sells_into && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Sells Into</p>
                    <p className="text-xs text-gray-700">{selected.sells_into}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <p className="text-sm text-gray-400">Select a persona template to preview it</p>
              </div>
            )}

            {/* Import footer */}
            <div className="border-t border-gray-200 p-4 space-y-3">
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Import into pipeline</label>
                <select
                  value={targetPipeline}
                  onChange={(e) => setTargetPipeline(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleImport}
                disabled={!selectedId || importing}
                className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {importing ? 'Importing…' : 'Import Persona'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
