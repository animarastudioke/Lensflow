import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getInvoice } from '@/lib/actions/invoices'
import { getStudioCurrency } from '@/lib/actions/studios'
import { formatCurrency } from '@/lib/currencies'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'
import { MpesaPaymentDialog } from '@/components/invoices/MpesaPaymentDialog'

interface InvoiceDetailPageProps {
  params: Promise<{ studioSlug: string; invoiceId: string }>
}

export async function generateMetadata({
  params,
}: InvoiceDetailPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Invoice - ${studioSlug}`,
    description: 'View invoice details',
  }
}

const STATUS_VARIANT = {
  draft: 'secondary',
  sent: 'info',
  viewed: 'info',
  paid: 'success',
  partial: 'warning',
  overdue: 'destructive',
  cancelled: 'secondary',
  refunded: 'secondary',
} as const

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { studioSlug, invoiceId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [invoice, currency] = await Promise.all([
    getInvoice(invoiceId, studioSlug),
    getStudioCurrency(studioSlug),
  ])

  if (!invoice) {
    notFound()
  }

  const balanceDue = Math.max(invoice.total - invoice.amount_paid, 0)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/${studioSlug}/invoices`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to invoices
          </Link>
          <h1 className="text-display-md font-display font-semibold text-foreground">{invoice.invoice_number}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={STATUS_VARIANT[invoice.status]}>{invoice.status}</Badge>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/${studioSlug}/invoices/${invoice.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Client</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.client ? (
            <div className="text-sm">
              <p className="font-medium">{invoice.client.name}</p>
              <p className="text-muted-foreground">{invoice.client.email}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No client attached</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Line items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoice.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{item.description}</p>
                <p className="text-muted-foreground">{item.quantity} × {formatCurrency(item.unit_price, currency)}</p>
              </div>
              <span className="font-mono tabular-nums">{formatCurrency(item.total, currency)}</span>
            </div>
          ))}
          <div className="pt-3 border-t space-y-2 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatCurrency(invoice.subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Tax</span>
              <span className="font-mono tabular-nums">{formatCurrency(invoice.tax, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Discount</span>
              <span className="font-mono tabular-nums">-{formatCurrency(invoice.discount, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-medium text-foreground pt-2 border-t">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatCurrency(invoice.total, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Paid</span>
              <span className="font-mono tabular-nums">{formatCurrency(invoice.amount_paid, currency)}</span>
            </div>
            <div className="flex items-center justify-between font-medium text-foreground">
              <span>Balance due</span>
              <span className="font-mono tabular-nums">{formatCurrency(balanceDue, currency)}</span>
            </div>
          </div>

          {balanceDue > 0 && currency === 'KES' && (
            <div className="pt-2">
              <MpesaPaymentDialog
                invoiceId={invoice.id}
                studioSlug={studioSlug}
                balanceDue={balanceDue}
                defaultPhone={invoice.client?.phone ?? undefined}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
