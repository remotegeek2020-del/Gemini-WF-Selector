export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { ReportSummary, PersonaReport } from '@/types'

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

  const { data: statusCounts, error: statusError } = await supabase
    .from('leads')
    .select('status')
    .eq('account_id', params.accountId)

  if (statusError) return NextResponse.json({ error: statusError.message }, { status: 500 })

  const summary: ReportSummary = {
    total: statusCounts?.length || 0,
    assigned: statusCounts?.filter((l) => l.status === 'assigned').length || 0,
    pending: statusCounts?.filter((l) => l.status === 'pending').length || 0,
    failed: statusCounts?.filter((l) => l.status === 'failed').length || 0,
    no_persona: statusCounts?.filter((l) => l.status === 'no_persona').length || 0,
    enriching: statusCounts?.filter((l) => l.status === 'enriching').length || 0,
  }

  const { data: leadsWithPersonas, error: leadsError } = await supabase
    .from('leads')
    .select('assigned_persona_id, created_at, personas(id, name, color)')
    .eq('account_id', params.accountId)
    .order('created_at', { ascending: false })

  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 })

  const personaMap = new Map<
    string,
    { name: string; color: string; count: number; last_lead_date: string | null }
  >()

  for (const lead of leadsWithPersonas || []) {
    const personaId = lead.assigned_persona_id || 'unassigned'
    const personaName =
      (lead.personas as { name?: string; color?: string } | null)?.name || 'Unassigned'
    const personaColor =
      (lead.personas as { name?: string; color?: string } | null)?.color || '#6b7280'

    if (!personaMap.has(personaId)) {
      personaMap.set(personaId, { name: personaName, color: personaColor, count: 0, last_lead_date: null })
    }

    const entry = personaMap.get(personaId)!
    entry.count++
    if (!entry.last_lead_date || lead.created_at > entry.last_lead_date) {
      entry.last_lead_date = lead.created_at
    }
  }

  const personaReports: PersonaReport[] = Array.from(personaMap.entries())
    .map(([persona_id, data]) => ({
      persona_id: persona_id === 'unassigned' ? null : persona_id,
      persona_name: data.name,
      persona_color: data.color,
      count: data.count,
      last_lead_date: data.last_lead_date,
    }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ summary, personaReports })
}
