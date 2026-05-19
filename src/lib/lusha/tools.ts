export interface LushaPersonData {
  firstName?: string
  lastName?: string
  emails?: Array<{ email: string; type: string }>
  phoneNumbers?: Array<{ localNumber: string; countryCode: string; type: string }>
  linkedinUrl?: string
  currentPositions?: Array<{ title?: string; companyName?: string }>
}

interface LushaEnrichParams {
  linkedinUrl?: string
  email?: string
  firstName?: string
  lastName?: string
  company?: string
}

interface LushaEnrichResponse {
  person: LushaPersonData | null
  error?: string
}

export async function lushaEnrichPerson(
  apiKey: string,
  params: LushaEnrichParams
): Promise<LushaEnrichResponse> {
  try {
    const query = new URLSearchParams()
    if (params.linkedinUrl) {
      // Normalize LinkedIn URL to https and remove trailing slashes
      const normalized = params.linkedinUrl
        .replace(/^http:\/\//, 'https://')
        .replace(/\/$/, '')
      query.set('linkedinUrl', normalized)
    }
    if (params.email) query.set('email', params.email)
    if (params.firstName) query.set('firstName', params.firstName)
    if (params.lastName) query.set('lastName', params.lastName)
    if (params.company) query.set('companyName', params.company)

    const response = await fetch(`https://api.lusha.com/v2/person?${query.toString()}`, {
      method: 'GET',
      headers: {
        'api_key': apiKey,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        person: null,
        error: `Lusha API error ${response.status}: ${errorText}`,
      }
    }

    const data = await response.json()
    return { person: data.data || null }
  } catch (error) {
    return {
      person: null,
      error: error instanceof Error ? error.message : 'Unknown error calling Lusha API',
    }
  }
}

export function formatLushaData(person: LushaPersonData | null): Record<string, unknown> {
  if (!person) return {}

  const directEmails = (person.emails || []).map((e) => e.email).filter(Boolean)
  const phones = (person.phoneNumbers || []).map(
    (p) => `${p.countryCode || ''}${p.localNumber}`.trim()
  ).filter(Boolean)

  return {
    lusha_emails: directEmails,
    lusha_phones: phones,
    lusha_current_title: person.currentPositions?.[0]?.title,
    lusha_current_company: person.currentPositions?.[0]?.companyName,
  }
}
