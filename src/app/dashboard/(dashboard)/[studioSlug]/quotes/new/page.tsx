import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getClients } from '@/lib/actions/clients'
import { NewQuoteForm } from '@/components/quotes/NewQuoteForm'

interface NewQuotePageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: NewQuotePageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `New Quote - ${studioSlug}`,
    description: 'Create a new quote',
  }
}

export default async function NewQuotePage({ params }: NewQuotePageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const { clients } = await getClients(studioSlug)

  return <NewQuoteForm studioSlug={studioSlug} clients={clients.map(c => ({ id: c.id, name: c.name }))} />
}
