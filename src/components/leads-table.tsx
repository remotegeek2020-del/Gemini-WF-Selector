'use client'

import { useState, useEffect, useRef } from 'react'
import type { Lead } from '@/types'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface LeadsTableProps {
  leads: Lead[]
  onEnrich?: (leadId: string) => Promise<void>
  onDelete?: (leadId: string) => Promise<void>
  onBulkDelete?: (ids: string[]) => Promise<void>
  showPipeline?: boolean
  initialExpandedId?: string | null
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

const TOOL_META: Record<string, { label: string; phase: string; color: string; badgeCls: string }> = {
  apollo:       { label: 'Apollo.io',        phase: 'Phase 1',  color: 'text-indigo-600', badgeCls: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  lusha:        { label: 'Lusha',            phase: 'Phase 1',  color: 'text-indigo-500', badgeCls: 'bg-indigo-50 text-indigo-500 border-indigo-200' },
  pdl:          { label: 'People Data Labs', phase: 'Phase 2',  color: 'text-blue-600',   badgeCls: 'bg-blue-50 text-blue-600 border-blue-200' },
  datagma:      { label: 'Datagma',          phase: 'Phase 2',  color: 'text-blue-500',   badgeCls: 'bg-blue-50 text-blue-500 border-blue-200' },
  bettercontact:{ label: 'BetterContact',    phase: 'Phase 3',  color: 'text-amber-600',  badgeCls: 'bg-amber-50 text-amber-700 border-amber-200' },
  kaspr:        { label: 'Kaspr',            phase: 'Phase 3',  color: 'text-amber-500',  badgeCls: 'bg-amber-50 text-amber-600 border-amber-200' },
  cognism:      { label: 'Cognism',          phase: 'Phase 3',  color: 'text-amber-600',  badgeCls: 'bg-amber-50 text-amber-700 border-amber-200' },
  contactout:   { label: 'ContactOut',       phase: 'Phase 4',  color: 'text-emerald-600',badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  hunter:       { label: 'Hunter.io',        phase: 'Phase 4',  color: 'text-emerald-500',badgeCls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  dropcontact:  { label: 'Dropcontact',      phase: 'Phase 4',  color: 'text-emerald-600',badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  findymail:    { label: 'Findymail',        phase: 'Phase 4',  color: 'text-emerald-500',badgeCls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  enrow:        { label: 'Enrow',            phase: 'Phase 5',  color: 'text-purple-600', badgeCls: 'bg-purple-50 text-purple-700 border-purple-200' },
}

function renderEnrichVal(v: unknown): React.ReactNode {
  if (v === null || v === undefined || v === '') return <span className="text-gray-400 italic text-xs">—</span>
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="text-gray-400 italic text-xs">none</span>
    return (
      <div className="space-y-0.5">
        {v.map((item, i) =>
          typeof item === 'object' && item !== null
            ? <span key={i} className="block text-xs text-gray-700">{Object.entries(item as Record<string, unknown>).filter(([, val]) => val != null && val !== '').map(([ik, iv]) => `${ik.replace(/_/g,' ')}: ${iv}`).join(' · ')}</span>
            : <span key={i} className="block text-xs text-gray-700">{String(item)}</span>
        )}
      </div>
    )
  }
  if (typeof v === 'object') return <span className="text-xs text-gray-500 font-mono">{JSON.stringify(v)}</span>
  return <span className="text-xs text-gray-800">{String(v)}</span>
}

function ToolSection({ tool, data }: { tool: string; data: Record<string, unknown> }) {
  const meta = TOOL_META[tool]
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
  if (entries.length === 0) return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${meta?.color ?? 'text-gray-500'}`}>{meta?.label ?? tool}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${meta?.badgeCls ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>{meta?.phase ?? ''}</span>
      </div>
      <p className="text-xs text-gray-400 italic">Ran — no data returned</p>
    </div>
  )
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${meta?.color ?? 'text-gray-500'}`}>{meta?.label ?? tool}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${meta?.badgeCls ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>{meta?.phase ?? ''}</span>
      </div>
      <dl className="space-y-1">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="text-gray-500 text-xs capitalize shrink-0 min-w-[110px]">{k.replace(/^(apollo|lusha|pdl|datagma|bettercontact|kaspr|cognism|contactout|hunter|dropcontact|findymail|enrow)_/, '').replace(/_/g, ' ')}:</dt>
            <dd>{renderEnrichVal(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function getToolData(tool: string, ed: Record<string, unknown>): Record<string, unknown> | null {
  switch (tool) {
    case 'apollo': {
      const raw = ed.apollo_raw as Record<string, unknown> | null
      if (!raw) return Object.keys(ed).length ? { '(normalized)': 'no apollo_raw — see fields above' } : null
      const skip = new Set(['id', 'photo_url', 'twitter_url', 'github_url', 'facebook_url', 'extrapolated_email_confidence', 'snippets_loaded', 'is_likely_to_engage', 'intent_strength', 'show_intent', 'revealed_for_current_team'])
      return Object.fromEntries(Object.entries(raw).filter(([k]) => !skip.has(k)))
    }
    case 'lusha': {
      const phones = ed.lusha_phones as string[] | undefined
      const emails = ed.lusha_emails as string[] | undefined
      return { phones: phones || [], emails: emails || [] }
    }
    case 'pdl': return (ed.pdl_raw as Record<string, unknown> | null) || { pdl_phones: ed.pdl_phones, pdl_emails: ed.pdl_emails }
    case 'datagma': return (ed.datagma_raw as Record<string, unknown> | null) || { datagma_phones: ed.datagma_phones, datagma_email: ed.datagma_email }
    case 'bettercontact': return { phones: ed.bettercontact_phones }
    case 'kaspr': return { phones: ed.kaspr_phones }
    case 'cognism': return { phones: ed.cognism_phones }
    case 'contactout': return { emails: ed.contactout_emails }
    case 'hunter': return { email: ed.hunter_email }
    case 'dropcontact': return { email: ed.dropcontact_email }
    case 'findymail': return { email: ed.findymail_email }
    case 'enrow': return { verified_emails: ed.enrow_verified_emails }
    default: return null
  }
}

const PERSONAL_DOMAINS = new Set(['gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com','aol.com','protonmail.com','mail.com','msn.com','live.com','me.com'])

function getSkipReason(tool: string, ed: Record<string, unknown>): string {
  // sources_skipped only means the tool didn't run at all (key missing or prerequisite not met)
  const linkedIn = ed.linkedin_url as string | undefined
  const allPhones = (ed.all_phones as string[] | undefined) || []
  const allEmails = (ed.all_emails as string[] | undefined) || []
  const hasWorkEmail = allEmails.some(e => {
    const domain = e.split('@')[1]?.toLowerCase()
    return domain && !PERSONAL_DOMAINS.has(domain)
  })

  switch (tool) {
    case 'apollo':
      return "No Apollo API key set up yet"
    case 'lusha':
      return "No Lusha API key set up yet"
    case 'pdl': {
      const apolloFoundProfile = !!(ed.title || ed.current_company)
      if (apolloFoundProfile && allPhones.length > 1) return "Apollo already found job title and phone — skipped to save credits"
      return "No People Data Labs API key set up yet"
    }
    case 'datagma':
      if (!linkedIn) return "Needs a LinkedIn profile URL — we didn't find one for this person"
      return "No Datagma API key set up yet"
    case 'bettercontact':
      if (allPhones.length > 1) return "Already found phone numbers earlier — skipped to save credits"
      return "No BetterContact API key set up yet"
    case 'kaspr':
      if (allPhones.length > 1) return "Already found phone numbers earlier — skipped to save credits"
      if (!linkedIn) return "Needs a LinkedIn URL — we didn't find one for this person"
      return "No Kaspr API key set up yet"
    case 'cognism':
      if (allPhones.length > 1) return "Already found phone numbers earlier — skipped to save credits"
      return "No Cognism API key set up yet"
    case 'contactout':
      if (hasWorkEmail) return "Already has a work email address — no need to search"
      if (!linkedIn) return "Needs a LinkedIn URL — we didn't find one for this person"
      return "No ContactOut API key set up yet"
    case 'hunter':
      if (hasWorkEmail) return "Already has a work email address — no need to search"
      return "No Hunter.io API key, or missing the person's full name and company website"
    case 'dropcontact':
      if (hasWorkEmail) return "Already has a work email address — no need to search"
      return "No Dropcontact API key, or missing the person's name and company"
    case 'findymail':
      if (hasWorkEmail) return "Already has a work email address — no need to search"
      if (!linkedIn) return "Needs a LinkedIn URL or name + company domain — didn't have enough info"
      return "No Findymail API key set up yet"
    case 'enrow':
      if (allEmails.length === 0) return "No email addresses to verify — nothing to check"
      return "No Enrow API key set up yet"
    default:
      return `No API key set up for ${TOOL_META[tool]?.label ?? tool}`
  }
}

function EnrichmentWaterfall({ enrichedData }: { enrichedData: Record<string, unknown> }) {
  const ed = enrichedData
  const sourcesUsed = (ed.sources_used as string[] | undefined) || []
  const sourcesSkipped = (ed.sources_skipped as string[] | undefined) || []
  const hasWaterfall = sourcesUsed.length > 0 || sourcesSkipped.length > 0

  // Legacy leads (no sources_used): fall back to old Apollo/Lusha display
  if (!hasWaterfall) {
    const apolloEntries = Object.entries(ed).filter(([k]) => !k.startsWith('lusha_') && k !== 'apollo_raw' && k !== 'lusha_raw')
    const lushaEntries = Object.entries(ed).filter(([k]) => k.startsWith('lusha_') && k !== 'lusha_raw')
    const hasLusha = 'lusha_raw' in ed
    return (
      <div className={`col-span-2 grid gap-4 ${hasLusha ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Apollo.io</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-600 border-indigo-200 font-medium">source</span>
          </div>
          <dl className="space-y-1">{apolloEntries.map(([k, v]) => <div key={k} className="flex gap-2"><dt className="text-gray-500 text-xs capitalize shrink-0 min-w-[110px]">{k.replace(/_/g,' ')}:</dt><dd>{renderEnrichVal(v)}</dd></div>)}</dl>
        </div>
        {hasLusha && (lushaEntries.length > 0
          ? <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Lusha</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-500 border-indigo-200 font-medium">source</span>
              </div>
              <dl className="space-y-1">{lushaEntries.map(([k, v]) => <div key={k} className="flex gap-2"><dt className="text-gray-500 text-xs capitalize shrink-0 min-w-[110px]">{k.replace(/^lusha_/,'').replace(/_/g,' ')}:</dt><dd>{renderEnrichVal(v)}</dd></div>)}</dl>
            </div>
          : <div><div className="flex items-center gap-1.5 mb-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Lusha</span></div><p className="text-xs text-gray-400 italic">No contact found in Lusha database</p></div>
        )}
      </div>
    )
  }

  const allTools = Object.keys(TOOL_META)
  return (
    <div className="col-span-2 space-y-3">
      {/* Waterfall summary bar */}
      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-gray-100">
        {allTools.map((t) => {
          const used = sourcesUsed.includes(t)
          const skipped = sourcesSkipped.includes(t)
          if (!used && !skipped) return null
          const meta = TOOL_META[t]
          return used
            ? <span key={t} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.badgeCls}`}>
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd"/></svg>
                {meta.label}
              </span>
            : <span key={t} className="relative group inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-gray-50 text-gray-400 border-gray-200 cursor-help">
                — {meta.label}
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 w-52 rounded-md bg-gray-900 px-2.5 py-1.5 text-[10px] leading-relaxed text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg text-center">
                  {getSkipReason(t, ed)}
                </span>
              </span>
        })}
      </div>
      {/* Per-tool sections for tools that ran */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {sourcesUsed.map((tool) => {
          const data = getToolData(tool, ed)
          return data ? <ToolSection key={tool} tool={tool} data={data} /> : null
        })}
      </div>
    </div>
  )
}

export default function LeadsTable({ leads, onEnrich, onDelete, onBulkDelete, showPipeline, initialExpandedId }: LeadsTableProps) {
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId || null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const highlightRowRef = useRef<HTMLTableRowElement>(null)

  // Scroll to the highlighted lead when it's available
  useEffect(() => {
    if (initialExpandedId && highlightRowRef.current) {
      setTimeout(() => highlightRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
    }
  }, [initialExpandedId, leads.length])

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
                    ref={lead.id === initialExpandedId ? highlightRowRef : undefined}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : ''} ${lead.id === initialExpandedId ? 'ring-2 ring-indigo-400 ring-inset' : ''}`}
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
                      <div className="flex items-center gap-1.5">
                        {lead.is_hot && (
                          <span title="AI-flagged high-priority lead" className="text-base leading-none">🔥</span>
                        )}
                        <div className="font-medium text-gray-900">
                          {name !== 'Unknown' ? name : <span className="text-gray-400 italic">Unknown</span>}
                        </div>
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
                          {lead.is_hot && lead.hot_reasoning && (
                            <div className="col-span-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-base">🔥</span>
                                <h4 className="text-xs font-semibold text-orange-700 uppercase tracking-wide">AI: High-Priority Lead</h4>
                              </div>
                              <p className="text-sm text-orange-900">{lead.hot_reasoning}</p>
                              <p className="text-xs text-orange-500 italic mt-1">AI assessment only — use as a guide. Your judgment is final.</p>
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
                          {lead.enriched_data && Object.keys(lead.enriched_data).length > 0 && (
                            <EnrichmentWaterfall enrichedData={lead.enriched_data} />
                          )}
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
