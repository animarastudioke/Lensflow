import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * Orchestration coverage for verifyGalleryPassword's rate-limit integration
 * (src/lib/actions/galleries.ts). The rate-limit module itself is fully
 * covered in isolation by tests/unit/gallery-password-rate-limit.test.ts --
 * this file instead proves the ORDER OF OPERATIONS contract inside
 * verifyGalleryPassword: rate limit is checked before Argon2id runs, a
 * rate-limited result skips Argon2id entirely, a successful verification
 * resets only the gallery-ip layer, and a non-password-protected gallery
 * never touches the rate limiter at all.
 *
 * Every transitive dependency of galleries.ts is mocked -- this file never
 * touches a database, R2, email, or sharp.
 */

const mockSingle = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })),
      update: mockUpdate,
    })),
  },
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Map()) }))
vi.mock('sharp', () => ({ default: vi.fn() }))
vi.mock('@/lib/entitlements', () => ({
  canCreateGallery: vi.fn(), getEffectivePlan: vi.fn(), getSubscriptionAccessState: vi.fn(),
  hasEntitlement: vi.fn(), reserveUploadQuota: vi.fn(), releaseUploadReservations: vi.fn(),
}))
vi.mock('@/lib/storage/r2', () => ({
  buildMediaKey: vi.fn(), createPresignedDownloadUrl: vi.fn(), createPresignedUploadUrl: vi.fn(),
  deleteObject: vi.fn(), deleteObjects: vi.fn(), deleteObjectsByPrefix: vi.fn(),
  downloadObject: vi.fn(), getR2PublicUrl: vi.fn(), headObject: vi.fn(), uploadObject: vi.fn(),
}))
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/email/templates', () => ({ galleryPublishedEmail: vi.fn() }))
vi.mock('@/lib/utils/concurrency', () => ({ mapWithConcurrency: vi.fn() }))

const mockVerifyGalleryPasswordHash = vi.fn()
const mockHashGalleryPassword = vi.fn(async () => 'new-argon2id-hash')
vi.mock('@/lib/security/gallery-password', () => ({
  hashGalleryPassword: (...args: unknown[]) => mockHashGalleryPassword(...args),
  verifyGalleryPasswordHash: (...args: unknown[]) => mockVerifyGalleryPasswordHash(...args),
}))

const mockCheckRateLimit = vi.fn()
const mockResetRateLimit = vi.fn()
const mockHashIp = vi.fn(async (ip: string) => `hashed(${ip})`)
vi.mock('@/lib/security/gallery-password-rate-limit', () => ({
  checkGalleryPasswordRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  resetGalleryPasswordRateLimit: (...args: unknown[]) => mockResetRateLimit(...args),
  hashIpForRateLimit: (...args: unknown[]) => mockHashIp(...args),
}))

describe('verifyGalleryPassword: rate-limit order of operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue({ allowed: true })
    mockUpdate.mockReturnValue({ eq: vi.fn(() => Promise.resolve({ error: null })) })
  })

  it('non-password-protected gallery: never calls the rate limiter or Argon2id at all', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'gallery-1', password_hash: null, password_protected: false } })
    const { verifyGalleryPassword } = await import('@/lib/actions/galleries')

    const result = await verifyGalleryPassword('token-1', 'anything')

    expect(result).toEqual({ status: 'valid' })
    expect(mockCheckRateLimit).not.toHaveBeenCalled()
    expect(mockVerifyGalleryPasswordHash).not.toHaveBeenCalled()
  })

  it('rate-limited: Argon2id (verifyGalleryPasswordHash) is never called', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'gallery-1', password_hash: 'somehash', password_protected: true } })
    mockCheckRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 42 })
    const { verifyGalleryPassword } = await import('@/lib/actions/galleries')

    const result = await verifyGalleryPassword('token-1', 'guess')

    expect(result).toEqual({ status: 'rate_limited', retryAfterSeconds: 42 })
    expect(mockVerifyGalleryPasswordHash).not.toHaveBeenCalled()
    expect(mockResetRateLimit).not.toHaveBeenCalled()
  })

  it('rate limit is checked BEFORE Argon2id when allowed (call order proven via a shared log)', async () => {
    const callOrder: string[] = []
    mockCheckRateLimit.mockImplementation(async () => {
      callOrder.push('rate-limit-check')
      return { allowed: true }
    })
    mockVerifyGalleryPasswordHash.mockImplementation(async () => {
      callOrder.push('argon2-verify')
      return { valid: true, needsRehash: false }
    })
    mockSingle.mockResolvedValue({ data: { id: 'gallery-1', password_hash: '$argon2id$...', password_protected: true } })
    const { verifyGalleryPassword } = await import('@/lib/actions/galleries')

    await verifyGalleryPassword('token-1', 'correct')

    expect(callOrder).toEqual(['rate-limit-check', 'argon2-verify'])
  })

  it('correct password: resets the gallery-ip rate limiter, scoped to the server-resolved gallery id', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'gallery-42', password_hash: '$argon2id$...', password_protected: true } })
    mockVerifyGalleryPasswordHash.mockResolvedValue({ valid: true, needsRehash: false })
    const { verifyGalleryPassword } = await import('@/lib/actions/galleries')

    const result = await verifyGalleryPassword('token-1', 'correct')

    expect(result).toEqual({ status: 'valid' })
    expect(mockResetRateLimit).toHaveBeenCalledTimes(1)
    expect(mockResetRateLimit.mock.calls[0]![0]).toBe('gallery-42')
  })

  it('wrong password: does NOT reset the rate limiter', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'gallery-1', password_hash: '$argon2id$...', password_protected: true } })
    mockVerifyGalleryPasswordHash.mockResolvedValue({ valid: false, needsRehash: false })
    const { verifyGalleryPassword } = await import('@/lib/actions/galleries')

    const result = await verifyGalleryPassword('token-1', 'wrong')

    expect(result).toEqual({ status: 'invalid' })
    expect(mockResetRateLimit).not.toHaveBeenCalled()
  })

  it('legacy-hash lazy rehash behavior is unchanged by the rate-limit integration', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'gallery-1', password_hash: 'aabbccdd'.repeat(8), password_protected: true } })
    mockVerifyGalleryPasswordHash.mockResolvedValue({ valid: true, needsRehash: true })
    const { verifyGalleryPassword } = await import('@/lib/actions/galleries')

    const result = await verifyGalleryPassword('token-1', 'correct-legacy-password')

    expect(result).toEqual({ status: 'valid' })
    expect(mockHashGalleryPassword).toHaveBeenCalledWith('correct-legacy-password')
    expect(mockUpdate).toHaveBeenCalledWith({ password_hash: 'new-argon2id-hash' })
  })
})
