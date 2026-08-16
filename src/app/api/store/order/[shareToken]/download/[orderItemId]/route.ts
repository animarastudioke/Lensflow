import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createPresignedDownloadUrl } from '@/lib/storage/r2'

// Gated by two things a buyer can't forge: the order's own share_token (a
// non-guessable random string, same trust model as gallery/invoice share
// links) and the order's payment_status actually being 'paid' in the DB —
// never trusted from the client, checked fresh on every request.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shareToken: string; orderItemId: string }> }
) {
  const { shareToken, orderItemId } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, payment_status')
    .eq('share_token', shareToken)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (order.payment_status !== 'paid') {
    return NextResponse.json({ error: 'This order has not been paid yet' }, { status: 403 })
  }

  const { data: item } = await supabaseAdmin
    .from('order_items')
    .select('id, order_id, product_id')
    .eq('id', orderItemId)
    .single()

  if (!item || item.order_id !== order.id || !item.product_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('digital_file_key, digital_file_name')
    .eq('id', item.product_id)
    .single()

  if (!product?.digital_file_key) {
    return NextResponse.json({ error: 'This file is no longer available' }, { status: 404 })
  }

  const downloadUrl = await createPresignedDownloadUrl(
    product.digital_file_key,
    product.digital_file_name ?? undefined,
    300
  )
  return NextResponse.redirect(downloadUrl)
}
