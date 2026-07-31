import type { AIConfig, Persona, HotLeadCriteria } from '@/types'

export interface HotAssessmentInput {
  enrichedData: Record<string, unknown>
  persona: Persona | null
  isDefaultFallback: boolean
  source?: string | null
  criteria?: HotLeadCriteria | null
}

export interface HotAssessmentResult {
  is_hot: boolean
  hot_reasoning: string
  criteria_matched: string[]
}

function buildCriteriaBlock(c: HotLeadCriteria): string {
  const lines: string[] = []

  // Title & Seniority
  if (c.requireDecisionMaker) lines.push('• Must be a decision maker (Owner, CEO, President, C-Suite, Managing Partner, Principal)')
  if (c.requireVpOrAbove) lines.push('• Seniority must be VP or above')
  if (c.requireDirectorOrAbove) lines.push('• Seniority must be Director or above')
  if (c.requireManagerOrAbove) lines.push('• Seniority must be Manager or above')
  if (c.titleKeywords?.trim()) lines.push(`• Title must contain one of these keywords: ${c.titleKeywords}`)
  if (c.titleRoles?.length) lines.push(`• Title role type must be one of: ${c.titleRoles.join(', ')}`)
  if (c.titleRolesOther?.trim()) lines.push(`• Title/role criteria (custom): ${c.titleRolesOther}`)

  // Company Size
  if (c.minEmployees) lines.push(`• Company must have at least ${c.minEmployees} employees`)
  if (c.maxEmployees) lines.push(`• Company must have fewer than ${c.maxEmployees} employees (SMB target)`)
  if (c.minRevenue) lines.push(`• Company annual revenue must be above ${c.minRevenue}`)
  if (c.requireFunding) lines.push('• Company must have received funding (any round)')
  if (c.maxFoundedYearsAgo) lines.push(`• Company must be a startup (founded within the last ${c.maxFoundedYearsAgo} years)`)

  // Industry
  if (c.targetIndustries?.length) lines.push(`• Industry must be one of: ${c.targetIndustries.join(', ')}`)
  if (c.targetIndustriesOther?.trim()) lines.push(`• Industry targets (custom): ${c.targetIndustriesOther}`)
  if (c.excludeIndustries?.length) lines.push(`• Industry must NOT be: ${c.excludeIndustries.join(', ')}`)
  if (c.excludeIndustriesOther?.trim()) lines.push(`• Industry exclusions (custom): ${c.excludeIndustriesOther}`)

  // Contact Quality
  if (c.requireVerifiedEmail) lines.push('• Must have a verified email address')
  if (c.requirePhone) lines.push('• Must have at least one phone number')
  if (c.requireLinkedin) lines.push('• Must have a LinkedIn profile')
  if (c.requireMultipleContactMethods) lines.push('• Must have both a phone number and an email address')
  if (c.maxPdlVerifiedMonths) lines.push(`• PDL data must have been verified within the last ${c.maxPdlVerifiedMonths} months`)
  if (c.minEnrichmentSources) lines.push(`• At least ${c.minEnrichmentSources} enrichment tools must have returned data`)

  // Location
  if (c.targetStates?.length) lines.push(`• Must be located in one of these US states: ${c.targetStates.join(', ')}`)
  if (c.targetCities?.trim()) lines.push(`• Must be located in one of these cities: ${c.targetCities}`)
  if (c.targetCountries?.trim()) lines.push(`• Must be located in: ${c.targetCountries}`)
  if (c.excludeLocations?.trim()) lines.push(`• Must NOT be located in: ${c.excludeLocations}`)

  // Career Signals
  if (c.recentJobChangeMonths) lines.push(`• Must have changed jobs within the last ${c.recentJobChangeMonths} months`)
  if (c.minYearsInRole) lines.push(`• Must have been in current role for at least ${c.minYearsInRole} years`)
  if (c.minCompaniesWorked) lines.push(`• Must have worked at ${c.minCompaniesWorked} or more companies`)
  if (c.requireCareerGrowth) lines.push('• Career must show upward trajectory (promotions visible in history)')
  if (c.previousNotableCompanies?.trim()) lines.push(`• Previously worked at a notable company such as: ${c.previousNotableCompanies}`)
  if (c.careerSignalsOther?.trim()) lines.push(`• Career signals (custom): ${c.careerSignalsOther}`)

  // Company Signals
  if (c.requireCompanyLinkedin) lines.push('• Company must have a LinkedIn page')
  if (c.requireCompanyPhone) lines.push('• Company must have a phone number')
  if (c.requireCompanyWebsite) lines.push('• Company must have a website')
  if (c.companyHq?.trim()) lines.push(`• Company HQ must be in: ${c.companyHq}`)
  if (c.companyKeywords?.trim()) lines.push(`• Company must be associated with these keywords: ${c.companyKeywords}`)
  if (c.companySignalsOther?.trim()) lines.push(`• Company signals (custom): ${c.companySignalsOther}`)

  // Lead Source
  if (c.requirePaidAd) lines.push('• Lead must have come from a paid ad (UTM source present)')
  if (c.requireUtmCampaign?.trim()) lines.push(`• Lead must have come from UTM campaign: ${c.requireUtmCampaign}`)
  if (c.requireFormName?.trim()) lines.push(`• Lead must have come from form: ${c.requireFormName}`)
  if (c.requireOrganicSearch) lines.push('• Lead must have come from organic search')
  if (c.leadSourceOther?.trim()) lines.push(`• Lead source (custom): ${c.leadSourceOther}`)

  return lines.join('\n')
}

