import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getGallery } from '@/lib/actions/galleries'
import { UploadGalleryFlow } from '@/components/galleries/UploadGalleryFlow'

interface UploadGalleryPageProps {
  params: Promise<{ studioSlug: string; galleryId: string }>
}

export async function generateMetadata({
  params,
}: UploadGalleryPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Upload Photos - ${studioSlug}`,
    description: 'Upload photos to a gallery',
  }
}

export default async function UploadGalleryPage({ params }: UploadGalleryPageProps) {
  const { studioSlug, galleryId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const gallery = await getGallery(galleryId, studioSlug)

  if (!gallery) {
    notFound()
  }

  return (
    <UploadGalleryFlow
      studioSlug={studioSlug}
      studioId={gallery.studio_id}
      galleryId={gallery.id}
      galleryName={gallery.name}
      initialLayoutType={gallery.layout_type}
    />
  )
}
