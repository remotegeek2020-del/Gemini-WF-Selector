'use client'

import { useState, useEffect } from 'react'
import type { Lead } from '@/types'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LeadDetailContent } from '@/components/leads-table'

export default function LeadModal({ lead, onClose, onEnrich, onDelete }: {
  lead: Lead
  onClose: () => void
  onEnrich?: (id: string) => Promise<void>
  onDelete?: (id: string, name: string) => Promise<void>
}) {
  const [isEnriching, setIsEnriching] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email || 'Unknown'

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleEnrich = async () => {
    if (!onEnrich) return
    setIsEnriching(true)
    try { await onEnrich(lead.id) } finally { setIsEnriching(false) }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm(`Delete lead "${name}"? This cannot be undone.`)) return
    setIsDeleting(true)
    try { await onDelete(lead.id, name) } finally { setIsDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col mt-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {lead.is_hot && <span title="AI-flagged high-priority" className="text-lg leading-none">🔥</span>}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900 truncate">
                  {name !== 'Unknown' ? name : <span className="text-gray-400 italic">Unknown</span>}
                </h2>
                <StatusBadge status={lead.status} />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {lead.personas && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lead.personas.color || '#6366f1' }} />
                    {lead.personas.name}
                  </span>
                )}
                {lead.email && <span className="text-xs text-gray-400">{lead.email}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {onEnrich && (
              <Button size="sm" variant="secondary" isLoading={isEnriching} onClick={handleEnrich}>
                {lead.status === 'pending' ? 'Enrich' : 'Re-enrich'}
              </Button>
            )}
            {onDelete && (
              <Button size="sm" variant="danger" isLoading={isDeleting} onClick={handleDelete}>
                Delete
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6">
          <LeadDetailContent lead={lead} />
        </div>
      </div>
    </div>
  )
}
