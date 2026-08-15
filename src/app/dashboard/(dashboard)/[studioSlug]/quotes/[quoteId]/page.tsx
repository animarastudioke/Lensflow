import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getQuote } from '@/lib/actions/quotes'
import { getStudioSettings, getStudioCurrency } from '@/lib/actions/studios'
import { BillingDocumentView } from '@/components/billing/BillingDocumentView'
import { CopyShareLinkButton } from '@/components/billing/CopyShareLinkButton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Download } from 'lucide-react'

interface QuoteDetailPageProps {
  params: Promise<{ studioSlug: string; quoteId: string }>
}

export async function generateMetadata({
  params,
}: QuoteDetailPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Quote - ${studioSlug}`,
    description: 'View quote details',
  }
}

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { studioSlug, quoteId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [quote, settings, currency] = await Promise.all([
    getQuote(quoteId, studioSlug),
    getStudioSettings(studioSlug),
    getStudioCurrency(studioSlug),
  ])

  if (!quote) {
    notFound()
  }

  const shareUrl = quote.share_token
    ? `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/quote/${quote.share_token}`
    : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/${studioSlug}/quotes`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to quotes
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {quote.share_token && <CopyShareLinkButton token={quote.share_token} basePath="/quote" />}
          {quote.share_token && (
            <Button variant="outline" asChild>
              <a href={`/api/quote/${quote.share_token}/pdf`}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </a>
            </Button>
          )}
          <Button asChild>
            <Link href={`/dashboard/${studioSlug}/quotes/${quote.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <BillingDocumentView
            kind="Quote"
            documentNumber={quote.quote_number}
            title={quote.title}
            statusLabel={quote.status}
            issueDate={quote.issue_date}
            secondaryDateLabel="Expires"
            secondaryDate={quote.expires_at}
            currency={currency}
            items={quote.items.map((i) => ({ id: i.id, description: i.description, quantity: i.quantity, unitPrice: i.unit_price, total: i.total }))}
            subtotal={quote.subtotal}
            tax={quote.tax}
            discount={quote.discount}
            total={quote.total}
            notes={quote.notes}
            client={quote.client}
            studio={{
              name: settings?.name ?? studioSlug,
              logoUrl: settings?.logo_url ?? null,
              brandColor: settings?.brand_color ?? null,
              email: settings?.email ?? null,
              phone: settings?.phone ?? null,
              address: settings?.address ?? null,
            }}
          />
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
