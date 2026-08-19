import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getInvoiceByToken } from '@/lib/actions/invoices'
import { BillingDocumentView } from '@/components/billing/BillingDocumentView'
import { PublicMpesaPaymentDialog } from '@/components/invoices/PublicMpesaPaymentDialog'
import { Download } from 'lucide-react'

interface Props {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const invoice = await getInvoiceByToken(token)

  if (!invoice) return { title: 'Invoice Not Found' }

  return {
    title: `Invoice ${invoice.invoice_number} - ${invoice.studio.name}`,
    robots: { index: false, follow: false },
  }
}

export default async function PublicInvoicePage({ params }: Props) {
  const { token } = await params
  const invoice = await getInvoiceByToken(token)

  if (!invoice) {
    notFound()
  }

  const balanceDue = Math.max(invoice.total - invoice.amount_paid, 0)

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="bg-background border border-border rounded-lg shadow-sm p-6 sm:p-10">
          <BillingDocumentView
            kind="Invoice"
            documentNumber={invoice.invoice_number}
            statusLabel={invoice.status}
            issueDate={invoice.issue_date}
            secondaryDateLabel="Due"
            secondaryDate={invoice.due_date}
            currency={invoice.currency}
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
              name: invoice.studio.name,
              logoUrl: invoice.studio.logo_url,
              brandColor: invoice.studio.brand_color,
              email: invoice.studio.email,
              phone: invoice.studio.phone,
              address: invoice.studio.address,
            }}
          />

          <div className="mt-8 pt-6 border-t border-border flex items-center justify-end gap-3">
            <a
              href={`/api/invoice/${token}/pdf`}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
            {balanceDue > 0 && invoice.currency === 'KES' && invoice.status !== 'cancelled' && invoice.status !== 'refunded' && (
              <PublicMpesaPaymentDialog
                token={token}
                balanceDue={balanceDue}
                defaultPhone={invoice.client?.phone ?? undefined}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
