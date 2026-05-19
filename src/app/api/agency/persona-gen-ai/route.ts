export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')

  const admin = createAdminClient()
  const { data: settingsRow } = await admin
    .from('agency_settings')
    .select('value')
    .eq('key', 'persona_gen_ai')
    .single()

  const config = settingsRow?.value as Record<string, unknown> | null
  const globalConfigured = !!(config?.api_key && config?.provider && config?.model)

  if (!accountId) {
    return NextResponse.json({ configured: globalConfigured, enabled: false })
  }

  const { data: accountRow } = await admin
    .from('accounts')
    .select('persona_gen_ai_enabled')
    .eq('id', accountId)
    .single()

  const perAccountEnabled = accountRow?.persona_gen_ai_enabled === true

  return NextResponse.json({
    configured: globalConfigured,
    enabled: globalConfigured && perAccountEnabled,
  })
}
