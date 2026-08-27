import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { getAuthUserServer } from '@/lib/auth'
import { getProject, getProjectFinancials } from '@/lib/actions/projects'
import { getStudioCurrency } from '@/lib/actions/studios'
import { formatCurrency } from '@/lib/currencies'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/layout/StatusBadge'
import { ProjectDetailActions } from '@/components/projects/ProjectDetailActions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Mail, Image as ImageIcon, CalendarDays } from 'lucide-react'

interface ProjectDetailPageProps {
  params: Promise<{ studioSlug: string; projectId: string }>
}

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Project - ${studioSlug}`,
    description: 'View project details',
  }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { studioSlug, projectId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [project, financials, currency] = await Promise.all([
    getProject(projectId, studioSlug),
    getProjectFinancials(studioSlug),
    getStudioCurrency(studioSlug),
  ])

  if (!project) {
    notFound()
  }

  const money = financials[project.id]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={project.name}
        backHref={`/dashboard/${studioSlug}/projects`}
        actions={<ProjectDetailActions projectId={project.id} studioSlug={studioSlug} />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Project details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <StatusBadge status={project.status} />
          </div>
          {project.start_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(`${project.start_date}T00:00:00`), 'MMM d, yyyy')}
                {project.end_date && ` – ${format(new Date(`${project.end_date}T00:00:00`), 'MMM d, yyyy')}`}
              </span>
            </div>
          )}
          {project.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{project.location}</span>
            </div>
          )}
          {project.booking_id && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Link
                href={`/dashboard/${studioSlug}/bookings/${project.booking_id}`}
                className="text-primary hover:underline"
              >
                View related booking
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {project.client ? (
            <>
              {project.client_id ? (
                <Link
                  href={`/dashboard/${studioSlug}/clients/${project.client_id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {project.client.name}
                </Link>
              ) : (
                <p className="font-medium">{project.client.name}</p>
              )}
              {project.client.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${project.client.email}`} className="hover:underline">{project.client.email}</a>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No client attached to this project.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Total billed</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">{formatCurrency(money?.totalValue ?? 0, currency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Paid</dt>
              <dd className="font-mono tabular-nums font-medium mt-1">{formatCurrency(money?.paidAmount ?? 0, currency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Balance due</dt>
              <dd className={`font-mono tabular-nums font-medium mt-1 ${(money?.balanceDue ?? 0) > 0 ? 'text-destructive' : 'text-success'}`}>
                {formatCurrency(money?.balanceDue ?? 0, currency)}
              </dd>
            </div>
          </dl>
          {!money && (
            <p className="text-xs text-muted-foreground mt-3">No invoices have been billed against this project yet.</p>
          )}
        </CardContent>
      </Card>

      {project.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" asChild>
        <Link href={`/dashboard/${studioSlug}/galleries/new?project=${project.id}`}>
          <ImageIcon className="h-4 w-4 mr-2" />
          Create Gallery
        </Link>
      </Button>
    </div>
  )
}
