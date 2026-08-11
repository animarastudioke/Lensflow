import { Metadata } from 'next'
import Link from 'next/link'
import { format } from 'date-fns'
import { getAuthUserServer } from '@/lib/auth'
import { getPayments } from '@/lib/actions/payments'
import { getStudioCurrency } from '@/lib/actions/studios'
import { formatCurrency } from '@/lib/currencies'
import { DollarSign, Receipt } from 'lucide-react'
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

  const [{ payments, totalCollected }, currency] = await Promise.all([
    getPayments(studioSlug),
    getStudioCurrency(studioSlug),
  ])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border border border-border">
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
      </div>

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
