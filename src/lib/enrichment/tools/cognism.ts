// Cognism: B2B data platform with diamond-verified mobile numbers
// BYO API Key — endpoint varies by customer data region
// Docs: https://developer.cognism.com
export async function cognismFindPhone(
  apiKey: string,
  params: { email?: string | null; linkedinUrl?: string | null; firstName?: string | null; lastName?: string | null; company?: string | null }
): Promise<{ phones: string[]; email?: string; error?: string }> {
  try {
    const body: Record<string, string> = {}
    if (params.email) body.email = params.email
    if (params.linkedinUrl) body.linkedin_url = params.linkedinUrl
    if (params.firstName) body.first_name = params.firstName
    if (params.lastName) body.last_name = params.lastName
    if (params.company) body.company_name = params.company

    const res = await fetch('https://api.cognism.com/v1/person/enrich', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      return { phones: [], error: `Cognism API error ${res.status}: ${text}` }
    }

    const json = await res.json()
    const phones: string[] = []

    if (json.mobile_number) phones.push(json.mobile_number)
    if (json.phone_number) phones.push(json.phone_number)
    if (Array.isArray(json.phone_numbers)) phones.push(...json.phone_numbers.filter(Boolean))

    return { phones: Array.from(new Set(phones)), email: json.email || undefined }
  } catch (err) {
    return { phones: [], error: err instanceof Error ? err.message : 'Cognism unknown error' }
  }
}
