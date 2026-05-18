export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getCurrentUser, getUserRole } from '@/lib/auth'
import AccountSidebar from '@/components/account-sidebar'
import { createServerClient } from '@/lib/supabase/server'

export default async function SubAccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const roleData = await getUserRole(user.id)
  if (!roleData || !roleData.account_id) redirect('/login')

  const supabase = createServerClient()
  const { data: account } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('id', roleData.account_id)
    .single()

  return (
    <div className="flex min-h-screen">
      <AccountSidebar
        accountId={roleData.account_id}
        accountName={account?.name}
        isAgencyAdmin={false}
      />
      <main className="flex-1 p-8 overflow-auto bg-gray-50">{children}</main>
    </div>
  )
}
