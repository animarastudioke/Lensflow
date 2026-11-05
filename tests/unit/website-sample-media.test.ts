import { describe, expect, it } from 'vitest'
import { samplePhotoSrc } from '@/lib/website/sample-media'

describe('samplePhotoSrc', () => {
  it('returns an SVG data URI', () => {
    expect(samplePhotoSrc(0, false)).toMatch(/^data:image\/svg\+xml;charset=utf-8,%3Csvg/)
  })
  it('varies by index and by light or dark surface, and wraps', () => {
    expect(samplePhotoSrc(0, false)).not.toBe(samplePhotoSrc(1, false))
    expect(samplePhotoSrc(0, false)).not.toBe(samplePhotoSrc(0, true))
    expect(samplePhotoSrc(4, false)).toBe(samplePhotoSrc(0, false))
  })
  it('tolerates a negative variant', () => {
    expect(samplePhotoSrc(-1, true)).toBe(samplePhotoSrc(1, true))
  })
})
