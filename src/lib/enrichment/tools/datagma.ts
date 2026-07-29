// Datagma: LinkedIn URL → full profile + mobile phone
// Docs: https://datagma.com/documentation
export async function datagmaEnrichPerson(
  apiKey: string,
  params: { linkedinUrl: string }
): Promise<{ data: Record<string, unknown> | null; error?: string }> {
  try {
    const url = new URL('https://gateway.datagma.net/api/ingress/v2/find')
    url.searchParams.set('apiId', apiKey)
    url.searchParams.set('data', params.linkedinUrl)

    const res = await fetch(url.toString(), { method: 'GET' })

    if (!res.ok) {
      const text = await res.text()
      return { data: null, error: `Datagma API error ${res.status}: ${text}` }
    }

    const json = await res.json()
    if (!json || json.error) return { data: null }

    const phones: string[] = []
    if (json.phoneNumber) phones.push(json.phoneNumber)
    if (Array.isArray(json.phoneNumbers)) phones.push(...json.phoneNumbers)

    return {
      data: {
        datagma_title: json.jobTitle || json.title,
        datagma_company: json.companyName || json.company,
        datagma_phones: phones,
        datagma_email: json.email,
        datagma_raw: json,
      },
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Datagma unknown error' }
  }
}
