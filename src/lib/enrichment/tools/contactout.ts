// ContactOut: LinkedIn URL → personal + work emails
// Docs: https://contactout.com/api
export async function contactoutFindEmails(
  apiKey: string,
  params: { linkedinUrl: string }
): Promise<{ emails: string[]; phones: string[]; error?: string }> {
  try {
    const res = await fetch('https://api.contactout.com/v1/people/search', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ linkedin: params.linkedinUrl }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { emails: [], phones: [], error: `ContactOut API error ${res.status}: ${text}` }
    }

    const json = await res.json()
    const profile = json.profile || json.data || {}

    const emails: string[] = [
      ...(Array.isArray(profile.emails) ? profile.emails : []),
      ...(Array.isArray(profile.personal_emails) ? profile.personal_emails : []),
      ...(Array.isArray(profile.work_emails) ? profile.work_emails : []),
    ].filter(Boolean)

    const phones: string[] = [
      ...(Array.isArray(profile.phones) ? profile.phones : []),
      ...(profile.phone ? [profile.phone] : []),
    ].filter(Boolean)

    return { emails: Array.from(new Set(emails)), phones: Array.from(new Set(phones)) }
  } catch (err) {
    return { emails: [], phones: [], error: err instanceof Error ? err.message : 'ContactOut unknown error' }
  }
}
