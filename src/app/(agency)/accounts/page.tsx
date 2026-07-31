'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import AgencySidebar from '@/components/agency-sidebar'
import ToolConfigSection from '@/components/tool-config-section'
import type { Account } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}

// ── 3-dot menu per card ───────────────────────────────────────────────────────

function AccountMenu({
  account,
  onConfigureTools,
  onToggleComplimentary,
}: {
  account: Account & { lead_count?: number }
  onConfigureTools: () => void
  onToggleComplimentary: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Account options"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-sm">
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 text-gray-700 font-medium"
            onClick={() => { setOpen(false); onConfigureTools() }}
          >
            <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Configure Enrichment Tools
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 text-gray-700"
            onClick={() => { setOpen(false); onToggleComplimentary() }}
          >
            {account.is_complimentary ? (
              <>
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Switch to Paying
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Mark as Complimentary
              </>
            )}
          </button>
          <div className="my-1 border-t border-gray-100" />
          <Link
            href={`/accounts/${account.id}/dashboard`}
            className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-gray-500"
            onClick={() => setOpen(false)}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Account
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Tool Config Drawer ────────────────────────────────────────────────────────

function ToolConfigDrawer({
  account,
  onClose,
}: {
  account: Account & { lead_count?: number }
  onClose: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Enrichment Tools</h2>
            <p className="text-xs text-gray-500 mt-0.5">{account.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          <ToolConfigSection accountId={account.id} />
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<(Account & { lead_count?: number })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [configDrawer, setConfigDrawer] = useState<(Account & { lead_count?: number }) | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/accounts')
      if (!res.ok) throw new Error('Failed to fetch accounts')
      const data = await res.json()
      setAccounts(data.accounts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setIsCreating(true)
    setCreateError(null)
    try {
      const slug = generateSlug(newName)
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), slug }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create account')
      }
      setIsModalOpen(false)
      setNewName('')
      await fetchAccounts()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleComplimentary = useCallback(async (account: Account & { lead_count?: number }) => {
    setTogglingId(account.id)
    try {
      const res = await fetch(`/api/accounts/${account.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complimentary: !account.is_complimentary }),
      })
      if (res.ok) {
        setAccounts((prev) =>
          prev.map((a) => a.id === account.id ? { ...a, is_complimentary: !account.is_complimentary } : a)
        )
      }
    } finally {
      setTogglingId(null)
    }
  }, [])

  return (
    <div className="flex min-h-screen">
      <AgencySidebar />
      <main className="flex-1 p-8 overflow-auto bg-gray-50">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
            <p className="text-sm text-gray-500 mt-1">
              {accounts.length} account{accounts.length !== 1 ? 's' : ''}
              {accounts.filter((a) => a.is_complimentary).length > 0 && (
                <span className="ml-2 text-emerald-600">
                  · {accounts.filter((a) => a.is_complimentary).length} complimentary
                </span>
              )}
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Account
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-3 text-sm font-semibold text-gray-500">No accounts yet</h3>
            <p className="text-xs text-gray-400 mt-1">Create your first account to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <Card key={account.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate">{account.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">/{account.slug}</p>
                    </div>
                    <AccountMenu
                      account={account}
                      onConfigureTools={() => setConfigDrawer(account)}
                      onToggleComplimentary={() => handleToggleComplimentary(account)}
                    />
                  </div>

                  {/* Badges row */}
                  <div className="flex items-center gap-2 mt-2 mb-3 flex-wrap">
                    {account.is_complimentary ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        Complimentary
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                        </svg>
                        Paying
                      </span>
                    )}
                    {account.lead_count !== undefined && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700">
                        {account.lead_count} lead{account.lead_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    {account.tool_config?.bundle_preset && account.tool_config.bundle_preset !== 'custom' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                        {account.tool_config.bundle_preset.replace(/_/g, ' ')}
                      </span>
                    )}
                    {togglingId === account.id && (
                      <svg className="animate-spin h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 mb-4">Created {formatDate(account.created_at)}</p>

                  <Link href={`/accounts/${account.id}/dashboard`}>
                    <Button variant="secondary" size="sm" className="w-full">
                      View Account
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* New Account Modal */}
        <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setNewName(''); setCreateError(null) }} title="New Account">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Account Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Acme Corp"
              required
              autoFocus
            />
            {newName && (
              <p className="text-xs text-gray-500">
                Slug: <code className="bg-gray-100 px-1 rounded">{generateSlug(newName)}</code>
              </p>
            )}
            {createError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{createError}</div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); setNewName(''); setCreateError(null) }}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isCreating}>Create Account</Button>
            </div>
          </form>
        </Modal>

        {/* Tool Config Drawer */}
        {configDrawer && (
          <ToolConfigDrawer
            account={configDrawer}
            onClose={() => setConfigDrawer(null)}
          />
        )}
      </main>
    </div>
  )
}
