import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Increment download error:', error)
    return NextResponse.json({ success: true }) // Don't fail the download if tracking fails
  }
}