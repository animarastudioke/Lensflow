'use server'

// Public, unauthenticated storefront + checkout. No buyer account system
// exists, so every read/write here goes through supabaseAdmin — the trust
// boundary is this server code (studio slug + product id + generated
// share_token), never RLS, matching the pattern already used for public
// galleries and invoices/quotes.

import { supabaseAdmin } from '@/lib/supabase/admin'
import { hasEntitlement } from '@/lib/entitlements'
import { initiateStkPush, normalizeKenyanPhone, queryStkPushStatus } from '@/lib/payments/mpesa'
import { applyMpesaPaymentOutcome } from '@/lib/payments/resolve'

export interface PublicStoreProduct {
  id: string
  name: string
  description: string | null
  price: number
  salePrice: number | null
}

export interface PublicStore {
  studioName: string
  logoUrl: string | null
  brandColor: string | null
  currency: string
  acceptingPayments: boolean
  products: PublicStoreProduct[]
}

/**
 * v1 is digital-downloads-only (physical fulfillment/shipping is a separate
 * project — see migration 023), so the storefront only ever lists active
 * digital products that actually have a file attached. Non-digital products
 * stay manageable in the dashboard but simply don't appear here yet.
 */
export async function getPublicStore(studioSlug: string): Promise<PublicStore | null> {
  const { data: studio } = await supabaseAdmin
    .from('studios')
    .select('id, name, logo_url, brand_color, currency')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return null

  const entitled = await hasEntitlement(studio.id, 'store')
  if (!entitled) return null

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, description, price, sale_price')
    .eq('studio_id', studio.id)
    .eq('status', 'active')
    .eq('type', 'digital')
    .not('digital_file_key', 'is', null)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })

  return {
    studioName: studio.name,
    logoUrl: studio.logo_url,
    brandColor: studio.brand_color,
    currency: studio.currency,
    // M-Pesa STK Push is the only payment rail in this app, and it only
    // settles in KES — matching the same gate invoice payments use rather
    // than silently auto-converting a photographer's own prices.
    acceptingPayments: studio.currency === 'KES',
    products: (products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      salePrice: p.sale_price !== null ? Number(p.sale_price) : null,
    })),
  }
}

export interface InitiatedProductPurchase {
  paymentId: string
  checkoutRequestId: string
  customerMessage: string
  amountKes: number
}

export async function initiateProductPurchase(
  studioSlug: string,
  productId: string,
  email: string,
  phoneNumberInput: string
): Promise<InitiatedProductPurchase | { error: string }> {
  const { data: studio } = await supabaseAdmin
    .from('studios')
    .select('id, currency')
    .eq('slug', studioSlug)
    .single()

  if (!studio) return { error: 'Store not found' }

  const entitled = await hasEntitlement(studio.id, 'store')
  if (!entitled) return { error: 'This store is not currently available' }

  if (studio.currency !== 'KES') {
    return { error: 'This store is not currently accepting online payments.' }
  }

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, name, price, sale_price, digital_file_key, status, type')
    .eq('id', productId)
    .eq('studio_id', studio.id)
    .single()

  if (!product || product.status !== 'active' || product.type !== 'digital' || !product.digital_file_key) {
    return { error: 'This product is not available for purchase' }
  }

  const trimmedEmail = email.trim().toLowerCase()
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { error: 'Enter a valid email address' }
  }

  const phoneNumber = normalizeKenyanPhone(phoneNumberInput)
  if (!phoneNumber) {
    return { error: 'Enter a valid Kenyan phone number (e.g. 0712345678).' }
  }

  const amount = Number(product.sale_price ?? product.price)
  if (amount <= 0) {
    return { error: 'This product has no price set' }
  }

  const { count } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', studio.id)

  const orderNumber = `ORD-${String((count ?? 0) + 1).padStart(3, '0')}`

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      studio_id: studio.id,
      order_number: orderNumber,
      email: trimmedEmail,
      currency: 'KES',
      status: 'pending',
      payment_status: 'pending',
      subtotal: amount,
      total: amount,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('Create order error:', orderError)
    return { error: 'Failed to start checkout. Try again.' }
  }

  const { error: itemError } = await supabaseAdmin
    .from('order_items')
    .insert({
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      price: amount,
      total: amount,
    })

  if (itemError) {
    console.error('Create order item error:', itemError)
    await supabaseAdmin.from('orders').delete().eq('id', order.id)
    return { error: 'Failed to start checkout. Try again.' }
  }

  let stkResult
  try {
    stkResult = await initiateStkPush({
      phoneNumber,
      amount,
      transactionDesc: 'Store purchase',
    })
  } catch (err) {
    console.error('M-Pesa store STK push failed:', err)
    await supabaseAdmin.from('orders').delete().eq('id', order.id)
    return { error: err instanceof Error ? err.message : 'Failed to reach M-Pesa. Try again.' }
  }

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('payments')
    .insert({
      studio_id: studio.id,
      order_id: order.id,
      amount,
      currency: 'KES',
      method: 'mpesa',
      status: 'pending',
      phone_number: phoneNumber,
      provider_checkout_id: stkResult.checkoutRequestId,
      provider_merchant_request_id: stkResult.merchantRequestId,
    })
    .select('id')
    .single()

  if (paymentError || !payment) {
    console.error('Failed to record pending store payment:', paymentError)
    return { error: 'M-Pesa request was sent, but we failed to record it — do not pay, and try again.' }
  }

  return {
    paymentId: payment.id,
    checkoutRequestId: stkResult.checkoutRequestId,
    customerMessage: stkResult.customerMessage,
    amountKes: amount,
  }
}

