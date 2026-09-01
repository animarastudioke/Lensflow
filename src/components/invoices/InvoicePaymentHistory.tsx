import { format } from 'date-fns'
import { formatCurrency } from '@/lib/currencies'
import { Receipt } from 'lucide-react'
import type { InvoicePaymentRow } from '@/lib/actions/invoices'

const METHOD_LABELS: Record<string, string> = {
  mpesa: 'M-Pesa',
  stripe: 'Stripe',
  flutterwave: 'Flutterwave',
  paypal: 'PayPal',
  manual: 'Manual',
}

/**
 * Real transactions from the payments ledger (src/lib/payments) -- only
 * shown when at least one exists. A manually marked-as-paid invoice (no
 * M-Pesa/ledger row) has no history to show here; that's an honest empty
 * state, not something this fabricates a placeholder row for.
 */
export function InvoicePaymentHistory({ payments, currency }: { payments: InvoicePaymentRow[]; currency: string }) {
  if (payments.length === 0) return null

  return (
    <div className="border-t border-border pt-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
        Payment history
      </p>
      <ul className="space-y-2">
        {payments.map((payment) => (
          <li key={payment.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{format(new Date(payment.created_at), 'MMM d, yyyy')}</span>
              <span aria-hidden="true">&middot;</span>
              <span>{METHOD_LABELS[payment.method] ?? payment.method}</span>
              {payment.provider_receipt_number && (
                <span className="font-mono text-xs">Receipt: {payment.provider_receipt_number}</span>
              )}
            </div>
            <span className="font-mono tabular-nums text-foreground">
              {formatCurrency(payment.amount, payment.currency || currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
