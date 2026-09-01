import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getWebsite } from '@/lib/actions/websites'
import { Eye, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'

interface WebsiteAnalyticsPageProps {
  params: Promise<{ studioSlug: string; websiteId: string }>
}

export async function generateMetadata({
  params,
}: WebsiteAnalyticsPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Website Analytics - ${studioSlug}`,
    description: 'Analytics for your portfolio website',
  }
}

export default async function WebsiteAnalyticsPage({ params }: WebsiteAnalyticsPageProps) {
  const { studioSlug, websiteId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const website = await getWebsite(websiteId, studioSlug)

  if (!website) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={website.name}
        description="Analytics"
        breadcrumbs={[
          { label: 'Websites', href: `/dashboard/${studioSlug}/website` },
          { label: website.name, href: `/dashboard/${studioSlug}/website/${websiteId}/editor` },
          { label: 'Analytics' },
        ]}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-border rounded-md px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Total visits</span>
            <Eye className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">
            {website.visits.toLocaleString()}
          </div>
        </div>
        <div className="border border-border rounded-md px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Unique visitors</span>
            <Users className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">
            {website.unique_visitors.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="border border-border rounded-md p-4">
        <h2 className="font-medium text-sm">Traffic tracking isn&apos;t set up yet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Custom domain hosting for websites isn&apos;t live yet, so there&apos;s no real visitor traffic to
          measure. These numbers will start reflecting real visits once the site is actually reachable.
        </p>
      </div>
    </div>
  )
}
