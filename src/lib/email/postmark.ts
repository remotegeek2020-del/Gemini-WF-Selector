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
  isHot?: boolean
  hotReasoning?: string
  pipeline: string
  source?: string
  rawData?: Record<string, unknown>
  enrichedData?: Record<string, unknown>
}

function extractAttribution(rawData?: Record<string, unknown>): Record<string, string> {
  if (!rawData) return {}
  const attrs: Record<string, string> = {}

  // HL stores source as contact_source at top level
  const contactSource = rawData.contact_source as string | undefined
  if (contactSource) attrs['Lead Source'] = contactSource

  // Primary attribution is at contact.attributionSource
  const contact = (rawData.contact || {}) as Record<string, unknown>
  const first = (contact.attributionSource || {}) as Record<string, unknown>
  const last = (contact.lastAttributionSource || {}) as Record<string, unknown>

  if (first.sessionSource) attrs['Session Source'] = String(first.sessionSource)
  if (first.medium) attrs['Medium'] = String(first.medium)
  if (first.formName) attrs['Ad/Form Name'] = String(first.formName)
  if (first.adAccountId) attrs['Ad Account ID'] = String(first.adAccountId)
  if (first.url) attrs['Attribution URL'] = String(first.url)
  if (first.utmSource) attrs['UTM Source'] = String(first.utmSource)
  if (first.utmMedium) attrs['UTM Medium'] = String(first.utmMedium)
  if (first.utmCampaign) attrs['UTM Campaign'] = String(first.utmCampaign)
  if (first.utmContent) attrs['UTM Content'] = String(first.utmContent)
  if (first.gclid) attrs['Google Click ID'] = String(first.gclid)

  // Last attribution (most recent touch)
  if (last.sessionSource && last.sessionSource !== first.sessionSource) attrs['Last Session Source'] = String(last.sessionSource)
  if (last.url) attrs['Last URL'] = String(last.url)
  if (last.utmSource) attrs['Last UTM Source'] = String(last.utmSource)
  if (last.utmMedium) attrs['Last UTM Medium'] = String(last.utmMedium)
  if (last.utmCampaign) attrs['Last UTM Campaign'] = String(last.utmCampaign)
  if (last.referrer) attrs['Referrer'] = String(last.referrer)
  if (last.gclid && !attrs['Google Click ID']) attrs['Google Click ID'] = String(last.gclid)

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

  // Phone numbers — Lusha stores as lusha_phones (string[]), Apollo in apollo_raw.phone_numbers
  const lushaPhones = (ed.lusha_phones as string[] | undefined) || []
  const apolloPhones = (apolloRaw.phone_numbers as { sanitized_number?: string; type?: string }[] | undefined) || []
  const allPhones: string[] = [...lushaPhones]
  for (const p of apolloPhones) {
    const num = p.sanitized_number
    if (num && !allPhones.some((x) => x.includes(num.replace(/\D/g, '').slice(-7)))) {
      allPhones.push(`${num}${p.type ? ` (${p.type})` : ''}`)
    }
  }
  if (lead.phone && !allPhones.some((x) => x.includes(lead.phone!.replace(/\D/g, '').slice(-7)))) {
    allPhones.unshift(lead.phone)
  }

  // Lusha emails (direct emails found by Lusha)
  const lushaEmails = (ed.lusha_emails as string[] | undefined) || []
  const lushaTitle = ed.lusha_current_title as string | undefined
  const lushaCompany = ed.lusha_current_company as string | undefined

  // Employment history — filter out our own company so leads don't show us as their employer
  const employment = ((ed.employment_history as { company?: string; title?: string; current?: boolean; start_date?: string; end_date?: string }[] | undefined) || [])
    .filter((e) => !e.company?.toLowerCase().includes('payprotec'))

  // LinkedIn — prefer caller-supplied, fall back to enrichedData directly
  const effectiveLinkedin =
    lead.linkedinUrl ||
    (apolloRaw.linkedin_url as string | undefined) ||
    (ed.linkedin_url as string | undefined) ||
    (ed.hl_linkedin_url as string | undefined) ||
    undefined

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
  const departments = (apolloRaw.departments as string[] | undefined)?.join(', ')
  const photoUrl = apolloRaw.photo_url as string | undefined
  const orgPhone = (org.primary_phone as { number?: string } | undefined)?.number || (org.sanitized_phone as string | undefined)

  // Build HTML sections
  const allEmails = Array.from(new Set([lead.email, ...lushaEmails].filter(Boolean))) as string[]
  const effectiveTitle = lead.title || lushaTitle
  const effectiveCompany = lead.company || lushaCompany

  const contactRows = [
    row('Name', name),
    allEmails.length ? row('Email', allEmails.map((e) => `<a href="mailto:${e}" style="color:#4f46e5;">${e}</a>`).join('<br>')) : '',
    allPhones.length ? row('Phone', allPhones.join('<br>')) : '',
    effectiveCompany ? row('Company', effectiveCompany) : '',
    effectiveTitle ? row('Title', effectiveTitle) : '',
    departments ? row('Department', departments) : '',
    seniority ? row('Seniority', seniority) : '',
    personLocation ? row('Location', String(personLocation)) : '',
    headline ? row('Headline', String(headline)) : '',
    effectiveLinkedin ? row('LinkedIn', 'View Profile →', effectiveLinkedin) : '',
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
    orgPhone ? row('Company Phone', orgPhone) : '',
    keywords ? row('Keywords', keywords) : '',
    orgWebsite ? row('Website', orgWebsite, orgWebsite) : '',
    orgLinkedin ? row('Company LinkedIn', 'View →', orgLinkedin) : '',
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

  const hotBannerHtml = lead.isHot
    ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <span style="font-size:22px;line-height:1;">🔥</span>
      <div>
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#c2410c;">AI-Flagged: High-Priority Lead</p>
        <p style="margin:0 0 6px;font-size:13px;color:#7c2d12;">${lead.hotReasoning || ''}</p>
        <p style="margin:0;font-size:11px;color:#9a3412;font-style:italic;">This is an AI assessment and should be used as a guide only. Your own judgment is the final authority.</p>
      </div>
    </div>
  </div>`
    : ''

  const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#f9fafb;padding:24px;">
  ${hotBannerHtml}
  <div style="background:#fff;border-radius:8px;padding:24px;border:1px solid #e5e7eb;">

    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
      ${photoUrl ? `<img src="${photoUrl}" alt="${name}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid #e5e7eb;">` : `<div style="width:52px;height:52px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">👤</div>`}
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
          <div style="width:10px;height:10px;border-radius:50%;background:${lead.personaColor};flex-shrink:0;"></div>
          <h2 style="margin:0;font-size:17px;color:#111827;">${name}</h2>
        </div>
        <p style="margin:0;font-size:12px;color:#6b7280;">${effectiveTitle ? `${effectiveTitle}${effectiveCompany ? ` · ${effectiveCompany}` : ''}` : (effectiveCompany || '')}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">Assigned to <strong>${lead.personaName}</strong> · ${score}</p>
      </div>
    </div>

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
    lead.isHot ? `🔥 HIGH-PRIORITY LEAD (AI Assessment — use as guide only)` : '',
    lead.isHot && lead.hotReasoning ? lead.hotReasoning : '',
    lead.isHot ? '' : '',
    `New Lead Assigned — ${lead.personaName} (${score})`,
    '',
    '--- CONTACT INFO ---',
    `Name: ${name}`,
    allEmails.length ? `Email: ${allEmails.join(', ')}` : '',
    allPhones.length ? `Phone: ${allPhones.join(', ')}` : '',
    effectiveCompany ? `Company: ${effectiveCompany}` : '',
    effectiveTitle ? `Title: ${effectiveTitle}` : '',
    departments ? `Department: ${departments}` : '',
    seniority ? `Seniority: ${seniority}` : '',
    personLocation ? `Location: ${personLocation}` : '',
    headline ? `Headline: ${headline}` : '',
    effectiveLinkedin ? `LinkedIn: ${effectiveLinkedin}` : '',
    twitterUrl ? `Twitter: ${twitterUrl}` : '',
    '',
    companyRows.trim() ? '--- COMPANY INTELLIGENCE ---' : '',
    industry ? `Industry: ${industry}` : '',
    employees ? `Employees: ${employees}` : '',
    revenue ? `Revenue: ${revenue}` : '',
    funding ? `Total Funding: ${funding}` : '',
    founded ? `Founded: ${founded}` : '',
    companyLocation ? `HQ: ${companyLocation}` : '',
    orgPhone ? `Company Phone: ${orgPhone}` : '',
    keywords ? `Keywords: ${keywords}` : '',
    orgWebsite ? `Website: ${orgWebsite}` : '',
    '',
    employmentRows.trim() ? '--- EMPLOYMENT HISTORY ---' : '',
    ...employment.map((e) => {
      const dates = [e.start_date?.substring(0, 7), e.current ? 'Present' : e.end_date?.substring(0, 7)].filter(Boolean).join(' – ')
      return `${e.current ? '(Current) ' : ''}${e.title || '—'} @ ${e.company || '—'}${dates ? ` [${dates}]` : ''}`
    }),
    '',
    attrRows.trim() ? '--- LEAD ATTRIBUTION (HIGHLEVEL) ---' : '',
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
