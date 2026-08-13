import { NextRequest, NextResponse } from 'next/server'
import { extractCallbackMetadata, type MpesaCallbackPayload } from '@/lib/payments/mpesa'
import { applyMpesaPaymentOutcome } from '@/lib/payments/resolve'

// Safaricom posts here after a customer approves/declines/ignores an STK
// push. Daraja has no HMAC signature to verify (unlike Stripe) — the real
// protection is that applyMpesaPaymentOutcome only ever updates a payment
// row *we* created (matched by CheckoutRequestID) and only while it's still
// 'pending', so a replayed or forged callback can't move money that isn't
// already waiting on exactly that transaction.
//
// Per Daraja convention, this must always respond 200 with ResultCode: 0
// regardless of whether the underlying payment succeeded — that's just an
// acknowledgment of receipt so Safaricom stops retrying. The actual outcome
// is in the payload's own ResultCode, handled below.
export async function POST(request: NextRequest) {
  let payload: MpesaCallbackPayload

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }

  const callback = payload?.Body?.stkCallback
  if (!callback?.CheckoutRequestID) {
    console.error('M-Pesa callback missing stkCallback/CheckoutRequestID:', JSON.stringify(payload))
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }

  const metadata = callback.ResultCode === 0 ? extractCallbackMetadata(payload) : {}

  const outcome = await applyMpesaPaymentOutcome({
    checkoutRequestId: callback.CheckoutRequestID,
    resultCode: callback.ResultCode,
    resultDesc: callback.ResultDesc,
    receiptNumber: metadata.receiptNumber,
    rawCallback: payload,
  })

  if (!outcome.handled) {
    // Not necessarily an attack — could just be a duplicate delivery of a
    // callback the polling fallback already resolved. Log for visibility,
    // still acknowledge so Safaricom doesn't keep retrying.
    console.warn('M-Pesa callback did not match a pending payment:', callback.CheckoutRequestID)
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
}
