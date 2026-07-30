'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Lead, Pipeline } from '@/types'
import LeadsTable from '@/components/leads-table'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SubAccountDashboardPage() {
  const searchParams = useSearchParams()
  const leadFromUrl = searchParams.get('lead')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [activePipeline, setActivePipeline] = useState<string>('main')
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getAccountId = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('account_id')
        .eq('user_id', user.id)
        .single()
      if (roleData?.account_id) setAccountId(roleData.account_id)
    }
    getAccountId()
  }, [])

  useEffect(() => {
    if (!accountId) return
    fetch(`/api/accounts/${accountId}/pipelines`)
      .then((r) => r.json())
      .then((d) => { if (d.pipelines?.length) setPipelines(d.pipelines) })
      .catch(() => {})
  }, [accountId])

  const pipelineOptions = pipelines.length > 1
    ? [{ id: 'all', name: 'All Channels', slug: 'all' }, ...pipelines]
    : pipelines

  const fetchLeads = useCallback(async () => {
    if (!accountId) return
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '100', pipeline: activePipeline })
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/accounts/${accountId}/leads?${params}`)
      if (!res.ok) throw new Error('Failed to fetch leads')
      const data = await res.json()
      setLeads(data.leads || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setIsLoading(false)
    }
  }, [accountId, statusFilter, activePipeline])

  useEffect(() => {
    if (accountId) fetchLeads()
  }, [fetchLeads, accountId])

  const handleEnrich = async (leadId: string) => {
    if (!accountId) return
    const res = await fetch(`/api/accounts/${accountId}/leads/${leadId}/enrich`, {
      method: 'POST',
    })
    if (!res.ok) {
      const data = await res.json()
      alert(`Enrichment failed: ${data.error}`)
      return
    }
    await fetchLeads()
  }

  const handleDelete = async (leadId: string) => {
    if (!accountId) return
    const res = await fetch(`/api/accounts/${accountId}/leads/${leadId}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      alert(`Delete failed: ${data.error}`)
      return
    }
    await fetchLeads()
  }

  const handleBulkDelete = async (ids: string[]) => {
    if (!accountId) return
    const res = await fetch(`/api/accounts/${accountId}/leads`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(`Bulk delete failed: ${data.error}`)
      return
    }
    await fetchLeads()
  }

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'enriching', label: 'Enriching' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'failed', label: 'Failed' },
    { value: 'no_persona', label: 'No Persona' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} total lead{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pipelineOptions.length > 1 && (
            <select
              value={activePipeline}
              onChange={(e) => setActivePipeline(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {pipelineOptions.map((p) => (
                <option key={p.id} value={p.slug}>{p.name}</option>
              ))}
            </select>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={fetchLeads} size="sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <LeadsTable leads={leads} onEnrich={handleEnrich} onDelete={handleDelete} onBulkDelete={handleBulkDelete} showPipeline={activePipeline === 'all'} initialExpandedId={leadFromUrl} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
