import { Metadata } from 'next'
import Link from 'next/link'
import { format } from 'date-fns'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getOrder } from '@/lib/actions/orders'
import { getStudioCurrency } from '@/lib/actions/studios'
import { formatCurrency } from '@/lib/currencies'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'

interface OrderDetailPageProps {
  params: Promise<{ studioSlug: string; orderId: string }>
}

export async function generateMetadata({
  params,
}: OrderDetailPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Order - ${studioSlug}`,
    description: 'View order details',
  }
}

const STATUS_VARIANT = {
  pending: 'secondary',
  processing: 'info',
  shipped: 'default',
  delivered: 'success',
  cancelled: 'destructive',
  refunded: 'outline',
} as const

const PAYMENT_VARIANT = {
  pending: 'outline',
  paid: 'success',
  partial: 'warning',
  refunded: 'outline',
} as const

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { studioSlug, orderId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [order, currency] = await Promise.all([
    getOrder(orderId, studioSlug),
    getStudioCurrency(studioSlug),
  ])

  if (!order) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/dashboard/${studioSlug}/store`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>
        <h1 className="text-display-md font-display font-semibold text-foreground font-mono">{order.order_number}</h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
          <Badge variant={PAYMENT_VARIANT[order.payment_status]} className="text-xs">{order.payment_status}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">{order.client?.name ?? order.email ?? 'No client'}</p>
          {(order.client?.email ?? order.email) && (
            <p className="text-sm text-muted-foreground">{order.client?.email ?? order.email}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items on this order</p>
          ) : (
            order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-muted-foreground">Qty {item.quantity}</p>
                </div>
                <span className="font-mono tabular-nums">{formatCurrency(item.total, currency)}</span>
              </div>
            ))
          )}
          <div className="pt-3 border-t space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatCurrency(order.subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Tax</span>
              <span className="font-mono tabular-nums">{formatCurrency(order.tax, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Shipping</span>
              <span className="font-mono tabular-nums">{formatCurrency(order.shipping, currency)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Discount</span>
                <span className="font-mono tabular-nums">-{formatCurrency(order.discount, currency)}</span>
              </div>
            )}
            <div className="flex items-center justify-between font-medium text-base pt-1.5">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatCurrency(order.total, currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {(order.payment_method || order.shipping_address || order.tracking_number || order.notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Fulfillment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {order.payment_method && (
              <div>
                <p className="text-muted-foreground">Payment method</p>
                <p className="mt-0.5">{order.payment_method}</p>
              </div>
            )}
            {order.shipping_address && (
              <div>
                <p className="text-muted-foreground">Shipping address</p>
                <p className="mt-0.5">{order.shipping_address}</p>
              </div>
            )}
            {order.tracking_number && (
              <div>
                <p className="text-muted-foreground">Tracking number</p>
                <p className="mt-0.5 font-mono">{order.tracking_number}</p>
              </div>
            )}
            {order.notes && (
              <div>
                <p className="text-muted-foreground">Notes</p>
                <p className="mt-0.5 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Placed {format(new Date(order.created_at), 'MMM d, yyyy')}
      </p>
    </div>
  )
}
