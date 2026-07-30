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
  leadId?: string
  accountId?: string
  appBaseUrl?: string
  isReenrich?: boolean
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

const TOOL_LABELS: Record<string, string> = {
  apollo: 'Apollo.io', lusha: 'Lusha', pdl: 'People Data Labs',
  datagma: 'Datagma', bettercontact: 'BetterContact', kaspr: 'Kaspr',
  cognism: 'Cognism', contactout: 'ContactOut', hunter: 'Hunter.io',
  dropcontact: 'Dropcontact', findymail: 'Findymail', enrow: 'Enrow',
}

function getToolContribution(tool: string, ed: Record<string, unknown>): string[] {
  const items: string[] = []
  switch (tool) {
    case 'apollo': {
      const raw = (ed.apollo_raw || {}) as Record<string, unknown>
      const org = (raw.organization || {}) as Record<string, unknown>
      if (raw.title) items.push(`Title: ${raw.title}`)
      if (org.name) items.push(`Company: ${org.name}`)
      const phones = (raw.phone_numbers as { sanitized_number?: string }[] | undefined) || []
      if (phones.length) items.push(`${phones.length} phone${phones.length > 1 ? 's' : ''}`)
      if (raw.email) items.push(`Email found`)
      if (raw.linkedin_url) items.push(`LinkedIn found`)
      break
    }
    case 'lusha': {
      const phones = (ed.lusha_phones as string[] | undefined) || []
      const emails = (ed.lusha_emails as string[] | undefined) || []
      if (phones.length) items.push(`${phones.length} phone${phones.length > 1 ? 's' : ''}: ${phones.slice(0, 2).join(', ')}`)
      if (emails.length) items.push(`${emails.length} email${emails.length > 1 ? 's' : ''}`)
      if (ed.lusha_current_title && !ed.title) items.push(`Title: ${ed.lusha_current_title}`)
      if (ed.lusha_current_company && !ed.current_company) items.push(`Company: ${ed.lusha_current_company}`)
      break
    }
    case 'pdl': {
      if (ed.pdl_title) items.push(`Title: ${ed.pdl_title}`)
      if (ed.pdl_company) items.push(`Company: ${ed.pdl_company}`)
      const phones = (ed.pdl_phones as string[] | undefined) || []
      const emails = (ed.pdl_emails as string[] | undefined) || []
      if (phones.length) items.push(`${phones.length} phone${phones.length > 1 ? 's' : ''}`)
      if (emails.length) items.push(`${emails.length} email${emails.length > 1 ? 's' : ''}`)
      if (ed.pdl_location) items.push(`Location: ${ed.pdl_location}`)
      if (ed.pdl_title_role) items.push(`Role: ${ed.pdl_title_role}${ed.pdl_title_sub_role ? ` / ${ed.pdl_title_sub_role}` : ''}`)
      if (ed.pdl_company_size) items.push(`Co. size: ${ed.pdl_company_size}`)
      if (ed.pdl_last_verified) items.push(`Verified: ${String(ed.pdl_last_verified).substring(0, 10)}`)
      const exp = (ed.pdl_experience as unknown[] | undefined) || []
      if (exp.length) items.push(`${exp.length} job${exp.length > 1 ? 's' : ''} in history`)
      break
    }
    case 'datagma': {
      const phones = (ed.datagma_phones as string[] | undefined) || []
      if (phones.length) items.push(`${phones.length} phone${phones.length > 1 ? 's' : ''}`)
      if (ed.datagma_email) items.push(`Email found`)
      break
    }
    case 'bettercontact': {
      const phones = (ed.bettercontact_phones as string[] | undefined) || []
      if (phones.length) items.push(`${phones.length} phone${phones.length > 1 ? 's' : ''}: ${phones.slice(0, 2).join(', ')}`)
      break
    }
    case 'kaspr': {
      const phones = (ed.kaspr_phones as string[] | undefined) || []
      if (phones.length) items.push(`${phones.length} phone${phones.length > 1 ? 's' : ''}`)
      break
    }
    case 'cognism': {
      const phones = (ed.cognism_phones as string[] | undefined) || []
      if (phones.length) items.push(`${phones.length} phone${phones.length > 1 ? 's' : ''}`)
      break
    }
    case 'contactout': {
      const emails = (ed.contactout_emails as string[] | undefined) || []
      if (emails.length) items.push(`${emails.length} email${emails.length > 1 ? 's' : ''}: ${emails.slice(0, 2).join(', ')}`)
      break
    }
    case 'hunter':
      if (ed.hunter_email) items.push(`Email: ${ed.hunter_email}`)
      break
    case 'dropcontact':
      if (ed.dropcontact_email) items.push(`Email: ${ed.dropcontact_email}`)
      break
    case 'findymail':
      if (ed.findymail_email) items.push(`Email: ${ed.findymail_email}`)
      break
    case 'enrow': {
      const verified = (ed.enrow_verified_emails as string[] | undefined) || []
      if (verified.length) items.push(`${verified.length} verified email${verified.length > 1 ? 's' : ''}`)
      break
    }
  }
  return items
}

