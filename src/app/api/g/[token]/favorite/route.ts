import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { mediaId, isFavorite } = await request.json()

    if (typeof mediaId !== 'string' || typeof isFavorite !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.rpc('toggle_gallery_media_favorite', {
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
