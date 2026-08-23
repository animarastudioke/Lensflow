import { afterEach, describe, expect, it, vi } from 'vitest'

// Regression coverage for TASK 7 (M-Pesa callback forgery): a payer who
// knows their own CheckoutRequestID (returned to them when they initiated
// the STK push) must not be able to self-forge a success callback without
// actually completing payment on their phone. The fix corroborates any
// claimed success against Safaricom's own queryStkPushStatus() before
// applying it — this file exercises that corroboration logic in isolation,
// mocking both the Daraja client and the shared resolution path so no real
// network or database calls happen.

const queryStkPushStatus = vi.fn()
const applyMpesaPaymentOutcome = vi.fn()

vi.mock('@/lib/payments/mpesa', async () => {
  const actual = await vi.importActual<typeof import('@/lib/payments/mpesa')>('@/lib/payments/mpesa')
  return {
    ...actual,
    queryStkPushStatus: (...args: unknown[]) => queryStkPushStatus(...args),
  }
})

vi.mock('@/lib/payments/resolve', () => ({
  applyMpesaPaymentOutcome: (...args: unknown[]) => applyMpesaPaymentOutcome(...args),
}))

const { POST } = await import('@/app/api/payments/mpesa/callback/route')

function callbackRequest(body: unknown) {
  return new Request('http://localhost/api/payments/mpesa/callback', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

function stkCallback(overrides: { CheckoutRequestID?: string; ResultCode: number; ResultDesc?: string; amount?: number }) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: 'merchant-1',
        CheckoutRequestID: overrides.CheckoutRequestID ?? 'ws_CO_forged_123',
        ResultCode: overrides.ResultCode,
        ResultDesc: overrides.ResultDesc ?? '',
        ...(overrides.amount !== undefined
          ? { CallbackMetadata: { Item: [{ Name: 'Amount', Value: overrides.amount }] } }
          : {}),
      },
    },
  }
}

afterEach(() => {
  queryStkPushStatus.mockReset()
  applyMpesaPaymentOutcome.mockReset()
  applyMpesaPaymentOutcome.mockResolvedValue({ handled: true, status: 'completed' })
})

describe('M-Pesa callback: forged success is rejected (ATTACK 10)', () => {
  it('does NOT apply success when the callback claims ResultCode 0 but Safaricom reports the transaction is still pending (self-forged callback, real STK push never completed)', async () => {
    queryStkPushStatus.mockResolvedValue({ status: 'pending', resultDesc: 'Awaiting customer action' })

    const res = await POST(callbackRequest(stkCallback({ ResultCode: 0, amount: 5000 })))

    expect(res.status).toBe(200) // still acks Daraja per convention
    expect(queryStkPushStatus).toHaveBeenCalledWith('ws_CO_forged_123')
    expect(applyMpesaPaymentOutcome).not.toHaveBeenCalled()
  })

  it('does NOT apply success when Safaricom reports the transaction failed, even though the callback body claims success', async () => {
    queryStkPushStatus.mockResolvedValue({ status: 'failed', resultDesc: 'Cancelled by user' })

    await POST(callbackRequest(stkCallback({ ResultCode: 0, amount: 5000 })))

    expect(applyMpesaPaymentOutcome).not.toHaveBeenCalled()
  })

  it('fails closed (does not apply success) when the corroboration query to Safaricom throws / is unreachable', async () => {
    queryStkPushStatus.mockRejectedValue(new Error('network unreachable'))

    const res = await POST(callbackRequest(stkCallback({ ResultCode: 0, amount: 5000 })))

    expect(res.status).toBe(200)
    expect(applyMpesaPaymentOutcome).not.toHaveBeenCalled()
  })

  it('DOES apply success once Safaricom corroborates the transaction actually completed', async () => {
    queryStkPushStatus.mockResolvedValue({ status: 'completed', resultDesc: 'The service request is processed successfully.' })

    await POST(callbackRequest(stkCallback({ ResultCode: 0, amount: 5000 })))

    expect(applyMpesaPaymentOutcome).toHaveBeenCalledTimes(1)
    expect(applyMpesaPaymentOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ checkoutRequestId: 'ws_CO_forged_123', resultCode: 0 })
    )
  })

  it('applies a claimed failure directly, without querying Safaricom (failure carries no incentive to forge)', async () => {
    await POST(callbackRequest(stkCallback({ ResultCode: 1032, ResultDesc: 'Request cancelled by user' })))

    expect(queryStkPushStatus).not.toHaveBeenCalled()
    expect(applyMpesaPaymentOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ checkoutRequestId: 'ws_CO_forged_123', resultCode: 1032 })
    )
  })

  it('acks and no-ops on a payload missing CheckoutRequestID', async () => {
    const res = await POST(callbackRequest({ Body: {} }))
    expect(res.status).toBe(200)
    expect(applyMpesaPaymentOutcome).not.toHaveBeenCalled()
  })
})
