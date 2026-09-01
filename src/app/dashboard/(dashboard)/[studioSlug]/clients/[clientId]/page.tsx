import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { getAuthUserServer } from '@/lib/auth'
import { getClient } from '@/lib/actions/clients'
import { getBookings } from '@/lib/actions/bookings'
import { getProjects } from '@/lib/actions/projects'
import { getInvoices } from '@/lib/actions/invoices'
import { getGalleries } from '@/lib/actions/galleries'
import { getStudioCurrency } from '@/lib/actions/studios'
import { formatCurrency } from '@/lib/currencies'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/layout/StatusBadge'
import { EmptyState } from '@/components/layout/EmptyState'
import { ClientDetailActions } from '@/components/clients/ClientDetailActions'
import { Mail, Phone, MapPin, Calendar, Briefcase, DollarSign, Images } from 'lucide-react'

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

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { studioSlug, clientId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const client = await getClient(clientId, studioSlug)
  if (!client) {
    notFound()
  }

  const [currency, { bookings }, { projects }, { invoices }, { galleries }] = await Promise.all([
    getStudioCurrency(studioSlug),
    getBookings(studioSlug, { clientId: client.id }),
    getProjects(studioSlug, { clientId: client.id }),
    getInvoices(studioSlug, { clientId: client.id }),
    getGalleries(studioSlug, { clientId: client.id }),
  ])

  const clientName = client.name || `${client.first_name} ${client.last_name}`.trim()
  const backHref = client.status === 'lead' ? `/dashboard/${studioSlug}/leads` : `/dashboard/${studioSlug}/clients`
  const backLabel = client.status === 'lead' ? 'Leads' : 'Clients'

  const outstandingBalance = invoices
    .filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled' && inv.status !== 'refunded')
    .reduce((sum, inv) => sum + Math.max(inv.total - inv.amount_paid, 0), 0)

  const activeBookings = bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'completed').length
  const activeProjects = projects.filter((p) => p.status !== 'archived' && p.status !== 'delivered').length
  // clients.total_spent/total_orders are dead columns -- the trigger that
  // once kept them in sync only exists in supabase/migrations/_archived and
  // was never carried into the current baseline, so they sit at their
  // NOT NULL DEFAULT 0 forever. Total paid is computed here instead, from
  // the same real invoices already fetched for the Invoices section below.
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={clientName}
        description={client.email}
        breadcrumbs={[
          { label: backLabel, href: backHref },
          { label: clientName },
        ]}
        actions={<ClientDetailActions clientId={client.id} clientName={clientName} studioSlug={studioSlug} redirectTo={backHref} />}
      />

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={client.status} />
            <span className="text-sm text-muted-foreground">
              Client since {format(new Date(client.created_at), 'MMM d, yyyy')}
            </span>
          </div>

          <div className="space-y-2 text-sm">
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
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{[client.address, client.city, client.state, client.zip_code, client.country].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4 pt-2 border-t border-border">
            <div>
              <dt className="text-muted-foreground">Total paid</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">{formatCurrency(totalPaid, currency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Outstanding balance</dt>
              <dd className={`font-mono tabular-nums font-medium mt-1 ${outstandingBalance > 0 ? 'text-destructive' : ''}`}>
                {formatCurrency(outstandingBalance, currency)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Active bookings</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">{activeBookings}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Active projects</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">{activeProjects}</dd>
            </div>
          </dl>

          {client.source && (
            <p className="text-sm text-muted-foreground">Source: <span className="text-foreground">{client.source}</span></p>
          )}

          {client.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {client.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Bookings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bookings.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No bookings yet"
              description="Sessions booked for this client will appear here."
              action={{ label: 'New Booking', href: `/dashboard/${studioSlug}/bookings/new?client=${client.id}` }}
              compact
            />
          ) : (
            <ul className="divide-y divide-border">
              {bookings.map((booking) => (
                <li key={booking.id}>
                  <Link
                    href={`/dashboard/${studioSlug}/bookings/${booking.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{booking.session_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.session_date ? format(new Date(`${booking.session_date}T00:00:00`), 'MMM d, yyyy') : 'No date set'}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Projects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {projects.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No projects yet"
              description="Shoots tracked for this client will appear here."
              action={{ label: 'New Project', href: `/dashboard/${studioSlug}/projects/new?client=${client.id}` }}
              compact
            />
          ) : (
            <ul className="divide-y divide-border">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/dashboard/${studioSlug}/projects/${project.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{project.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {project.start_date ? format(new Date(`${project.start_date}T00:00:00`), 'MMM d, yyyy') : 'No date set'}
                      </p>
                    </div>
                    <StatusBadge status={project.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No invoices yet"
              description="Invoices billed to this client will appear here."
              action={{ label: 'New Invoice', href: `/dashboard/${studioSlug}/invoices/new?client=${client.id}` }}
              compact
            />
          ) : (
            <ul className="divide-y divide-border">
              {invoices.map((invoice) => {
                const balance = Math.max(invoice.total - invoice.amount_paid, 0)
                return (
                  <li key={invoice.id}>
                    <Link
                      href={`/dashboard/${studioSlug}/invoices/${invoice.id}`}
                      className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground font-mono tabular-nums">
                          {formatCurrency(invoice.total, currency)}
                          {balance > 0 && <span className="text-destructive"> · {formatCurrency(balance, currency)} due</span>}
                        </p>
                      </div>
                      <StatusBadge status={invoice.status} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Galleries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Galleries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {galleries.length === 0 ? (
            <EmptyState
              icon={Images}
              title="No galleries yet"
              description="Galleries created for this client will appear here."
              action={{ label: 'New Gallery', href: `/dashboard/${studioSlug}/galleries/new?client=${client.id}` }}
              compact
            />
          ) : (
            <ul className="divide-y divide-border">
              {galleries.map((gallery) => (
                <li key={gallery.id}>
                  <Link
                    href={`/dashboard/${studioSlug}/galleries/${gallery.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{gallery.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {gallery.shoot_date ? format(new Date(`${gallery.shoot_date}T00:00:00`), 'MMM d, yyyy') : 'No date set'}
                      </p>
                    </div>
                    <StatusBadge status={gallery.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
