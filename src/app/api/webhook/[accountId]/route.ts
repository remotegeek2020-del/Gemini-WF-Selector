export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const { accountId } = params
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  // The secret is the first 16 chars of accountId with hyphens removed
  // Validate if provided (optional extra security)
  const expectedSecret = accountId.replace(/-/g, '').substring(0, 16)
  if (secret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify account exists
  const supabase = createAdminClient()
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Extract contact data from Highlevel webhook payload
  const contactId = (body.contactId || body.id || body.contact_id) as string | undefined
  const firstName = (body.firstName || body.first_name) as string | undefined
  const lastName = (body.lastName || body.last_name) as string | undefined
  const email = body.email as string | undefined
  const phone = (body.phone || body.phoneRaw) as string | undefined

  // Determine source from tags or custom fields
  let source = 'other'
  const rawTags = body.tags
  const tags = Array.isArray(rawTags) ? rawTags : typeof rawTags === 'string' ? [rawTags] : []
  const tagsLower = tags.map((t: string) => t.toLowerCase())

  if (tagsLower.some((t) => t.includes('facebook') || t.includes('fb'))) {
    source = 'facebook'
  } else if (tagsLower.some((t) => t.includes('linkedin'))) {
    source = 'linkedin'
  } else if (tagsLower.some((t) => t.includes('google'))) {
    source = 'google'
  }

  const customFields = body.customFields as Record<string, unknown>[] | undefined
  if (customFields && Array.isArray(customFields)) {
    for (const field of customFields) {
      const fieldValue = String(field.value || '').toLowerCase()
      if (fieldValue.includes('facebook')) source = 'facebook'
      else if (fieldValue.includes('linkedin')) source = 'linkedin'
      else if (fieldValue.includes('google')) source = 'google'
    }
  }

  // Create lead record scoped to this account
  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert({
      account_id: accountId,
      highlevel_contact_id: contactId || null,
      first_name: firstName || null,
      last_name: lastName || null,
      email: email || null,
      phone: phone || null,
      source,
      raw_data: body,
      status: 'pending',
    })
    .select()
    .single()

  if (insertError) {
    console.error('Failed to insert lead:', insertError)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  // Trigger enrichment asynchronously
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
  const enrichUrl = `${baseUrl}/api/accounts/${accountId}/leads/${lead.id}/enrich`

  fetch(enrichUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).catch((err) => {
    console.error('Failed to trigger enrichment:', err)
  })

  return NextResponse.json({ success: true, leadId: lead.id }, { status: 200 })
}
