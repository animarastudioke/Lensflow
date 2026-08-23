import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'node:stream'
import archiver from 'archiver'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { hasEntitlement } from '@/lib/entitlements'
import { getObjectStream } from '@/lib/storage/r2'
import { verifyGalleryPassword } from '@/lib/actions/galleries'

// Streams a zip of every photo in a shared gallery, gated by the studio's
// plan (bulk_download entitlement). There is deliberately no server-side
// zip buffering — archive entries are piped straight from R2 into the
// response stream so a large wedding gallery doesn't have to fit in memory.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const { data: gallery, error: galleryError } = await supabaseAdmin
    .from('galleries')
    .select('id, name, studio_id, status, allow_download, share_token')
    .eq('share_token', token)
    .single()

  if (galleryError || !gallery) {
    return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })
  }

  if (gallery.status !== 'published' || !gallery.allow_download) {
    return NextResponse.json({ error: 'Downloads are not available for this gallery' }, { status: 403 })
  }

  // Re-verify the actual password server-side — never trust a client-side
  // "already unlocked this gallery" claim.
  const providedPassword = request.nextUrl.searchParams.get('password') ?? ''
  const passwordOk = await verifyGalleryPassword(gallery.share_token, providedPassword)
  if (!passwordOk) {
    return NextResponse.json({ error: 'This gallery is password protected' }, { status: 403 })
  }

  const entitled = await hasEntitlement(gallery.studio_id, 'bulk_download')
  if (!entitled) {
    return NextResponse.json(
      { error: 'Bulk download requires the photographer to upgrade their plan.' },
      { status: 403 }
    )
  }

  const { data: mediaRows, error: mediaError } = await supabaseAdmin
    .from('media')
    .select('id, filename, original_key')
    .eq('gallery_id', gallery.id)
    .order('created_at', { ascending: true })

  if (mediaError || !mediaRows || mediaRows.length === 0) {
    return NextResponse.json({ error: 'No photos to download' }, { status: 404 })
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
          console.error(`Failed to stream ${key} into bulk download zip:`, streamError)
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
