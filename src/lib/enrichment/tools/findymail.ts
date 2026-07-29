// Findymail: LinkedIn URL or name+domain → work email
// Docs: https://findymail.com/api
export async function findymailFindEmail(
  apiKey: string,
  params: { linkedinUrl?: string | null; firstName?: string | null; lastName?: string | null; domain?: string | null }
): Promise<{ email: string | null; error?: string }> {
  try {
    const body: Record<string, string> = {}
    if (params.linkedinUrl) body.linkedin_url = params.linkedinUrl
    if (params.firstName) body.first_name = params.firstName
    if (params.lastName) body.last_name = params.lastName
    if (params.domain) body.domain = params.domain

    const res = await fetch('https://app.findymail.com/api/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      return { email: null, error: `Findymail API error ${res.status}: ${text}` }
    }

    const json = await res.json()
    const email = json.email || json.data?.email || null
    return { email }
  } catch (err) {
    return { email: null, error: err instanceof Error ? err.message : 'Findymail unknown error' }
  }
}
