import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
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

  return (
    <DashboardLayout studioSlug={studioSlug} studioName="My Studio">
      <AnalyticsDashboard studioSlug={studioSlug} />
    </DashboardLayout>
  )
}