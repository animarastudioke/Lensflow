'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireStudioPermission } from '@/lib/auth/server'

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded'

export interface OrderItemRow {
  id: string
  product_id: string | null
  product_name: string
  quantity: number
  price: number
  total: number
}

export interface OrderRow {
  id: string
  studio_id: string
  client_id: string | null
  email: string | null
  order_number: string
  status: OrderStatus
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  payment_status: PaymentStatus
  payment_method: string | null
  shipping_address: string | null
  tracking_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
  client: { name: string; email: string } | null
  items: OrderItemRow[]
}

async function getStudioId(studioSlug: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: studio } = await supabase
    .from('studios')
    .select('id')
    .eq('slug', studioSlug)
    .single()
  return studio?.id ?? null
}

export async function getOrders(studioSlug: string): Promise<{ orders: OrderRow[]; total: number }> {
  const supabase = await createClient()
  const studioId = await getStudioId(studioSlug)
  if (!studioId) return { orders: [], total: 0 }

  const { data: orders, count, error } = await supabase
    .from('orders')
    .select('*, client:clients(name, email), items:order_items(*)', { count: 'exact' })
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get orders error:', error)
    return { orders: [], total: 0 }
  }

  return { orders: (orders as unknown as OrderRow[]) || [], total: count || 0 }
}

export async function getOrder(orderId: string, studioSlug: string): Promise<OrderRow | null> {
  const supabase = await createClient()
  const studioId = await getStudioId(studioSlug)
  if (!studioId) return null

  const { data: order } = await supabase
    .from('orders')
    .select('*, client:clients(name, email), items:order_items(*)')
    .eq('id', orderId)
    .eq('studio_id', studioId)
    .single()

  return order as unknown as OrderRow | null
}

export async function updateOrderStatus(
  orderId: string,
  studioSlug: string,
  status: OrderStatus
): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission('store:manage_orders')
  if ('error' in membership) return membership

  const supabase = await createClient()

  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Update order status error:', error)
    return { error: 'Failed to update order status' }
  }

  revalidatePath(`/dashboard/${studioSlug}/store`)
}

export async function deleteOrder(orderId: string, studioSlug: string): Promise<{ error: string } | undefined> {
  const membership = await requireStudioPermission('store:manage_orders')
  if ('error' in membership) return membership

  const supabase = await createClient()

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
    .eq('studio_id', membership.studioId)

  if (error) {
    console.error('Delete order error:', error)
    return { error: 'Failed to delete order' }
  }

  revalidatePath(`/dashboard/${studioSlug}/store`)
}

/**
 * Phase 5 P5: rotates an order's share_token, matching the established
 * regenerateInvoiceShareToken/regenerateQuoteShareToken pattern exactly.
 * The old token stops working immediately, the new token works right
 * away, and the order's own fields (status, items, everything digital-
 * download eligibility is derived from) are untouched -- only the token
 * column changes. Gated on store:manage_orders, the same permission
 * that already governs every other order mutation (updateOrderStatus/
 * deleteOrder above) -- no new RLS policy is needed, orders already has
 * a granular UPDATE policy requiring this permission (migration 032).
 */
export async function regenerateOrderShareToken(
  orderId: string,
  studioSlug: string
): Promise<{ error: string } | { success: true; shareToken: string }> {
  const membership = await requireStudioPermission('store:manage_orders')
  if ('error' in membership) return membership

  const supabase = await createClient()
  const newToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const { data, error } = await supabase
    .from('orders')
    .update({ share_token: newToken, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('studio_id', membership.studioId)
    .select('id')
    .single()

  if (error || !data) {
    console.error('Regenerate order share token error:', error)
    return { error: 'Failed to regenerate share link' }
  }

  revalidatePath(`/dashboard/${studioSlug}/store`)
  return { success: true, shareToken: newToken }
}
