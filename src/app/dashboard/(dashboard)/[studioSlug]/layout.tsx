import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { getAuthUserServer } from '@/lib/auth'
import { getStudioForSettings } from '@/lib/actions/studios'
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

  const studio = await getStudioForSettings(studioSlug)
  const studioName = studio?.name ?? studioSlug

  return (
    <DashboardLayout studioSlug={studioSlug} studioName={studioName} studioLogoUrl={studio?.logoUrl ?? null}>
      {children}
    </DashboardLayout>
  )
}
