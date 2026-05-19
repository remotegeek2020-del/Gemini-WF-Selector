interface WorkflowAssignResult {
  success: boolean
  error?: string
}

export interface HighlevelWorkflow {
  id: string
  name: string
  status: string
}

interface WorkflowsResult {
  workflows: HighlevelWorkflow[]
  error?: string
}

export async function getWorkflows(
  apiKey: string,
  locationId: string
): Promise<WorkflowsResult> {
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/workflows/?locationId=${locationId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: '2021-04-15',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return { workflows: [], error: `Highlevel API error ${response.status}: ${errorText}` }
    }

    const data = await response.json()
    return { workflows: data.workflows || [] }
  } catch (error) {
    return {
      workflows: [],
      error: error instanceof Error ? error.message : 'Unknown error fetching workflows',
    }
  }
}

export async function assignWorkflow(
  apiKey: string,
  contactId: string,
  workflowId: string
): Promise<WorkflowAssignResult> {
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/contacts/${contactId}/workflow/${workflowId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: '2021-04-15',
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Highlevel API error ${response.status}: ${errorText}`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error calling Highlevel API',
    }
  }
}
