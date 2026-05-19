import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type Tool,
} from '@google/generative-ai'
import { apolloEnrichPerson, formatApolloDataForGemini } from '@/lib/apollo/tools'
import type { AIConfig, EnrichmentResult, Persona } from '@/types'
import {
  buildSystemPrompt,
  buildLeadSummary,
  extractPersonaFromText,
  type LeadData,
} from '../shared'

const apolloEnrichPersonDeclaration: FunctionDeclaration = {
  name: 'apollo_enrich_person',
  description:
    'Enriches a lead with professional data from Apollo.io. Returns job title, seniority, company info, LinkedIn URL, industry, employee count, and more.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      email: {
        type: SchemaType.STRING,
        description: "The person's email address",
      },
      first_name: {
        type: SchemaType.STRING,
        description: "The person's first name",
      },
      last_name: {
        type: SchemaType.STRING,
        description: "The person's last name",
      },
      organization_name: {
        type: SchemaType.STRING,
        description: "The person's current organization/company name",
      },
      domain: {
        type: SchemaType.STRING,
        description: "The company's website domain (e.g. acme.com) — improves match accuracy",
      },
      linkedin_url: {
        type: SchemaType.STRING,
        description: "The person's LinkedIn profile URL",
      },
    },
    required: [],
  },
}

const apolloTools: Tool[] = [
  {
    functionDeclarations: [apolloEnrichPersonDeclaration],
  },
]

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('overloaded')
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (!isRetryableError(err) || attempt === maxAttempts) throw err
      const delay = attempt * 3000
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw lastError
}

export async function runGeminiAgent(
  config: AIConfig,
  apolloApiKey: string,
  lead: LeadData,
  personas: Persona[]
): Promise<EnrichmentResult> {
  const genAI = new GoogleGenerativeAI(config.apiKey)
  const model = genAI.getGenerativeModel({
    model: config.model || 'gemini-1.5-flash',
    systemInstruction: buildSystemPrompt(personas),
    tools: apolloTools,
  })

  const chat = model.startChat()
  let enrichedData: Record<string, unknown> = {}

  const initialResponse = await withRetry(() => chat.sendMessage(buildLeadSummary(lead)))
  let result = initialResponse.response

  // Agentic loop
  let iteration = 0
  const maxIterations = 5

  while (iteration < maxIterations) {
    const functionCalls = result.functionCalls()
    if (!functionCalls || functionCalls.length === 0) break

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const functionResponses: any[] = []

    for (const call of functionCalls) {
      if (call.name === 'apollo_enrich_person') {
        const args = call.args as {
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
        enrichedData = { ...formattedData, apollo_raw: apolloResult.person }

        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: apolloResult.error
              ? { error: apolloResult.error, data: null }
              : { data: formattedData, success: true },
          },
        })
      }
    }

    const functionResult = await withRetry(() => chat.sendMessage(functionResponses))
    result = functionResult.response
    iteration++
  }

  const finalText = result.text()
  const assignedPersonaId = extractPersonaFromText(finalText, personas)

  return {
    persona_id: assignedPersonaId,
    reasoning: finalText,
    enriched_data: enrichedData,
  }
}
