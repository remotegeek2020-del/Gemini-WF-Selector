// Enrow: verify email deliverability
// Docs: https://enrow.io/documentation
export type EnrowStatus = 'valid' | 'invalid' | 'risky' | 'unknown'

export async function enrowVerifyEmail(
  apiKey: string,
  email: string
): Promise<{ status: EnrowStatus; error?: string }> {
  try {
    const res = await fetch('https://api.enrow.io/v1/verify', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { status: 'unknown', error: `Enrow API error ${res.status}: ${text}` }
    }

    const json = await res.json()
    const status = (json.status || json.result || 'unknown').toLowerCase() as EnrowStatus
    return { status }
  } catch (err) {
    return { status: 'unknown', error: err instanceof Error ? err.message : 'Enrow unknown error' }
  }
}

export async function enrowVerifyEmails(
  apiKey: string,
  emails: string[]
): Promise<Record<string, EnrowStatus>> {
  const results: Record<string, EnrowStatus> = {}
  await Promise.all(
    emails.map(async (email) => {
      const { status } = await enrowVerifyEmail(apiKey, email)
      results[email] = status
    })
  )
  return results
}
