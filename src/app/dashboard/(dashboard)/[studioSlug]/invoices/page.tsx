import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { InvoiceList } from '@/components/invoices/InvoiceList'

interface InvoicesPageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ page?: string; status?: string; search?: string }>
}

export async function generateMetadata({
  params,
}: InvoicesPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Invoices - ${studioSlug}`,
    description: 'Manage your invoices and payments',
  }
}

export default async function InvoicesPage({ params }: InvoicesPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  return <InvoiceList studioSlug={studioSlug} />
}