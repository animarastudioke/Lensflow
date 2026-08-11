import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getQuote } from '@/lib/actions/quotes'
import { getStudioCurrency } from '@/lib/actions/studios'
import { formatCurrency } from '@/lib/currencies'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'

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

const STATUS_VARIANT = {
  draft: 'secondary',
  sent: 'info',
  viewed: 'info',
  accepted: 'success',
  declined: 'destructive',
  expired: 'secondary',
} as const

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { studioSlug, quoteId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [quote, currency] = await Promise.all([
    getQuote(quoteId, studioSlug),
    getStudioCurrency(studioSlug),
  ])

  if (!quote) {
    notFound()
  }

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
          <h1 className="text-display-md font-display font-semibold text-foreground">{quote.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={STATUS_VARIANT[quote.status]}>{quote.status}</Badge>
            <span className="text-sm text-muted-foreground font-mono">{quote.quote_number}</span>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/${studioSlug}/quotes/${quote.id}/edit`}>
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
          {quote.client ? (
            <div className="text-sm">
              <p className="font-medium">{quote.client.name}</p>
              <p className="text-muted-foreground">{quote.client.email}</p>
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
          {quote.items.map((item) => (
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
              <span className="font-mono tabular-nums">{formatCurrency(quote.subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Tax</span>
              <span className="font-mono tabular-nums">{formatCurrency(quote.tax, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Discount</span>
              <span className="font-mono tabular-nums">-{formatCurrency(quote.discount, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-medium text-foreground pt-2 border-t">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatCurrency(quote.total, currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {quote.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
