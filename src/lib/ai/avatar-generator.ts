import type { AIConfig } from '@/types'

const UNSUPPORTED_PROVIDERS = ['anthropic', 'openrouter']

export function canGenerateAvatar(provider: string): boolean {
  return !UNSUPPORTED_PROVIDERS.includes(provider)
}

export async function generatePersonaAvatar(
  config: AIConfig,
  name: string,
  role: string,
  description: string
): Promise<Buffer> {
  if (UNSUPPORTED_PROVIDERS.includes(config.provider)) {
    throw new Error(
      `Image generation is not supported for the ${config.provider} provider. Switch to Gemini or OpenAI in Agency Settings.`
    )
  }

  const roleLabel = role || 'business professional'
  const prompt = `Professional business headshot portrait of a person named ${name}, who is a ${roleLabel}. Clean studio background, professional attire, natural confident expression, photorealistic, high quality, soft lighting.`

  switch (config.provider) {
    case 'gemini':
      return generateWithGeminiImagen(config, prompt)
    case 'openai':
      return generateWithDallE(config, prompt)
    default:
      throw new Error(`Unsupported provider for image generation: ${config.provider}`)
  }
}

async function generateWithGeminiImagen(config: AIConfig, prompt: string): Promise<Buffer> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1 },
      }),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message || 'Gemini image generation failed')
  }
  const data = await res.json() as { predictions?: { bytesBase64Encoded?: string }[] }
  const b64 = data.predictions?.[0]?.bytesBase64Encoded
  if (!b64) throw new Error('No image returned from Gemini Imagen')
  return Buffer.from(b64, 'base64')
}

async function generateWithDallE(config: AIConfig, prompt: string): Promise<Buffer> {
  const OpenAI = (await import('openai')).default
  const client = new OpenAI({ apiKey: config.apiKey })
  const response = await client.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    response_format: 'b64_json',
  })
  const b64 = response.data[0]?.b64_json
  if (!b64) throw new Error('No image returned from DALL-E')
  return Buffer.from(b64, 'base64')
}
