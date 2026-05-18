'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface SubUser {
  user_id: string
  email: string
  created_at: string
}

export default function AccountUsersPage({ params }: { params: { accountId: string } }) {
  const { accountId } = params
  const [users, setUsers] = useState<SubUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/accounts/${accountId}/users`)
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return

    setIsAdding(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/accounts/${accountId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create user')
      }

      setSuccess(`User ${email} created successfully`)
      setEmail('')
      setPassword('')
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!confirm(`Remove ${userEmail} from this account? This will delete their login.`)) return

    setDeletingId(userId)
    setError(null)
    try {
      const res = await fetch(`/api/accounts/${accountId}/users/${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete user')
      }
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage sub-account users who can access this account.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {success}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddUser} className="space-y-3">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@client.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
              minLength={6}
            />
            <div className="flex justify-end">
              <Button type="submit" isLoading={isAdding} size="sm">
                Add User
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              No users yet. Add one above.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Email</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Created</th>
                  <th className="text-right py-3 px-6 font-medium text-gray-500 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="py-3 px-6 text-gray-900">{user.email}</td>
                    <td className="py-3 px-6 text-gray-500 text-xs">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={deletingId === user.user_id}
                        onClick={() => handleDelete(user.user_id, user.email)}
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
    </div>
  )
}
