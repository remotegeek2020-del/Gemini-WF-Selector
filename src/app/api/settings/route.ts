export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, service, key_value, extra_data, updated_at')
    .in('service', ['gemini', 'apollo', 'highlevel'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mask the key values for display
  const maskedKeys = (data || []).map((k) => ({
    ...k,
    key_value_masked: maskApiKey(k.key_value),
  }))

  return NextResponse.json({ apiKeys: maskedKeys })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

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

  const validServices = ['gemini', 'apollo', 'highlevel']
  if (!validServices.includes(service as string)) {
    return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
  }

  // Upsert the API key
  const { data, error } = await supabase
    .from('api_keys')
    .upsert(
      {
        service,
        key_value,
        extra_data: extra_data || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'service' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data.id })
}

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '****'
  return key.slice(0, 4) + '****' + key.slice(-4)
}
