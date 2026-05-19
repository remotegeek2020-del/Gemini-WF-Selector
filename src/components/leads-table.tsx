'use client'

import { useState } from 'react'
import type { Lead } from '@/types'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface LeadsTableProps {
  leads: Lead[]
  onEnrich?: (leadId: string) => Promise<void>
  onDelete?: (leadId: string) => Promise<void>
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

function getSourceIcon(source: string | null): string {
  switch (source?.toLowerCase()) {
    case 'facebook':
      return 'FB'
    case 'linkedin':
      return 'LI'
    case 'google':
      return 'GG'
    default:
      return source?.slice(0, 2).toUpperCase() || '??'
  }
}

function getSourceColor(source: string | null): string {
  switch (source?.toLowerCase()) {
    case 'facebook':
      return 'bg-blue-100 text-blue-800'
    case 'linkedin':
      return 'bg-sky-100 text-sky-800'
    case 'google':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export default function LeadsTable({ leads, onEnrich, onDelete }: LeadsTableProps) {
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleEnrich = async (leadId: string) => {
    if (!onEnrich) return
    setEnrichingIds((prev) => new Set(prev).add(leadId))
    try {
      await onEnrich(leadId)
    } finally {
      setEnrichingIds((prev) => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
    }
  }

  const handleDelete = async (leadId: string, name: string) => {
    if (!onDelete) return
    if (!confirm(`Delete lead "${name}"? This cannot be undone.`)) return
    setDeletingIds((prev) => new Set(prev).add(leadId))
    try {
      await onDelete(leadId)
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
    }
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-16">
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
        <h3 className="mt-3 text-sm font-semibold text-gray-500">No leads yet</h3>
        <p className="text-xs text-gray-400 mt-1">Leads will appear here when your webhook receives data.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">
              Name
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">
              Email
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">
              Source
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">
              Status
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">
              Persona
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">
              Created
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.map((lead) => (
            <>
              <tr
                key={lead.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
              >
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900">
                    {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || (
                      <span className="text-gray-400 italic">Unknown</span>
                    )}
                  </div>
                  {lead.phone && (
                    <div className="text-xs text-gray-500 mt-0.5">{lead.phone}</div>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-600">{lead.email || '—'}</td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSourceColor(lead.source)}`}
                  >
                    {getSourceIcon(lead.source)} {lead.source || 'other'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="py-3 px-4">
                  {lead.personas ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: lead.personas.color || '#6366f1' }}
                      />
                      <span className="text-gray-700">{lead.personas.name}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                  {formatDate(lead.created_at)}
                </td>
                <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {onEnrich && (
                      <Button
                        size="sm"
                        variant="secondary"
                        isLoading={enrichingIds.has(lead.id)}
                        onClick={() => handleEnrich(lead.id)}
                      >
                        {lead.status === 'pending' ? 'Enrich' : 'Re-enrich'}
                      </Button>
                    )}
                    {lead.workflow_triggered && (
                      <span className="text-xs text-green-600 font-medium">Workflow sent</span>
                    )}
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={deletingIds.has(lead.id)}
                        onClick={() =>
                          handleDelete(
                            lead.id,
                            [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'
                          )
                        }
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
              {expandedId === lead.id && (
                <tr key={`${lead.id}-expanded`} className="bg-gray-50">
                  <td colSpan={7} className="px-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      {lead.persona_reasoning && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            AI Reasoning
                          </h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.persona_reasoning}</p>
                        </div>
                      )}
                      {lead.error_message && (
                        <div>
                          <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">
                            Error
                          </h4>
                          <p className="text-sm text-red-700">{lead.error_message}</p>
                        </div>
                      )}
                      {lead.enriched_data && Object.keys(lead.enriched_data).length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Enriched Data
                          </h4>
                          <dl className="text-sm space-y-1">
                            {Object.entries(lead.enriched_data)
                              .filter(([k]) => k !== 'apollo_raw')
                              .map(([k, v]) => (
                                <div key={k} className="flex gap-2">
                                  <dt className="text-gray-500 capitalize min-w-[120px]">
                                    {k.replace(/_/g, ' ')}:
                                  </dt>
                                  <dd className="text-gray-800">
                                    {Array.isArray(v)
                                      ? v.map((item, i) =>
                                          typeof item === 'object' && item !== null
                                            ? <span key={i} className="block text-xs">{Object.entries(item).filter(([,val]) => val).map(([ik, iv]) => `${ik}: ${iv}`).join(' · ')}</span>
                                            : <span key={i}>{String(item)}</span>
                                        )
                                      : typeof v === 'object' && v !== null
                                      ? JSON.stringify(v)
                                      : String(v ?? '—')}
                                  </dd>
                                </div>
                              ))}
                          </dl>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
