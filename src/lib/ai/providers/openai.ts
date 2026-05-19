import OpenAI from 'openai'
import { apolloEnrichPerson, formatApolloDataForGemini } from '@/lib/apollo/tools'
import type { AIConfig, EnrichmentResult, Persona } from '@/types'
import {
  buildSystemPrompt,
  buildLeadSummary,
  extractPersonaFromText,
  apolloToolJsonSchema,
  type LeadData,
} from '../shared'

export async function runOpenAIAgent(
  config: AIConfig,
  apolloApiKey: string,
  lead: LeadData,
  personas: Persona[]
): Promise<EnrichmentResult> {
  const client = new OpenAI({ apiKey: config.apiKey })
  const model = config.model || 'gpt-4o'

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

    // Add assistant message to history
    messages.push(assistantMessage)

    if (choice.finish_reason !== 'tool_calls' || !assistantMessage.tool_calls) {
      // No more tool calls — we have the final answer
      break
    }

    // Execute tool calls
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
        enrichedData = { ...formattedData, apollo_raw: apolloResult.person }

        const toolResult = apolloResult.error
          ? JSON.stringify({ error: apolloResult.error, data: null })
          : JSON.stringify({ data: formattedData, success: true })

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult,
        })
      }
    }

    iteration++
  }

  // Extract final text from last assistant message
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
