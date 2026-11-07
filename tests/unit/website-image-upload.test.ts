import { beforeEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'

// Site photos are the first user-supplied bytes served from a public host
// without going through a gallery. These pin what makes that safe: only real
// images are accepted, the stored object is a bounded server-made WebP under
// the studio's own folder, and a page can only reference its own studio's photos.

const STUDIO = '123e4567-e89b-42d3-a456-426614174000'
const OTHER = '123e4567-e89b-42d3-a456-426614174999'
const IMG = '123e4567-e89b-42d3-a456-426614174002'
const url = (studio: string) => `https://media.lensflow.co.ke/studios/${studio}/website/img-${IMG}.webp`

const uploadObjectMock = vi.fn()
vi.mock('@/lib/storage/r2', () => ({
  uploadObject: (...a: unknown[]) => uploadObjectMock(...a),
  getR2PublicUrl: (key: string) => `https://media.lensflow.co.ke/${key}`,
}))

const requireStudioPermissionMock = vi.fn()
vi.mock('@/lib/auth/server', () => ({ requireStudioPermission: (...a: unknown[]) => requireStudioPermissionMock(...a) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
const hasEntitlementMock = vi.fn(async (..._a: unknown[]) => true)
vi.mock('@/lib/entitlements', () => ({ hasEntitlement: (...a: unknown[]) => hasEntitlementMock(...a), requireEntitlement: vi.fn(async () => ({})) }))

const pageUpdates: Record<string, unknown>[] = []
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    const b: any = {}
    b.select = () => b
    b.eq = () => b
    b.update = (p: Record<string, unknown>) => { pageUpdates.push(p); return b }
    b.single = async () => ({ data: { id: 'w', subdomain: 'studio', path: '/' }, error: null })
    return { from: () => b }
  },
}))

const { uploadWebsiteImage, updateWebsitePageContent } = await import('@/lib/actions/websites')

// jsdom's File has no arrayBuffer(), which the action relies on in a real server runtime.
const fileOf = (bytes: Buffer | string, type: string, name = 'p.jpg') => {
  const buf = typeof bytes === 'string' ? Buffer.from(bytes) : bytes
  const file = new File([buf as BlobPart], name, { type })
  Object.defineProperty(file, 'arrayBuffer', { value: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) })
  Object.defineProperty(file, 'size', { value: buf.length })
  return file
}
const form = (file: File | string | null) => {
  const f = new FormData()
  if (file !== null) f.set('image', file)
  return f
}
const realJpeg = (w = 3000, h = 1000) => sharp({ create: { width: w, height: h, channels: 3, background: '#884422' } }).jpeg().toBuffer()

beforeEach(() => {
  uploadObjectMock.mockReset().mockResolvedValue(undefined)
  requireStudioPermissionMock.mockReset().mockResolvedValue({ userId: 'u', studioId: STUDIO, role: 'studio_owner' })
  hasEntitlementMock.mockReset().mockResolvedValue(true)
  pageUpdates.length = 0
})

