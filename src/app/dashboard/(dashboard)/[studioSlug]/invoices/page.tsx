import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { InvoiceList } from '@/components/invoices/InvoiceList'
import { getInvoices } from '@/lib/actions/invoices'

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

  const { invoices } = await getInvoices(studioSlug)

  const initialInvoices = invoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    clientId: invoice.client_id ?? '',
    clientName: invoice.client?.name ?? 'No client',
    clientEmail: invoice.client?.email ?? '',
    status: invoice.status,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date ?? invoice.issue_date,
    paidDate: invoice.paid_at ?? undefined,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.total,
    })),
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    discount: invoice.discount,
    total: invoice.total,
    amountPaid: invoice.amount_paid,
    balanceDue: Math.max(invoice.total - invoice.amount_paid, 0),
    notes: invoice.notes ?? undefined,
    createdAt: invoice.created_at,
    updatedAt: invoice.updated_at,
  }))

  return <InvoiceList studioSlug={studioSlug} initialInvoices={initialInvoices} />
}