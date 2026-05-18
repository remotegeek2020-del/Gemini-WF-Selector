import { redirect } from 'next/navigation'
import { getCurrentUser, getUserRole } from '@/lib/auth'

export default async function RootPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const roleData = await getUserRole(user.id)

  if (!roleData) {
    redirect('/login')
  }

  if (roleData.role === 'agency_admin') {
    redirect('/accounts')
  }

  if (roleData.role === 'sub_account' && roleData.account_id) {
    redirect(`/accounts/${roleData.account_id}/dashboard`)
  }

  redirect('/login')
}
