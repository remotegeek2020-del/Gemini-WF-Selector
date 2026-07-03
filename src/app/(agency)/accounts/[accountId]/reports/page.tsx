'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ReportSummary, PersonaReport, Lead } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface StatCardProps {
  title: string
  value: number
  color: string
}

function StatCard({ title, value, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function exportLeadsCSV(leads: Lead[], personaName?: string) {
  const rows = [
    ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Title', 'LinkedIn Profile', 'Persona', 'Status', 'Source', 'Created'],
    ...leads.map((lead) => {
      const ed = (lead.enriched_data || {}) as Record<string, unknown>
      const apolloRaw = (ed.apollo_raw || {}) as Record<string, unknown>
      const company = (ed.current_company as string) || (apolloRaw.organization as Record<string,string> | undefined)?.name || ''
      const title = (ed.title as string) || (apolloRaw.title as string) || ''
      const linkedin = (ed.linkedin_url as string) || (apolloRaw.linkedin_url as string) || (ed.hl_linkedin_url as string) || ''
      return [
        lead.first_name || '',
        lead.last_name || '',
        lead.email || '',
        lead.phone || '',
        company,
        title,
        linkedin,
        lead.personas?.name || '',
        lead.status,
        lead.source || '',
        lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-US') : '',
      ]
    }),
  ]

  const csv = rows.map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads${personaName ? `-${personaName.replace(/\s+/g, '-')}` : ''}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function getPipelineLabel(slug: string): string {
  const labels: Record<string, string> = { main: 'Main (LinkedIn)', nurture: 'Nurture' }
  return labels[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function AccountReportsPage({ params }: { params: { accountId: string } }) {
  const { accountId } = params
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [personaReports, setPersonaReports] = useState<PersonaReport[]>([])
  const [pipelineBreakdown, setPipelineBreakdown] = useState<{ slug: string; total: number; assigned: number }[]>([])
  const [activePipeline, setActivePipeline] = useState<string>('all')
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLeadsLoading, setIsLeadsLoading] = useState(false)

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true)
      try {
        const qs = activePipeline !== 'all' ? `?pipeline=${activePipeline}` : ''
        const res = await fetch(`/api/accounts/${accountId}/reports${qs}`)
        if (!res.ok) throw new Error('Failed to fetch reports')
        const data = await res.json()
        setSummary(data.summary)
        setPersonaReports(data.personaReports || [])
        setPipelineBreakdown(data.pipelineBreakdown || [])
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchReports()
  }, [accountId, activePipeline])

  const fetchLeadsByPersona = useCallback(
    async (personaId: string) => {
      setIsLeadsLoading(true)
      try {
        const queryParams = new URLSearchParams({ limit: '100', pipeline: activePipeline })
        if (personaId && personaId !== 'unassigned') {
          queryParams.set('persona_id', personaId)
        }
        const res = await fetch(`/api/accounts/${accountId}/leads?${queryParams}`)
        if (!res.ok) throw new Error('Failed to fetch leads')
        const data = await res.json()
        setLeads(data.leads || [])
      } catch (err) {
        console.error(err)
      } finally {
        setIsLeadsLoading(false)
      }
    },
    [accountId, activePipeline]
  )

  useEffect(() => {
    fetchLeadsByPersona(selectedPersonaId)
  }, [selectedPersonaId, fetchLeadsByPersona])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  const allPipelinesTotal = pipelineBreakdown.reduce((s, p) => s + p.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Lead enrichment and persona assignment summary</p>
        </div>
        {pipelineBreakdown.length > 1 && (
          <select
            value={activePipeline}
            onChange={(e) => { setActivePipeline(e.target.value); setSelectedPersonaId('') }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Channels</option>
            {pipelineBreakdown.map((p) => (
              <option key={p.slug} value={p.slug}>{getPipelineLabel(p.slug)}</option>
            ))}
          </select>
        )}
      </div>

      {/* Channel breakdown */}
      {pipelineBreakdown.length > 1 && (
        <Card>
          <CardHeader><CardTitle>Leads by Channel</CardTitle></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Channel</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Total Leads</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Assigned</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pipelineBreakdown.map((p) => (
                  <tr
                    key={p.slug}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${activePipeline === p.slug ? 'bg-indigo-50' : ''}`}
                    onClick={() => { setActivePipeline(activePipeline === p.slug ? 'all' : p.slug); setSelectedPersonaId('') }}
                  >
                    <td className="py-3 px-6 font-medium text-gray-900">{getPipelineLabel(p.slug)}</td>
                    <td className="py-3 px-6 font-semibold text-gray-900">{p.total}</td>
                    <td className="py-3 px-6 text-green-700 font-medium">{p.assigned}</td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[100px]">
                          <div
                            className="h-1.5 rounded-full bg-indigo-500"
                            style={{ width: `${allPipelinesTotal ? Math.round((p.total / allPipelinesTotal) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {allPipelinesTotal ? Math.round((p.total / allPipelinesTotal) * 100) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Total Leads" value={summary.total} color="text-gray-900" />
          <StatCard title="Assigned" value={summary.assigned} color="text-green-600" />
          <StatCard title="Pending" value={summary.pending} color="text-yellow-600" />
          <StatCard title="Enriching" value={summary.enriching} color="text-blue-600" />
          <StatCard title="Failed" value={summary.failed} color="text-red-600" />
          <StatCard title="No Persona" value={summary.no_persona} color="text-gray-500" />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Leads by Persona</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Persona</th>
                <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Lead Count</th>
                <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Last Lead Date</th>
                <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {personaReports.map((report) => (
                <tr
                  key={report.persona_id || 'unassigned'}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() =>
                    setSelectedPersonaId(
                      report.persona_id
                        ? report.persona_id === selectedPersonaId ? '' : report.persona_id
                        : 'unassigned'
                    )
                  }
                >
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: report.persona_color }} />
                      <span className="font-medium text-gray-900">{report.persona_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-6 font-semibold text-gray-900">{report.count}</td>
                  <td className="py-3 px-6 text-gray-600">{formatDate(report.last_lead_date)}</td>
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[100px]">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            backgroundColor: report.persona_color,
                            width: `${summary ? Math.round((report.count / summary.total) * 100) : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {summary ? Math.round((report.count / summary.total) * 100) : 0}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {personaReports.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">No lead data yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {selectedPersonaId
                ? `Leads — ${personaReports.find((p) => p.persona_id === selectedPersonaId)?.persona_name || 'Selected Persona'}`
                : 'All Leads'}
            </CardTitle>
            <div className="flex items-center gap-3">
              {leads.length > 0 && (
                <button
                  onClick={() =>
                    exportLeadsCSV(
                      leads,
                      personaReports.find((p) => p.persona_id === selectedPersonaId)?.persona_name
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 rounded-md px-3 py-1.5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              )}
              {selectedPersonaId && (
                <button
                  onClick={() => setSelectedPersonaId('')}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLeadsLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Name</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Email</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Source</th>
                    {activePipeline === 'all' && <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Channel</th>}
                    <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Persona</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="py-3 px-6 font-medium text-gray-900">
                        {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || (
                          <span className="text-gray-400 italic">Unknown</span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-gray-600">{lead.email || '—'}</td>
                      <td className="py-3 px-6 text-gray-600 capitalize">{lead.source || '—'}</td>
                      {activePipeline === 'all' && (
                        <td className="py-3 px-6">
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium">
                            {getPipelineLabel(lead.pipeline)}
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-6"><StatusBadge status={lead.status} /></td>
                      <td className="py-3 px-6">
                        {lead.personas ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lead.personas.color || '#6366f1' }} />
                            {lead.personas.name}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-gray-500 text-xs">{formatDate(lead.created_at)}</td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={activePipeline === 'all' ? 7 : 6} className="py-8 text-center text-gray-400 text-sm">No leads found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
