import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getClient } from '@/lib/actions/clients'
import { getStudioCurrency } from '@/lib/actions/studios'
import { formatCurrency } from '@/lib/currencies'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Mail, Phone } from 'lucide-react'

interface ClientDetailPageProps {
  params: Promise<{ studioSlug: string; clientId: string }>
}

export async function generateMetadata({
  params,
}: ClientDetailPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Client - ${studioSlug}`,
    description: 'View client details',
  }
}

const STATUS_VARIANT = {
  lead: 'info',
  active: 'success',
  inactive: 'secondary',
  archived: 'secondary',
} as const

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { studioSlug, clientId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [client, currency] = await Promise.all([
    getClient(clientId, studioSlug),
    getStudioCurrency(studioSlug),
  ])

  if (!client) {
    notFound()
  }

  const backHref = client.status === 'lead' ? `/dashboard/${studioSlug}/leads` : `/dashboard/${studioSlug}/clients`

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-display-md font-display font-semibold text-foreground">{client.name || client.first_name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={STATUS_VARIANT[client.status]}>{client.status}</Badge>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/${studioSlug}/clients/${client.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a>
          </div>
          {client.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{client.phone}</span>
            </div>
          )}
          {(client.address || client.city) && (
            <p className="text-muted-foreground pt-1">
              {[client.address, client.city, client.state, client.zip_code, client.country].filter(Boolean).join(', ')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Total spent</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">{formatCurrency(client.total_spent, currency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total orders</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">{client.total_orders}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Source</dt>
              <dd className="font-medium mt-1">{client.source || '—'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {client.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tags</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {client.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
