import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Phase 11 Step 13: the public gallery favorite-toggle route previously had
// NO server-side gate beyond toggle_gallery_media_favorite's own DB-level
// scoping (correct gallery + allow_favorites=true) -- unlike every other
// client-facing mutation/download route in this codebase (download,
// bulk-download), it never checked the gallery's published status and never
// re-verified a password for a password-protected gallery. That meant
// anyone holding a share token for a password-protected gallery could
// toggle favorites without ever entering the password. Fixed by adding the
// same status + password-reverification gate the download routes already
// use.

let galleryRow: Record<string, unknown> | null = null
const rpcMock = vi.fn(async () => ({ error: null }))
const verifyGalleryPasswordMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () =>
            table === 'galleries'
              ? { data: galleryRow, error: galleryRow ? null : { message: 'not found' } }
              : { data: null, error: null },
        }),
      }),
    }),
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}))

vi.mock('@/lib/actions/galleries', () => ({
  verifyGalleryPassword: (...args: unknown[]) => verifyGalleryPasswordMock(...args),
}))

const { POST } = await import('@/app/api/g/[token]/favorite/route')

function makeRequest(body: unknown) {
  return new NextRequest('https://example.test/api/g/tok-1/favorite', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  rpcMock.mockClear()
  verifyGalleryPasswordMock.mockReset()
  galleryRow = { id: 'gallery-1', status: 'published', allow_favorites: true, share_token: 'tok-1' }
})

describe('POST /api/g/[token]/favorite: gating', () => {
  it('rejects a favorite toggle on a password-protected gallery without a correct password', async () => {
    verifyGalleryPasswordMock.mockResolvedValue({ status: 'invalid' })
    const response = await POST(makeRequest({ mediaId: 'media-1', isFavorite: true }), {
      params: Promise.resolve({ token: 'tok-1' }),
    })
    expect(response.status).toBe(403)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('allows the toggle once the correct password is supplied', async () => {
    verifyGalleryPasswordMock.mockResolvedValue({ status: 'valid' })
    const response = await POST(makeRequest({ mediaId: 'media-1', isFavorite: true, password: 'correct' }), {
      params: Promise.resolve({ token: 'tok-1' }),
    })
    expect(response.status).toBe(200)
    expect(rpcMock).toHaveBeenCalledWith('toggle_gallery_media_favorite', {
      token: 'tok-1',
      media_id: 'media-1',
      new_value: true,
    })
  })

  it('a gallery with no password protection needs no password (unaffected by this fix)', async () => {
    verifyGalleryPasswordMock.mockResolvedValue({ status: 'valid' })
    const response = await POST(makeRequest({ mediaId: 'media-1', isFavorite: false }), {
      params: Promise.resolve({ token: 'tok-1' }),
    })
    expect(response.status).toBe(200)
    expect(verifyGalleryPasswordMock).toHaveBeenCalledWith('tok-1', '')
  })

  it('rejects a toggle on an unpublished gallery even with allow_favorites true', async () => {
    galleryRow = { id: 'gallery-1', status: 'draft', allow_favorites: true, share_token: 'tok-1' }
    const response = await POST(makeRequest({ mediaId: 'media-1', isFavorite: true }), {
      params: Promise.resolve({ token: 'tok-1' }),
    })
    expect(response.status).toBe(403)
    expect(rpcMock).not.toHaveBeenCalled()
    expect(verifyGalleryPasswordMock).not.toHaveBeenCalled()
  })

  it('rejects a toggle when the gallery has favorites disabled', async () => {
    galleryRow = { id: 'gallery-1', status: 'published', allow_favorites: false, share_token: 'tok-1' }
    const response = await POST(makeRequest({ mediaId: 'media-1', isFavorite: true }), {
      params: Promise.resolve({ token: 'tok-1' }),
    })
    expect(response.status).toBe(403)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 429 with Retry-After when rate-limited, without leaking hashing detail', async () => {
    verifyGalleryPasswordMock.mockResolvedValue({ status: 'rate_limited', retryAfterSeconds: 42 })
    const response = await POST(makeRequest({ mediaId: 'media-1', isFavorite: true, password: 'guess' }), {
      params: Promise.resolve({ token: 'tok-1' }),
    })
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('42')
    const body = await response.json()
    expect(body.error).not.toMatch(/argon2|hash/i)
  })

  it('returns 404 when no gallery matches the token, without ever checking the password', async () => {
    galleryRow = null
    const response = await POST(makeRequest({ mediaId: 'media-1', isFavorite: true }), {
      params: Promise.resolve({ token: 'unknown-token' }),
    })
    expect(response.status).toBe(404)
    expect(verifyGalleryPasswordMock).not.toHaveBeenCalled()
  })

  it('rejects a malformed body before touching the database', async () => {
    const response = await POST(makeRequest({ mediaId: 123, isFavorite: 'yes' }), {
      params: Promise.resolve({ token: 'tok-1' }),
    })
    expect(response.status).toBe(400)
    expect(rpcMock).not.toHaveBeenCalled()
    expect(verifyGalleryPasswordMock).not.toHaveBeenCalled()
  })
})
