import type { Persona } from '@/types'

export interface LeadData {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  source?: string | null
  linkedinUrl?: string | null
  rawData?: Record<string, unknown>
}

export function buildSystemPrompt(personas: Persona[]): string {
  const personaList = personas
    .map((p, i) => {
      const lines: string[] = [
        `${i + 1}. ID: ${p.id}`,
        `   Persona Name: ${p.name}`,
      ]

      // Sample Person block
      if (p.full_name || p.title_role) {
        lines.push(`   --- SAMPLE PERSON ---`)
        if (p.full_name) lines.push(`   Full Name: ${p.full_name}`)
        if (p.title_role) lines.push(`   Title / Role: ${p.title_role}`)
        if (p.age) lines.push(`   Age: ${p.age}`)
        if (p.location) lines.push(`   Location: ${p.location}`)
        if (p.current_income) lines.push(`   Current Income: ${p.current_income}`)
        if (p.income_goal) lines.push(`   Income Goal: ${p.income_goal}`)
        if (p.background_story) lines.push(`   Background Story: ${p.background_story}`)
        if (p.core_frustration) lines.push(`   Core Frustration: ${p.core_frustration}`)
      }

      // Characteristics block
      if (p.who_they_are || p.industry_experience || p.primary_frustration) {
        lines.push(`   --- CHARACTERISTICS ---`)
        if (p.who_they_are) lines.push(`   Who They Are: ${p.who_they_are}`)
        if (p.industry_experience) lines.push(`   Industry Experience: ${p.industry_experience}`)
        if (p.primary_frustration) lines.push(`   Primary Frustration: ${p.primary_frustration}`)
        if (p.what_they_want) lines.push(`   What They Want: ${p.what_they_want}`)
        if (p.decision_trigger) lines.push(`   Decision Trigger: ${p.decision_trigger}`)
        if (p.trust_barrier) lines.push(`   Trust Barrier: ${p.trust_barrier}`)
        if (p.engagement_style) lines.push(`   Engagement Style: ${p.engagement_style}`)
        if (p.best_contact_method) lines.push(`   Best Contact Method: ${p.best_contact_method}`)
        if (p.sells_into) lines.push(`   Sells Into: ${p.sells_into}`)
      }

      // Legacy fields
      if (p.description) lines.push(`   Description: ${p.description}`)
      if (p.characteristics) lines.push(`   Characteristics: ${p.characteristics}`)
      if (p.state) lines.push(`   State: ${p.state}`)
      if (p.county) lines.push(`   County: ${p.county}`)

      return lines.join('\n')
    })
    .join('\n\n')

  return `You are a lead qualification AI agent for a sales team. Your job is to:
1. Enrich lead data using the Apollo.io tool
2. Analyze the enriched professional profile in depth
3. Assign the lead to the most appropriate persona using intensive field-by-field matching

Available personas:
${personaList}

Matching Instructions — analyze each persona field intensively:
- Always call apollo_enrich_person first to get professional details
- Use email if available, otherwise use name and company from raw data

After enrichment, perform a deep multi-factor analysis against EVERY persona field:

SAMPLE PERSON matching:
- Title / Role: Does the lead's job title closely match this persona's title/role archetype?
- Age: Is the lead's approximate age or career stage consistent with this persona's age profile?
- Location: Does the lead's city/state match the persona's geographic location or State/County target?
- Current Income: Does the lead's seniority and role suggest a similar income bracket?
- Background Story: Does the lead's career history and company type align with this persona's background narrative?
- Core Frustration: Based on the lead's industry and role, would they likely share this persona's core frustration?

CHARACTERISTICS matching:
- Who They Are: Does the lead's professional identity (title, seniority, company type) match this description?
- Industry Experience: Does the lead's experience level and domain knowledge match the persona's industry experience descriptor?
- Primary Frustration: Based on role and industry, does the lead likely face this specific frustration?
- What They Want: Does the lead's career stage and role suggest they would want the same outcomes?
- Decision Trigger: What in the enriched data suggests whether this person would respond to this type of trigger?
- Trust Barrier: Does the lead's background suggest they would have this trust barrier?
- Engagement Style: Based on seniority and industry, does the lead likely prefer this engagement style?
- Best Contact Method: Does available contact data align with the preferred contact method?
- Sells Into: Does the lead's company type or industry match the verticals this persona sells into?

Additional rules:
- If a persona has a State or County specified, weight it for leads in that region (only if the profile also matches)
- The enrichment response may include lusha_contact data — use this for a fuller profile picture
- Choose the single best-matching persona based on ALL fields combined, not just job title
- If no persona is a good match (less than 50% field alignment), return persona_id as null

When assigning a persona, your final response MUST follow this exact format:
Assigned Persona: [Persona Name]
Persona ID: [persona UUID]
Reasoning: [3-5 sentences explaining specifically why this persona matches, referencing the lead's actual job title, company, industry, seniority, and which persona fields aligned most strongly]

When no persona matches, your final response MUST follow this exact format:
Assigned Persona: None
Persona ID: null
Reasoning: [3-5 sentences explaining specifically why none of the personas fit, referencing the lead's actual data and which fields failed to match]`
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
