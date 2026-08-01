import { Metadata } from 'next'
import { getAuthUser } from '@/lib/auth'
import { getGallery, getShareSettings } from '@/lib/actions/galleries'
import { redirect } from 'next/navigation'
import { ShareSettingsContent } from './ShareSettingsContent'

interface Props {
  params: Promise<{ studioSlug: string; galleryId: string }>
}

export const metadata: Metadata = {
  title: 'Share Settings',
  description: 'Configure gallery share settings',
}

export default async function GallerySharePage({ params }: Props) {
  const { studioSlug, galleryId } = await params
  const user = await getAuthUser()

  if (!user) {
    redirect('/auth/login')
  }

  const gallery = await getGallery(galleryId, studioSlug)
  if (!gallery) redirect('/dashboard/' + studioSlug + '/galleries')

  const settings = await getShareSettings(galleryId, studioSlug)

  return (
    <ShareSettingsContent
      studioSlug={studioSlug}
      galleryId={galleryId}
      gallery={gallery}
      settings={settings}
    />
  )
}