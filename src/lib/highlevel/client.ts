const HL_BASE = 'https://services.leadconnectorhq.com'
const V1 = '2021-04-15'
const V2 = '2021-07-28'

function headers(apiKey: string, version = V2) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: version,
    'Content-Type': 'application/json',
  }
}

// ── Workflows ─────────────────────────────────────────────────────────────────

export interface HighlevelWorkflow {
  id: string
  name: string
  status: string
}

export async function getWorkflows(apiKey: string, locationId: string) {
  try {
    const res = await fetch(`${HL_BASE}/workflows/?locationId=${locationId}`, {
      headers: headers(apiKey, V1),
    })
    if (!res.ok) return { workflows: [], error: `HL ${res.status}: ${await res.text()}` }
    const data = await res.json()
    return { workflows: (data.workflows || []) as HighlevelWorkflow[] }
  } catch (e) {
    return { workflows: [], error: String(e) }
  }
}

export async function assignWorkflow(apiKey: string, contactId: string, workflowId: string) {
  try {
    const res = await fetch(`${HL_BASE}/contacts/${contactId}/workflow/${workflowId}`, {
      method: 'POST',
      headers: headers(apiKey, V1),
    })
    if (!res.ok) return { success: false, error: `HL ${res.status}: ${await res.text()}` }
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export async function addContactTags(apiKey: string, contactId: string, tags: string[]) {
  const res = await fetch(`${HL_BASE}/contacts/${contactId}/tags`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({ tags }),
  })
  if (!res.ok) throw new Error(`HL tags ${res.status}: ${await res.text()}`)
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export async function addContactNote(apiKey: string, contactId: string, body: string) {
  const res = await fetch(`${HL_BASE}/contacts/${contactId}/notes`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({ body }),
  })
  if (!res.ok) throw new Error(`HL note ${res.status}: ${await res.text()}`)
}

// ── Custom Fields ─────────────────────────────────────────────────────────────

export interface HLCustomField {
  id: string
  name: string
  fieldKey: string
  dataType: string
}

export async function getCustomFields(apiKey: string, locationId: string): Promise<HLCustomField[]> {
  const res = await fetch(`${HL_BASE}/locations/${locationId}/customFields`, {
    headers: headers(apiKey),
  })
  if (!res.ok) throw new Error(`HL custom fields ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return (data.customFields || []) as HLCustomField[]
}

export async function createCustomField(
  apiKey: string,
  locationId: string,
  name: string,
  fieldKey: string
): Promise<HLCustomField> {
  const res = await fetch(`${HL_BASE}/locations/${locationId}/customFields`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({ name, fieldKey, dataType: 'TEXT' }),
  })
  if (!res.ok) throw new Error(`HL create field ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.customField as HLCustomField
}

export async function updateContactCustomFields(
  apiKey: string,
  contactId: string,
  fields: { id: string; field_value: string }[]
) {
  const res = await fetch(`${HL_BASE}/contacts/${contactId}`, {
    method: 'PUT',
    headers: headers(apiKey),
    body: JSON.stringify({ customFields: fields }),
  })
  if (!res.ok) throw new Error(`HL update contact ${res.status}: ${await res.text()}`)
}

export interface ContactProfileUpdate {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  companyName?: string
}

export async function updateContactProfile(
  apiKey: string,
  contactId: string,
  profile: ContactProfileUpdate
) {
  // Strip out undefined/empty values so we don't overwrite with blanks
  const payload = Object.fromEntries(
    Object.entries(profile).filter(([, v]) => v && String(v).trim())
  )
  if (Object.keys(payload).length === 0) return

  const res = await fetch(`${HL_BASE}/contacts/${contactId}`, {
    method: 'PUT',
    headers: headers(apiKey),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`HL update contact profile ${res.status}: ${await res.text()}`)
}

// ── Pipelines ─────────────────────────────────────────────────────────────────

export interface HLPipelineStage {
  id: string
  name: string
}

export interface HLPipeline {
  id: string
  name: string
  stages: HLPipelineStage[]
}

export async function getPipelines(apiKey: string, locationId: string): Promise<HLPipeline[]> {
  const res = await fetch(`${HL_BASE}/opportunities/pipelines?locationId=${locationId}`, {
    headers: headers(apiKey),
  })
  if (!res.ok) throw new Error(`HL pipelines ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return (data.pipelines || []) as HLPipeline[]
}

// ── Opportunities ─────────────────────────────────────────────────────────────

export async function createOpportunity(
  apiKey: string,
  locationId: string,
  opts: {
    pipelineId: string
    pipelineStageId: string
    contactId: string
    name: string
  }
) {
  const res = await fetch(`${HL_BASE}/opportunities/`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      pipelineId: opts.pipelineId,
      locationId,
      name: opts.name,
      pipelineStageId: opts.pipelineStageId,
      status: 'open',
      contactId: opts.contactId,
    }),
  })
  if (!res.ok) throw new Error(`HL opportunity ${res.status}: ${await res.text()}`)
}
