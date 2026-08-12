import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { hasEntitlement } from '@/lib/entitlements'
import { createPresignedDownloadUrl, getR2PublicUrl } from '@/lib/storage/r2'

// Gated single-asset original download. Entitlement is resolved from the
// *studio's* plan, not the (anonymous, public-gallery) requester's identity
// — this route has no auth requirement of its own, but it is the
// server-side-authoritative check: hiding the download button in the UI is
// not enough, a Free-tier studio's gallery must 403 here even if someone
// hits this URL directly.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params

  const { data: media, error: mediaError } = await supabaseAdmin
    .from('media')
    .select('id, filename, gallery_id, original_key')
    .eq('id', assetId)
    .single()

  if (mediaError || !media) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: gallery, error: galleryError } = await supabaseAdmin
    .from('galleries')
    .select('id, studio_id, status, allow_download')
    .eq('id', media.gallery_id)
    .single()

  if (galleryError || !gallery) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (gallery.status !== 'published' || !gallery.allow_download) {
    return NextResponse.json({ error: 'Downloads are not available for this gallery' }, { status: 403 })
  }

  const entitled = await hasEntitlement(gallery.studio_id, 'original_download')
  if (!entitled) {
    return NextResponse.json(
      { error: 'Full-resolution downloads require the photographer to upgrade their plan.' },
      { status: 403 }
    )
  }

  if (!media.original_key) {
    // Entitled, but this photo predates the studio's upgrade (or original
    // retention failed at upload time) — fall back to the always-available
    // web preview rather than a dead end.
    const previewKey = `studios/${gallery.studio_id}/galleries/${gallery.id}/assets/${media.id}/preview.webp`
    return NextResponse.redirect(getR2PublicUrl(previewKey))
  }

  const downloadUrl = await createPresignedDownloadUrl(media.original_key, media.filename)
  return NextResponse.redirect(downloadUrl)
}
