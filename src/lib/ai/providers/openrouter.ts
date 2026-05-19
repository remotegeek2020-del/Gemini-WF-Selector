import OpenAI from 'openai'
import { apolloEnrichPerson, formatApolloDataForGemini } from '@/lib/apollo/tools'
import { autoLushaFromLinkedin } from '@/lib/lusha/tools'
import type { AIConfig, EnrichmentResult, Persona } from '@/types'
import {
  buildSystemPrompt,
  buildLeadSummary,
  extractPersonaFromText,
  apolloToolJsonSchema,
  type LeadData,
} from '../shared'

export async function runOpenRouterAgent(
  config: AIConfig,
  apolloApiKey: string,
  lead: LeadData,
  personas: Persona[],
  lushaApiKey?: string
): Promise<EnrichmentResult> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
  })

  const model = config.model || 'openai/gpt-4o'

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(personas) },
    { role: 'user', content: buildLeadSummary(lead) },
  ]

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: apolloToolJsonSchema.name,
        description: apolloToolJsonSchema.description,
        parameters: apolloToolJsonSchema.parameters,
      },
    },
  ]

  let enrichedData: Record<string, unknown> = {}
  let iteration = 0
  const maxIterations = 5

  while (iteration < maxIterations) {
    const response = await client.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: 'auto',
    })

    const choice = response.choices[0]
    const assistantMessage = choice.message
    messages.push(assistantMessage)

    if (choice.finish_reason !== 'tool_calls' || !assistantMessage.tool_calls) break

    for (const toolCall of assistantMessage.tool_calls) {
      if (toolCall.function.name === 'apollo_enrich_person') {
        let args: {
          email?: string
          first_name?: string
          last_name?: string
          organization_name?: string
          domain?: string
          linkedin_url?: string
        } = {}

        try {
          args = JSON.parse(toolCall.function.arguments)
        } catch {
          args = {}
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

        // Auto-enrich with Lusha if LinkedIn URL found
        let lushaContact: Record<string, unknown> = {}
        if (lushaApiKey && formattedData.linkedin_url) {
          const { lushaFormatted, lushaRaw } = await autoLushaFromLinkedin(lushaApiKey, formattedData, lead)
          enrichedData = { ...enrichedData, ...lushaFormatted, lusha_raw: lushaRaw }
          lushaContact = lushaFormatted
        } else if (lushaApiKey) {
          enrichedData = { ...enrichedData, lusha_raw: null }
        }

        const toolResult = apolloResult.error
          ? JSON.stringify({ error: apolloResult.error, data: null })
          : JSON.stringify({
              data: formattedData,
              ...(Object.keys(lushaContact).length > 0 ? { lusha_contact: lushaContact } : {}),
              success: true,
            })

        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResult })
      }
    }

    iteration++
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
  const finalText =
    lastAssistant && 'content' in lastAssistant && typeof lastAssistant.content === 'string'
      ? lastAssistant.content
      : ''

  const assignedPersonaId = extractPersonaFromText(finalText, personas)

  return {
    persona_id: assignedPersonaId,
    reasoning: finalText,
    enriched_data: enrichedData,
  }
}
