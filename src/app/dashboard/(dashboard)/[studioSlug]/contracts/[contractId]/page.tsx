import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getContract } from '@/lib/actions/contracts'
import { getStudioCurrency } from '@/lib/actions/studios'
import { formatCurrency } from '@/lib/currencies'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'

interface ContractDetailPageProps {
  params: Promise<{ studioSlug: string; contractId: string }>
}

export async function generateMetadata({
  params,
}: ContractDetailPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Contract - ${studioSlug}`,
    description: 'View contract details',
  }
}

const STATUS_VARIANT = {
  draft: 'secondary',
  sent: 'info',
  viewed: 'info',
  signed: 'success',
  completed: 'success',
  expired: 'secondary',
  declined: 'destructive',
  cancelled: 'destructive',
} as const

function getTypeLabel(type: string) {
  return type
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default async function ContractDetailPage({ params }: ContractDetailPageProps) {
  const { studioSlug, contractId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [contract, currency] = await Promise.all([
    getContract(contractId, studioSlug),
    getStudioCurrency(studioSlug),
  ])

  if (!contract) {
    notFound()
  }

  const balanceDue = Math.max(contract.deposit_required - contract.deposit_paid, 0)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/${studioSlug}/contracts`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contracts
          </Link>
          <h1 className="text-display-md font-display font-semibold text-foreground">{contract.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={STATUS_VARIANT[contract.status]}>{contract.status}</Badge>
            <Badge variant="outline" className="text-xs">{getTypeLabel(contract.type)}</Badge>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/${studioSlug}/contracts/${contract.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Client</CardTitle>
        </CardHeader>
        <CardContent>
          {contract.client ? (
            <div className="text-sm">
              <p className="font-medium">{contract.client.name}</p>
              <p className="text-muted-foreground">{contract.client.email}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No client attached</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Value</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Total value</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">{formatCurrency(contract.total_value, currency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Deposit required</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">{formatCurrency(contract.deposit_required, currency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Deposit paid</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">{formatCurrency(contract.deposit_paid, currency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Balance due</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">{formatCurrency(balanceDue, currency)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {contract.signers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Signers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contract.signers.map((signer) => (
              <div key={signer.email} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{signer.name}</p>
                  <p className="text-muted-foreground">{signer.email}</p>
                </div>
                <Badge variant={signer.status === 'signed' ? 'success' : signer.status === 'declined' ? 'destructive' : 'secondary'}>
                  {signer.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {contract.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contract.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
