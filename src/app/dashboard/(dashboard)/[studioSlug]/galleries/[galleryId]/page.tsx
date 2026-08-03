import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GalleryDetail } from '@/components/galleries/GalleryDetail'

interface GalleryDetailPageProps {
  params: Promise<{ studioSlug: string; galleryId: string }>
}

export async function generateMetadata({
  params,
}: GalleryDetailPageProps): Promise<Metadata> {
  const { studioSlug, galleryId } = await params
  return {
    title: `Gallery - ${studioSlug}`,
    description: 'View and manage gallery',
  }
}

export default async function GalleryDetailPage({ params }: GalleryDetailPageProps) {
  const { studioSlug, galleryId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  return (
    <DashboardLayout studioSlug={studioSlug} studioName="My Studio">
      <GalleryDetail studioSlug={studioSlug} galleryId={galleryId} />
    </DashboardLayout>
  )
}