function buildHotPrompt(input: HotAssessmentInput): string {
  const ed = input.enrichedData
  const apolloRaw = (ed.apollo_raw || {}) as Record<string, unknown>
  const org = (apolloRaw.organization || ed.organization || {}) as Record<string, unknown>

  const personaContext = input.persona
    ? [
        `ASSIGNED PERSONA: ${input.persona.name}`,
        input.persona.description ? `PERSONA DESCRIPTION: ${input.persona.description}` : '',
        input.persona.who_they_are ? `WHO THEY ARE: ${input.persona.who_they_are}` : '',
        input.persona.industry_experience ? `INDUSTRY EXPERIENCE: ${input.persona.industry_experience}` : '',
        input.persona.what_they_want ? `WHAT THEY WANT: ${input.persona.what_they_want}` : '',
        input.persona.decision_trigger ? `DECISION TRIGGER: ${input.persona.decision_trigger}` : '',
        `DIRECT PERSONA MATCH: ${input.isDefaultFallback ? 'NO (assigned via default fallback)' : 'YES'}`,
      ].filter(Boolean).join('\n')
    : 'ASSIGNED PERSONA: None (no match found)'

  const c = input.criteria
  const hasCriteria = c && buildCriteriaBlock(c).trim().length > 0

  let criteriaSection = ''
  if (hasCriteria) {
    const mode = c!.strictMode
      ? 'ALL of the following criteria must be met for a lead to be considered hot.'
      : c!.minCriteriaMatch
        ? `At least ${c!.minCriteriaMatch} of the following criteria must be met for a lead to be considered hot.`
        : 'Use the following criteria as strong signals — the more that are met, the hotter the lead.'

    criteriaSection = `
ACCOUNT-SPECIFIC HOT LEAD CRITERIA:
${mode}

${buildCriteriaBlock(c!)}
${c!.customInstructions?.trim() ? `\nADDITIONAL ACCOUNT INSTRUCTIONS:\n${c!.customInstructions}` : ''}
`
  } else {
    criteriaSection = `
DEFAULT HOT LEAD SIGNALS:
- Decision-making authority: Owner, CEO, President, VP, Director, C-level, Managing Partner, Principal
- Company size and industry that fits the target persona well
- Was a DIRECT persona match (not a default fallback)
- Meaningful profile data available (title, company, LinkedIn)

NOT hot:
- Junior employee, agent, or staff role with no purchasing authority
- Default fallback assignment (persona mismatch)
- Very little enrichment data returned
`
  }

  return `You are a lead quality assessor. Based on the enriched profile, persona, and criteria below, decide if this lead is HIGH-PRIORITY (hot).

${criteriaSection}

${personaContext}
SOURCE CHANNEL: ${input.source || 'unknown'}

ENRICHED LEAD PROFILE:
- Title: ${ed.title || apolloRaw.title || 'Unknown'}
- Seniority: ${ed.seniority || 'Unknown'}
- Company: ${ed.current_company || org.name || 'Unknown'}
- Industry: ${ed.company_industry || org.industry || 'Unknown'}
- Company Size: ${ed.company_size || org.estimated_num_employees || 'Unknown'}
- Location: ${ed.location || 'Unknown'}
- LinkedIn: ${ed.linkedin_url || apolloRaw.linkedin_url ? 'Found' : 'Not found'}
- Headline: ${ed.headline || 'None'}
- Verified Email: ${(ed.verified_emails as string[] | undefined)?.length ? 'Yes' : 'Unknown'}
- Phone Count: ${(ed.all_phones as string[] | undefined)?.length ?? 0}
- Enrichment Sources Used: ${(ed.sources_used as string[] | undefined)?.length ?? 0}
- PDL Last Verified: ${ed.pdl_last_verified || 'Unknown'}
- Job History Count: ${(ed.pdl_experience as unknown[] | undefined)?.length ?? 0}

Respond in EXACTLY this format (three lines only):
Hot: YES or NO
Reasoning: [2-3 concise sentences. Be specific: reference the lead's actual title/seniority and whether they meet the account's criteria.]
Criteria: [JSON array of short strings naming each criterion that was met, e.g. ["Decision maker - CEO", "Verified email", "LinkedIn found"]. Empty array [] if none met.]`
}

