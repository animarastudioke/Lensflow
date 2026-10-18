// Safaricom Daraja API (M-Pesa) client — STK Push ("Lipa Na M-Pesa Online").
//
// Daraja has no cryptographic webhook signature the way Stripe does; the
// only server-to-server authentication is the OAuth bearer token used when
// *we* call Safaricom. Protecting the callback route (src/app/api/payments/
// mpesa/callback) therefore relies on matching the CheckoutRequestID against
// a payment row *we* created and idempotent processing — see that route for
// the actual security logic. This file only talks to Safaricom.

// USD_TO_KES_RATE moved to lib/currencies.ts -- it's a plain display
// constant, not part of this server-only Daraja API client, and living here
// meant any importer (including client components) pulled in this whole
// module's env-var-reading functions along with it.

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function getBaseUrl(): string {
  const env = process.env['MPESA_ENVIRONMENT'] ?? 'sandbox'
  return env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'
}

// Daraja's AccountReference is customer-facing (shown in the STK prompt and
// the confirmation SMS's "Account No" field) and plays no role in our own
// payment matching -- the callback route matches a payment back to its
// invoice/subscription/order exclusively via CheckoutRequestID (see
// applyMpesaPaymentOutcome in resolve.ts), never this field. Fixed to the
// product name rather than a per-transaction value (invoice/order number,
// plan name) so it consistently reads "LENSFLOW" regardless of what's being
// paid for. Must stay <=12 chars, Daraja's hard limit for this field.
const MPESA_ACCOUNT_REFERENCE = 'LENSFLOW'

/**
 * Normalizes common Kenyan phone number formats (07XXXXXXXX, +2547XXXXXXXX,
 * 2547XXXXXXXX, 01XXXXXXXX) to the 2547XXXXXXXX / 2541XXXXXXXX format Daraja
 * requires. Returns null if the input doesn't look like a valid Kenyan
 * mobile number.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, '')
  let normalized: string | null = null

  if (digits.startsWith('254') && digits.length === 12) {
    normalized = digits
  } else if (digits.startsWith('0') && digits.length === 10) {
    normalized = `254${digits.slice(1)}`
  } else if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) {
    normalized = `254${digits}`
  }

  if (!normalized || !/^254(7|1)\d{8}$/.test(normalized)) return null
  return normalized
}

interface CachedToken {
  token: string
  expiresAt: number
}

let cachedToken: CachedToken | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token
  }

  const consumerKey = getEnv('MPESA_CONSUMER_KEY')
  const consumerSecret = getEnv('MPESA_CONSUMER_SECRET')
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

  const response = await fetch(`${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  })

  if (!response.ok) {
    throw new Error(`M-Pesa OAuth failed: ${response.status} ${await response.text()}`)
  }

  const data = (await response.json()) as { access_token: string; expires_in: string }
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in) * 1000,
  }
  return cachedToken.token
}

function buildTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function buildPassword(timestamp: string): string {
  const shortcode = getEnv('MPESA_SHORTCODE')
  const passkey = getEnv('MPESA_PASSKEY')
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')
}

export interface StkPushResult {
  merchantRequestId: string
  checkoutRequestId: string
  responseCode: string
  customerMessage: string
}

export async function initiateStkPush(params: {
  phoneNumber: string
  amount: number
  transactionDesc: string
}): Promise<StkPushResult> {
  const token = await getAccessToken()
  const shortcode = getEnv('MPESA_SHORTCODE')
  const timestamp = buildTimestamp()
  const password = buildPassword(timestamp)

  const response = await fetch(`${getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      // Daraja requires a whole-number shilling amount.
      Amount: Math.round(params.amount),
      PartyA: params.phoneNumber,
      PartyB: shortcode,
      PhoneNumber: params.phoneNumber,
      CallBackURL: getEnv('MPESA_CALLBACK_URL'),
      AccountReference: MPESA_ACCOUNT_REFERENCE,
      TransactionDesc: params.transactionDesc.slice(0, 13),
    }),
  })

  const data = await response.json()

  if (!response.ok || data.ResponseCode !== '0') {
    const message = data.errorMessage || data.ResponseDescription || 'M-Pesa request failed'
    throw new Error(message)
  }

  return {
    merchantRequestId: data.MerchantRequestID,
    checkoutRequestId: data.CheckoutRequestID,
    responseCode: data.ResponseCode,
    customerMessage: data.CustomerMessage,
  }
}

export type StkPushQueryStatus = 'pending' | 'completed' | 'failed'

export interface StkPushQueryResult {
  status: StkPushQueryStatus
  resultDesc: string
  /** Present only when Daraja returned a real numeric ResultCode (status is then 'completed' or 'failed'). */
  resultCode?: number
}

