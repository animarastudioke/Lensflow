import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getClients } from '@/lib/actions/clients'
import { NewInvoiceForm } from '@/components/invoices/NewInvoiceForm'

interface NewInvoicePageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: NewInvoicePageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `New Invoice - ${studioSlug}`,
    description: 'Create a new invoice',
  }
}

export default async function NewInvoicePage({ params }: NewInvoicePageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const { clients } = await getClients(studioSlug)

  return <NewInvoiceForm studioSlug={studioSlug} clients={clients.map(c => ({ id: c.id, name: c.name }))} />
}
