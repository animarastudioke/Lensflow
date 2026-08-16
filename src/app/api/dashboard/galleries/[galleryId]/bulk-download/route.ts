import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'node:stream'
import archiver from 'archiver'
import { createClient } from '@/lib/supabase/server'
import { getObjectStream } from '@/lib/storage/r2'

// Dashboard-authenticated bulk download for the photographer's own gallery
// — mirrors /api/g/[token]/bulk-download's streaming-zip approach (no
// server-side buffering) but checks studio membership instead of the
// public route's plan/publish-status gates, and can target a specific
// selection (?ids=a,b,c) instead of always zipping the whole gallery.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  const { galleryId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: gallery } = await supabase
    .from('galleries')
    .select('id, name, studio_id')
    .eq('id', galleryId)
    .single()

  if (!gallery) {
    return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })
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

  const idsParam = request.nextUrl.searchParams.get('ids')
  const ids = idsParam ? idsParam.split(',').filter(Boolean) : null

  let query = supabase
    .from('media')
    .select('id, filename, original_key')
    .eq('gallery_id', gallery.id)
    .order('created_at', { ascending: true })

  if (ids && ids.length > 0) {
    query = query.in('id', ids)
  }

  const { data: mediaRows, error: mediaError } = await query

  if (mediaError || !mediaRows || mediaRows.length === 0) {
    return NextResponse.json({ error: 'No files to download' }, { status: 404 })
  }

  const archive = archiver('zip', { zlib: { level: 6 } })
  const usedNames = new Set<string>()

  function uniqueName(name: string): string {
    if (!usedNames.has(name)) {
      usedNames.add(name)
      return name
    }
    const dot = name.lastIndexOf('.')
    const base = dot === -1 ? name : name.slice(0, dot)
    const ext = dot === -1 ? '' : name.slice(dot)
    let n = 2
    let candidate = `${base} (${n})${ext}`
    while (usedNames.has(candidate)) {
      n += 1
      candidate = `${base} (${n})${ext}`
    }
    usedNames.add(candidate)
    return candidate
  }

  void (async () => {
    try {
      for (const item of mediaRows) {
        const key = item.original_key
          ?? `studios/${gallery.studio_id}/galleries/${gallery.id}/assets/${item.id}/preview.webp`
        try {
          const stream = await getObjectStream(key)
          if (!stream) continue
          archive.append(stream as unknown as Readable, { name: uniqueName(item.filename) })
        } catch (streamError) {
          console.error(`Failed to stream ${key} into dashboard bulk download zip:`, streamError)
        }
      }
    } finally {
      void archive.finalize()
    }
  })()

  const webStream = Readable.toWeb(archive as unknown as Readable) as ReadableStream

  const safeName = gallery.name.replace(/[^a-zA-Z0-9-_ ]/g, '_').trim() || 'gallery'
  return new NextResponse(webStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}.zip"`,
    },
  })
}
