'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Account } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<(Account & { lead_count?: number })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchAccounts = async () => {
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
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''}
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
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
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
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {account.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">/{account.slug}</p>
                  </div>
                  {account.lead_count !== undefined && (
                    <span className="ml-2 flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {account.lead_count} lead{account.lead_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Created {formatDate(account.created_at)}
                </p>
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {createError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsModalOpen(false); setNewName(''); setCreateError(null) }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
