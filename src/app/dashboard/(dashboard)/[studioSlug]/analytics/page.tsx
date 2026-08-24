import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { requireStudioPermission } from '@/lib/auth/server'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'

interface AnalyticsPageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ period?: string }>
}

export async function generateMetadata({
  params,
}: AnalyticsPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Analytics - ${studioSlug}`,
    description: 'View your studio analytics and insights',
  }
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  // analytics:read is deliberately withheld from team_member and editor
  // in ROLE_PERMISSIONS (src/lib/auth/permissions.ts) -- this page must
  // enforce that itself, since AnalyticsDashboard's data (getAnalyticsOverview)
  // is fetched client-side via a Server Action RPC the page can't gate for it.
  const access = await requireStudioPermission('analytics:read')
  if ('error' in access) {
    return null
  }

  return <AnalyticsDashboard studioSlug={studioSlug} />
}