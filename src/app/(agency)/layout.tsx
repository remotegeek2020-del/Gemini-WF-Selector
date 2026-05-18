export const dynamic = 'force-dynamic'

import AgencySidebar from '@/components/agency-sidebar'

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AgencySidebar />
      <main className="flex-1 p-8 overflow-auto bg-gray-50">{children}</main>
    </div>
  )
}
