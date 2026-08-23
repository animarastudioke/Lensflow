import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getGalleryGateInfo, getGalleryByToken, incrementGalleryView, verifyGalleryPassword } from '@/lib/actions/galleries'
import { ClientGalleryContent } from './ClientGalleryContent'

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ password?: string; embed?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const gallery = await getGalleryGateInfo(token)

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

  // Gate-only fetch first: name/branding/expiry/password_protected, never
  // media, client PII, share_token, or any password hash. Only once the
  // caller is known to be authorized (not password-protected, or the
  // password below verifies) do we fetch the full gallery — otherwise that
  // data would be serialized into this page's RSC payload and reach the
  // browser regardless of what the password-gate UI chooses to render.
  const gate = await getGalleryGateInfo(token)

  if (!gate) {
    notFound()
  }

  if (gate.expired) {
    return (
      <ClientGalleryContent
        gallery={null}
        token={token}
        embed={embed === 'true'}
        error="This gallery has expired."
      />
    )
  }

  if (gate.password_protected) {
    const providedPassword = password || ''
    const isValid = providedPassword ? await verifyGalleryPassword(token, providedPassword) : false

    if (!isValid) {
      return (
        <ClientGalleryContent
          gallery={{
            id: gate.id,
            studio_id: gate.studio_id,
            name: gate.name,
            cover_image: gate.cover_image ?? undefined,
            // Placeholder values for fields the password-gate screen never
            // reads (it only checks the gallery object is present) — the
            // real values live behind the password check, in the full
            // getGalleryByToken() fetch below.
            type: 'other',
            media_count: 0,
            allow_download: false,
            allow_comments: false,
            allow_favorites: false,
            watermark_enabled: false,
            password_protected: true,
            share_token: token,
            layout_type: 'grid',
            cover_template: gate.cover_template,
            heading_font: gate.heading_font ?? undefined,
            studio: gate.studio
              ? { name: gate.studio.name, slug: gate.studio.slug, logo_url: gate.studio.logo_url ?? undefined, brand_color: gate.studio.brand_color ?? undefined }
              : undefined,
          }}
          token={token}
          embed={embed === 'true'}
          requirePassword
          passwordError={providedPassword ? 'Incorrect password. Please try again.' : undefined}
        />
      )
    }
  }

  const gallery = await getGalleryByToken(token)

  if (!gallery || gallery.expired) {
    notFound()
  }

  return (
    <ClientGalleryContent
      gallery={gallery}
      token={token}
      embed={embed === 'true'}
    />
  )
}