function buildWaterfallSection(ed: Record<string, unknown>): string {
  const sourcesUsed = (ed.sources_used as string[] | undefined) || []
  const sourcesSkipped = (ed.sources_skipped as string[] | undefined) || []
  if (sourcesUsed.length === 0 && sourcesSkipped.length === 0) return ''

  const allTools = [...sourcesUsed, ...sourcesSkipped.filter((t) => !sourcesUsed.includes(t))]
  const rows = allTools.map((tool) => {
    const label = TOOL_LABELS[tool] || tool
    const used = sourcesUsed.includes(tool)
    const contributions = used ? getToolContribution(tool, ed) : []
    const hasNewData = contributions.length > 0
    const statusColor = used && hasNewData ? '#16a34a' : used ? '#6b7280' : '#d1d5db'
    const statusIcon = used && hasNewData ? '✓' : used ? '–' : '○'
    const contribText = used
      ? (hasNewData ? contributions.join(' · ') : 'No new data returned')
      : 'Skipped'
    return `<tr>
      <td style="padding:4px 0;width:20px;vertical-align:top;">
        <span style="color:${statusColor};font-size:12px;font-weight:700;">${statusIcon}</span>
      </td>
      <td style="padding:4px 8px 4px 0;width:140px;vertical-align:top;">
        <span style="font-size:11px;font-weight:600;color:${used ? '#111827' : '#9ca3af'};">${label}</span>
      </td>
      <td style="padding:4px 0;vertical-align:top;">
        <span style="font-size:11px;color:${used && hasNewData ? '#374151' : '#9ca3af'};">${contribText}</span>
      </td>
    </tr>`
  }).join('')

  return `
  <div style="margin-top:20px;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;">Enrichment Waterfall</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px 14px;">
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>
  </div>`
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

  // Phone numbers — use consolidated all_phones from pipeline (covers all 12 tools)
  // Fall back to manual assembly for legacy leads without pipeline waterfall data
  const consolidatedPhones = (ed.all_phones as string[] | undefined) || []
  const allPhones: string[] = consolidatedPhones.length > 0
    ? consolidatedPhones
    : (() => {
        const phones: string[] = []
        if (lead.phone) phones.push(lead.phone)
        const lp = (ed.lusha_phones as string[] | undefined) || []
        const ap = (apolloRaw.phone_numbers as { sanitized_number?: string }[] | undefined) || []
        phones.push(...lp)
        for (const p of ap) {
          if (p.sanitized_number && !phones.some((x) => x.includes(p.sanitized_number!.replace(/\D/g, '').slice(-7)))) {
            phones.push(p.sanitized_number)
          }
        }
        return phones
      })()

  // Emails — use consolidated all_emails from pipeline (covers all 12 tools)
  const consolidatedEmails = (ed.all_emails as string[] | undefined) || []
  const verifiedEmailSet = new Set((ed.verified_emails as string[] | undefined) || [])
  const allEmails: string[] = consolidatedEmails.length > 0
    ? consolidatedEmails
    : Array.from(new Set([lead.email, ...((ed.lusha_emails as string[] | undefined) || [])].filter(Boolean))) as string[]

  const lushaTitle = ed.lusha_current_title as string | undefined
  const lushaCompany = ed.lusha_current_company as string | undefined

  // PDL supplementary fields
  const pdlTitle = ed.pdl_title as string | undefined
  const pdlCompany = ed.pdl_company as string | undefined
  const pdlLocation = ed.pdl_location as string | undefined
  const pdlIndustry = ed.pdl_industry as string | undefined
  const pdlInferred = (ed.pdl_raw as Record<string, unknown> | undefined)?.inferred_salary as string | undefined
  const pdlTitleRole = ed.pdl_title_role as string | undefined
  const pdlTitleSubRole = ed.pdl_title_sub_role as string | undefined
  const pdlCompanySize = ed.pdl_company_size as string | undefined
  const pdlCompanyLinkedin = ed.pdl_company_linkedin as string | undefined
  const pdlCompanyLocation = ed.pdl_company_location as string | undefined
  const pdlLastVerified = ed.pdl_last_verified as string | undefined
  type PDLExp = { company?: { name?: string; size?: string; linkedin_url?: string; location?: { name?: string } }; title?: { name?: string; role?: string; sub_role?: string }; is_primary?: boolean; start_date?: string | null; end_date?: string | null }
  const pdlExperience = (ed.pdl_experience as PDLExp[] | undefined) || []

  // Employment history — Apollo first, fall back to PDL experience
  const apolloEmployment = ((ed.employment_history as { company?: string; title?: string; current?: boolean; start_date?: string; end_date?: string }[] | undefined) || [])
    .filter((e) => !e.company?.toLowerCase().includes('payprotec'))
  const pdlEmploymentConverted = pdlExperience
    .filter((e) => e.company?.name && !e.company?.name?.toLowerCase().includes('payprotec'))
    .map((e) => ({
      company: e.company?.name || '',
      title: e.title?.name || '',
      current: !!(e.is_primary),
      start_date: e.start_date || undefined,
      end_date: e.end_date || undefined,
    }))
  const employment = apolloEmployment.length > 0 ? apolloEmployment : pdlEmploymentConverted

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
  const orgWebsite = (org.website_url || ed.company_website) as string | undefined

  // Company details — Apollo first, PDL as fallback
  const employees = (org.estimated_num_employees || ed.company_size || pdlCompanySize) as string | number | undefined
  const revenue = (org.annual_revenue_printed || ed.company_revenue) as string | undefined
  const funding = (org.total_funding_printed || ed.company_funding) as string | undefined
  const founded = (org.founded_year || ed.company_founded) as string | number | undefined
  const companyCity = org.city as string | undefined
  const companyState = org.state as string | undefined
  const companyCountry = org.country as string | undefined
  const apolloCompanyLocation = [companyCity, companyState, companyCountry].filter(Boolean).join(', ')
  const companyLocation = apolloCompanyLocation || pdlCompanyLocation || ''
  const personLocation = (ed.location as string | undefined) || pdlLocation
  const seniority = ed.seniority as string | undefined
  const headline = ed.headline as string | undefined
  const keywords = (org.keywords as string[] | undefined)?.slice(0, 8).join(', ')
  const departments = (apolloRaw.departments as string[] | undefined)?.join(', ')
  const photoUrl = apolloRaw.photo_url as string | undefined
  const orgPhone = (org.primary_phone as { number?: string } | undefined)?.number || (org.sanitized_phone as string | undefined)
  const orgLinkedin = (org.linkedin_url || ed.company_linkedin_url || pdlCompanyLinkedin) as string | undefined

  // Build HTML sections — title/company fallback chain: caller > ed > lusha > pdl
  const effectiveTitle = lead.title || (ed.title as string | undefined) || lushaTitle || pdlTitle
  const effectiveCompany = lead.company || (ed.current_company as string | undefined) || lushaCompany || pdlCompany
  const effectiveIndustry = (org.industry as string | undefined) || pdlIndustry
  const roleClassification = [pdlTitleRole, pdlTitleSubRole].filter(Boolean).join(' / ')

  const emailCells = allEmails.map((e) => {
    const isVerified = verifiedEmailSet.has(e)
    const label = isVerified
      ? `<a href="mailto:${e}" style="color:#4f46e5;">${e}</a> <span style="color:#16a34a;font-size:10px;font-weight:700;background:#dcfce7;border-radius:3px;padding:1px 4px;">✓ verified</span>`
      : `<a href="mailto:${e}" style="color:#4f46e5;">${e}</a>`
    return label
  }).join('<br>')

  const contactRows = [
    row('Name', name),
    allEmails.length ? row('Email', emailCells) : '',
    allPhones.length ? row('Phone', allPhones.join('<br>')) : '',
    effectiveCompany ? row('Company', effectiveCompany) : '',
    effectiveTitle ? row('Title', effectiveTitle) : '',
    departments ? row('Department', departments) : '',
    seniority ? row('Seniority', seniority) : '',
    roleClassification ? row('Role Type', roleClassification) : '',
    personLocation ? row('Location', String(personLocation)) : '',
    pdlInferred ? row('Est. Salary', pdlInferred) : '',
    pdlLastVerified ? row('PDL Verified', String(pdlLastVerified).substring(0, 10)) : '',
    headline ? row('Headline', String(headline)) : '',
    effectiveLinkedin ? row('LinkedIn', 'View Profile →', effectiveLinkedin) : '',
    twitterUrl ? row('Twitter', 'View Profile', twitterUrl) : '',
    githubUrl ? row('GitHub', 'View Profile', githubUrl) : '',
    facebookUrl ? row('Facebook', 'View Profile', facebookUrl) : '',
  ].join('')

  const industry = effectiveIndustry
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

  const leadUrl = lead.leadId && lead.appBaseUrl
    ? `${lead.appBaseUrl}/accounts/${lead.accountId}/dashboard?lead=${lead.leadId}`
    : null

  const viewButtonHtml = leadUrl
    ? `<div style="text-align:center;margin:20px 0 4px;">
        <a href="${leadUrl}" style="display:inline-block;background:#4f46e5;color:#fff;font-size:13px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none;letter-spacing:0.01em;">
          See in Lead Router →
        </a>
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
    ${buildWaterfallSection(ed)}
    ${attrRows.trim() ? section('Lead Attribution (HighLevel)', attrRows) : ''}
    ${section('Routing', matchRows)}

    <div style="background:#f3f4f6;border-radius:6px;padding:14px;margin-top:20px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;">AI Reasoning</p>
      <p style="margin:0;font-size:13px;color:#374151;white-space:pre-line;">${lead.reasoning}</p>
    </div>

    ${viewButtonHtml}
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
    allEmails.length ? `Email: ${allEmails.map((e) => verifiedEmailSet.has(e) ? `${e} (verified)` : e).join(', ')}` : '',
    allPhones.length ? `Phone: ${allPhones.join(', ')}` : '',
    effectiveCompany ? `Company: ${effectiveCompany}` : '',
    effectiveTitle ? `Title: ${effectiveTitle}` : '',
    departments ? `Department: ${departments}` : '',
    seniority ? `Seniority: ${seniority}` : '',
    roleClassification ? `Role Type: ${roleClassification}` : '',
    personLocation ? `Location: ${personLocation}` : '',
    pdlLastVerified ? `PDL Verified: ${String(pdlLastVerified).substring(0, 10)}` : '',
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
    '',
    leadUrl ? `View this lead in Lead Router: ${leadUrl}` : '',
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
      Subject: lead.isReenrich ? `Re-enriched: ${name} → ${lead.personaName}` : `New Lead: ${name} → ${lead.personaName}`,
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
