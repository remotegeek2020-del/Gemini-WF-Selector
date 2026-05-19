export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const BUCKET = 'persona-avatars'

type Params = { params: { accountId: string; personaId: string } }

async function authorizeRequest(accountId: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401, supabase: null }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, account_id')
    .eq('user_id', user.id)
    .single()

  if (!roleData) return { error: 'Forbidden', status: 403, supabase: null }
  if (roleData.role === 'sub_account' && roleData.account_id !== accountId) {
    return { error: 'Forbidden', status: 403, supabase: null }
  }

  return { error: null, status: 200, supabase }
}

// POST /api/accounts/[accountId]/personas/[personaId]/avatar
// Body: multipart/form-data with field "file"  → user upload
// Body: JSON { generate: true }                → AI generation
export async function POST(request: NextRequest, { params }: Params) {
  const { accountId, personaId } = params
  const auth = await authorizeRequest(accountId)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const contentType = request.headers.get('content-type') || ''
  let imageBuffer: Buffer
  let mimeType = 'image/png'

  if (contentType.includes('multipart/form-data')) {
    // ── User upload ──────────────────────────────────────────
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'File must be JPEG, PNG, or WebP' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
    }

    mimeType = file.type
    imageBuffer = Buffer.from(await file.arrayBuffer())
  } else {
    // ── AI generation ────────────────────────────────────────
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!body.generate) {
      return NextResponse.json({ error: 'Set generate:true or send a file' }, { status: 400 })
    }

    // Load AI config from agency settings
    const admin = createAdminClient()
    const { data: settingRow } = await admin
      .from('agency_settings')
      .select('setting_value')
      .eq('setting_key', 'persona_gen_ai')
      .single()

    const config = settingRow?.setting_value as
      | { provider?: string; model?: string; api_key?: string }
      | undefined

    if (!config?.api_key || !config?.provider) {
      return NextResponse.json(
        { error: 'AI is not configured. Set up an AI provider in Agency Settings.' },
        { status: 400 }
      )
    }

    // Check per-account AI enable flag
    const { data: accountRow } = await admin
      .from('accounts')
      .select('persona_gen_ai_enabled')
      .eq('id', accountId)
      .single()

    if (!accountRow?.persona_gen_ai_enabled) {
      return NextResponse.json(
        { error: 'AI Persona Generator is not enabled for this account.' },
        { status: 403 }
      )
    }

    // Get persona details for the prompt
    const { data: persona } = await admin
      .from('personas')
      .select('name, sample_person, description')
      .eq('id', personaId)
      .eq('account_id', accountId)
      .single()

    if (!persona) return NextResponse.json({ error: 'Persona not found' }, { status: 404 })

    const { generatePersonaAvatar } = await import('@/lib/ai/avatar-generator')
    try {
      imageBuffer = await generatePersonaAvatar(
        { provider: config.provider as 'gemini' | 'openai' | 'anthropic' | 'openrouter', model: config.model || '', apiKey: config.api_key },
        persona.name,
        persona.sample_person || '',
        persona.description
      )
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Image generation failed' },
        { status: 400 }
      )
    }
  }

  // ── Upload to Supabase Storage ─────────────────────────────
  const admin = createAdminClient()
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png'
  const storagePath = `${accountId}/${personaId}.${ext}`

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, imageBuffer, {
      contentType: mimeType,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 })
  }

  const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`

  // Update persona record
  const { error: updateError } = await admin
    .from('personas')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', personaId)
    .eq('account_id', accountId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ avatar_url: avatarUrl })
}

// DELETE — remove avatar
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { accountId, personaId } = params
  const auth = await authorizeRequest(accountId)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  // Remove all possible extensions
  await Promise.allSettled(
    ['png', 'jpg', 'webp'].map((ext) =>
      admin.storage.from(BUCKET).remove([`${accountId}/${personaId}.${ext}`])
    )
  )

  await admin
    .from('personas')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', personaId)
    .eq('account_id', accountId)

  return NextResponse.json({ success: true })
}
