import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getQuote } from '@/lib/actions/quotes'
import { getClients } from '@/lib/actions/clients'
import { EditQuoteForm } from '@/components/quotes/EditQuoteForm'

interface EditQuotePageProps {
  params: Promise<{ studioSlug: string; quoteId: string }>
}

export async function generateMetadata({
  params,
}: EditQuotePageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Edit Quote - ${studioSlug}`,
    description: 'Edit quote details',
  }
}

export default async function EditQuotePage({ params }: EditQuotePageProps) {
  const { studioSlug, quoteId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [quote, { clients }] = await Promise.all([
    getQuote(quoteId, studioSlug),
    getClients(studioSlug),
  ])

  if (!quote) {
    notFound()
  }

  return (
    <EditQuoteForm
      studioSlug={studioSlug}
      clients={clients.map(c => ({ id: c.id, name: c.name }))}
      initialValues={{
        id: quote.id,
        title: quote.title,
        status: quote.status,
        clientId: quote.client_id ?? 'none',
        issueDate: quote.issue_date ? quote.issue_date.slice(0, 10) : '',
        expiresAt: quote.expires_at ? quote.expires_at.slice(0, 10) : '',
        tax: quote.tax,
        discount: quote.discount,
        notes: quote.notes ?? '',
        items: quote.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      }}
    />
  )
}
