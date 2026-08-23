'use server'

import { createClient } from '@/lib/supabase/server'
import { requireStudioPermission } from '@/lib/auth/server'

export interface PaymentRow {
  invoiceId: string
  invoiceNumber: string
  clientName: string
  clientEmail: string
  amountPaid: number
  total: number
  status: string
  paidAt: string | null
  issueDate: string
}

// LensFlow doesn't have a dedicated payments/transactions table or a payment
// processor integration yet - the only real record of money received is
// invoices.amount_paid. This derives a payments list from that rather than
// inventing a ledger that doesn't exist.
export async function getPayments(_studioSlug: string): Promise<{ payments: PaymentRow[]; totalCollected: number }> {
  const membership = await requireStudioPermission('payments:read')
  if ('error' in membership) return { payments: [], totalCollected: 0 }

  const supabase = await createClient()

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, issue_date, paid_at, total, amount_paid, client:clients(name, email)')
    .eq('studio_id', membership.studioId)
    .gt('amount_paid', 0)
    .order('paid_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Get payments error:', error)
    return { payments: [], totalCollected: 0 }
  }

  const payments = (invoices || []).map((invoice) => {
    const client = invoice.client as unknown as { name: string; email: string } | null
    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      clientName: client?.name ?? 'No client',
      clientEmail: client?.email ?? '',
      amountPaid: invoice.amount_paid,
      total: invoice.total,
      status: invoice.status,
      paidAt: invoice.paid_at,
      issueDate: invoice.issue_date,
    }
  })

  const totalCollected = payments.reduce((sum, p) => sum + p.amountPaid, 0)

  return { payments, totalCollected }
}
