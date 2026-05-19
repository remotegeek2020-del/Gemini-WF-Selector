export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getWorkflows } from '@/lib/highlevel/client'

export async function GET(
  _request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, account_id')
    .eq('user_id', user.id)
    .single()

  if (!roleData) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (roleData.role === 'sub_account' && roleData.account_id !== params.accountId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: hlKey } = await supabase
    .from('api_keys')
    .select('key_value, extra_data')
    .eq('account_id', params.accountId)
    .eq('service', 'highlevel')
    .single()

  if (!hlKey) {
    return NextResponse.json({ error: 'Highlevel API key not configured' }, { status: 404 })
  }

  const locationId = (hlKey.extra_data as Record<string, string> | null)?.location_id
  if (!locationId) {
    return NextResponse.json({ error: 'Highlevel Location ID not configured' }, { status: 400 })
  }

  const result = await getWorkflows(hlKey.key_value, locationId)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  return NextResponse.json({ workflows: result.workflows })
}
