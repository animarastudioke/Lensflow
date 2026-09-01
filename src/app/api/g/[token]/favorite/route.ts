import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyGalleryPassword } from '@/lib/actions/galleries'

// Anonymous, token-gated mutation -- unlike the read-only view/download
// counters, this actually changes a media row, so it needs the same
// server-authoritative gate as the download routes: published status and
// (if the gallery is password-protected) a re-verified password. Previously
// this only relied on toggle_gallery_media_favorite's own scoping to the
// gallery's allow_favorites flag, which meant a password-protected gallery's
// favorites could be toggled by anyone who had the share token but never
// entered the password.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { mediaId, isFavorite, password } = await request.json()

    if (typeof mediaId !== 'string' || typeof isFavorite !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { data: gallery, error: galleryError } = await supabaseAdmin
      .from('galleries')
      .select('id, status, allow_favorites, share_token')
      .eq('share_token', token)
      .single()

    if (galleryError || !gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })
    }

    if (gallery.status !== 'published' || !gallery.allow_favorites) {
      return NextResponse.json({ error: 'Favorites are not available for this gallery' }, { status: 403 })
    }

    const providedPassword = typeof password === 'string' ? password : ''
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

    const { error } = await supabaseAdmin.rpc('toggle_gallery_media_favorite', {
      token,
      media_id: mediaId,
      new_value: isFavorite,
    })

    if (error) {
      console.error('Toggle favorite error:', error)
      return NextResponse.json({ error: 'Failed to update favorite' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Toggle favorite error:', error)
    return NextResponse.json({ error: 'Failed to update favorite' }, { status: 500 })
  }
}
