import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getGallery } from '@/lib/actions/galleries'
import { getClients } from '@/lib/actions/clients'
import { EditGalleryForm } from '@/components/galleries/EditGalleryForm'

interface EditGalleryPageProps {
  params: Promise<{ studioSlug: string; galleryId: string }>
}

export async function generateMetadata({
  params,
}: EditGalleryPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Edit Gallery - ${studioSlug}`,
    description: 'Edit gallery details',
  }
}

export default async function EditGalleryPage({ params }: EditGalleryPageProps) {
  const { studioSlug, galleryId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const [gallery, { clients }] = await Promise.all([
    getGallery(galleryId, studioSlug),
    getClients(studioSlug),
  ])

  if (!gallery) {
    notFound()
  }

  return (
    <EditGalleryForm
      studioSlug={studioSlug}
      clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      initialValues={{
        id: gallery.id,
        name: gallery.name,
        description: gallery.description ?? '',
        type: gallery.type,
        shootDate: gallery.shoot_date ?? '',
        clientId: gallery.client_id ?? 'none',
        status: gallery.status,
        passwordProtected: gallery.password_protected,
        allowDownload: gallery.allow_download,
        allowComments: gallery.allow_comments,
        allowFavorites: gallery.allow_favorites,
        watermarkEnabled: gallery.watermark_enabled,
      }}
    />
  )
}
