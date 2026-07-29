export interface PDLPersonData {
  full_name?: string
  first_name?: string
  last_name?: string
  job_title?: string
  job_company_name?: string
  linkedin_url?: string
  phone_numbers?: string[]
  emails?: { address: string; type?: string }[]
  industry?: string
  location_name?: string
  inferred_salary?: string
  experience?: { company?: { name?: string }; title?: { name?: string }; is_primary?: boolean; start_date?: string; end_date?: string }[]
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

    const allEmails = (person.emails || []).map((e) => e.address).filter(Boolean)

    const data: Record<string, unknown> = {
      pdl_title: person.job_title,
      pdl_company: person.job_company_name,
      pdl_linkedin: person.linkedin_url,
      pdl_phones: person.phone_numbers || [],
      pdl_emails: allEmails,
      pdl_industry: person.industry,
      pdl_location: person.location_name,
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
