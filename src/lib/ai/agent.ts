import type { AIConfig, EnrichmentResult, Persona } from '@/types'
import type { LeadData } from './shared'
import { runGeminiAgent } from './providers/gemini'
import { runOpenAIAgent } from './providers/openai'
import { runAnthropicAgent } from './providers/anthropic'
import { runOpenRouterAgent } from './providers/openrouter'

export type { LeadData }

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
