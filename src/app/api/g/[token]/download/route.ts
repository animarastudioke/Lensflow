import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/actions/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = await createClient()
    const { token } = await params

    // Increment download count
    const { error } = await supabase.rpc('increment_gallery_download', { token })

    if (error) {
      // If RPC doesn't exist, fallback to manual update
      const { data: gallery } = await supabase
        .from('galleries')
        .select('id, download_count')
        .eq('share_token', token)
        .single()

      if (gallery) {
        await supabase
          .from('galleries')
          .update({ download_count: gallery.download_count + 1 })
          .eq('id', gallery.id)
      }
    }

    // Phase 12 Step 12: 'gallery_downloaded' was a fully-implemented
    // notification type (see lib/actions/galleries.ts's now-removed
    // incrementGalleryDownload) that this route never actually called --
    // it duplicated the RPC increment inline instead, so a real client
    // download never notified the studio. studio_id is resolved here from
    // the share_token via the DB, never trusted from client input.
    const { data: gallery } = await supabase
      .from('galleries')
      .select('studio_id, name, studio:studios(slug)')
      .eq('share_token', token)
      .single()

    if (gallery) {
      const studioSlug = (gallery.studio as unknown as { slug: string } | null)?.slug
      await createNotification(gallery.studio_id, {
        type: 'gallery_downloaded',
        title: 'Gallery downloaded',
        body: `A client downloaded a photo from "${gallery.name}"`,
        link: studioSlug ? `/dashboard/${studioSlug}/galleries` : undefined,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Increment download error:', error)
    return NextResponse.json({ success: true }) // Don't fail the download if tracking fails
  }
}