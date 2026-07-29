// Kaspr: LinkedIn URL → mobile phone
// Docs: https://developer.kaspr.io
export async function kasprFindPhone(
  apiKey: string,
  params: { linkedinUrl: string }
): Promise<{ phones: string[]; error?: string }> {
  try {
    const res = await fetch('https://app.kaspr.io/api/v1/linkedin-profiles/phone-numbers', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkedin_url: params.linkedinUrl }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { phones: [], error: `Kaspr API error ${res.status}: ${text}` }
    }

    const json = await res.json()
    const phones: string[] = []

    if (json.phone_number) phones.push(json.phone_number)
    if (Array.isArray(json.phone_numbers)) phones.push(...json.phone_numbers.map((p: { number?: string } | string) => typeof p === 'string' ? p : p.number || '').filter(Boolean))

    return { phones: Array.from(new Set(phones)) }
  } catch (err) {
    return { phones: [], error: err instanceof Error ? err.message : 'Kaspr unknown error' }
  }
}
