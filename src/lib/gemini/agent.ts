import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type Tool,
} from '@google/generative-ai'
import { apolloEnrichPerson, formatApolloDataForGemini } from '@/lib/apollo/tools'
import type { Persona, EnrichmentResult } from '@/types'

interface LeadData {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  source?: string | null
  rawData?: Record<string, unknown>
}

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
    },
    required: [],
  },
}

const apolloTools: Tool[] = [
  {
    functionDeclarations: [apolloEnrichPersonDeclaration],
  },
]

function buildSystemPrompt(personas: Persona[]): string {
  const personaList = personas
    .map(
      (p, i) =>
        `${i + 1}. ID: ${p.id}
   Name: ${p.name}
   Description: ${p.description}
   Characteristics: ${p.characteristics}
   ${p.sample_person ? `Sample Person: ${p.sample_person}` : ''}`
    )
    .join('\n\n')

  return `You are a lead qualification AI agent for a sales team. Your job is to:
1. Enrich lead data using the Apollo.io tool
2. Analyze the enriched professional profile
3. Assign the lead to the most appropriate persona

Available personas:
${personaList}

Instructions:
- Always call apollo_enrich_person first to get professional details
- Use email if available, otherwise use name and company from raw data
- After enrichment, carefully analyze: job title, seniority level, company size, industry, and career history
- Choose the single best matching persona based on the enriched data
- If no persona is a good match, return persona_id as null with explanation
- Your reasoning should be specific and reference actual data points from the enrichment
- Be decisive - pick the best match even if it's not perfect`
}

export async function runEnrichmentAgent(
  geminiApiKey: string,
  apolloApiKey: string,
  lead: LeadData,
  personas: Persona[]
): Promise<EnrichmentResult> {
  if (!personas || personas.length === 0) {
    return {
      persona_id: null,
      reasoning: 'No personas configured. Please add personas in the Personas page.',
      enriched_data: {},
    }
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: buildSystemPrompt(personas),
    tools: apolloTools,
  })

  const leadSummary = `
Lead information:
- Name: ${[lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unknown'}
- Email: ${lead.email || 'Not provided'}
- Phone: ${lead.phone || 'Not provided'}
- Source: ${lead.source || 'Unknown'}
- Raw data: ${JSON.stringify(lead.rawData || {}, null, 2)}

Please enrich this lead using Apollo and then assign them to a persona.
`

  const chat = model.startChat()
  let enrichedData: Record<string, unknown> = {}

  const initialResponse = await chat.sendMessage(leadSummary)
  let result = initialResponse.response

  // Handle function calls in an agentic loop
  let iteration = 0
  const maxIterations = 5

  while (iteration < maxIterations) {
    const functionCalls = result.functionCalls()

    if (!functionCalls || functionCalls.length === 0) {
      break
    }

    const functionResponses = []

    for (const call of functionCalls) {
      if (call.name === 'apollo_enrich_person') {
        const args = call.args as {
          email?: string
          first_name?: string
          last_name?: string
          organization_name?: string
        }

        const apolloResult = await apolloEnrichPerson(apolloApiKey, {
          email: args.email || lead.email || undefined,
          firstName: args.first_name || lead.firstName || undefined,
          lastName: args.last_name || lead.lastName || undefined,
          organizationName: args.organization_name || undefined,
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

    const functionResult = await chat.sendMessage(functionResponses)
    result = functionResult.response
    iteration++
  }

  // Parse the final text response to extract persona assignment
  const finalText = result.text()

  // Try to extract persona_id from the response
  let assignedPersonaId: string | null = null
  let reasoning = finalText

  // Look for persona ID in the response (UUIDs)
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
  const uuids = finalText.match(uuidRegex)

  if (uuids && uuids.length > 0) {
    // Find the first UUID that matches a persona ID
    for (const uuid of uuids) {
      const matchingPersona = personas.find((p) => p.id.toLowerCase() === uuid.toLowerCase())
      if (matchingPersona) {
        assignedPersonaId = matchingPersona.id
        break
      }
    }
  }

  // Check if the model explicitly said no match
  const noMatchPhrases = [
    'no match',
    'no persona',
    'no_match',
    'cannot assign',
    'does not match',
    'none of the personas',
    'no suitable persona',
  ]
  const lowerText = finalText.toLowerCase()
  if (noMatchPhrases.some((phrase) => lowerText.includes(phrase))) {
    if (!assignedPersonaId) {
      assignedPersonaId = null
    }
  }

  // If no UUID found but model gave text, try to match persona by name
  if (!assignedPersonaId) {
    for (const persona of personas) {
      if (finalText.toLowerCase().includes(persona.name.toLowerCase())) {
        assignedPersonaId = persona.id
        break
      }
    }
  }

  return {
    persona_id: assignedPersonaId,
    reasoning,
    enriched_data: enrichedData,
  }
}
