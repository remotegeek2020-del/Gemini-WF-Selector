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
}

export async function runPostEnrichmentHLActions(opts: PostEnrichmentOptions) {
  const { apiKey, locationId, contactId, persona, reasoning, isDefaultFallback, fieldIds } = opts

  const score = isDefaultFallback ? 'Low — Default Fallback' : 'High — Direct Match'

  const noteBody = [
    '📋 Lead Router — Persona Assignment',
    `Persona: ${persona.name}${isDefaultFallback ? ' (default fallback)' : ''}`,
    `Score: ${score}`,
    '',
    'Reasoning:',
    reasoning,
  ].join('\n')

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
            name: `${persona.name} Lead`,
          }).catch((e) => console.error('[HL] opportunity failed:', e)),
        ]
      : []),
  ])
}
