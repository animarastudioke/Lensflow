import { Metadata } from 'next'
import { DashboardLayout } from '@/components/layout'
import { getAuthUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your LensFlow dashboard',
}

interface Props {
  params: Promise<{ studioSlug: string }>
}

export default async function DashboardRootLayout(
  { children, params }: { children: React.ReactNode; params: Promise<{ studioSlug: string }> }
) {
  const { studioSlug } = await params
  const user = await getAuthUser()

  if (!user) {
    redirect('/auth/login')
  }

  // In a real app, verify studio access
  const studioName = 'My Studio'

  return (
    <DashboardLayout studioSlug={studioSlug} studioName={studioName}>
      {children}
    </DashboardLayout>
  )
}