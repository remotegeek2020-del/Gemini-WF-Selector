import type { EmailConfig, EmailMessage } from '../index'

export async function sendViaPostmark(
  config: EmailConfig,
  message: EmailMessage
): Promise<{ success: boolean; error?: string }> {
  const from = `${config.senderName} <${config.senderEmail}>`

  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': config.apiKey,
    },
    body: JSON.stringify({
      From: from,
      To: message.to,
      Subject: message.subject,
      HtmlBody: message.html,
      TextBody: message.text ?? '',
      MessageStream: 'outbound',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    return { success: false, error: `Postmark error ${res.status}: ${body}` }
  }

  return { success: true }
}
