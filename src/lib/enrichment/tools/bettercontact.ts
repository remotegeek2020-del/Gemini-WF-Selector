// BetterContact: multi-source phone number finder
// Docs: https://bettercontact.rocks/api-documentation
export async function bettercontactFindPhone(
  apiKey: string,
  params: { email?: string | null; firstName?: string | null; lastName?: string | null; company?: string | null; linkedinUrl?: string | null }
): Promise<{ phones: string[]; error?: string }> {
  try {
    const body: Record<string, string> = {}
    if (params.email) body.email = params.email
    if (params.firstName) body.first_name = params.firstName
    if (params.lastName) body.last_name = params.lastName
    if (params.company) body.company_name = params.company
    if (params.linkedinUrl) body.linkedin_url = params.linkedinUrl

    const res = await fetch('https://app.bettercontact.rocks/api/v2/async', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      return { phones: [], error: `BetterContact API error ${res.status}: ${text}` }
    }

    const json = await res.json()
    const phones: string[] = []

    if (json.phone) phones.push(json.phone)
    if (Array.isArray(json.phones)) phones.push(...json.phones.map((p: { number?: string } | string) => typeof p === 'string' ? p : p.number || '').filter(Boolean))
    if (json.mobile) phones.push(json.mobile)

    return { phones: Array.from(new Set(phones)) }
  } catch (err) {
    return { phones: [], error: err instanceof Error ? err.message : 'BetterContact unknown error' }
  }
}
