import type { Persona } from '@/types'
import {
  addContactTags,
  addContactNote,
  updateContactCustomFields,
  createOpportunity,
} from './client'

interface FieldIds {
  persona_field_id: string
  score_field_id: string
  reasoning_field_id: string
}

interface PostEnrichmentOptions {
  apiKey: string
  locationId: string
  contactId: string
  persona: Persona
  reasoning: string
  isDefaultFallback: boolean
  fieldIds?: FieldIds | null
  enrichedData?: Record<string, unknown>
  leadData?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    company?: string
    title?: string
    source?: string
    isHot?: boolean
    hotReasoning?: string
  }
}

function tok(name: string): RegExp {
  // Matches {token} or {{token}} — tolerates single/double braces
  return new RegExp(`\\{\\{?${name}\\}?\\}`, 'gi')
}

function resolveOpportunityName(template: string | null | undefined, opts: {
  personaName: string
  firstName?: string
  lastName?: string
  email?: string
  company?: string
  title?: string
  source?: string
}): string {
  if (!template?.trim()) return `${opts.personaName} Lead`
  const fullName = [opts.firstName, opts.lastName].filter(Boolean).join(' ')
  return template
    .replace(tok('persona'), opts.personaName)
    .replace(tok('first_name'), opts.firstName || '')
    .replace(tok('last_name'), opts.lastName || '')
    .replace(tok('full_name'), fullName)
    .replace(tok('email'), opts.email || '')
    .replace(tok('company'), opts.company || '')
    .replace(tok('title'), opts.title || '')
    .replace(tok('source'), opts.source || '')
    .trim() || `${opts.personaName} Lead`
}

export async function runPostEnrichmentHLActions(opts: PostEnrichmentOptions) {
  const { apiKey, locationId, contactId, persona, reasoning, isDefaultFallback, fieldIds, enrichedData, leadData } = opts

  const score = isDefaultFallback ? 'Low — Default Fallback' : 'High — Direct Match'
  const ed = enrichedData || {}

  // Collect enriched contact details for the note
  const allPhones = (ed.all_phones as string[] | undefined) || []
  const allEmails = (ed.all_emails as string[] | undefined) || []
  const verifiedEmails = new Set((ed.verified_emails as string[] | undefined) || [])
  const enrichedTitle = (ed.title as string | undefined) || (ed.lusha_current_title as string | undefined) || (ed.pdl_title as string | undefined)
  const enrichedCompany = (ed.current_company as string | undefined) || (ed.lusha_current_company as string | undefined) || (ed.pdl_company as string | undefined)
  const linkedinUrl = (ed.linkedin_url as string | undefined)
  const location = (ed.location as string | undefined) || (ed.pdl_location as string | undefined)
  const seniority = ed.seniority as string | undefined
  const industry = (ed.pdl_industry as string | undefined) || ((ed.apollo_raw as Record<string, unknown> | undefined)?.organization as Record<string, unknown> | undefined)?.industry as string | undefined
  const companySize = ed.pdl_company_size as string | undefined
  const sourcesUsed = (ed.sources_used as string[] | undefined) || []

  const contactLines: string[] = []
  if (leadData?.firstName || leadData?.lastName) contactLines.push(`Name: ${[leadData.firstName, leadData.lastName].filter(Boolean).join(' ')}`)
  if (allEmails.length) contactLines.push(`Email: ${allEmails.map(e => verifiedEmails.has(e) ? `${e} ✓` : e).join(', ')}`)
  if (allPhones.length) contactLines.push(`Phone: ${allPhones.join(', ')}`)
  if (enrichedCompany) contactLines.push(`Company: ${enrichedCompany}`)
  if (enrichedTitle) contactLines.push(`Title: ${enrichedTitle}`)
  if (seniority) contactLines.push(`Seniority: ${seniority}`)
  if (industry) contactLines.push(`Industry: ${industry}`)
  if (companySize) contactLines.push(`Company Size: ${companySize}`)
  if (location) contactLines.push(`Location: ${location}`)
  if (linkedinUrl) contactLines.push(`LinkedIn: ${linkedinUrl}`)

  const noteBody = [
    leadData?.isHot ? '🔥 HIGH-PRIORITY LEAD (AI assessment — use as guide)' : '',
    leadData?.isHot && leadData.hotReasoning ? `Hot Reason: ${leadData.hotReasoning}` : '',
    leadData?.isHot ? '' : '',
    '📋 Lead Router — Enrichment Summary',
    `Persona: ${persona.name}${isDefaultFallback ? ' (default fallback)' : ''}`,
    `Score: ${score}`,
    '',
    ...(contactLines.length ? ['--- Contact Info ---', ...contactLines, ''] : []),
    ...(sourcesUsed.length ? [`Data Sources: ${sourcesUsed.join(', ')}`, ''] : []),
    '--- AI Reasoning ---',
    reasoning,
  ].filter(l => l !== null && l !== undefined).join('\n').replace(/\n{3,}/g, '\n\n').trim()

  await Promise.allSettled([
    // 1. Tag contact with persona name
    addContactTags(apiKey, contactId, [persona.name]).catch((e) =>
      console.error('[HL] tag failed:', e)
    ),

    // 2. Add AI reasoning as a contact note
    addContactNote(apiKey, contactId, noteBody).catch((e) =>
      console.error('[HL] note failed:', e)
    ),

    // 3. Write custom fields if set up
    ...(fieldIds
      ? [
          updateContactCustomFields(apiKey, contactId, [
            { id: fieldIds.persona_field_id, field_value: persona.name },
            { id: fieldIds.score_field_id, field_value: score },
            { id: fieldIds.reasoning_field_id, field_value: reasoning.substring(0, 500) },
          ]).catch((e) => console.error('[HL] custom fields failed:', e)),
        ]
      : []),

    // 4. Create opportunity if persona has a pipeline+stage configured
    ...(persona.highlevel_pipeline_id && persona.highlevel_stage_id
      ? [
          createOpportunity(apiKey, locationId, {
            pipelineId: persona.highlevel_pipeline_id,
            pipelineStageId: persona.highlevel_stage_id,
            contactId,
            name: resolveOpportunityName(persona.opportunity_name_template, {
              personaName: persona.name,
              firstName: leadData?.firstName,
              lastName: leadData?.lastName,
              email: leadData?.email,
              company: leadData?.company,
              title: leadData?.title,
              source: leadData?.source,
            }),
          }).catch((e) => console.error('[HL] opportunity failed:', e)),
        ]
      : []),
  ])
}