export interface ProductPurchaseStatus {
  status: 'pending' | 'completed' | 'failed'
  failureReason: string | null
  orderShareToken: string | null
}

/**
 * Public polling endpoint — there's no buyer session to authorize against,
 * so paymentId (an unguessable server-generated UUID, never exposed except
 * to the browser that just initiated this exact checkout) is the only
 * credential, same trust model as a gallery/invoice share_token.
 */
export async function pollProductPurchaseStatus(paymentId: string): Promise<ProductPurchaseStatus | { error: string }> {
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('status, provider_checkout_id, failure_reason, order_id')
    .eq('id', paymentId)
    .not('order_id', 'is', null)
    .single()

  if (!payment) return { error: 'Payment not found' }

  const getOrderShareToken = async (): Promise<string | null> => {
    if (!payment.order_id) return null
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('share_token')
      .eq('id', payment.order_id)
      .single()
    return order?.share_token ?? null
  }

  if (payment.status !== 'pending') {
    return {
      status: payment.status as 'completed' | 'failed',
      failureReason: payment.failure_reason,
      orderShareToken: payment.status === 'completed' ? await getOrderShareToken() : null,
    }
  }

  if (!payment.provider_checkout_id) {
    return { status: 'pending', failureReason: null, orderShareToken: null }
  }

  const queryResult = await queryStkPushStatus(payment.provider_checkout_id).catch((err) => {
    console.error('M-Pesa store status query failed:', err)
    return { status: 'pending' as const, resultDesc: '' }
  })

  if (queryResult.status === 'pending') {
    return { status: 'pending', failureReason: null, orderShareToken: null }
  }

  const outcome = await applyMpesaPaymentOutcome({
    checkoutRequestId: payment.provider_checkout_id,
    resultCode: queryResult.status === 'completed' ? 0 : 1,
    resultDesc: queryResult.resultDesc,
  })

  return {
    status: outcome.status === 'unknown' ? 'pending' : outcome.status,
    failureReason: outcome.status === 'failed' ? queryResult.resultDesc : null,
    orderShareToken: outcome.status === 'completed' ? await getOrderShareToken() : null,
  }
}

export interface PublicOrderItem {
  id: string
  productId: string | null
  productName: string
  quantity: number
  total: number
  downloadable: boolean
}

export interface PublicOrder {
  orderNumber: string
  email: string
  currency: string
  total: number
  status: string
  paymentStatus: string
  createdAt: string
  studioName: string
  items: PublicOrderItem[]
}

export async function getOrderByShareToken(shareToken: string): Promise<PublicOrder | null> {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('order_number, email, currency, total, status, payment_status, created_at, studio:studios(name), items:order_items(id, product_id, product_name, quantity, total)')
    .eq('share_token', shareToken)
    .single()

  if (!order) return null

  const productIds = (order.items ?? []).map((i) => i.product_id).filter((id): id is string => !!id)
  const { data: products } = productIds.length
    ? await supabaseAdmin.from('products').select('id, digital_file_key').in('id', productIds)
    : { data: [] }
  const downloadableProductIds = new Set((products ?? []).filter((p) => p.digital_file_key).map((p) => p.id))

  return {
    orderNumber: order.order_number,
    email: order.email ?? '',
    currency: order.currency,
    total: Number(order.total),
    status: order.status,
    paymentStatus: order.payment_status,
    createdAt: order.created_at,
    studioName: (order.studio as unknown as { name: string } | null)?.name ?? '',
    items: (order.items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      quantity: item.quantity,
      total: Number(item.total),
      downloadable: !!item.product_id && downloadableProductIds.has(item.product_id),
    })),
  }
}
