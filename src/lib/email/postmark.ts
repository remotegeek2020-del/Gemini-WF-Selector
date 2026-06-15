interface LeadNotificationData {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  company?: string
  title?: string
  linkedinUrl?: string
  personaName: string
  personaColor: string
  reasoning: string
  isDefaultFallback: boolean
  pipeline: string
}

export async function sendLeadNotification(
  postmarkKey: string,
  toEmails: string[],
  fromEmail: string,
  lead: LeadNotificationData
) {
  if (!toEmails.length) return

  const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email || 'Unknown'
  const score = lead.isDefaultFallback ? 'Low — Default Fallback' : 'High — Direct Match'
  const reasoningShort = lead.reasoning.split('\n').slice(0, 5).join('\n')

  const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;">
  <div style="background:#fff;border-radius:8px;padding:24px;border:1px solid #e5e7eb;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      <div style="width:12px;height:12px;border-radius:50%;background:${lead.personaColor};display:inline-block;"></div>
      <h2 style="margin:0;font-size:18px;color:#111827;">New Lead Assigned — ${lead.personaName}</h2>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:120px;">Name</td><td style="padding:6px 0;font-weight:600;color:#111827;">${name}</td></tr>
      ${lead.email ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Email</td><td style="padding:6px 0;"><a href="mailto:${lead.email}" style="color:#4f46e5;">${lead.email}</a></td></tr>` : ''}
      ${lead.phone ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Phone</td><td style="padding:6px 0;color:#111827;">${lead.phone}</td></tr>` : ''}
      ${lead.company ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Company</td><td style="padding:6px 0;color:#111827;">${lead.company}</td></tr>` : ''}
      ${lead.title ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Title</td><td style="padding:6px 0;color:#111827;">${lead.title}</td></tr>` : ''}
      ${lead.linkedinUrl ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">LinkedIn</td><td style="padding:6px 0;"><a href="${lead.linkedinUrl}" style="color:#4f46e5;">View Profile</a></td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Match Score</td><td style="padding:6px 0;color:#111827;">${score}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Pipeline</td><td style="padding:6px 0;color:#111827;text-transform:capitalize;">${lead.pipeline}</td></tr>
    </table>

    <div style="background:#f3f4f6;border-radius:6px;padding:14px;margin-top:12px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">AI Reasoning</p>
      <p style="margin:0;font-size:13px;color:#374151;white-space:pre-line;">${reasoningShort}</p>
    </div>
  </div>
  <p style="text-align:center;margin-top:16px;font-size:11px;color:#9ca3af;">Sent by Lead Router</p>
</div>`

  const textBody = [
    `New Lead Assigned — ${lead.personaName}`,
    '',
    `Name: ${name}`,
    lead.email ? `Email: ${lead.email}` : '',
    lead.phone ? `Phone: ${lead.phone}` : '',
    lead.company ? `Company: ${lead.company}` : '',
    lead.title ? `Title: ${lead.title}` : '',
    lead.linkedinUrl ? `LinkedIn: ${lead.linkedinUrl}` : '',
    `Match Score: ${score}`,
    `Pipeline: ${lead.pipeline}`,
    '',
    'AI Reasoning:',
    reasoningShort,
  ].filter((l) => l !== null).join('\n')

  await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': postmarkKey,
    },
    body: JSON.stringify({
      From: fromEmail,
      To: toEmails.join(','),
      Subject: `New Lead: ${name} → ${lead.personaName}`,
      HtmlBody: htmlBody,
      TextBody: textBody,
      MessageStream: 'outbound',
    }),
  })
}
