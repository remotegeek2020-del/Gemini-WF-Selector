export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('agency_settings')
    .select('value')
    .eq('key', 'persona_gen_ai')
    .single()

  const config = data?.value as Record<string, unknown> | null
  return NextResponse.json({ enabled: config?.enabled === true })
}
