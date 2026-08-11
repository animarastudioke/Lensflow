import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getWebsite } from '@/lib/actions/websites'
import { ArrowLeft, Eye, Users } from 'lucide-react'

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
      <div>
        <Link
          href={`/dashboard/${studioSlug}/website`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to websites
        </Link>
        <h1 className="text-display-md font-display font-semibold text-foreground">{website.name}</h1>
        <p className="text-body text-muted-foreground mt-1">Analytics</p>
      </div>

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
