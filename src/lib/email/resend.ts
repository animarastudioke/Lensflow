// Raw fetch against Resend's REST API rather than the `resend` SDK — this
// codebase's established pattern for third-party APIs (see mpesa.ts) is a
// thin fetch wrapper, not a new dependency for a single POST endpoint.

const RESEND_API_URL = 'https://api.resend.com/emails'

export interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export type SendEmailResult = { success: true } | { success: false; error: string }

/**
 * Best-effort: a failed email should never fail the business action that
 * triggered it (an invoice still gets marked "sent" even if the send fails)
 * — callers fire this and log/ignore the result, matching how
 * createNotification is already used throughout this app. Never throws.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env['RESEND_API_KEY']
  const fromEmail = process.env['RESEND_FROM_EMAIL']
  const replyTo = process.env['RESEND_REPLY_TO']

  if (!apiKey || !fromEmail) {
    console.error('Resend is not configured — skipped email:', params.subject, 'to', params.to)
    return { success: false, error: 'Email is not configured' }
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error('Resend send failed:', response.status, body)
      return { success: false, error: `Email provider returned ${response.status}` }
    }

    return { success: true }
  } catch (err) {
    console.error('Resend send error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send email' }
  }
}
