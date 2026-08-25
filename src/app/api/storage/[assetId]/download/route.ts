import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'node:stream'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { hasEntitlement } from '@/lib/entitlements'
import { getObjectWithMeta } from '@/lib/storage/r2'
import { verifyGalleryPassword } from '@/lib/actions/galleries'

// Gated single-asset original download. Entitlement is resolved from the
// *studio's* plan, not the (anonymous, public-gallery) requester's identity
// — this route has no auth requirement of its own, but it is the
// server-side-authoritative check: hiding the download button in the UI is
// not enough, a Free-tier studio's gallery must 403 here even if someone
// hits this URL directly.
//
// Streams the object through this server rather than redirecting to a
// presigned R2 URL: the client fetches this to build a blob (so it can show
// a real success/error toast for the entitlement check above), and R2's
// bucket has no CORS policy for that — a redirect left the browser unable to
// read the response at all, silently breaking every client-facing download.
// The dashboard's own download link/store download link don't have this
// problem since they're plain <a href> navigations, never read via fetch().
export async function GET(
  request: NextRequest,
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
    .select('id, studio_id, status, allow_download, share_token')
    .eq('id', media.gallery_id)
    .single()

  if (galleryError || !gallery) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (gallery.status !== 'published' || !gallery.allow_download) {
    return NextResponse.json({ error: 'Downloads are not available for this gallery' }, { status: 403 })
  }

  // Re-verify the actual password server-side — never trust a client-side
  // "already unlocked this gallery" claim. verifyGalleryPassword() itself
  // returns {status:'valid'} when the gallery isn't password-protected, so
  // this is a no-op for the (more common) unprotected-gallery case.
  const providedPassword = request.nextUrl.searchParams.get('password') ?? ''
  const verification = await verifyGalleryPassword(gallery.share_token, providedPassword)
  if (verification.status === 'rate_limited') {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait and try again.' },
      { status: 429, headers: { 'Retry-After': String(verification.retryAfterSeconds) } }
    )
  }
  if (verification.status !== 'valid') {
    return NextResponse.json({ error: 'This gallery is password protected' }, { status: 403 })
  }

  const entitled = await hasEntitlement(gallery.studio_id, 'original_download')
  if (!entitled) {
    return NextResponse.json(
      { error: 'Full-resolution downloads require the photographer to upgrade their plan.' },
      { status: 403 }
    )
  }

  // Entitled, but this photo predates the studio's upgrade (or original
  // retention failed at upload time) — fall back to the always-available
  // web preview rather than a dead end.
  const key = media.original_key
    ?? `studios/${gallery.studio_id}/galleries/${gallery.id}/assets/${media.id}/preview.webp`

  const object = await getObjectWithMeta(key)
  if (!object) {
    return NextResponse.json({ error: 'File not found in storage' }, { status: 404 })
  }

  const webStream = Readable.toWeb(object.stream as unknown as Readable) as ReadableStream
  const safeName = media.filename.replace(/"/g, '')

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': object.contentType,
      ...(object.contentLength ? { 'Content-Length': String(object.contentLength) } : {}),
      'Content-Disposition': `attachment; filename="${safeName}"`,
    },
  })
}
