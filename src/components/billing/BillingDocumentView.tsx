import { formatCurrency } from '@/lib/currencies'
import { format } from 'date-fns'

export interface BillingDocumentItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface BillingDocumentStudio {
  name: string
  logoUrl: string | null
  brandColor: string | null
  email: string | null
  phone: string | null
  address: string | null
}

export interface BillingDocumentProps {
  kind: 'Invoice' | 'Quote'
  documentNumber: string
  title?: string | null
  statusLabel: string
  issueDate: string
  secondaryDateLabel: string
  secondaryDate: string | null
  currency: string
  items: BillingDocumentItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  amountPaid?: number
  balanceDue?: number
  notes: string | null
  client: { name: string; email: string; phone?: string | null } | null
  studio: BillingDocumentStudio
}

/**
 * Pure presentational — no data fetching, no client-side state — so the
 * exact same markup renders in three places without drifting apart: the
 * dashboard detail page, the public share page, and (via the PDF template's
 * own react-pdf version of this layout) the downloaded PDF.
 */
export function BillingDocumentView(doc: BillingDocumentProps) {
  const accent = doc.studio.brandColor || '#3B82F6'

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-4">
          {doc.studio.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.studio.logoUrl} alt={doc.studio.name} className="h-14 w-14 rounded-lg object-contain bg-muted" />
          ) : (
            <div
              className="h-14 w-14 rounded-lg flex items-center justify-center text-white font-display text-xl font-semibold shrink-0"
              style={{ backgroundColor: accent }}
            >
              {doc.studio.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-display text-lg font-semibold text-foreground">{doc.studio.name}</p>
            <p className="text-sm text-muted-foreground">{doc.studio.email}</p>
            {doc.studio.phone && <p className="text-sm text-muted-foreground">{doc.studio.phone}</p>}
            {doc.studio.address && <p className="text-sm text-muted-foreground">{doc.studio.address}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium uppercase tracking-wide" style={{ color: accent }}>{doc.kind}</p>
          <p className="font-mono text-lg font-medium text-foreground">{doc.documentNumber}</p>
          {doc.title && <p className="text-sm text-muted-foreground">{doc.title}</p>}
          <span className="inline-block mt-2 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium capitalize">
            {doc.statusLabel}
          </span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 text-sm">
        <div>
          <p className="text-muted-foreground uppercase tracking-wide text-xs mb-1">Billed to</p>
          {doc.client ? (
            <>
              <p className="font-medium text-foreground">{doc.client.name}</p>
              <p className="text-muted-foreground">{doc.client.email}</p>
              {doc.client.phone && <p className="text-muted-foreground">{doc.client.phone}</p>}
            </>
          ) : (
            <p className="text-muted-foreground">No client attached</p>
          )}
        </div>
        <div className="sm:text-right">
          <p className="text-muted-foreground">
            Issued <span className="text-foreground font-medium">{format(new Date(doc.issueDate), 'MMM d, yyyy')}</span>
          </p>
          {doc.secondaryDate && (
            <p className="text-muted-foreground">
              {doc.secondaryDateLabel} <span className="text-foreground font-medium">{format(new Date(doc.secondaryDate), 'MMM d, yyyy')}</span>
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground text-xs uppercase tracking-wide">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium text-right">Qty</th>
              <th className="pb-2 font-medium text-right">Rate</th>
              <th className="pb-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item) => (
              <tr key={item.id} className="border-t border-border/60">
                <td className="py-2 text-foreground">{item.description}</td>
                <td className="py-2 text-right text-muted-foreground font-mono tabular-nums">{item.quantity}</td>
                <td className="py-2 text-right text-muted-foreground font-mono tabular-nums">{formatCurrency(item.unitPrice, doc.currency)}</td>
                <td className="py-2 text-right font-mono tabular-nums text-foreground">{formatCurrency(item.total, doc.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums">{formatCurrency(doc.subtotal, doc.currency)}</span>
          </div>
          {doc.tax > 0 && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Tax</span>
              <span className="font-mono tabular-nums">{formatCurrency(doc.tax, doc.currency)}</span>
            </div>
          )}
          {doc.discount > 0 && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Discount</span>
              <span className="font-mono tabular-nums">-{formatCurrency(doc.discount, doc.currency)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-base font-medium text-foreground pt-1.5 border-t border-border">
            <span>Total</span>
            <span className="font-mono tabular-nums">{formatCurrency(doc.total, doc.currency)}</span>
          </div>
          {doc.amountPaid !== undefined && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Paid</span>
              <span className="font-mono tabular-nums">{formatCurrency(doc.amountPaid, doc.currency)}</span>
            </div>
          )}
          {doc.balanceDue !== undefined && (
            <div className="flex items-center justify-between font-medium text-foreground">
              <span>Balance due</span>
              <span className="font-mono tabular-nums">{formatCurrency(doc.balanceDue, doc.currency)}</span>
            </div>
          )}
        </div>
      </div>

      {doc.notes && (
        <div className="border-t border-border pt-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{doc.notes}</p>
        </div>
      )}
    </div>
  )
}
