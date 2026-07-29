// Hunter.io: domain + name → work email
// Docs: https://hunter.io/api-documentation
export async function hunterFindEmail(
  apiKey: string,
  params: { domain: string; firstName?: string | null; lastName?: string | null }
): Promise<{ email: string | null; confidence?: number; error?: string }> {
  try {
    const url = new URL('https://api.hunter.io/v2/email-finder')
    url.searchParams.set('domain', params.domain)
    if (params.firstName) url.searchParams.set('first_name', params.firstName)
    if (params.lastName) url.searchParams.set('last_name', params.lastName)
    url.searchParams.set('api_key', apiKey)

    const res = await fetch(url.toString())
    if (!res.ok) {
      const text = await res.text()
      return { email: null, error: `Hunter API error ${res.status}: ${text}` }
    }

    const json = await res.json()
    const email = json.data?.email || null
    const confidence = json.data?.score || undefined
    return { email, confidence }
  } catch (err) {
    return { email: null, error: err instanceof Error ? err.message : 'Hunter unknown error' }
  }
}

export function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  return match ? match[1] : null
}

export function isPersonalEmail(email: string): boolean {
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'live.com', 'msn.com', 'me.com', 'mac.com', 'protonmail.com', 'ymail.com']
  const domain = extractDomainFromEmail(email)
  return domain ? personalDomains.includes(domain.toLowerCase()) : false
}
