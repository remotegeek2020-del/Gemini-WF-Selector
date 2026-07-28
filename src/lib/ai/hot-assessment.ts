import type { AIConfig, Persona } from '@/types'

export interface HotAssessmentInput {
  enrichedData: Record<string, unknown>
  persona: Persona | null
  isDefaultFallback: boolean
  source?: string | null
}

export interface HotAssessmentResult {
  is_hot: boolean
  hot_reasoning: string
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

  return `You are a lead quality assessor. Based on the enriched profile and target persona below, decide if this lead is HIGH-PRIORITY (hot).

A HOT lead has strong signals:
- Decision-making authority: Owner, CEO, President, VP, Director, C-level, Managing Partner, Principal
- Company size and industry that fits the target persona well
- Was a DIRECT persona match (not a default fallback)
- Meaningful profile data available (title, company, LinkedIn)

NOT hot signals:
- Junior employee, agent, or staff role with no purchasing authority
- Default fallback assignment (persona mismatch)
- Very little enrichment data returned

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

Respond in EXACTLY this format (two lines only):
Hot: YES or NO
Reasoning: [2-3 concise sentences. Be specific: reference the lead's actual title, seniority, and why they do or don't have decision-making authority for this persona. If default fallback, mention it.]`
}

function parseHotAssessment(text: string): HotAssessmentResult {
  const hotMatch = text.match(/Hot:\s*(YES|NO)/i)
  const reasoningMatch = text.match(/Reasoning:\s*([\s\S]+?)(?:\n\n|$)/i)
  const is_hot = hotMatch ? hotMatch[1].toUpperCase() === 'YES' : false
  const hot_reasoning = reasoningMatch ? reasoningMatch[1].trim() : text.replace(/Hot:\s*(YES|NO)\s*/i, '').trim()
  return { is_hot, hot_reasoning }
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
          body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: prompt }], max_tokens: 300 }),
        })
        const data = await res.json()
        return parseHotAssessment(data.choices?.[0]?.message?.content || '')
      }
      case 'openrouter': {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
          body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: prompt }], max_tokens: 300 }),
        })
        const data = await res.json()
        return parseHotAssessment(data.choices?.[0]?.message?.content || '')
      }
      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: config.model, max_tokens: 300, messages: [{ role: 'user', content: prompt }] }),
        })
        const data = await res.json()
        return parseHotAssessment(data.content?.[0]?.text || '')
      }
      default:
        return { is_hot: false, hot_reasoning: 'Assessment unavailable for this AI provider.' }
    }
  } catch (err) {
    console.error('[HotAssessment] failed:', err)
    return { is_hot: false, hot_reasoning: 'Assessment could not be completed.' }
  }
}
