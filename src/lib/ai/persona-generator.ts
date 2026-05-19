import type { AIConfig } from '@/types'

export interface GeneratedPersona {
  name: string
  description: string
  characteristics: string
  sample_person: string
  state: string
  county: string
}

const SYSTEM_PROMPT = `You are an expert sales persona strategist. Given a description of a target customer segment, generate a detailed, humanized sales persona.

Respond with valid JSON only — no markdown, no code fences, just raw JSON matching this shape exactly:
{
  "name": "A realistic full person name (first + last) that represents this persona — e.g. 'Carlos Rivera', 'Sarah Johnson', 'Michael Chen'",
  "sample_person": "The role or archetype this name represents — e.g. 'Multi-Unit Restaurant Owner', 'VP of Operations at a regional hotel chain'. This is the job title / persona type label.",
  "description": "2-3 sentence description of who this persona is and why they matter as a prospect",
  "characteristics": "Detailed bullet-point list covering: typical job titles, seniority levels, company size, industries, pain points, buying behavior, and what makes them a good fit. Use plain text bullet points starting with •",
  "state": "US state abbreviation if the persona is geographically targeted (e.g. 'TX', 'CA', 'FL'). Empty string if not geo-specific.",
  "county": "County name if the persona is targeted to a specific county (e.g. 'Harris County', 'Miami-Dade County'). Empty string if not geo-specific."
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
    max_tokens: 1024,
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
    if (!parsed.name || !parsed.description || !parsed.characteristics) {
      throw new Error('Missing required fields in AI response')
    }
    return {
      name: String(parsed.name).trim(),
      sample_person: String(parsed.sample_person || '').trim(),
      description: String(parsed.description).trim(),
      characteristics: String(parsed.characteristics).trim(),
      state: String(parsed.state || '').trim(),
      county: String(parsed.county || '').trim(),
    }
  } catch {
    throw new Error('AI returned invalid JSON. Please try again.')
  }
}
