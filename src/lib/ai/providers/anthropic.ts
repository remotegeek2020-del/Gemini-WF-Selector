import Anthropic from '@anthropic-ai/sdk'
import { apolloEnrichPerson, formatApolloDataForGemini } from '@/lib/apollo/tools'
import { lushaEnrichPerson, formatLushaData } from '@/lib/lusha/tools'
import type { AIConfig, EnrichmentResult, Persona } from '@/types'
import {
  buildSystemPrompt,
  buildLeadSummary,
  extractPersonaFromText,
  apolloToolJsonSchema,
  lushaToolJsonSchema,
  type LeadData,
} from '../shared'

export async function runAnthropicAgent(
  config: AIConfig,
  apolloApiKey: string,
  lead: LeadData,
  personas: Persona[],
  lushaApiKey?: string
): Promise<EnrichmentResult> {
  const client = new Anthropic({ apiKey: config.apiKey })
  const model = config.model || 'claude-sonnet-4-5'

  const tools: Anthropic.Tool[] = [
    {
      name: apolloToolJsonSchema.name,
      description: apolloToolJsonSchema.description,
      input_schema: {
        type: 'object' as const,
        properties: apolloToolJsonSchema.parameters.properties,
        required: [],
      },
    },
  ]

  if (lushaApiKey) {
    tools.push({
      name: lushaToolJsonSchema.name,
      description: lushaToolJsonSchema.description,
      input_schema: {
        type: 'object' as const,
        properties: lushaToolJsonSchema.parameters.properties,
        required: [],
      },
    })
  }

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: buildLeadSummary(lead) },
  ]

  let enrichedData: Record<string, unknown> = {}
  let iteration = 0
  const maxIterations = 6
  let finalText = ''

  while (iteration < maxIterations) {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: buildSystemPrompt(personas, { hasLusha: !!lushaApiKey }),
      tools,
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason !== 'tool_use') {
      for (const block of response.content) {
        if (block.type === 'text') {
          finalText += block.text
        }
      }
      break
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'apollo_enrich_person') {
        const args = block.input as {
          email?: string
          first_name?: string
          last_name?: string
          organization_name?: string
          domain?: string
          linkedin_url?: string
        }

        const apolloResult = await apolloEnrichPerson(apolloApiKey, {
          email: args.email || lead.email || undefined,
          firstName: args.first_name || lead.firstName || undefined,
          lastName: args.last_name || lead.lastName || undefined,
          organizationName: args.organization_name || undefined,
          domain: args.domain || undefined,
          linkedinUrl: args.linkedin_url || undefined,
        })

        const formattedData = formatApolloDataForGemini(apolloResult.person)
        enrichedData = { ...enrichedData, ...formattedData, apollo_raw: apolloResult.person }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: apolloResult.error
            ? JSON.stringify({ error: apolloResult.error, data: null })
            : JSON.stringify({ data: formattedData, success: true }),
        })
      } else if (block.type === 'tool_use' && block.name === 'lusha_enrich_person' && lushaApiKey) {
        const args = block.input as {
          linkedin_url?: string
          email?: string
          first_name?: string
          last_name?: string
          company?: string
        }

        const lushaResult = await lushaEnrichPerson(lushaApiKey, {
          linkedinUrl: args.linkedin_url || (enrichedData.linkedin_url as string) || undefined,
          email: args.email || lead.email || undefined,
          firstName: args.first_name || lead.firstName || undefined,
          lastName: args.last_name || lead.lastName || undefined,
          company: args.company || (enrichedData.current_company as string) || undefined,
        })

        const lushaFormatted = formatLushaData(lushaResult.person)
        enrichedData = { ...enrichedData, ...lushaFormatted, lusha_raw: lushaResult.person }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: lushaResult.error
            ? JSON.stringify({ error: lushaResult.error, data: null })
            : JSON.stringify({ data: lushaFormatted, success: true }),
        })
      }
    }

    messages.push({ role: 'user', content: toolResults })

    iteration++
  }

  const assignedPersonaId = extractPersonaFromText(finalText, personas)

  return {
    persona_id: assignedPersonaId,
    reasoning: finalText,
    enriched_data: enrichedData,
  }
}