function parseHotAssessment(text: string): HotAssessmentResult {
  const hotMatch = text.match(/Hot:\s*(YES|NO)/i)
  const reasoningMatch = text.match(/Reasoning:\s*(.+?)(?:\nCriteria:|$)/is)
  const criteriaMatch = text.match(/Criteria:\s*(\[[\s\S]*?\])/i)

  const is_hot = hotMatch ? hotMatch[1].toUpperCase() === 'YES' : false
  const hot_reasoning = reasoningMatch ? reasoningMatch[1].trim() : text.replace(/Hot:\s*(YES|NO)\s*/i, '').trim()

  let criteria_matched: string[] = []
  if (criteriaMatch) {
    try {
      const parsed = JSON.parse(criteriaMatch[1])
      if (Array.isArray(parsed)) criteria_matched = parsed.filter((x) => typeof x === 'string')
    } catch {
      // ignore parse errors
    }
  }

  return { is_hot, hot_reasoning, criteria_matched }
}

export async function assessLeadHotness(
  config: AIConfig,
  input: HotAssessmentInput
): Promise<HotAssessmentResult> {
  const prompt = buildHotPrompt(input)

  try {
    switch (config.provider) {
      case 'gemini': {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(config.apiKey)
        const model = genAI.getGenerativeModel({ model: config.model || 'gemini-2.5-flash' })
        const result = await model.generateContent(prompt)
        return parseHotAssessment(result.response.text())
      }
      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
          body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: prompt }], max_tokens: 400 }),
        })
        const data = await res.json()
        return parseHotAssessment(data.choices?.[0]?.message?.content || '')
      }
      case 'openrouter': {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
          body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: prompt }], max_tokens: 400 }),
        })
        const data = await res.json()
        return parseHotAssessment(data.choices?.[0]?.message?.content || '')
      }
      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: config.model, max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
        })
        const data = await res.json()
        return parseHotAssessment(data.content?.[0]?.text || '')
      }
      default:
        return { is_hot: false, hot_reasoning: 'Assessment unavailable for this AI provider.', criteria_matched: [] }
    }
  } catch (err) {
    console.error('[HotAssessment] failed:', err)
    return { is_hot: false, hot_reasoning: 'Assessment could not be completed.', criteria_matched: [] }
  }
}
