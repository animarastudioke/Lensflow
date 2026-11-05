import { describe, expect, it } from 'vitest'
import { MAX_SECTION_IMAGES, isWebsiteImageUrl, websiteImageStudioId } from '@/lib/website/media'
import { websiteSectionsSchema } from '@/lib/website/section-schema'
import { getWebsiteSections } from '@/lib/website/content'

const STUDIO = '123e4567-e89b-42d3-a456-426614174000'
const IMG = '123e4567-e89b-42d3-a456-426614174002'
const good = `https://media.lensflow.co.ke/studios/${STUDIO}/website/img-${IMG}.webp`

describe('website image URLs', () => {
  it('accepts exactly the shape the upload action produces and names its studio', () => {
    expect(isWebsiteImageUrl(good)).toBe(true)
    expect(websiteImageStudioId(good)).toBe(STUDIO)
  })

  it.each([
    ['another host', good.replace('media.lensflow.co.ke', 'evil.example')],
    ['http', good.replace('https', 'http')],
    ['a query string', `${good}?x=1`],
    ['a fragment', `${good}#x`],
    ['another extension', good.replace('.webp', '.png')],
    ['a gallery key', `https://media.lensflow.co.ke/studios/${STUDIO}/galleries/${IMG}/assets/${IMG}/preview.webp`],
    ['a nested path', good.replace('/website/', '/website/x/')],
    ['a userinfo trick', `https://media.lensflow.co.ke@evil.example/studios/${STUDIO}/website/img-${IMG}.webp`],
    ['credentials', `https://user:pw@media.lensflow.co.ke/studios/${STUDIO}/website/img-${IMG}.webp`],
    ['an explicit port', good.replace('.ke/', '.ke:443/')],
    ['an uppercase host', good.replace('media.lensflow.co.ke', 'MEDIA.lensflow.co.ke')],
    ['an embedded newline', good.replace('/website', '/web\nsite')],
    ['a non-string', 42],
  ])('rejects %s', (_label, value) => {
    expect(isWebsiteImageUrl(value)).toBe(false)
  })
})

describe('section validators agree on uploaded photos', () => {
  const hero = { id: 'h', type: 'hero', heading: 'Hi', imageUrl: good }
  const gallery = { id: 'g', type: 'gallery', heading: 'Work', imageUrls: [good, good] }

  it('accepts them on save and on load', () => {
    expect(websiteSectionsSchema.safeParse([hero, gallery]).success).toBe(true)
    expect(getWebsiteSections({ version: 1, sections: [hero, gallery] }, 'P')).toEqual([hero, gallery])
  })

  it('rejects a bad photo URL in both places', () => {
    const bad = { ...hero, imageUrl: 'https://evil.example/a.png' }
    expect(websiteSectionsSchema.safeParse([bad]).success).toBe(false)
    expect(getWebsiteSections({ version: 1, sections: [bad] }, 'P').some((s) => s.id === 'h')).toBe(false)
  })

  it('caps the number of gallery photos in both places', () => {
    const many = { ...gallery, imageUrls: Array.from({ length: MAX_SECTION_IMAGES + 1 }, () => good) }
    expect(websiteSectionsSchema.safeParse([many]).success).toBe(false)
    expect(getWebsiteSections({ version: 1, sections: [many] }, 'P').some((s) => s.id === 'g')).toBe(false)
  })
})
