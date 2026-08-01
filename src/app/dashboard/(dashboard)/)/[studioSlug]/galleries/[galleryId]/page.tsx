import { Metadata } from 'next'
import { GalleryDetailContent } from './GalleryDetailContent'
import { getAuthUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGallery } from '@/lib/actions/galleries'

interface Props {
  params: Promise<{ studioSlug: string; galleryId: string }>
}

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'View and manage gallery',
}

export default async function GalleryDetailPage({ params }: Props) {
  const { studioSlug, galleryId } = await params
  const user = await getAuthUser()

  if (!user) {
    redirect('/auth/login')
  }

  const gallery = await getGallery(galleryId, studioSlug)
  if (!gallery) redirect('/dashboard/' + studioSlug + '/galleries')

  return (
    <GalleryDetailContent studioSlug={studioSlug} galleryId={galleryId} gallery={gallery} />
  )
}