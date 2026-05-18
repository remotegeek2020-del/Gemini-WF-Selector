interface WorkflowAssignResult {
  success: boolean
  error?: string
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
