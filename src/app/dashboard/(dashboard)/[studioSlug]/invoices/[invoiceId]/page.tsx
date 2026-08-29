import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getInvoice, getInvoicePayments } from '@/lib/actions/invoices'
import { getStudioSettings, getStudioCurrency } from '@/lib/actions/studios'
import { BillingDocumentView } from '@/components/billing/BillingDocumentView'
import { CopyShareLinkButton } from '@/components/billing/CopyShareLinkButton'
import { InvoicePaymentHistory } from '@/components/invoices/InvoicePaymentHistory'
import { InvoiceDetailActions } from '@/components/invoices/InvoiceDetailActions'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit, Download } from 'lucide-react'
import Link from 'next/link'
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

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { studioSlug, invoiceId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [invoice, settings, currency] = await Promise.all([
    getInvoice(invoiceId, studioSlug),
    getStudioSettings(studioSlug),
    getStudioCurrency(studioSlug),
  ])

  if (!invoice) {
    notFound()
  }

  const payments = await getInvoicePayments(invoice.id, studioSlug)

  const balanceDue = Math.max(invoice.total - invoice.amount_paid, 0)
  const shareUrl = invoice.share_token
    ? `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/invoice/${invoice.share_token}`
    : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={invoice.invoice_number}
        description={invoice.client?.name ?? 'No client attached'}
        breadcrumbs={[
          { label: 'Invoices', href: `/dashboard/${studioSlug}/invoices` },
          { label: invoice.invoice_number },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {invoice.share_token && (
              <CopyShareLinkButton token={invoice.share_token} basePath="/invoice" />
            )}
            {invoice.share_token && (
              <Button variant="outline" asChild>
                <a href={`/api/invoice/${invoice.share_token}/pdf`}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </a>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/dashboard/${studioSlug}/invoices/${invoice.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
            <InvoiceDetailActions invoiceId={invoice.id} studioSlug={studioSlug} status={invoice.status} />
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6 space-y-6">
          <BillingDocumentView
            kind="Invoice"
            documentNumber={invoice.invoice_number}
            statusLabel={invoice.status}
            issueDate={invoice.issue_date}
            secondaryDateLabel="Due"
            secondaryDate={invoice.due_date}
            currency={currency}
            items={invoice.items.map((i) => ({ id: i.id, description: i.description, quantity: i.quantity, unitPrice: i.unit_price, total: i.total }))}
            subtotal={invoice.subtotal}
            tax={invoice.tax}
            discount={invoice.discount}
            total={invoice.total}
            amountPaid={invoice.amount_paid}
            balanceDue={balanceDue}
            notes={invoice.notes}
            client={invoice.client}
            studio={{
              name: settings?.name ?? studioSlug,
              logoUrl: settings?.logo_url ?? null,
              brandColor: settings?.brand_color ?? null,
              email: settings?.email ?? null,
              phone: settings?.phone ?? null,
              address: settings?.address ?? null,
            }}
          />

          <InvoicePaymentHistory payments={payments} currency={currency} />

          {balanceDue > 0 && currency === 'KES' && (
            <div className="border-t border-border pt-6">
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

      {shareUrl && (
        <p className="text-xs text-muted-foreground text-center">
          Client-facing link: <span className="font-mono">{shareUrl}</span>
        </p>
      )}
    </div>
  )
}
