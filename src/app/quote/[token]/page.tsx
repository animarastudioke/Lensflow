import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getQuoteByToken } from '@/lib/actions/quotes'
import { BillingDocumentView } from '@/components/billing/BillingDocumentView'
import { Download } from 'lucide-react'

interface Props {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const quote = await getQuoteByToken(token)

  if (!quote) return { title: 'Quote Not Found' }

  return {
    title: `Quote ${quote.quote_number} - ${quote.studio.name}`,
    robots: { index: false, follow: false },
  }
}

export default async function PublicQuotePage({ params }: Props) {
  const { token } = await params
  const quote = await getQuoteByToken(token)

  if (!quote) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="bg-background border border-border rounded-lg shadow-sm p-6 sm:p-10">
          <BillingDocumentView
            kind="Quote"
            documentNumber={quote.quote_number}
            title={quote.title}
            statusLabel={quote.status}
            issueDate={quote.issue_date}
            secondaryDateLabel="Expires"
            secondaryDate={quote.expires_at}
            currency={quote.currency}
            items={quote.items.map((i) => ({ id: i.id, description: i.description, quantity: i.quantity, unitPrice: i.unit_price, total: i.total }))}
            subtotal={quote.subtotal}
            tax={quote.tax}
            discount={quote.discount}
            total={quote.total}
            notes={quote.notes}
            client={quote.client}
            studio={{
              name: quote.studio.name,
              logoUrl: quote.studio.logo_url,
              brandColor: quote.studio.brand_color,
              email: quote.studio.email,
              phone: quote.studio.phone,
              address: quote.studio.address,
            }}
          />

          <div className="mt-8 pt-6 border-t border-border flex justify-end">
            <a
              href={`/api/quote/${token}/pdf`}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
