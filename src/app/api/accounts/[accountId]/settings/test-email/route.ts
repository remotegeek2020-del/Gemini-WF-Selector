export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(
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

  const [keysResult, accountResult] = await Promise.all([
    supabase
      .from('api_keys')
      .select('service, key_value, extra_data')
      .eq('account_id', params.accountId)
      .eq('service', 'postmark')
      .single(),
    supabase
      .from('accounts')
      .select('notification_emails')
      .eq('id', params.accountId)
      .single(),
  ])

  const postmarkKey = keysResult.data?.key_value
  const postmarkFrom = (keysResult.data?.extra_data as Record<string, string> | null)?.from_email
  const globalEmails: string[] = accountResult.data?.notification_emails || []

  if (!postmarkKey) {
    return NextResponse.json({ error: 'Postmark API key not configured' }, { status: 400 })
  }
  if (!postmarkFrom) {
    return NextResponse.json({ error: 'Postmark From Email not configured' }, { status: 400 })
  }
  if (globalEmails.length === 0) {
    return NextResponse.json({ error: 'No notification emails configured on this account' }, { status: 400 })
  }

  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': postmarkKey,
    },
    body: JSON.stringify({
      From: postmarkFrom,
      To: globalEmails.join(','),
      Subject: 'Lead Router — Test Email',
      HtmlBody: `<p>This is a test email from <strong>Lead Router</strong>.</p><p>If you received this, your Postmark configuration is working correctly.</p>`,
      TextBody: 'This is a test email from Lead Router. If you received this, your Postmark configuration is working correctly.',
      MessageStream: 'outbound',
    }),
  })

  const body = await res.json()

  if (!res.ok) {
    return NextResponse.json({
      error: `Postmark rejected the request (HTTP ${res.status})`,
      details: body,
    }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    message: `Test email sent to: ${globalEmails.join(', ')}`,
    postmarkMessageId: body.MessageID,
  })
}
