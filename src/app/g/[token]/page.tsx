import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getGalleryByToken, incrementGalleryView } from '@/lib/actions/galleries'
import { ClientGalleryContent } from './ClientGalleryContent'

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ password?: string; embed?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const gallery = await getGalleryByToken(token)

  if (!gallery) {
    return { title: 'Gallery Not Found' }
  }

  if (gallery.expired) {
    return { title: 'Gallery Expired' }
  }

  return {
    title: gallery.seo_title || gallery.name,
    description: gallery.seo_description || gallery.description || `View ${gallery.name} gallery`,
    openGraph: {
      title: gallery.seo_title || gallery.name,
      description: gallery.seo_description || gallery.description || `View ${gallery.name} gallery`,
      images: gallery.cover_image ? [{ url: gallery.cover_image }] : [],
      type: 'website',
    },
  }
}

export default async function ClientGalleryPage({ params, searchParams }: Props) {
  const { token } = await params
  const { password, embed } = await searchParams

  // Increment view count (fire and forget)
  incrementGalleryView(token).catch(console.error)

  const gallery = await getGalleryByToken(token)

  if (!gallery) {
    notFound()
  }

  if (gallery.expired) {
    return (
      <ClientGalleryContent
        gallery={null}
        token={token}
        embed={embed === 'true'}
        error="This gallery has expired."
      />
    )
  }

  // Check password protection
  if (gallery.password_protected) {
    const providedPassword = password || ''
    if (!providedPassword) {
      return (
        <ClientGalleryContent
          gallery={gallery}
          token={token}
          embed={embed === 'true'}
          requirePassword
        />
      )
    }

    // Verify password
    const isValid = await import('@/lib/actions/galleries').then(m => m.verifyGalleryPassword(token, providedPassword))
    if (!isValid) {
      return (
        <ClientGalleryContent
          gallery={gallery}
          token={token}
          embed={embed === 'true'}
          requirePassword
          passwordError="Incorrect password. Please try again."
        />
      )
    }
  }

  return (
    <ClientGalleryContent
      gallery={gallery}
      token={token}
      embed={embed === 'true'}
    />
  )
}