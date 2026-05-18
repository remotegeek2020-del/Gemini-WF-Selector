import type { ApolloPersonData } from '@/types'

interface ApolloEnrichParams {
  email?: string
  firstName?: string
  lastName?: string
  organizationName?: string
}

interface ApolloEnrichResponse {
  person: ApolloPersonData | null
  error?: string
}

export async function apolloEnrichPerson(
  apiKey: string,
  params: ApolloEnrichParams
): Promise<ApolloEnrichResponse> {
  try {
    const body: Record<string, string> = {}

    if (params.email) body.email = params.email
    if (params.firstName) body.first_name = params.firstName
    if (params.lastName) body.last_name = params.lastName
    if (params.organizationName) body.organization_name = params.organizationName

    const response = await fetch('https://api.apollo.io/api/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        ...body,
        reveal_personal_emails: true,
        reveal_phone_number: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        person: null,
        error: `Apollo API error ${response.status}: ${errorText}`,
      }
    }

    const data = await response.json()

    return {
      person: data.person || null,
    }
  } catch (error) {
    return {
      person: null,
      error: error instanceof Error ? error.message : 'Unknown error calling Apollo API',
    }
  }
}

export function formatApolloDataForGemini(person: ApolloPersonData | null): Record<string, unknown> {
  if (!person) return {}

  return {
    name: person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim(),
    email: person.email,
    title: person.title,
    seniority: person.seniority,
    headline: person.headline,
    linkedin_url: person.linkedin_url,
    location: [person.city, person.state, person.country].filter(Boolean).join(', '),
    current_company: person.organization?.name,
    company_industry: person.organization?.industry,
    company_size: person.organization?.estimated_num_employees,
    company_website: person.organization?.website_url,
    company_founded: person.organization?.founded_year,
    company_revenue: person.organization?.annual_revenue_printed,
    company_funding: person.organization?.total_funding_printed,
    employment_history: person.employment_history
      ?.filter((e) => e.current || e.end_date)
      ?.slice(0, 5)
      ?.map((e) => ({
        company: e.organization_name,
        title: e.title,
        current: e.current,
        start_date: e.start_date,
        end_date: e.end_date,
      })),
  }
}
