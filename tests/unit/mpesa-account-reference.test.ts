import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Daraja's AccountReference field is customer-facing only (shown in the STK
// prompt / confirmation SMS) and is never used for our own payment
// matching -- the callback route matches exclusively on CheckoutRequestID
// (see src/lib/payments/resolve.ts). This guards that AccountReference is
// always the fixed "LENSFLOW" brand string regardless of what's being
// paid for (invoice, subscription, or store order), and that
// BusinessShortCode is read from MPESA_SHORTCODE rather than hardcoded.

const ENV = {
  MPESA_CONSUMER_KEY: 'test-consumer-key',
  MPESA_CONSUMER_SECRET: 'test-consumer-secret',
  MPESA_SHORTCODE: '999888',
  MPESA_PASSKEY: 'test-passkey',
  MPESA_CALLBACK_URL: 'https://example.com/api/payments/mpesa/callback',
}

let originalEnv: Record<string, string | undefined>

beforeEach(() => {
  originalEnv = { ...process.env }
  Object.assign(process.env, ENV)
  vi.resetModules()
})

afterEach(() => {
  process.env = originalEnv
  vi.restoreAllMocks()
})

function mockFetchSequence() {
  const calls: { url: string; body: unknown }[] = []
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body as string) : undefined })
    if (String(url).includes('/oauth/v1/generate')) {
      return new Response(JSON.stringify({ access_token: 'tok', expires_in: '3600' }), { status: 200 })
    }
    return new Response(
      JSON.stringify({
        MerchantRequestID: 'mr-1',
        CheckoutRequestID: 'ws_CO_1',
        ResponseCode: '0',
        CustomerMessage: 'Enter PIN',
      }),
      { status: 200 }
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

describe('initiateStkPush: AccountReference is always the fixed brand string', () => {
  it('sends AccountReference "LENSFLOW" for an invoice payment, ignoring any per-transaction identifier', async () => {
    const calls = mockFetchSequence()
    const { initiateStkPush } = await import('@/lib/payments/mpesa')

    await initiateStkPush({
      phoneNumber: '254712345678',
      amount: 5000,
      transactionDesc: 'Invoice payment',
    })

    const stkCall = calls.find((c) => c.url.includes('/mpesa/stkpush/v1/processrequest'))
    expect(stkCall).toBeDefined()
    const body = stkCall!.body as Record<string, unknown>
    expect(body['AccountReference']).toBe('LENSFLOW')
  })

  it('never accepts a caller-supplied accountReference (no such parameter exists on the function)', async () => {
    const calls = mockFetchSequence()
    const { initiateStkPush } = await import('@/lib/payments/mpesa')

    // @ts-expect-error -- accountReference was deliberately removed from the params type
    await initiateStkPush({
      phoneNumber: '254712345678',
      amount: 1000,
      accountReference: 'INV-042',
      transactionDesc: 'Subscription',
    })

    const stkCall = calls.find((c) => c.url.includes('/mpesa/stkpush/v1/processrequest'))
    const body = stkCall!.body as Record<string, unknown>
    expect(body['AccountReference']).toBe('LENSFLOW')
  })

  it('AccountReference is at most 12 characters, Daraja\'s hard limit', async () => {
    const calls = mockFetchSequence()
    const { initiateStkPush } = await import('@/lib/payments/mpesa')

    await initiateStkPush({
      phoneNumber: '254712345678',
      amount: 2500,
      transactionDesc: 'Store purchase',
    })

    const stkCall = calls.find((c) => c.url.includes('/mpesa/stkpush/v1/processrequest'))
    const body = stkCall!.body as Record<string, unknown>
    expect((body['AccountReference'] as string).length).toBeLessThanOrEqual(12)
  })

  it('BusinessShortCode is read from MPESA_SHORTCODE, not a hardcoded value', async () => {
    const calls = mockFetchSequence()
    const { initiateStkPush } = await import('@/lib/payments/mpesa')

    await initiateStkPush({
      phoneNumber: '254712345678',
      amount: 100,
      transactionDesc: 'Subscription',
    })

    const stkCall = calls.find((c) => c.url.includes('/mpesa/stkpush/v1/processrequest'))
    const body = stkCall!.body as Record<string, unknown>
    expect(body['BusinessShortCode']).toBe(ENV.MPESA_SHORTCODE)
    expect(body['PartyB']).toBe(ENV.MPESA_SHORTCODE)
  })
})
