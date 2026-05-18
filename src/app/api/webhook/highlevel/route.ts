export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const expectedSecret = process.env.WEBHOOK_SECRET

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  const tags = (body.tags || []) as string[]
  const tagsLower = tags.map((t: string) => t.toLowerCase())

  if (tagsLower.some((t) => t.includes('facebook') || t.includes('fb'))) {
    source = 'facebook'
  } else if (tagsLower.some((t) => t.includes('linkedin'))) {
    source = 'linkedin'
  } else if (tagsLower.some((t) => t.includes('google'))) {
    source = 'google'
  }

  // Also check customFields if present
  const customFields = body.customFields as Record<string, unknown>[] | undefined
  if (customFields && Array.isArray(customFields)) {
    for (const field of customFields) {
      const fieldValue = String(field.value || '').toLowerCase()
      if (fieldValue.includes('facebook')) source = 'facebook'
      else if (fieldValue.includes('linkedin')) source = 'linkedin'
      else if (fieldValue.includes('google')) source = 'google'
    }
  }

  const supabase = createServerClient()

  // Create lead record
  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert({
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

  // Trigger enrichment asynchronously by calling the enrich endpoint
  // We don't await this so the webhook returns immediately
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
  const enrichUrl = `${baseUrl}/api/leads/${lead.id}/enrich`

  fetch(enrichUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).catch((err) => {
    console.error('Failed to trigger enrichment:', err)
  })

  return NextResponse.json({ success: true, leadId: lead.id }, { status: 200 })
}
