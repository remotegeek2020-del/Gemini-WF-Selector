import type { Lead } from '@/types'

function getPipelineLabel(slug: string): string {
  const labels: Record<string, string> = { main: 'Main (LinkedIn)', nurture: 'Nurture' }
  return labels[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function generateLeadsCSV(leads: Lead[]): string {
  const headers = [
    'Pipeline', 'Hot Lead', 'Hot Reason',
    'First Name', 'Last Name', 'Email', 'Phone',
    'All Phones', 'All Emails', 'Verified Emails',
    'Company', 'Title', 'Seniority', 'Department', 'Location',
    'Industry', 'Company Size', 'Company Revenue', 'Company Founded',
    'LinkedIn URL', 'Twitter',
    'Sources Used',
    'Persona', 'Status', 'Source', 'Created',
  ]

  const rows = [
    headers,
    ...leads.map((lead) => {
      const ed = (lead.enriched_data || {}) as Record<string, unknown>
      const apolloRaw = (ed.apollo_raw || {}) as Record<string, unknown>
      const company = (ed.current_company as string) || (apolloRaw.organization as Record<string, string> | undefined)?.name || ''
      const title = (ed.title as string) || (apolloRaw.title as string) || ''
      const linkedin = (ed.linkedin_url as string) || (apolloRaw.linkedin_url as string) || (ed.hl_linkedin_url as string) || ''
      const twitter = (ed.twitter_url as string) || (ed.twitter as string) || ''
      const seniority = (ed.seniority as string) || ''
      const dept = Array.isArray(ed.departments)
        ? (ed.departments as string[]).join('; ')
        : (ed.department as string) || ''
      const location = [ed.city, ed.state, ed.country].filter(Boolean).join(', ')
      const industry = (ed.industry as string) || ''
      const companySize = (ed.company_employee_count as string | number) || (ed.company_size as string | number) || ''
      const companyRevenue = (ed.company_annual_revenue as string | number) || ''
      const companyFounded = (ed.company_founded_year as string | number) || ''
      const allPhones = Array.isArray(ed.all_phones)
        ? (ed.all_phones as Array<Record<string, unknown>>).map((p) => (p.number || p.value || '') as string).filter(Boolean).join('; ')
        : ''
      const allEmails = Array.isArray(ed.all_emails)
        ? (ed.all_emails as Array<Record<string, unknown>>).map((e) => (e.email || e.value || '') as string).filter(Boolean).join('; ')
        : ''
      const verifiedEmails = Array.isArray(ed.verified_emails)
        ? (ed.verified_emails as string[]).join('; ')
        : ''
      const sourcesUsed = Array.isArray(ed.sources_used)
        ? (ed.sources_used as string[]).join('; ')
        : ''
      return [
        getPipelineLabel(lead.pipeline || 'main'),
        lead.is_hot ? 'Yes' : 'No',
        lead.hot_reasoning || '',
        lead.first_name || '',
        lead.last_name || '',
        lead.email || '',
        lead.phone || '',
        allPhones,
        allEmails,
        verifiedEmails,
        company,
        title,
        seniority,
        dept,
        location,
        industry,
        String(companySize),
        String(companyRevenue),
        String(companyFounded),
        linkedin,
        twitter,
        sourcesUsed,
        lead.personas?.name || '',
        lead.status,
        lead.source || '',
        lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-US') : '',
      ]
    }),
  ]

  return rows.map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')
}
