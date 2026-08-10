import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { getAuthUserServer } from '@/lib/auth'
import { redirect } from 'next/navigation'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ studioSlug: string }>
}

export default async function DashboardLayoutWrapper({
  children,
  params,
}: LayoutProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  // Get studio info (could be cached)
  const studioName = 'Studio' // In production, fetch from database

  return (
    <DashboardLayout studioSlug={studioSlug} studioName={studioName}>
      {children}
    </DashboardLayout>
  )
}
