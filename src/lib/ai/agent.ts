import type { AIConfig, EnrichmentResult, Persona } from '@/types'
import type { LeadData } from './shared'
import { buildPersonaAssignmentPrompt, extractPersonaFromText } from './shared'
import { runGeminiAgent } from './providers/gemini'
import { runOpenAIAgent } from './providers/openai'
import { runAnthropicAgent } from './providers/anthropic'
import { runOpenRouterAgent } from './providers/openrouter'

export type { LeadData }

// Legacy entry point — used by re-enrich route that still runs Apollo inside the AI
export async function runEnrichmentAgent(
  config: AIConfig,
  apolloApiKey: string,
  lead: LeadData,
  personas: Persona[],
  lushaApiKey?: string
): Promise<EnrichmentResult> {
  if (!personas || personas.length === 0) {
    return {
      persona_id: null,
      reasoning: 'No personas configured. Please add personas in the Personas page.',
      enriched_data: {},
    }
  }

  switch (config.provider) {
    case 'gemini':
      return runGeminiAgent(config, apolloApiKey, lead, personas, lushaApiKey)
    case 'openai':
      return runOpenAIAgent(config, apolloApiKey, lead, personas, lushaApiKey)
    case 'anthropic':
      return runAnthropicAgent(config, apolloApiKey, lead, personas, lushaApiKey)
    case 'openrouter':
      return runOpenRouterAgent(config, apolloApiKey, lead, personas, lushaApiKey)
    default: {
      const _exhaustive: never = config.provider
      throw new Error(`Unsupported AI provider: ${_exhaustive}`)
    }
  }
}

// New entry point — used by webhook pipeline. Enrichment already done externally.
export async function runPersonaAssignment(
  config: AIConfig,
  lead: LeadData,
  enrichedData: Record<string, unknown>,
  personas: Persona[]
): Promise<{ persona_id: string | null; reasoning: string }> {
  if (!personas || personas.length === 0) {
    return { persona_id: null, reasoning: 'No personas configured. Please add personas in the Personas page.' }
  }

  const prompt = buildPersonaAssignmentPrompt(lead, enrichedData, personas)

  try {
    let text = ''

    switch (config.provider) {
      case 'gemini': {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(config.apiKey)
        const model = genAI.getGenerativeModel({ model: config.model || 'gemini-2.5-flash' })
        const result = await model.generateContent(prompt)
        text = result.response.text()
        break
      }
      case 'openai': {
        const OpenAI = (await import('openai')).default
        const client = new OpenAI({ apiKey: config.apiKey })
        const response = await client.chat.completions.create({
          model: config.model || 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 800,
        })
        text = response.choices[0]?.message?.content || ''
        break
      }
      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: config.model, max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
        })
        const data = await res.json()
        text = data.content?.[0]?.text || ''
        break
      }
      case 'openrouter': {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
          body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: prompt }], max_tokens: 800 }),
        })
        const data = await res.json()
        text = data.choices?.[0]?.message?.content || ''
        break
      }
    }

    const persona_id = extractPersonaFromText(text, personas)
    return { persona_id, reasoning: text }
  } catch (err) {
    console.error('[PersonaAssignment] failed:', err)
    return { persona_id: null, reasoning: 'Persona assignment failed due to an AI error.' }
  }
}
