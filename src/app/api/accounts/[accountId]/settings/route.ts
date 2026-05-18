export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

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

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, service, key_value, extra_data, updated_at')
    .eq('account_id', params.accountId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ apiKeys: data || [] })
}

export async function POST(
  request: NextRequest,
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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { service, key_value, extra_data } = body

  if (!service || !key_value) {
    return NextResponse.json({ error: 'Service and key_value are required' }, { status: 400 })
  }

  const validServices = ['ai_model', 'gemini', 'apollo', 'highlevel']
  if (!validServices.includes(service as string)) {
    return NextResponse.json(
      { error: `Invalid service. Must be one of: ${validServices.join(', ')}` },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('api_keys')
    .upsert(
      {
        account_id: params.accountId,
        service,
        key_value,
        extra_data: extra_data || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'account_id,service' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ apiKey: data }, { status: 200 })
}
