export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import AccountSidebar from '@/components/account-sidebar'

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { accountId: string }
}) {
  const supabase = createServerClient()
  const { data: account } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('id', params.accountId)
    .single()

  if (!account) {
    notFound()
  }

  return (
    <div className="flex min-h-screen">
      <AccountSidebar
        accountId={params.accountId}
        accountName={account.name}
        isAgencyAdmin={true}
      />
      <main className="flex-1 p-8 overflow-auto bg-gray-50">{children}</main>
    </div>
  )
}
