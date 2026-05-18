export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, account_id')
    .eq('user_id', user.id)
    .single()

  if (!roleData || roleData.role !== 'agency_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get accounts with lead counts
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get lead counts per account
  const { data: leadCounts } = await supabase
    .from('leads')
    .select('account_id')

  const countMap: Record<string, number> = {}
  for (const lead of leadCounts || []) {
    countMap[lead.account_id] = (countMap[lead.account_id] || 0) + 1
  }

  const accountsWithCounts = (accounts || []).map((a) => ({
    ...a,
    lead_count: countMap[a.id] || 0,
  }))

  return NextResponse.json({ accounts: accountsWithCounts })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!roleData || roleData.role !== 'agency_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, slug } = body

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
  }

  const { data: account, error } = await supabase
    .from('accounts')
    .insert({ name, slug })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ account }, { status: 201 })
}
