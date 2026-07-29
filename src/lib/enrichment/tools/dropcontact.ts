// Dropcontact: name + company → work email
// Docs: https://www.dropcontact.com/documentation
export async function dropcontactFindEmail(
  apiKey: string,
  params: { firstName?: string | null; lastName?: string | null; companyName?: string | null; companyDomain?: string | null }
): Promise<{ email: string | null; emails: string[]; error?: string }> {
  try {
    const contact: Record<string, string> = {}
    if (params.firstName) contact.first_name = params.firstName
    if (params.lastName) contact.last_name = params.lastName
    if (params.companyName) contact.company = params.companyName
    if (params.companyDomain) contact.website = params.companyDomain

    const res = await fetch('https://api.dropcontact.io/batch', {
      method: 'POST',
      headers: { 'X-Access-Token': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [contact], siren: false }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { email: null, emails: [], error: `Dropcontact API error ${res.status}: ${text}` }
    }

    const json = await res.json()
    const result = json.data?.[0] || {}

    const emails: string[] = []
    if (result.email) emails.push(typeof result.email === 'string' ? result.email : result.email.email)
    if (Array.isArray(result.emails)) {
      for (const e of result.emails) {
        emails.push(typeof e === 'string' ? e : e.email)
      }
    }

    const unique = Array.from(new Set(emails.filter(Boolean)))
    return { email: unique[0] || null, emails: unique }
  } catch (err) {
    return { email: null, emails: [], error: err instanceof Error ? err.message : 'Dropcontact unknown error' }
  }
}
