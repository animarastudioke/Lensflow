import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GalleryList } from '@/components/galleries/GalleryList'

interface GalleriesPageProps {
  params: Promise<{ studioSlug: string }>
  searchParams: Promise<{ page?: string; status?: string; type?: string }>
}

export async function generateMetadata({
  params,
}: GalleriesPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Galleries - ${studioSlug}`,
    description: 'Manage your client galleries',
  }
}

export default async function GalleriesPage({ params }: GalleriesPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null // Layout handles redirect
  }

  // In production, fetch galleries from database
  // For now, pass empty array to use mock data in component
  const initialGalleries: any[] = []

  return (
    <DashboardLayout studioSlug={studioSlug} studioName="My Studio">
      <GalleryList studioSlug={studioSlug} initialGalleries={initialGalleries} />
    </DashboardLayout>
  )
}