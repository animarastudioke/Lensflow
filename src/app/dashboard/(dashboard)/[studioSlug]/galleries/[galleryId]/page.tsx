import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { GalleryDetail } from '@/components/galleries/GalleryDetail'

interface GalleryDetailPageProps {
  params: Promise<{ studioSlug: string; galleryId: string }>
}

export async function generateMetadata({
  params,
}: GalleryDetailPageProps): Promise<Metadata> {
  const { studioSlug } = await params
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

  return <GalleryDetail studioSlug={studioSlug} galleryId={galleryId} />
}