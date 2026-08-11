import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { QuoteList } from '@/components/quotes/QuoteList'
import { getQuotes } from '@/lib/actions/quotes'
import { getStudioCurrency } from '@/lib/actions/studios'

interface QuotesPageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: QuotesPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Quotes - ${studioSlug}`,
    description: 'Manage your quotes and estimates',
  }
}

export default async function QuotesPage({ params }: QuotesPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  const [{ quotes }, currency] = await Promise.all([
    getQuotes(studioSlug),
    getStudioCurrency(studioSlug),
  ])

  const initialQuotes = quotes.map((quote) => ({
    id: quote.id,
    quoteNumber: quote.quote_number,
    title: quote.title,
    clientId: quote.client_id ?? '',
    clientName: quote.client?.name ?? 'No client',
    clientEmail: quote.client?.email ?? '',
    status: quote.status,
    issueDate: quote.issue_date,
    expiresAt: quote.expires_at ?? undefined,
    items: quote.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.total,
    })),
    subtotal: quote.subtotal,
    tax: quote.tax,
    discount: quote.discount,
    total: quote.total,
    notes: quote.notes ?? undefined,
    createdAt: quote.created_at,
    updatedAt: quote.updated_at,
  }))

  return <QuoteList studioSlug={studioSlug} initialQuotes={initialQuotes} currency={currency} />
}
