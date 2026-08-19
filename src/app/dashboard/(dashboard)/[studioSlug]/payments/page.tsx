import { Metadata } from 'next'
import Link from 'next/link'
import { format } from 'date-fns'
import { getAuthUserServer } from '@/lib/auth'
import { getPayments } from '@/lib/actions/payments'
import { getStudioPayoutSummary } from '@/lib/actions/payouts'
import { getStudioCurrency } from '@/lib/actions/studios'
import { formatCurrency } from '@/lib/currencies'
import { DollarSign, Receipt, Wallet } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PaymentsPageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: PaymentsPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Payments - ${studioSlug}`,
    description: 'Payments received from clients',
  }
}

export default async function PaymentsPage({ params }: PaymentsPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  const [{ payments, totalCollected }, currency, payoutSummary] = await Promise.all([
    getPayments(studioSlug),
    getStudioCurrency(studioSlug),
    getStudioPayoutSummary(studioSlug),
  ])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border border border-border">
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Total collected</span>
            <DollarSign className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-success tabular-nums">
            {formatCurrency(totalCollected, currency)}
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Payments recorded</span>
            <Receipt className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">
            {payments.length}
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Owed to you</span>
            <Wallet className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">
            {payoutSummary ? formatCurrency(payoutSummary.owed, 'KES') : '—'}
          </div>
        </div>
      </div>

      {payoutSummary && (
        <Card>
          <CardContent className="px-5 py-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-heading-md font-display font-semibold text-foreground">M-Pesa payouts</h2>
                <p className="text-body-sm text-muted-foreground mt-1 max-w-xl">
                  Client M-Pesa payments currently settle into LensFlow&apos;s own account and are paid out to
                  you manually. This is what you&apos;ve been sent so far against what&apos;s been collected on
                  your behalf.
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="label-caption">Paid out to date</div>
                <div className="font-mono text-lg font-medium text-foreground tabular-nums">
                  {formatCurrency(payoutSummary.totalPaidOut, 'KES')}
                </div>
              </div>
            </div>
            {payoutSummary.payouts.length > 0 && (
              <div className="mt-5 space-y-2">
                {payoutSummary.payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between text-sm border-t border-border pt-2 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <span className="text-foreground">{format(new Date(payout.createdAt), 'MMM d, yyyy')}</span>
                      {payout.note && <span className="text-muted-foreground"> — {payout.note}</span>}
                      {payout.reference && (
                        <span className="text-muted-foreground font-mono text-xs"> ({payout.reference})</span>
                      )}
                    </div>
                    <span className="font-mono tabular-nums">{formatCurrency(payout.amount, 'KES')}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <h1 className="text-display-md font-display font-semibold text-foreground">Payments</h1>
        <p className="text-body text-muted-foreground mt-1">
          Payments received against your invoices
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid on</TableHead>
                <TableHead className="text-right">Amount paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No payments recorded yet</p>
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.invoiceId} className="hover:bg-muted/50">
                    <TableCell>
                      <Link
                        href={`/dashboard/${studioSlug}/invoices/${payment.invoiceId}`}
                        className="font-mono text-sm text-primary hover:underline"
                      >
                        {payment.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{payment.clientName}</TableCell>
                    <TableCell>
                      <Badge variant={payment.status === 'paid' ? 'success' : 'warning'} className="text-xs">
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payment.paidAt ? format(new Date(payment.paidAt), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(payment.amountPaid, currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
