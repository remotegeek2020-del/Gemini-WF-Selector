'use client'

import { useState, useEffect, useCallback } from 'react'
import AgencySidebar from '@/components/agency-sidebar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'

interface AgencyUser {
  user_id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
}

interface PendingInvite {
  id: string
  email: string
  created_at: string
  expires_at: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function AgencyUsersPage() {
  const [users, setUsers] = useState<AgencyUser[]>([])
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [resendingId, setResendingId] = useState<string | null>(null)
  const [resendSuccess, setResendSuccess] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [usersRes, invitesRes] = await Promise.all([
        fetch('/api/agency/users'),
        fetch('/api/agency/invites'),
      ])

      if (usersRes.status === 403 || invitesRes.status === 403) {
        setForbidden(true)
        return
      }

      if (!usersRes.ok) throw new Error('Failed to fetch users')
      if (!invitesRes.ok) throw new Error('Failed to fetch invites')

      const usersData = await usersRes.json()
      const invitesData = await invitesRes.json()

      setUsers(usersData.users ?? [])
      setInvites(invitesData.invites ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setIsInviting(true)
    setInviteError(null)
    setInviteSuccess(null)
    try {
      const res = await fetch('/api/agency/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send invite')
      setInviteSuccess(`Invite sent to ${inviteEmail.trim()}.`)
      setInviteEmail('')
      await fetchData()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setIsInviting(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setInviteEmail('')
    setInviteError(null)
    setInviteSuccess(null)
  }

  const handleResend = async (inviteId: string, email: string) => {
    setResendingId(inviteId)
    setResendSuccess(null)
    try {
      const res = await fetch('/api/agency/invites/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inviteId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to resend invite')
      setResendSuccess(`Invite resent to ${email}.`)
      await fetchData()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to resend invite')
    } finally {
      setResendingId(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    setDeletingUserId(userId)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/agency/users/${userId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete user')
      }
      await fetchData()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setDeletingUserId(null)
    }
  }

  if (forbidden) {
    return (
      <div className="flex min-h-screen">
        <AgencySidebar />
        <main className="flex-1 p-8 overflow-auto bg-gray-50">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            You do not have permission to access this page.
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <AgencySidebar />
      <main className="flex-1 p-8 overflow-auto bg-gray-50">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agency Users</h1>
            <p className="text-sm text-gray-500 mt-1">Manage agency admins and pending invitations.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite User
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {deleteError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {deleteError}
          </div>
        )}
        {resendSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            {resendSuccess}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Agency Admins</CardTitle>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No agency admins found.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left pb-3 font-medium text-gray-600">Email</th>
                        <th className="text-left pb-3 font-medium text-gray-600">Created</th>
                        <th className="text-left pb-3 font-medium text-gray-600">Last Active</th>
                        <th className="pb-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map((u) => (
                        <tr key={u.user_id}>
                          <td className="py-3 text-gray-900">{u.email}</td>
                          <td className="py-3 text-gray-500">{formatDate(u.created_at)}</td>
                          <td className="py-3 text-gray-500">
                            {u.last_sign_in_at ? formatDate(u.last_sign_in_at) : (
                              <span className="text-gray-400 italic">Never</span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteUser(u.user_id)}
                              isLoading={deletingUserId === u.user_id}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Invites</CardTitle>
              </CardHeader>
              <CardContent>
                {invites.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No pending invitations.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left pb-3 font-medium text-gray-600">Email</th>
                        <th className="text-left pb-3 font-medium text-gray-600">Invited</th>
                        <th className="text-left pb-3 font-medium text-gray-600">Expires</th>
                        <th className="pb-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invites.map((invite) => (
                        <tr key={invite.id}>
                          <td className="py-3 text-gray-900">{invite.email}</td>
                          <td className="py-3 text-gray-500">{formatDate(invite.created_at)}</td>
                          <td className="py-3 text-gray-500">{formatDate(invite.expires_at)}</td>
                          <td className="py-3 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              isLoading={resendingId === invite.id}
                              onClick={() => handleResend(invite.id, invite.email)}
                            >
                              Resend
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title="Invite Agency Admin"
          size="sm"
        >
          <form onSubmit={handleInvite} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              autoFocus
            />

            {inviteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {inviteError}
              </div>
            )}

            {inviteSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                {inviteSuccess}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isInviting}>
                Send Invite
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  )
}
