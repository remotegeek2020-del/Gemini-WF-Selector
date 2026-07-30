export interface PDLPersonData {
  full_name?: string
  first_name?: string
  last_name?: string
  job_title?: string
  job_title_role?: string
  job_title_sub_role?: string
  job_company_name?: string
  job_company_size?: string
  job_company_linkedin_url?: string
  job_company_location_name?: string | boolean
  job_company_location_country?: string
  job_last_verified?: string
  job_last_changed?: string
  linkedin_url?: string
  phone_numbers?: string[] | boolean
  emails?: { address: string; type?: string }[] | boolean
  industry?: string
  location_name?: string | boolean
  location_country?: string
  location_continent?: string
  inferred_salary?: string
  sex?: string
  experience?: {
    company?: { name?: string; size?: string; linkedin_url?: string; location?: { name?: string } }
    title?: { name?: string; role?: string; sub_role?: string }
    is_primary?: boolean
    start_date?: string | null
    end_date?: string | null
  }[]
  profiles?: { network?: string; url?: string; username?: string }[]
}

export async function pdlEnrichPerson(
  apiKey: string,
  params: { email?: string | null; phone?: string | null; firstName?: string | null; lastName?: string | null; linkedinUrl?: string | null }
): Promise<{ data: Record<string, unknown> | null; raw: PDLPersonData | null; error?: string }> {
  try {
    const body: Record<string, unknown> = { required: 'profiles OR emails OR phone_numbers' }
    if (params.email) body.email = params.email
    if (params.phone) body.phone = params.phone
    if (params.firstName) body.first_name = params.firstName
    if (params.lastName) body.last_name = params.lastName
    if (params.linkedinUrl) body.linkedin = params.linkedinUrl

    const res = await fetch('https://api.peopledatalabs.com/v5/person/enrich', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.status === 404) return { data: null, raw: null }
    if (!res.ok) {
      const text = await res.text()
      return { data: null, raw: null, error: `PDL API error ${res.status}: ${text}` }
    }

    const json = await res.json()
    const person: PDLPersonData = json.data || {}

    // PDL returns boolean true/false for fields when data exists but isn't included at this plan level
    const allEmails = Array.isArray(person.emails)
      ? (person.emails as { address: string }[]).map((e) => e.address).filter(Boolean)
      : []

    // location_name may be boolean — fall back to location_country
    const locationStr = typeof person.location_name === 'string'
      ? person.location_name
      : person.location_country || null

    // company location may also be boolean — fall back to country
    const companyLocationStr = typeof person.job_company_location_name === 'string'
      ? person.job_company_location_name
      : person.job_company_location_country || null

    const data: Record<string, unknown> = {
      pdl_title: person.job_title,
      pdl_title_role: person.job_title_role,
      pdl_title_sub_role: person.job_title_sub_role,
      pdl_company: person.job_company_name,
      pdl_company_size: person.job_company_size,
      pdl_company_linkedin: person.job_company_linkedin_url,
      pdl_company_location: companyLocationStr,
      pdl_linkedin: person.linkedin_url,
      pdl_phones: Array.isArray(person.phone_numbers) ? person.phone_numbers : [],
      pdl_emails: allEmails,
      pdl_industry: person.industry,
      pdl_location: locationStr,
      pdl_last_verified: person.job_last_verified,
      pdl_last_changed: person.job_last_changed,
      pdl_experience: person.experience || [],
      pdl_raw: person,
    }

    // Fill standard fields only if not already set by Apollo
    if (person.job_title) data.title = data.title || person.job_title
    if (person.job_company_name) data.current_company = data.current_company || person.job_company_name
    if (person.linkedin_url) data.linkedin_url = data.linkedin_url || person.linkedin_url

    return { data, raw: person }
  } catch (err) {
    return { data: null, raw: null, error: err instanceof Error ? err.message : 'PDL unknown error' }
  }
}
