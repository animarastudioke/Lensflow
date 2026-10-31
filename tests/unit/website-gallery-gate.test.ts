import { describe, expect, it } from 'vitest'
import { getWebsiteGalleryOptions } from '@/lib/website/galleries'

// Galleries shown on a public website must already be safe to show to an
// anonymous visitor. Embedding is opt-in: a gallery with no share-settings row
// has never opted in, so it must not appear.

const STUDIO = '11111111-1111-4111-8111-111111111111'
const GALLERY = '22222222-2222-4222-8222-222222222222'
const MEDIA = '33333333-3333-4333-8333-333333333333'
const PREVIEW = `https://media.lensflow.co.ke/studios/${STUDIO}/galleries/${GALLERY}/assets/${MEDIA}/preview.webp`
const ORIGINAL = `https://media.lensflow.co.ke/studios/${STUDIO}/galleries/${GALLERY}/assets/${MEDIA}/original.jpg`

type Setting = {
  gallery_id: string
  password_protected: boolean
  require_email: boolean
  allow_embed: boolean
  expires_at: string | null
}

function fakeSupabase(settings: Setting[], mediaRows: { gallery_id: string; url: string | null; thumbnail_url: string | null }[]) {
  const tables: Record<string, unknown[]> = {
    galleries: [{ id: GALLERY, name: 'Wedding', password_protected: false, expiry_days: null, created_at: '2026-01-01T00:00:00Z' }],
    gallery_share_settings: settings,
    media: mediaRows,
  }
  const chain = (table: string): any => {
    const builder: any = {}
    for (const method of ['select', 'eq', 'in', 'order', 'limit']) builder[method] = () => builder
    builder.then = (resolve: (value: unknown) => unknown) => resolve({ data: tables[table], error: null })
    return builder
  }
  return { from: (table: string) => chain(table) } as never
}

const openSetting: Setting = { gallery_id: GALLERY, password_protected: false, require_email: false, allow_embed: true, expires_at: null }
const image = [{ gallery_id: GALLERY, url: ORIGINAL, thumbnail_url: PREVIEW }]

describe('getWebsiteGalleryOptions privacy gate', () => {
  it('includes an embeddable gallery and only its safe preview URL', async () => {
    const result = await getWebsiteGalleryOptions(fakeSupabase([openSetting], image), STUDIO)
    expect(result).toHaveLength(1)
    expect(result[0]?.images.map((i) => i.src)).toEqual([PREVIEW])
  })

  it('never emits an original-file URL', async () => {
    const onlyOriginal = [{ gallery_id: GALLERY, url: ORIGINAL, thumbnail_url: null }]
    expect(await getWebsiteGalleryOptions(fakeSupabase([openSetting], onlyOriginal), STUDIO)).toEqual([])
  })

  it('excludes a gallery that has no share-settings row (fails closed)', async () => {
    expect(await getWebsiteGalleryOptions(fakeSupabase([], image), STUDIO)).toEqual([])
  })

  it.each([
    ['embedding is off', { ...openSetting, allow_embed: false }],
    ['it is password protected', { ...openSetting, password_protected: true }],
    ['it requires an email', { ...openSetting, require_email: true }],
    ['its link has expired', { ...openSetting, expires_at: '2020-01-01T00:00:00Z' }],
  ])('excludes a gallery when %s', async (_label, setting) => {
    expect(await getWebsiteGalleryOptions(fakeSupabase([setting], image), STUDIO)).toEqual([])
  })
})
