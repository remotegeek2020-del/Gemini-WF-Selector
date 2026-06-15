interface LeadNotificationData {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  company?: string
  title?: string
  linkedinUrl?: string
  personaName: string
  personaColor: string
  reasoning: string
  isDefaultFallback: boolean
  pipeline: string
  source?: string
  rawData?: Record<string, unknown>
  enrichedData?: Record<string, unknown>
}

function extractAttribution(rawData?: Record<string, unknown>): Record<string, string> {
  if (!rawData) return {}
  const attrs: Record<string, string> = {}

  // Direct HL attribution fields
  const directFields: [string, string][] = [
    ['attributionSource', 'Source'],
    ['source', 'Source'],
    ['utmSource', 'UTM Source'],
    ['utmMedium', 'UTM Medium'],
    ['utmCampaign', 'UTM Campaign'],
    ['utmContent', 'UTM Content'],
    ['utmTerm', 'UTM Term'],
    ['referrer', 'Referrer'],
    ['gclid', 'Google Click ID'],
    ['fbclid', 'Facebook Click ID'],
  ]
  for (const [key, label] of directFields) {
    if (rawData[key] && typeof rawData[key] === 'string') {
      attrs[label] = rawData[key] as string
    }
  }

  // Nested attribution object (HL sometimes sends {attributionSource: {url, campaign, medium, source}})
  const attrObj = rawData.attributionSource
  if (attrObj && typeof attrObj === 'object' && !Array.isArray(attrObj)) {
    const a = attrObj as Record<string, string>
    if (a.url) attrs['Attribution URL'] = a.url
    if (a.source) attrs['Source'] = a.source
    if (a.medium) attrs['Medium'] = a.medium
    if (a.campaign) attrs['Campaign'] = a.campaign
  }

  // Scan customFields array for UTM/source related fields
  const customFields = rawData.customFields
  if (Array.isArray(customFields)) {
    for (const field of customFields) {
      const f = field as Record<string, string>
      const key = (f.name || f.key || '').toLowerCase()
      const val = f.value || f.fieldValue || ''
      if (!val) continue
      if (key.includes('utm_source') || key.includes('utm source')) attrs['UTM Source'] = val
      else if (key.includes('utm_medium') || key.includes('utm medium')) attrs['UTM Medium'] = val
      else if (key.includes('utm_campaign') || key.includes('utm campaign')) attrs['UTM Campaign'] = val
      else if (key.includes('utm_content') || key.includes('utm content')) attrs['UTM Content'] = val
      else if (key.includes('utm_term') || key.includes('utm term')) attrs['UTM Term'] = val
      else if (key.includes('referrer') || key.includes('referring')) attrs['Referrer'] = val
      else if (key.includes('source') && !attrs['Source']) attrs['Source'] = val
    }
  }

  return attrs
}

function row(label: string, value: string, link?: string): string {
  const cell = link
    ? `<a href="${link}" style="color:#4f46e5;">${value}</a>`
    : `<span style="color:#111827;">${value}</span>`
  return `<tr>
    <td style="padding:5px 0;color:#6b7280;font-size:12px;width:150px;vertical-align:top;">${label}</td>
    <td style="padding:5px 0;font-size:13px;">${cell}</td>
  </tr>`
}

function section(title: string, rows: string): string {
  if (!rows.trim()) return ''
  return `
  <div style="margin-top:20px;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;">${title}</p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
  </div>`
}

