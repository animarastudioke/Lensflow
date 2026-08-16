import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getOrderByShareToken } from '@/lib/actions/storefront'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Clock, Download, XCircle } from 'lucide-react'
import { format } from 'date-fns'

interface OrderPageProps {
  params: Promise<{ shareToken: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Your order' }
}

export default async function OrderReceiptPage({ params }: OrderPageProps) {
  const { shareToken } = await params
  const order = await getOrderByShareToken(shareToken)

  if (!order) {
    notFound()
  }

  const isPaid = order.paymentStatus === 'paid'

  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-12 px-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-8 space-y-6">
          <div className="flex flex-col items-center text-center gap-2">
            {isPaid ? (
              <CheckCircle2 className="h-10 w-10 text-success" />
            ) : order.paymentStatus === 'pending' ? (
              <Clock className="h-10 w-10 text-muted-foreground" />
            ) : (
              <XCircle className="h-10 w-10 text-destructive" />
            )}
            <h1 className="text-heading font-semibold text-foreground">
              {isPaid ? 'Thanks for your order' : order.paymentStatus === 'pending' ? 'Payment pending' : 'Payment not completed'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {order.orderNumber} · {order.studioName} · {format(new Date(order.createdAt), 'MMM d, yyyy')}
            </p>
          </div>

          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">KES {item.total.toLocaleString()}</p>
                </div>
                {isPaid && item.downloadable && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/api/store/order/${shareToken}/download/${item.id}`}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium text-foreground">KES {order.total.toLocaleString()}</span>
          </div>

          {!isPaid && order.paymentStatus === 'pending' && (
            <p className="text-xs text-muted-foreground text-center">
              This page updates once your M-Pesa payment is confirmed — refresh in a moment if you just paid.
            </p>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Bookmark this page — it&apos;s your receipt and download link.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
