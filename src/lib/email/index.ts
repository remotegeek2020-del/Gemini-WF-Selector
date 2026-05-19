import { sendViaPostmark } from './providers/postmark'
import { sendViaSendGrid } from './providers/sendgrid'

export type EmailProvider = 'postmark' | 'sendgrid'

export interface EmailConfig {
  provider: EmailProvider
  apiKey: string
  senderName: string
  senderEmail: string
}

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(
  config: EmailConfig,
  message: EmailMessage
): Promise<{ success: boolean; error?: string }> {
  if (config.provider === 'postmark') {
    return sendViaPostmark(config, message)
  }
  return sendViaSendGrid(config, message)
}
