export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

async function requireAgencyAdmin(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  return role?.role === 'agency_admin' ? user : null
}

export async function GET() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('persona_library')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const user = await requireAgencyAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('persona_library')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data }, { status: 201 })
}
