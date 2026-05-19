import type { EmailConfig, EmailMessage } from '../index'

export async function sendViaSendGrid(
  config: EmailConfig,
  message: EmailMessage
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: message.to }],
          subject: message.subject,
        },
      ],
      from: {
        email: config.senderEmail,
        name: config.senderName,
      },
      content: [
        { type: 'text/html', value: message.html },
        ...(message.text ? [{ type: 'text/plain', value: message.text }] : []),
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    return { success: false, error: `SendGrid error ${res.status}: ${body}` }
  }

  return { success: true }
}
