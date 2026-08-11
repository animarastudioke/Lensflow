import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getInvoice } from '@/lib/actions/invoices'
import { getClients } from '@/lib/actions/clients'
import { EditInvoiceForm } from '@/components/invoices/EditInvoiceForm'

interface EditInvoicePageProps {
  params: Promise<{ studioSlug: string; invoiceId: string }>
}

export async function generateMetadata({
  params,
}: EditInvoicePageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Edit Invoice - ${studioSlug}`,
    description: 'Edit invoice details',
  }
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const { studioSlug, invoiceId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [invoice, { clients }] = await Promise.all([
    getInvoice(invoiceId, studioSlug),
    getClients(studioSlug),
  ])

  if (!invoice) {
    notFound()
  }

  return (
    <EditInvoiceForm
      studioSlug={studioSlug}
      clients={clients.map(c => ({ id: c.id, name: c.name }))}
      initialValues={{
        id: invoice.id,
        status: invoice.status,
        clientId: invoice.client_id ?? 'none',
        issueDate: invoice.issue_date ? invoice.issue_date.slice(0, 10) : '',
        dueDate: invoice.due_date ? invoice.due_date.slice(0, 10) : '',
        tax: invoice.tax,
        discount: invoice.discount,
        notes: invoice.notes ?? '',
        items: invoice.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      }}
    />
  )
}
