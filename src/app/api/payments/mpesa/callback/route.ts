import { NextRequest, NextResponse } from 'next/server'
import { extractCallbackMetadata, queryStkPushStatus, type MpesaCallbackPayload } from '@/lib/payments/mpesa'
import { applyMpesaPaymentOutcome } from '@/lib/payments/resolve'

// Safaricom posts here after a customer approves/declines/ignores an STK
// push. Daraja has no HMAC signature to verify (unlike Stripe) — the real
// protection is that applyMpesaPaymentOutcome only ever updates a payment
// row *we* created (matched by CheckoutRequestID) and only while it's still
// 'pending', so a replayed or forged callback can't move money that isn't
// already waiting on exactly that transaction.
//
// That alone isn't enough, though: initiateMpesaInvoicePayment (and its
// subscription/store equivalents) return the CheckoutRequestID to whoever
// initiated the push, so a payer who knows their own pending checkout ID
// could POST a forged ResultCode: 0 straight to this public endpoint
// without ever completing (or even seeing) the STK prompt on their phone.
// A claimed success is therefore never applied on the callback's word alone
// — it's corroborated against Safaricom's own record of the transaction via
// queryStkPushStatus() first. A claimed failure carries no such incentive
// to forge (it can't move money), so it's applied directly, same as before.
//
// Per Daraja convention, this must always respond 200 with ResultCode: 0
// regardless of whether the underlying payment succeeded — that's just an
// acknowledgment of receipt so Safaricom stops retrying.
export async function POST(request: NextRequest) {
  let payload: MpesaCallbackPayload

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }

  const callback = payload?.Body?.stkCallback
  if (!callback?.CheckoutRequestID) {
    // Never log the raw payload here: a malformed-but-mostly-valid callback
    // could still carry a real CallbackMetadata (phone number, amount) even
    // while missing CheckoutRequestID specifically -- log only the
    // structural shape, which is enough to diagnose an integration/parsing
    // problem without risking PII in server logs.
    console.error('M-Pesa callback missing stkCallback/CheckoutRequestID. Top-level keys:', Object.keys(payload ?? {}))
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }

  let metadata: ReturnType<typeof extractCallbackMetadata> = {}

  if (callback.ResultCode === 0) {
    let corroboration: Awaited<ReturnType<typeof queryStkPushStatus>>
    try {
      corroboration = await queryStkPushStatus(callback.CheckoutRequestID)
    } catch (err) {
      // Fail closed: if we can't reach Safaricom to confirm, we don't apply
      // a success. The polling fallback (which performs the same query
      // independently) will pick this payment up once the provider is
      // reachable again, so legitimate payments still resolve.
      console.error('M-Pesa callback corroboration query failed, not applying claimed success:', callback.CheckoutRequestID, err)
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    if (corroboration.status !== 'completed') {
      console.warn(
        'M-Pesa callback claimed success but provider query did not corroborate it — not applying:',
        callback.CheckoutRequestID,
        corroboration
      )
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    metadata = extractCallbackMetadata(payload)
  }

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
