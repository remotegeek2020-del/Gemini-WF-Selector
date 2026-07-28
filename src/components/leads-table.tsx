'use client'

import { useState } from 'react'
import type { Lead } from '@/types'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface LeadsTableProps {
  leads: Lead[]
  onEnrich?: (leadId: string) => Promise<void>
  onDelete?: (leadId: string) => Promise<void>
  onBulkDelete?: (ids: string[]) => Promise<void>
  showPipeline?: boolean
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function classifySource(source: string | null): 'facebook' | 'linkedin' | 'google' | null {
  const s = source?.toLowerCase() || ''
  if (s.includes('facebook') || s.includes('fb') || s.includes('meta')) return 'facebook'
  if (s.includes('linkedin')) return 'linkedin'
  if (s.includes('google')) return 'google'
  return null
}

function getSourceIcon(source: string | null): string {
  switch (classifySource(source)) {
    case 'facebook': return 'FB'
    case 'linkedin': return 'LI'
    case 'google': return 'GG'
    default: return source?.slice(0, 2).toUpperCase() || '??'
  }
}

function getSourceColor(source: string | null): string {
  switch (classifySource(source)) {
    case 'facebook': return 'bg-blue-100 text-blue-800'
    case 'linkedin': return 'bg-sky-100 text-sky-800'
    case 'google': return 'bg-orange-100 text-orange-800'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function getPipelineLabel(pipeline: string): string {
  const labels: Record<string, string> = { main: 'Main', nurture: 'Nurture' }
  return labels[pipeline] || pipeline.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function LeadsTable({ leads, onEnrich, onDelete, onBulkDelete, showPipeline }: LeadsTableProps) {
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id))
  const someSelected = leads.some((l) => selectedIds.has(l.id))
  const colSpanBase = (onBulkDelete ? 1 : 0) + 6 + (showPipeline ? 1 : 0) + 1

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleEnrich = async (leadId: string) => {
    if (!onEnrich) return
    setEnrichingIds((prev) => new Set(prev).add(leadId))
    try { await onEnrich(leadId) }
    finally {
      setEnrichingIds((prev) => { const n = new Set(prev); n.delete(leadId); return n })
    }
  }

  const handleDelete = async (leadId: string, name: string) => {
    if (!onDelete) return
    if (!confirm(`Delete lead "${name}"? This cannot be undone.`)) return
    setDeletingIds((prev) => new Set(prev).add(leadId))
    try { await onDelete(leadId) }
    finally {
      setDeletingIds((prev) => { const n = new Set(prev); n.delete(leadId); return n })
    }
  }

  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} lead${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    setIsBulkDeleting(true)
    try {
      await onBulkDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
    } finally {
      setIsBulkDeleting(false)
    }
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="mt-3 text-sm font-semibold text-gray-500">No leads yet</h3>
        <p className="text-xs text-gray-400 mt-1">Leads will appear here when your webhook receives data.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Bulk action bar */}
      {someSelected && (
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 bg-indigo-600 text-white text-sm rounded-t-lg">
          <span className="font-medium">
            {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-indigo-200 hover:text-white text-xs underline"
            >
              Clear selection
            </button>
            {onBulkDelete && (
              <Button
                size="sm"
                variant="danger"
                isLoading={isBulkDeleting}
                onClick={handleBulkDelete}
              >
                Delete {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {onBulkDelete && (
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
              )}
              <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Email</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Source</th>
              {showPipeline && <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Channel</th>}
              <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Persona</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Created</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((lead) => {
              const isSelected = selectedIds.has(lead.id)
              const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'
              const colSpan = colSpanBase

              return (
                <>
                  <tr
                    key={lead.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}
                    onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                  >
                    {onBulkDelete && (
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(lead.id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">
                        {name !== 'Unknown' ? name : <span className="text-gray-400 italic">Unknown</span>}
                      </div>
                      {lead.phone && <div className="text-xs text-gray-500 mt-0.5">{lead.phone}</div>}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{lead.email || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSourceColor(lead.source)}`}>
                        {getSourceIcon(lead.source)} {lead.source || 'other'}
                      </span>
                    </td>
                    {showPipeline && (
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium">
                          {getPipelineLabel(lead.pipeline)}
                        </span>
                      </td>
                    )}
                    <td className="py-3 px-4"><StatusBadge status={lead.status} /></td>
                    <td className="py-3 px-4">
                      {lead.personas ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: lead.personas.color || '#6366f1' }} />
                          <span className="text-gray-700">{lead.personas.name}</span>
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">{formatDate(lead.created_at)}</td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {onEnrich && (
                          <Button size="sm" variant="secondary" isLoading={enrichingIds.has(lead.id)} onClick={() => handleEnrich(lead.id)}>
                            {lead.status === 'pending' ? 'Enrich' : 'Re-enrich'}
                          </Button>
                        )}
                        {lead.workflow_triggered && (
                          <span className="text-xs text-green-600 font-medium">Workflow sent</span>
                        )}
                        {onDelete && (
                          <Button size="sm" variant="danger" isLoading={deletingIds.has(lead.id)} onClick={() => handleDelete(lead.id, name)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expandedId === lead.id && (
                    <tr key={`${lead.id}-expanded`} className="bg-gray-50">
                      <td colSpan={colSpan} className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-4 items-start">
                          {lead.attribution && Object.keys(lead.attribution).length > 0 && (
                            <div className="col-span-2">
                              <h4 className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">Attribution</h4>
                              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                                {lead.attribution.campaign && (
                                  <><dt className="text-gray-500 text-xs">Campaign</dt><dd className="text-gray-800 text-xs font-medium truncate">{lead.attribution.campaign}</dd></>
                                )}
                                {lead.attribution.utmContent && (
                                  <><dt className="text-gray-500 text-xs">Ad</dt><dd className="text-gray-800 text-xs font-medium truncate">{lead.attribution.utmContent}</dd></>
                                )}
                                {lead.attribution.utmMedium && (
                                  <><dt className="text-gray-500 text-xs">Ad Set</dt><dd className="text-gray-800 text-xs font-medium truncate">{lead.attribution.utmMedium}</dd></>
                                )}
                                {lead.attribution.formName && (
                                  <><dt className="text-gray-500 text-xs">Form</dt><dd className="text-gray-800 text-xs font-medium truncate">{lead.attribution.formName}</dd></>
                                )}
                                {lead.attribution.sessionSource && (
                                  <><dt className="text-gray-500 text-xs">Session Source</dt><dd className="text-gray-800 text-xs font-medium">{lead.attribution.sessionSource}</dd></>
                                )}
                                {lead.attribution.adId && (
                                  <><dt className="text-gray-500 text-xs">Ad ID</dt><dd className="text-gray-800 text-xs font-mono">{lead.attribution.adId}</dd></>
                                )}
                              </dl>
                            </div>
                          )}
                          {lead.persona_reasoning && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">AI Reasoning</h4>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.persona_reasoning}</p>
                            </div>
                          )}
                          {lead.error_message && (
                            <div>
                              <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Error</h4>
                              <p className="text-sm text-red-700">{lead.error_message}</p>
                            </div>
                          )}
                          {lead.enriched_data && Object.keys(lead.enriched_data).length > 0 && (() => {
                            const raw = lead.enriched_data as Record<string, unknown>
                            const apolloEntries = Object.entries(raw).filter(([k]) => !k.startsWith('lusha_') && k !== 'apollo_raw' && k !== 'lusha_raw')
                            const lushaEntries = Object.entries(raw).filter(([k]) => k.startsWith('lusha_') && k !== 'lusha_raw')
                            const hasLusha = 'lusha_raw' in raw

                            const renderValue = (v: unknown) => {
                              if (Array.isArray(v)) {
                                if (v.length === 0) return <span className="text-gray-400 italic">None found</span>
                                return (
                                  <div className="space-y-0.5">
                                    {v.map((item, i) =>
                                      typeof item === 'object' && item !== null
                                        ? <span key={i} className="block text-xs">{Object.entries(item as Record<string, unknown>).filter(([, val]) => val).map(([ik, iv]) => `${ik}: ${iv}`).join(' · ')}</span>
                                        : <span key={i} className="block">{String(item)}</span>
                                    )}
                                  </div>
                                )
                              }
                              if (typeof v === 'object' && v !== null) return <span className="text-xs">{JSON.stringify(v)}</span>
                              return <span>{String(v ?? '—')}</span>
                            }

                            const renderSection = (entries: [string, unknown][], label: string, color: string, badge: string) => (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</h4>
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badge}`}>source</span>
                                </div>
                                <dl className="text-sm space-y-1">
                                  {entries.map(([k, v]) => (
                                    <div key={k} className="flex gap-2">
                                      <dt className="text-gray-500 capitalize min-w-[130px] shrink-0">{k.replace(/^lusha_/, '').replace(/_/g, ' ')}:</dt>
                                      <dd className="text-gray-800">{renderValue(v)}</dd>
                                    </div>
                                  ))}
                                </dl>
                              </div>
                            )

                            return (
                              <div className={`col-span-2 grid gap-4 ${hasLusha ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {renderSection(apolloEntries, 'Apollo.io', 'text-blue-600', 'bg-blue-50 text-blue-600')}
                                {hasLusha && (
                                  lushaEntries.length > 0
                                    ? renderSection(lushaEntries, 'Lusha', 'text-purple-600', 'bg-purple-50 text-purple-600')
                                    : (
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <h4 className="text-xs font-semibold uppercase tracking-wide text-purple-600">Lusha</h4>
                                          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-purple-50 text-purple-600">source</span>
                                        </div>
                                        <p className="text-sm text-gray-400 italic">No contact found in Lusha database</p>
                                      </div>
                                    )
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