export async function sendLeadNotification(
  postmarkKey: string,
  toEmails: string[],
  fromEmail: string,
  lead: LeadNotificationData
) {
  if (!toEmails.length) return

  const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email || 'Unknown'
  const score = lead.isDefaultFallback ? 'Low — Default Fallback' : 'High — Direct Match'

  const ed = (lead.enrichedData || {}) as Record<string, unknown>
  const apolloRaw = (ed.apollo_raw || {}) as Record<string, unknown>
  const org = (apolloRaw.organization || ed.organization || {}) as Record<string, unknown>

  // Attribution from HL webhook payload
  const attribution = extractAttribution(lead.rawData)

  // Additional phone numbers from Lusha / Apollo
  const lushaPhones = (ed.lusha_phone_numbers as { number?: string; type?: string }[] | undefined) || []
  const apolloPhones = (ed.phone_numbers as { sanitized_number?: string; type?: string }[] | undefined) || []
  const allPhones: string[] = []
  for (const p of lushaPhones) { if (p.number) allPhones.push(`${p.number}${p.type ? ` (${p.type})` : ''}`) }
  for (const p of apolloPhones) { if (p.sanitized_number && !allPhones.some((x) => x.startsWith(p.sanitized_number!))) allPhones.push(`${p.sanitized_number}${p.type ? ` (${p.type})` : ''}`) }
  if (lead.phone && !allPhones.some((x) => x.startsWith(lead.phone!))) allPhones.unshift(lead.phone)

  // Employment history
  const employment = (ed.employment_history as { company?: string; title?: string; current?: boolean; start_date?: string; end_date?: string }[] | undefined) || []

  // Social profiles
  const twitterUrl = apolloRaw.twitter_url as string | undefined
  const githubUrl = apolloRaw.github_url as string | undefined
  const facebookUrl = apolloRaw.facebook_url as string | undefined
  const orgLinkedin = (org.linkedin_url || ed.company_linkedin_url) as string | undefined
  const orgWebsite = (org.website_url || ed.company_website) as string | undefined

  // Company details
  const industry = (org.industry || ed.company_industry) as string | undefined
  const employees = (org.estimated_num_employees || ed.company_size) as string | number | undefined
  const revenue = (org.annual_revenue_printed || ed.company_revenue) as string | undefined
  const funding = (org.total_funding_printed || ed.company_funding) as string | undefined
  const founded = (org.founded_year || ed.company_founded) as string | number | undefined
  const companyCity = org.city as string | undefined
  const companyState = org.state as string | undefined
  const companyCountry = org.country as string | undefined
  const companyLocation = [companyCity, companyState, companyCountry].filter(Boolean).join(', ')
  const personLocation = ed.location as string | undefined
  const seniority = ed.seniority as string | undefined
  const headline = ed.headline as string | undefined
  const keywords = (org.keywords as string[] | undefined)?.slice(0, 8).join(', ')

  // Build HTML sections
  const contactRows = [
    row('Name', name),
    lead.email ? row('Email', lead.email, `mailto:${lead.email}`) : '',
    allPhones.length ? row('Phone', allPhones.join('<br>')) : '',
    lead.company ? row('Company', lead.company) : '',
    lead.title ? row('Title', lead.title) : '',
    seniority ? row('Seniority', seniority) : '',
    personLocation ? row('Location', personLocation as string) : '',
    headline ? row('Headline', headline as string) : '',
    lead.linkedinUrl ? row('LinkedIn', 'View Profile', lead.linkedinUrl) : '',
    twitterUrl ? row('Twitter', 'View Profile', twitterUrl) : '',
    githubUrl ? row('GitHub', 'View Profile', githubUrl) : '',
    facebookUrl ? row('Facebook', 'View Profile', facebookUrl) : '',
  ].join('')

  const companyRows = [
    industry ? row('Industry', industry) : '',
    employees ? row('Employees', String(employees)) : '',
    revenue ? row('Revenue', revenue) : '',
    funding ? row('Total Funding', funding) : '',
    founded ? row('Founded', String(founded)) : '',
    companyLocation ? row('HQ Location', companyLocation) : '',
    keywords ? row('Keywords', keywords) : '',
    orgWebsite ? row('Website', orgWebsite, orgWebsite) : '',
    orgLinkedin ? row('Company LinkedIn', 'View', orgLinkedin) : '',
  ].join('')

  const employmentRows = employment.length
    ? employment.map((e) => {
        const dates = [e.start_date?.substring(0, 7), e.current ? 'Present' : e.end_date?.substring(0, 7)].filter(Boolean).join(' – ')
        return row(e.current ? '✦ Current' : (dates || 'Past'), `${e.title || '—'} @ ${e.company || '—'}`)
      }).join('')
    : ''

  const attrRows = Object.entries(attribution).map(([k, v]) => row(k, v)).join('')

  const matchRows = [
    row('Match Score', score),
    row('Persona', lead.personaName),
    row('Pipeline', lead.pipeline),
    lead.source ? row('Lead Source', lead.source) : '',
  ].join('')

  const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#f9fafb;padding:24px;">
  <div style="background:#fff;border-radius:8px;padding:24px;border:1px solid #e5e7eb;">

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
      <div style="width:10px;height:10px;border-radius:50%;background:${lead.personaColor};flex-shrink:0;"></div>
      <h2 style="margin:0;font-size:17px;color:#111827;">New Lead — ${lead.personaName}</h2>
    </div>
    <p style="margin:0 0 20px;font-size:12px;color:#9ca3af;padding-left:20px;">${score}</p>

    ${section('Contact Info', contactRows)}
    ${companyRows.trim() ? section('Company Intelligence', companyRows) : ''}
    ${employmentRows.trim() ? section('Employment History', employmentRows) : ''}
    ${attrRows.trim() ? section('Lead Attribution (HighLevel)', attrRows) : ''}
    ${section('Routing', matchRows)}

    <div style="background:#f3f4f6;border-radius:6px;padding:14px;margin-top:20px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;">AI Reasoning</p>
      <p style="margin:0;font-size:13px;color:#374151;white-space:pre-line;">${lead.reasoning}</p>
    </div>
  </div>
  <p style="text-align:center;margin-top:16px;font-size:11px;color:#9ca3af;">Sent by Lead Router</p>
</div>`

  const textBody = [
    `New Lead Assigned — ${lead.personaName} (${score})`,
    '',
    '--- CONTACT INFO ---',
    `Name: ${name}`,
    lead.email ? `Email: ${lead.email}` : '',
    allPhones.length ? `Phone: ${allPhones.join(', ')}` : '',
    lead.company ? `Company: ${lead.company}` : '',
    lead.title ? `Title: ${lead.title}` : '',
    seniority ? `Seniority: ${seniority}` : '',
    personLocation ? `Location: ${personLocation}` : '',
    lead.linkedinUrl ? `LinkedIn: ${lead.linkedinUrl}` : '',
    '',
    companyRows.trim() ? '--- COMPANY INTELLIGENCE ---' : '',
    industry ? `Industry: ${industry}` : '',
    employees ? `Employees: ${employees}` : '',
    revenue ? `Revenue: ${revenue}` : '',
    funding ? `Total Funding: ${funding}` : '',
    founded ? `Founded: ${founded}` : '',
    companyLocation ? `HQ: ${companyLocation}` : '',
    orgWebsite ? `Website: ${orgWebsite}` : '',
    '',
    employmentRows.trim() ? '--- EMPLOYMENT HISTORY ---' : '',
    ...employment.map((e) => `${e.current ? '(Current) ' : ''}${e.title || '—'} @ ${e.company || '—'}`),
    '',
    attrRows.trim() ? '--- LEAD ATTRIBUTION ---' : '',
    ...Object.entries(attribution).map(([k, v]) => `${k}: ${v}`),
    '',
    '--- AI REASONING ---',
    lead.reasoning,
  ].filter((l) => l !== null && l !== undefined).join('\n')

  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': postmarkKey,
    },
    body: JSON.stringify({
      From: fromEmail,
      To: toEmails.join(','),
      Subject: `New Lead: ${name} → ${lead.personaName}`,
      HtmlBody: htmlBody,
      TextBody: textBody,
      MessageStream: 'outbound',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Postmark API error ${res.status}: ${body}`)
  }
}
