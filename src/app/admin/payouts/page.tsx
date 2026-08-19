import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { getAuthUserServer } from '@/lib/auth'
import { getAllStudioPayoutBalances } from '@/lib/actions/payouts'
import { formatCurrency } from '@/lib/currencies'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Wallet } from 'lucide-react'
import { RecordPayoutDialog } from '@/components/admin/RecordPayoutDialog'

export const metadata: Metadata = {
  title: 'Payouts - Admin',
  description: 'Platform-wide studio payout ledger',
}

export default async function AdminPayoutsPage() {
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }
  if (user.role !== 'super_admin') {
    notFound()
  }

  const balances = await getAllStudioPayoutBalances()

  if ('error' in balances) {
    notFound()
  }

  const totalOwed = balances.reduce((sum, b) => sum + b.owed, 0)

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-display-md font-display font-semibold text-foreground">Studio payouts</h1>
          <p className="text-body text-muted-foreground mt-1">
            Every studio with client M-Pesa payments collected through the platform&apos;s own account.
            Record what you&apos;ve manually sent them so the ledger stays accurate.
          </p>
        </div>

        <div className="border border-border bg-background px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
            <span className="label-caption">Total currently owed across all studios</span>
          </div>
          <span className="font-mono text-2xl font-medium text-foreground tabular-nums">
            {formatCurrency(totalOwed, 'KES')}
          </span>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Studio</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Paid out</TableHead>
                  <TableHead className="text-right">Owed</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Wallet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No studios have collected any client payments yet</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  balances.map((row) => (
                    <TableRow key={row.studioId} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="font-medium text-foreground">{row.studioName}</div>
                        <div className="text-xs text-muted-foreground">{row.ownerEmail}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(row.totalCollected, 'KES')}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {formatCurrency(row.totalPaidOut, 'KES')}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-medium">
                        {formatCurrency(row.owed, 'KES')}
                      </TableCell>
                      <TableCell className="text-right">
                        <RecordPayoutDialog studioId={row.studioId} studioName={row.studioName} owed={row.owed} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Last updated {format(new Date(), 'MMM d, yyyy, h:mm a')}. This page is only visible to platform admins.
        </p>
      </div>
    </div>
  )
}