/**
 * Pure interpretation of a Daraja STK Push Query response. Only a response
 * that Daraja itself accepted (HTTP ok, no errorCode, ResponseCode '0' when
 * present) AND that carries a numeric ResultCode is treated as a final
 * outcome: 0 = paid, any other number = a definitive customer/network
 * failure (1 insufficient funds, 1032 cancelled, 1037 prompt timed out,
 * 2001 wrong PIN, ...). Everything else - Daraja's "transaction is being
 * processed" error (errorCode 500.001.1001, HTTP 500), other HTTP errors,
 * a missing/malformed ResultCode - is "pending": we do not know yet, and
 * guessing 'failed' would mark a payment the customer may still complete
 * (or already completed) as failed.
 */
export function interpretStkQueryResponse(httpOk: boolean, data: unknown): StkPushQueryResult {
  const body = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>

  if (!httpOk || body['errorCode']) {
    const msg = typeof body['errorMessage'] === 'string' ? body['errorMessage'] : 'Awaiting customer action'
    return { status: 'pending', resultDesc: msg }
  }

  const responseCode = body['ResponseCode']
  if (responseCode !== undefined && String(responseCode) !== '0') {
    return { status: 'pending', resultDesc: 'Awaiting customer action' }
  }

  const raw = body['ResultCode']
  const parsed =
    typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? Number(raw) : NaN
  if (!Number.isInteger(parsed)) {
    return { status: 'pending', resultDesc: 'Awaiting customer action' }
  }

  const desc = typeof body['ResultDesc'] === 'string' ? body['ResultDesc'] : undefined
  if (parsed === 0) {
    return { status: 'completed', resultDesc: desc ?? 'Payment completed', resultCode: 0 }
  }
  return { status: 'failed', resultDesc: desc ?? 'Payment failed', resultCode: parsed }
}

/**
 * What a polling fallback may hand to applyMpesaPaymentOutcome: null unless
 * the query produced a final result. Keeps "in progress / unknown" rows
 * pending in every poller.
 */
export function stkQueryToOutcome(
  result: StkPushQueryResult
): { resultCode: number; resultDesc: string } | null {
  if (result.status === 'pending' || result.resultCode === undefined) return null
  return { resultCode: result.resultCode, resultDesc: result.resultDesc }
}

export async function queryStkPushStatus(checkoutRequestId: string): Promise<StkPushQueryResult> {
  const token = await getAccessToken()
  const shortcode = getEnv('MPESA_SHORTCODE')
  const timestamp = buildTimestamp()
  const password = buildPassword(timestamp)

  const response = await fetch(`${getBaseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  })

  // A non-JSON body (gateway error page) is "unknown", not a failure.
  const data = await response.json().catch(() => null)
  return interpretStkQueryResponse(response.ok, data)
}

/** Shape of the callback Safaricom POSTs to MPESA_CALLBACK_URL. */
export interface MpesaCallbackPayload {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: { Name: string; Value?: string | number }[]
      }
    }
  }
}

export function extractCallbackMetadata(payload: MpesaCallbackPayload): {
  amount?: number
  receiptNumber?: string
  transactionDate?: string
  phoneNumber?: string
} {
  const items = payload.Body.stkCallback.CallbackMetadata?.Item ?? []
  const get = (name: string) => items.find((item) => item.Name === name)?.Value

  return {
    amount: typeof get('Amount') === 'number' ? (get('Amount') as number) : undefined,
    receiptNumber: get('MpesaReceiptNumber') as string | undefined,
    transactionDate: get('TransactionDate') !== undefined ? String(get('TransactionDate')) : undefined,
    phoneNumber: get('PhoneNumber') !== undefined ? String(get('PhoneNumber')) : undefined,
  }
}
