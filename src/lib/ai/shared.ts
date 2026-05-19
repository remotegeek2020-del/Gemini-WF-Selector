import type { Persona } from '@/types'

export interface LeadData {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  source?: string | null
  rawData?: Record<string, unknown>
}

export function buildSystemPrompt(personas: Persona[]): string {
  const personaList = personas
    .map(
      (p, i) =>
        `${i + 1}. ID: ${p.id}
   Name: ${p.name}
   Description: ${p.description}
   Characteristics: ${p.characteristics}
   ${p.sample_person ? `Sample Person: ${p.sample_person}` : ''}
   ${p.state ? `State: ${p.state}` : ''}
   ${p.county ? `County: ${p.county}` : ''}`.replace(/\n   \n/g, '\n')
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
- After enrichment, carefully analyze: job title, seniority level, company size, industry, career history, and geographic location (state/county from Apollo data)
- If a persona has a State or County specified, prefer it for leads located in that region — but only assign if the professional profile also matches
- The enrichment response may include lusha_contact data with direct emails and phone numbers — use this for a fuller picture
- Choose the single best matching persona based on the enriched data
- If no persona is a good match, return persona_id as null with a clear explanation of why none fit

When assigning a persona, your final response MUST follow this exact format:
Assigned Persona: [Persona Name]
Persona ID: [persona UUID]
Reasoning: [2-4 sentences explaining specifically why this persona matches, referencing the lead's actual job title, company, industry, and seniority from the enriched data]

When no persona matches, your final response MUST follow this exact format:
Assigned Persona: None
Persona ID: null
Reasoning: [2-4 sentences explaining specifically why none of the personas fit, referencing the lead's actual data]`
}

export function buildLeadSummary(lead: LeadData): string {
  return `Lead information:
- Name: ${[lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unknown'}
- Email: ${lead.email || 'Not provided'}
- Phone: ${lead.phone || 'Not provided'}
- Source: ${lead.source || 'Unknown'}
- Raw data: ${JSON.stringify(lead.rawData || {}, null, 2)}

Please enrich this lead using Apollo and then assign them to a persona.`
}

export function extractPersonaFromText(finalText: string, personas: Persona[]): string | null {
  let assignedPersonaId: string | null = null

  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
  const uuids = finalText.match(uuidRegex)

  if (uuids && uuids.length > 0) {
    for (const uuid of uuids) {
      const matchingPersona = personas.find((p) => p.id.toLowerCase() === uuid.toLowerCase())
      if (matchingPersona) {
        assignedPersonaId = matchingPersona.id
        break
      }
    }
  }

  const noMatchPhrases = [
    'no match',
    'no persona',
    'no_match',
    'cannot assign',
    'does not match',
    'none of the personas',
    'no suitable persona',
    'not a good match',
    'not suitable',
    'unsuitable',
    'not a match',
    'persona_id: null',
    'persona id: null',
    'not appropriate',
    'not an appropriate',
  ]
  const lowerText = finalText.toLowerCase()
  const explicitNoMatch = noMatchPhrases.some((phrase) => lowerText.includes(phrase))

  if (explicitNoMatch) {
    return null
  }

  if (!assignedPersonaId) {
    for (const persona of personas) {
      if (finalText.toLowerCase().includes(persona.name.toLowerCase())) {
        assignedPersonaId = persona.id
        break
      }
    }
  }

  return assignedPersonaId
}

// Shared Apollo tool definition in JSON Schema format (for OpenAI / Anthropic / OpenRouter)
export const apolloToolJsonSchema = {
  name: 'apollo_enrich_person',
  description:
    'Enriches a lead with professional data from Apollo.io. Returns job title, seniority, company info, LinkedIn URL, industry, employee count, and more.',
  parameters: {
    type: 'object' as const,
    properties: {
      email: {
        type: 'string',
        description: "The person's email address",
      },
      first_name: {
        type: 'string',
        description: "The person's first name",
      },
      last_name: {
        type: 'string',
        description: "The person's last name",
      },
      organization_name: {
        type: 'string',
        description: "The person's current organization/company name",
      },
      domain: {
        type: 'string',
        description: "The company's website domain (e.g. acme.com) — improves match accuracy",
      },
      linkedin_url: {
        type: 'string',
        description: "The person's LinkedIn profile URL",
      },
    },
    required: [],
  },
}
