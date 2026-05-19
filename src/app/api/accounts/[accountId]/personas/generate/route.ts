export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { generatePersonaContent } from '@/lib/ai/persona-generator'

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

  const admin = createAdminClient()

  const [settingsResult, accountResult] = await Promise.all([
    admin.from('agency_settings').select('value').eq('key', 'persona_gen_ai').single(),
    admin.from('accounts').select('persona_gen_ai_enabled').eq('id', params.accountId).single(),
  ])

  const config = settingsResult.data?.value as Record<string, unknown> | null
  if (!config?.api_key || !config?.provider || !config?.model) {
    return NextResponse.json({ error: 'AI persona generation is not configured' }, { status: 403 })
  }

  if (!accountResult.data?.persona_gen_ai_enabled) {
    return NextResponse.json({ error: 'AI persona generation is not enabled for this account' }, { status: 403 })
  }

  let body: { prompt?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
  }

  try {
    const result = await generatePersonaContent(
      {
        provider: config.provider as 'gemini' | 'openai' | 'anthropic' | 'openrouter',
        model: config.model as string,
        apiKey: config.api_key as string,
      },
      body.prompt.trim()
    )
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
