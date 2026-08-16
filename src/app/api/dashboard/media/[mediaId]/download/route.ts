import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPresignedDownloadUrl } from '@/lib/storage/r2'

// The photographer's own download of their own gallery media — deliberately
// separate from /api/storage/[assetId]/download (the public, client-facing
// route), which gates on the gallery's publish status and the studio's
// original_download entitlement. Neither concern applies here: the owner can
// always fetch their own upload, and there's nothing to gate against their
// own plan. This route only checks studio membership, then falls back to
// the preview if no original was retained (e.g. a Free-plan upload that
// never got an original stored at all).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: media } = await supabase
    .from('media')
    .select('id, filename, original_key, gallery_id, gallery:galleries(id, studio_id)')
    .eq('id', mediaId)
    .single()

  if (!media) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const gallery = media.gallery as unknown as { id: string; studio_id: string } | null
  if (!gallery) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: membership } = await supabase
    .from('studio_members')
    .select('id')
    .eq('studio_id', gallery.studio_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const key = media.original_key
    ?? `studios/${gallery.studio_id}/galleries/${gallery.id}/assets/${media.id}/preview.webp`

  const downloadUrl = await createPresignedDownloadUrl(key, media.filename)
  return NextResponse.redirect(downloadUrl)
}
