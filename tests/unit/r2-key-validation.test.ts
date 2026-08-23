import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Phase 2 P3-A regression coverage: none of r2.ts's key/prefix-accepting
// functions validated their input before this change — every real call
// site happens to build keys as `studios/{studioId}/...` server-side, but
// nothing enforced that. deleteObjectsByPrefix is the sharpest edge: it
// fans out to a real bulk-delete, so an under-scoped prefix (a bare
// `studios/` namespace root, or an empty string) would delete every
// studio's media. These tests prove the added guards reject that class of
// input while every real, legitimately-scoped key/prefix used elsewhere in
// the app still passes through untouched.

class FakeCommand {
  input: Record<string, unknown>
  constructor(input: Record<string, unknown>) {
    this.input = input
  }
}

const sendMock = vi.fn(async () => ({ Contents: [], ContentLength: 0, IsTruncated: false }))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: FakeCommand,
  GetObjectCommand: FakeCommand,
  HeadObjectCommand: FakeCommand,
  DeleteObjectCommand: FakeCommand,
  DeleteObjectsCommand: FakeCommand,
  ListObjectsV2Command: FakeCommand,
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://example.com/signed-url'),
}))

beforeEach(() => {
  vi.stubEnv('R2_ACCOUNT_ID', 'test-account')
  vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key')
  vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret')
  vi.stubEnv('R2_BUCKET_NAME', 'test-bucket')
  sendMock.mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const {
  uploadObject,
  headObject,
  downloadObject,
  getObjectStream,
  getObjectWithMeta,
  deleteObject,
  deleteObjects,
  deleteObjectsByPrefix,
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
} = await import('@/lib/storage/r2')

describe('r2.ts key validation: dangerous or malformed keys are rejected', () => {
  const badKeys = [
    ['empty string', ''],
    ['whitespace only', '   '],
    ['leading slash', '/studios/studio-1/x'],
    ['path traversal', 'studios/studio-1/../../../etc/passwd'],
    ['outside studios/ namespace', 'not-studios/studio-1/x'],
    ['bare studio folder, no object path', 'studios/studio-1'],
    ['bare namespace root', 'studios/'],
  ] as const

  for (const [label, key] of badKeys) {
    it(`uploadObject rejects: ${label}`, async () => {
      await expect(uploadObject(key, Buffer.from('x'), 'text/plain')).rejects.toThrow()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it(`headObject rejects: ${label}`, async () => {
      await expect(headObject(key)).rejects.toThrow()
    })

    it(`downloadObject rejects: ${label}`, async () => {
      await expect(downloadObject(key)).rejects.toThrow()
    })

    it(`getObjectStream rejects: ${label}`, async () => {
      await expect(getObjectStream(key)).rejects.toThrow()
    })

    it(`getObjectWithMeta rejects: ${label}`, async () => {
      await expect(getObjectWithMeta(key)).rejects.toThrow()
    })

    it(`deleteObject rejects: ${label}`, async () => {
      await expect(deleteObject(key)).rejects.toThrow()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it(`createPresignedUploadUrl rejects: ${label}`, async () => {
      await expect(createPresignedUploadUrl(key, 'text/plain')).rejects.toThrow()
    })

    it(`createPresignedDownloadUrl rejects: ${label}`, async () => {
      await expect(createPresignedDownloadUrl(key)).rejects.toThrow()
    })
  }

  it('deleteObjects rejects if any key in the batch is malformed, and sends nothing', async () => {
    await expect(deleteObjects(['studios/studio-1/galleries/g1/assets/m1/original.jpg', ''])).rejects.toThrow()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('deleteObjects is a no-op for an empty array (not an error case)', async () => {
    await expect(deleteObjects([])).resolves.toBeUndefined()
    expect(sendMock).not.toHaveBeenCalled()
  })
})

describe('deleteObjectsByPrefix: under-scoped prefixes are rejected before any list/delete call', () => {
  const badPrefixes = [
    ['empty string', ''],
    ['bare namespace root', 'studios/'],
    ['bare namespace root, no trailing slash', 'studios'],
    ['studio id with no trailing slash (could prefix-match a sibling studio)', 'studios/studio-1'],
    ['path traversal', 'studios/studio-1/../studio-2/'],
    ['leading slash', '/studios/studio-1/'],
  ] as const

  for (const [label, prefix] of badPrefixes) {
    it(`rejects: ${label}`, async () => {
      await expect(deleteObjectsByPrefix(prefix)).rejects.toThrow()
      expect(sendMock).not.toHaveBeenCalled()
    })
  }
})

describe('Legitimate, server-built keys and prefixes pass validation unchanged', () => {
  it('a gallery asset key (buildMediaKey shape) is accepted', async () => {
    await expect(
      uploadObject('studios/studio-1/galleries/gallery-1/assets/media-1/original.jpg', Buffer.from('x'), 'image/jpeg')
    ).resolves.toBeUndefined()
    expect(sendMock).toHaveBeenCalledTimes(1)
  })

  it('a studio branding logo key is accepted', async () => {
    await expect(deleteObject('studios/studio-1/branding/logo-abc123.png')).resolves.toBeUndefined()
    expect(sendMock).toHaveBeenCalledTimes(1)
  })

  it('a product digital-file key is accepted', async () => {
    const url = await createPresignedUploadUrl('studios/studio-1/products/product-1/digital/file-1.pdf', 'application/pdf')
    expect(url).toBe('https://example.com/signed-url')
  })

  it('deleting one whole gallery is accepted (studio id + one more segment)', async () => {
    await expect(deleteObjectsByPrefix('studios/studio-1/galleries/gallery-1/')).resolves.toBeUndefined()
    expect(sendMock).toHaveBeenCalled()
  })

  it('deleting one whole studio is accepted (studio_id/ with nothing more) — the real deleteStudio use case', async () => {
    await expect(deleteObjectsByPrefix('studios/studio-1/')).resolves.toBeUndefined()
    expect(sendMock).toHaveBeenCalled()
  })
})
