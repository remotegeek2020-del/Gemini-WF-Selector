import type { AIConfig } from '@/types'

export interface GeneratedPersona {
  name: string
  // Sample Person
  full_name: string
  title_role: string
  age: string
  location: string
  current_income: string
  income_goal: string
  background_story: string
  core_frustration: string
  // Characteristics
  who_they_are: string
  industry_experience: string
  primary_frustration: string
  what_they_want: string
  decision_trigger: string
  trust_barrier: string
  engagement_style: string
  best_contact_method: string
  sells_into: string
  // Legacy fields still populated for backward compat
  description: string
  characteristics: string
  state: string
  county: string
}

const SYSTEM_PROMPT = `You are an expert sales persona strategist. Given a description of a target customer segment, generate a deeply humanized, realistic sales persona with a full sample person and detailed characteristics.

Respond with valid JSON only — no markdown, no code fences, just raw JSON matching this shape exactly:
{
  "name": "A short archetype label for this persona — e.g. 'Independent ISO Agent', 'Multi-Unit Restaurant Owner', 'SaaS VP of Operations'",
  "full_name": "A realistic full person name (first + last) representing this persona — e.g. 'Brian Castillo', 'Sarah Johnson'",
  "title_role": "Their exact job title or role — e.g. 'Independent ISO Agent', 'Director of Operations, Regional Hotel Group'",
  "age": "Realistic age for this persona — e.g. '38' or '42-48'",
  "location": "City and state — e.g. 'Houston, TX' or 'Miami, FL'",
  "current_income": "Their current income situation — e.g. '$4,200/month residual (stagnant for 2 years)'",
  "income_goal": "What income they are targeting — e.g. '$8,000–$12,000/month residual within 18 months'",
  "background_story": "3-4 sentences describing their career background, how they got here, and what their day-to-day looks like",
  "core_frustration": "1-2 sentences on the single biggest frustration driving them to look for a solution",
  "who_they_are": "2-3 sentences defining who this person is professionally and personally",
  "industry_experience": "Their level of industry knowledge and what they understand deeply — e.g. 'High — understands interchange, residuals, and ISO agreements'",
  "primary_frustration": "The main pain point in their work life — e.g. 'Underpaid residual split, no upline support, merchant attrition they can't control'",
  "what_they_want": "What outcome they are seeking — e.g. 'Better residual split, reliable upline support, a partner who invests in their growth'",
  "decision_trigger": "What event or proof point would make them act — e.g. 'Hard proof that your program pays better with a side-by-side residual comparison'",
  "trust_barrier": "What is holding them back from trusting — e.g. 'Has been burned by ISO promises before. Needs to see real numbers and talk to active agents'",
  "engagement_style": "How they prefer to be approached — e.g. 'Direct, skeptical, and experienced. Skip the pitch — lead with data and peer stories'",
  "best_contact_method": "Preferred outreach channel — e.g. 'Phone or LinkedIn. Responds to direct messages with specific value propositions'",
  "sells_into": "The types of businesses or verticals they work with — e.g. 'Restaurants, retail, auto, and service businesses under $1M revenue'",
  "description": "2-3 sentence summary of this persona for quick reference",
  "characteristics": "Bullet-point summary of key qualifying traits (job titles, seniority, company size, buying behavior). Use • bullets.",
  "state": "US state abbreviation if geographically targeted (e.g. 'TX'). Empty string if not.",
  "county": "County name if targeted to a specific county (e.g. 'Harris County'). Empty string if not."
}`

export async function generatePersonaContent(
  config: AIConfig,
  userPrompt: string
): Promise<GeneratedPersona> {
  const userMessage = `Create a sales persona for: ${userPrompt}`

  switch (config.provider) {
    case 'gemini':
      return generateWithGemini(config, userMessage)
    case 'openai':
      return generateWithOpenAI(config, userMessage, 'https://api.openai.com/v1')
    case 'anthropic':
      return generateWithAnthropic(config, userMessage)
    case 'openrouter':
      return generateWithOpenAI(config, userMessage, 'https://openrouter.ai/api/v1')
    default:
      throw new Error(`Unsupported provider: ${config.provider}`)
  }
}

async function generateWithGemini(config: AIConfig, userMessage: string): Promise<GeneratedPersona> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(config.apiKey)
  const model = genAI.getGenerativeModel({
    model: config.model,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { responseMimeType: 'application/json' },
  })
  const result = await model.generateContent(userMessage)
  return parseGenerated(result.response.text())
}

async function generateWithOpenAI(
  config: AIConfig,
  userMessage: string,
  baseURL: string
): Promise<GeneratedPersona> {
  const OpenAI = (await import('openai')).default
  const client = new OpenAI({ apiKey: config.apiKey, baseURL })
  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
  })
  return parseGenerated(response.choices[0].message.content || '')
}

async function generateWithAnthropic(config: AIConfig, userMessage: string): Promise<GeneratedPersona> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: config.apiKey })
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })
  const block = response.content[0]
  return parseGenerated(block.type === 'text' ? block.text : '')
}

function parseGenerated(text: string): GeneratedPersona {
  try {
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(clean)
    if (!parsed.name) {
      throw new Error('Missing required fields in AI response')
    }
    const str = (v: unknown) => String(v || '').trim()
    return {
      name: str(parsed.name),
      full_name: str(parsed.full_name),
      title_role: str(parsed.title_role),
      age: str(parsed.age),
      location: str(parsed.location),
      current_income: str(parsed.current_income),
      income_goal: str(parsed.income_goal),
      background_story: str(parsed.background_story),
      core_frustration: str(parsed.core_frustration),
      who_they_are: str(parsed.who_they_are),
      industry_experience: str(parsed.industry_experience),
      primary_frustration: str(parsed.primary_frustration),
      what_they_want: str(parsed.what_they_want),
      decision_trigger: str(parsed.decision_trigger),
      trust_barrier: str(parsed.trust_barrier),
      engagement_style: str(parsed.engagement_style),
      best_contact_method: str(parsed.best_contact_method),
      sells_into: str(parsed.sells_into),
      description: str(parsed.description),
      characteristics: str(parsed.characteristics),
      state: str(parsed.state),
      county: str(parsed.county),
    }
  } catch {
    throw new Error('AI returned invalid JSON. Please try again.')
  }
}