describe('uploadWebsiteImage', () => {
  it('stores a bounded WebP under the studio website folder with a server-made key', async () => {
    const result = await uploadWebsiteImage(form(fileOf(await realJpeg(), 'image/jpeg')))
    expect(result).toMatchObject({ success: true })
    const [key, body, contentType] = uploadObjectMock.mock.calls[0] as [string, Buffer, string]
    expect(key).toMatch(new RegExp(`^studios/${STUDIO}/website/img-[0-9a-f-]{36}\\.webp$`))
    expect(contentType).toBe('image/webp')
    const meta = await sharp(body).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(2400)
    expect('url' in result && result.url).toBe(`https://media.lensflow.co.ke/${key}`)
  })

  it('drops EXIF metadata such as GPS location', async () => {
    const withExif = await sharp(await realJpeg(200, 100)).withExif({ IFD0: { Copyright: 'secret-marker' } }).jpeg().toBuffer()
    await uploadWebsiteImage(form(fileOf(withExif, 'image/jpeg')))
    const body = uploadObjectMock.mock.calls[0]![1] as Buffer
    expect((await sharp(body).metadata()).exif).toBeUndefined()
    expect(body.includes(Buffer.from('secret-marker'))).toBe(false)
  })

  it('never uses a client-supplied name or path in the key', async () => {
    await uploadWebsiteImage(form(fileOf(await realJpeg(100, 100), 'image/jpeg', '../../etc/passwd.jpg')))
    expect(uploadObjectMock.mock.calls[0]![0]).not.toMatch(/passwd|\.\./)
  })

  it('refuses a file that claims to be an image but is not', async () => {
    const result = await uploadWebsiteImage(form(fileOf('<script>alert(1)</script>', 'image/png')))
    expect(result).toEqual({ error: 'That file could not be read as a photo.' })
    expect(uploadObjectMock).not.toHaveBeenCalled()
  })

  it.each([['image/svg+xml'], ['image/gif'], ['application/pdf']])('refuses %s', async (type) => {
    const result = await uploadWebsiteImage(form(fileOf(await realJpeg(50, 50), type)))
    expect(result).toEqual({ error: 'Use a JPEG, PNG or WebP photo.' })
    expect(uploadObjectMock).not.toHaveBeenCalled()
  })

  it('refuses a file whose real format is not JPEG, PNG or WebP, whatever it claims', async () => {
    const gif = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#fff' } }).gif().toBuffer()
    expect(await uploadWebsiteImage(form(fileOf(gif, 'image/png')))).toEqual({ error: 'Use a JPEG, PNG or WebP photo.' })
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'
    expect(await uploadWebsiteImage(form(fileOf(svg, 'image/jpeg')))).toEqual({ error: 'Use a JPEG, PNG or WebP photo.' })
    expect(uploadObjectMock).not.toHaveBeenCalled()
  })

  it('is gated by the website_builder plan feature', async () => {
    hasEntitlementMock.mockResolvedValue(false)
    const result = await uploadWebsiteImage(form(fileOf(await realJpeg(50, 50), 'image/jpeg')))
    expect(result).toEqual({ error: 'Your plan does not include the website builder.' })
    expect(hasEntitlementMock).toHaveBeenCalledWith(STUDIO, 'website_builder')
    expect(uploadObjectMock).not.toHaveBeenCalled()
  })

  it('refuses an oversized file before decoding it', async () => {
    const big = fileOf(Buffer.alloc(12 * 1024 * 1024 + 1), 'image/jpeg')
    expect(await uploadWebsiteImage(form(big))).toEqual({ error: 'That photo is over 12MB. Try a smaller export.' })
    expect(uploadObjectMock).not.toHaveBeenCalled()
  })

  it('refuses a missing file', async () => {
    expect(await uploadWebsiteImage(form(null))).toEqual({ error: 'No photo was provided.' })
    expect(await uploadWebsiteImage(form('not a file'))).toEqual({ error: 'No photo was provided.' })
  })

  it('requires the page-management permission', async () => {
    requireStudioPermissionMock.mockResolvedValue({ error: 'Insufficient permissions' })
    const result = await uploadWebsiteImage(form(fileOf(await realJpeg(50, 50), 'image/jpeg')))
    expect(result).toEqual({ error: 'Insufficient permissions' })
    expect(requireStudioPermissionMock).toHaveBeenCalledWith('website:manage_pages')
    expect(uploadObjectMock).not.toHaveBeenCalled()
  })

  it('reports a storage failure instead of returning a URL', async () => {
    uploadObjectMock.mockRejectedValue(new Error('r2 down'))
    const result = await uploadWebsiteImage(form(fileOf(await realJpeg(50, 50), 'image/jpeg')))
    expect(result).toEqual({ error: 'The upload failed. Try again.' })
  })
})

describe('updateWebsitePageContent: photo references', () => {
  const save = (sections: unknown[]) => {
    const f = new FormData()
    f.set('page_id', 'p')
    f.set('website_id', 'w')
    f.set('studio_slug', 'studio')
    f.set('sections', JSON.stringify(sections))
    return updateWebsitePageContent(f)
  }

  it("saves a section that uses this studio's own photos", async () => {
    const result = await save([
      { id: 'hero', type: 'hero', heading: 'Hi', imageUrl: url(STUDIO) },
      { id: 'g', type: 'gallery', heading: 'Work', imageUrls: [url(STUDIO)] },
    ])
    expect(result).toBeUndefined()
    expect(pageUpdates).toHaveLength(1)
  })

  it("refuses another studio's photo", async () => {
    expect(await save([{ id: 'hero', type: 'hero', heading: 'Hi', imageUrl: url(OTHER) }])).toEqual({ error: 'Some photos do not belong to this studio. Upload them again.' })
    expect(await save([{ id: 'g', type: 'gallery', heading: 'W', imageUrls: [url(STUDIO), url(OTHER)] }])).toMatchObject({ error: expect.stringContaining('do not belong') })
    expect(pageUpdates).toHaveLength(0)
  })

  it('refuses a URL that is not one of our site photos', async () => {
    const result = await save([{ id: 'hero', type: 'hero', heading: 'Hi', imageUrl: 'https://evil.example/x.png' }])
    expect(result).toMatchObject({ error: expect.stringContaining('invalid') })
    expect(pageUpdates).toHaveLength(0)
  })
})
