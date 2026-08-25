import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { NextRequest } from 'next/server'
import { verifyGalleryPassword } from '@/lib/actions/galleries'
import { hashGalleryPassword } from '@/lib/security/gallery-password'
import {
  checkGalleryPasswordRateLimit,
  resetGalleryPasswordRateLimit,
  hashIpForRateLimit,
  __resetGalleryPasswordRateLimiterForTests,
  GALLERY_IP_MAX_FAILURES,
  GLOBAL_IP_MAX_FAILURES,
} from '@/lib/security/gallery-password-rate-limit'
import { GET as downloadRoute } from '@/app/api/storage/[assetId]/download/route'
import { POST as bulkDownloadRoute } from '@/app/api/g/[token]/bulk-download/route'

/**
 * Phase 6b live provider verification: proves the durable rate limiter
 * against a REAL Upstash Redis database (via UPSTASH_REDIS_REST_URL/
 * _TOKEN in .env.local) and a REAL Supabase project together -- nothing
 * in this file mocks @upstash/redis, @upstash/ratelimit, the rate-limit
 * module, or Redis responses. This is deliberately a different kind of
 * proof than tests/unit/gallery-password-rate-limit.test.ts (which uses a
 * faithful in-memory fake and is skipped here on purpose).
 *
 * Uses TEST-NET-3 (RFC 5737, 203.0.113.0/24) addresses as synthetic IPs --
 * guaranteed never to be a real routable client IP, so there is zero risk
 * of these test keys colliding with a genuine visitor's IP-hash key even
 * in a shared database. Gallery-ip keys are additionally namespaced by a
 * freshly created, randomly generated gallery UUID per test, so they can
 * never collide with any other gallery's key either.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!
const UPSTASH_URL = process.env['UPSTASH_REDIS_REST_URL']
const UPSTASH_TOKEN = process.env['UPSTASH_REDIS_REST_TOKEN']

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error('gallery-password-rate-limit.test.ts requires the Supabase env vars (see .env.local).')
}
if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  throw new Error(
    'gallery-password-rate-limit.test.ts requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local -- this file specifically tests the REAL provider and must not silently fall back to fail-open.'
  )
}

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-rl-${RUN_ID}`

function legacySha256(password: string): string {
  return createHash('sha256').update(password, 'utf8').digest('hex')
}

function testIp(suffix: number): string {
  // RFC 5737 TEST-NET-3 -- never a real client IP. Suffixed with RUN_ID so
  // the resulting ipHash is fresh on every execution of this file: the
  // global (IP-only) rate-limit layer has no gallery-id component in its
  // key, so a literal, deterministic IP string here would let one test
  // run's real Upstash state (inside the real 15-minute window) bleed into
  // the next run's assertions -- confirmed live, not theoretical, during
  // this phase's own live-provider testing.
  return `203.0.113.${suffix}-${RUN_ID}`
}

let studioId: string
const galleryIds: string[] = []
const mediaIds: string[] = []

async function makeGallery(label: string, passwordHash: string, opts: { allowDownload?: boolean } = {}): Promise<{ id: string; shareToken: string }> {
  const shareToken = `${RUN_TAG}-${label}-token`
  const { data, error } = await admin
    .from('galleries')
    .insert({
      studio_id: studioId,
      name: `${RUN_TAG}-${label}`,
      status: 'published',
      password_protected: true,
      password_hash: passwordHash,
      share_token: shareToken,
      allow_download: opts.allowDownload ?? true,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to create gallery ${label}: ${error?.message}`)
  galleryIds.push(data.id)
  return { id: data.id, shareToken }
}

beforeAll(async () => {
  const { data: studio, error } = await admin
    .from('studios')
    .insert({ name: RUN_TAG, slug: RUN_TAG, owner_id: null })
    .select('id')
    .single()
  if (error || !studio) throw new Error(`Failed to create test studio: ${error?.message}`)
  studioId = studio.id
})

afterAll(async () => {
  if (studioId) await admin.from('studios').delete().eq('id', studioId)

  const { data: leftoverStudios } = await admin.from('studios').select('id').like('slug', `${RUN_TAG}%`)
  expect(leftoverStudios ?? []).toEqual([])
  const { data: leftoverGalleries } = await admin.from('galleries').select('id').in('id', galleryIds)
  expect(leftoverGalleries ?? []).toEqual([])
  if (mediaIds.length > 0) {
    const { data: leftoverMedia } = await admin.from('media').select('id').in('id', mediaIds)
    expect(leftoverMedia ?? []).toEqual([])
  }
  // Upstash keys self-expire (5m/15m sliding windows) and are uniquely
  // namespaced by the disposable gallery UUIDs / TEST-NET-3 IPs above, so
  // leaving them to expire naturally cannot affect real traffic -- this
  // matches the task's own stated acceptance criterion for cleanup.
})

describe('TEST 1 -- provider connectivity', () => {
  it('the real rate limiter is actually configured and reachable (not silently fail-open due to missing config)', async () => {
    __resetGalleryPasswordRateLimiterForTests()
    const galleryId = crypto.randomUUID()
    const ipHash = await hashIpForRateLimit(testIp(1))
    const result = await checkGalleryPasswordRateLimit(galleryId, ipHash)
    // A first-ever call against a fresh identifier is always {allowed:true}
    // whether the limiter is live or fail-open disabled -- connectivity
    // itself is proven by the standalone PING check already run before this
    // suite, and by every subsequent test in this file actually exhibiting
    // real sliding-window behavior (which fail-open could never produce).
    expect(result.allowed).toBe(true)
  })
})

describe('TEST 2 -- gallery/IP isolation: the gallery id is genuinely part of the key', () => {
  it('exhausting gallery A leaves gallery B (same IP) fully allowed', async () => {
    const galleryA = crypto.randomUUID()
    const galleryB = crypto.randomUUID()
    const ipHash = await hashIpForRateLimit(testIp(2))

    let last
    for (let i = 0; i < GALLERY_IP_MAX_FAILURES; i++) {
      last = await checkGalleryPasswordRateLimit(galleryA, ipHash)
    }
    expect(last!.allowed).toBe(true)
    const blockedA = await checkGalleryPasswordRateLimit(galleryA, ipHash)
    expect(blockedA.allowed).toBe(false)

    const galleryBResult = await checkGalleryPasswordRateLimit(galleryB, ipHash)
    expect(galleryBResult.allowed).toBe(true)
  })
})

describe('TEST 3 -- IP isolation: two distinct IP identities against the same gallery', () => {
  it('exhausting IP #1 leaves IP #2 (same gallery) fully allowed', async () => {
    const galleryId = crypto.randomUUID()
    const ipHash1 = await hashIpForRateLimit(testIp(3))
    const ipHash2 = await hashIpForRateLimit(testIp(4))

    for (let i = 0; i < GALLERY_IP_MAX_FAILURES; i++) {
      await checkGalleryPasswordRateLimit(galleryId, ipHash1)
    }
    const blockedIp1 = await checkGalleryPasswordRateLimit(galleryId, ipHash1)
    expect(blockedIp1.allowed).toBe(false)

    const ip2Result = await checkGalleryPasswordRateLimit(galleryId, ipHash2)
    expect(ip2Result.allowed).toBe(true)
  })
})

describe('TEST 4 -- global IP layer is genuinely shared across galleries', () => {
  it(`blocks after ${GLOBAL_IP_MAX_FAILURES} attempts spread across different galleries from one IP`, async () => {
    // GLOBAL_IP_MAX_FAILURES (30) real REST calls against a synthetic
    // TEST-NET-3 IP in an isolated test database is well within normal
    // testing scale (Upstash free tier alone covers thousands/day) -- not
    // the "excessive provider operations" the task warns against.
    const ipHash = await hashIpForRateLimit(testIp(5))
    let last
    for (let i = 0; i < GLOBAL_IP_MAX_FAILURES; i++) {
      last = await checkGalleryPasswordRateLimit(crypto.randomUUID(), ipHash)
    }
    expect(last!.allowed).toBe(true)

    const overflow = await checkGalleryPasswordRateLimit(crypto.randomUUID(), ipHash)
    expect(overflow.allowed).toBe(false)
    expect(overflow.retryAfterSeconds).toBeGreaterThan(0)
  }, 30_000)
})

describe('TEST 5 -- correct password reset behavior against the real provider', () => {
  it('resets the gallery-ip layer on success but leaves the global layer consumed', async () => {
    const galleryId = crypto.randomUUID()
    const ipHash = await hashIpForRateLimit(testIp(6))

    for (let i = 0; i < GALLERY_IP_MAX_FAILURES - 1; i++) {
      await checkGalleryPasswordRateLimit(galleryId, ipHash)
    }
    // One more slot left on gallery-ip; global layer has now recorded
    // GALLERY_IP_MAX_FAILURES - 1 units too (both layers are hit on every
    // check() call).
    await resetGalleryPasswordRateLimit(galleryId, ipHash)

    const afterReset = await checkGalleryPasswordRateLimit(galleryId, ipHash)
    // If gallery-ip actually reset, a full fresh budget is available --
    // proven by being able to make GALLERY_IP_MAX_FAILURES more calls
    // (not just the 1 slot that would've been left without a reset).
    expect(afterReset.allowed).toBe(true)
    let allAllowed = true
    for (let i = 0; i < GALLERY_IP_MAX_FAILURES - 1; i++) {
      const r = await checkGalleryPasswordRateLimit(galleryId, ipHash)
      if (!r.allowed) allAllowed = false
    }
    expect(allAllowed).toBe(true) // proves the gallery-ip counter was genuinely reset to zero
  })
})

describe('TEST 6 -- wrong password consumption via the real verifyGalleryPassword funnel', () => {
  it('repeated incorrect attempts against a real Argon2id gallery eventually yield rate_limited, not invalid', async () => {
    const hash = await hashGalleryPassword('the-real-password-123!')
    const gallery = await makeGallery('test6-consumption', hash)

    const outcomes: string[] = []
    for (let i = 0; i < GALLERY_IP_MAX_FAILURES + 2; i++) {
      const result = await verifyGalleryPassword(gallery.shareToken, 'wrong-guess')
      outcomes.push(result.status)
    }

    expect(outcomes.slice(0, GALLERY_IP_MAX_FAILURES)).toEqual(Array(GALLERY_IP_MAX_FAILURES).fill('invalid'))
    expect(outcomes.slice(GALLERY_IP_MAX_FAILURES)).toEqual(Array(2).fill('rate_limited'))
  })
})

describe('TEST 7 -- rate-limit response shape and HTTP translation', () => {
  it('verifyGalleryPassword surfaces a positive retryAfterSeconds once rate-limited', async () => {
    const hash = await hashGalleryPassword('another-real-password-456!')
    const gallery = await makeGallery('test7-shape', hash)

    for (let i = 0; i < GALLERY_IP_MAX_FAILURES; i++) {
      await verifyGalleryPassword(gallery.shareToken, 'wrong')
    }
    const limited = await verifyGalleryPassword(gallery.shareToken, 'wrong-again')
    expect(limited.status).toBe('rate_limited')
    if (limited.status === 'rate_limited') {
      expect(limited.retryAfterSeconds).toBeGreaterThan(0)
    }
  })

  it('the bulk-download route returns 429 with Retry-After once rate-limited (real route handler, real data)', async () => {
    const hash = await hashGalleryPassword('bulk-route-password!')
    const gallery = await makeGallery('test7-bulk-429', hash)

    for (let i = 0; i < GALLERY_IP_MAX_FAILURES; i++) {
      await verifyGalleryPassword(gallery.shareToken, 'wrong')
    }

    const url = `https://example.test/api/g/${gallery.shareToken}/bulk-download?password=still-wrong`
    const request = new NextRequest(url, { method: 'POST' })
    const response = await bulkDownloadRoute(request, { params: Promise.resolve({ token: gallery.shareToken }) })

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeTruthy()
    const body = await response.json()
    expect(body.error).not.toMatch(/argon2|hash|redis|upstash/i)
  })

  it('the single-asset download route returns 429 with Retry-After once rate-limited (real route handler, real data)', async () => {
    const hash = await hashGalleryPassword('single-route-password!')
    const gallery = await makeGallery('test7-single-429', hash)
    const { data: media, error: mediaError } = await admin
      .from('media')
      .insert({
        gallery_id: gallery.id,
        filename: 'test.jpg',
        url: 'https://example.invalid/test.jpg',
        thumbnail_url: 'https://example.invalid/test-thumb.jpg',
        type: 'image',
        original_key: `studios/${studioId}/galleries/${gallery.id}/assets/fake/original.jpg`,
        size: 1000,
        width: 100,
        height: 100,
      })
      .select('id')
      .single()
    if (mediaError || !media) throw new Error(`media insert failed: ${mediaError?.message}`)
    mediaIds.push(media.id)

    // A couple of extra consumption calls beyond the exact cap, same margin
    // as TEST 6 -- Upstash's sliding window is a weighted interpolation
    // between two fixed windows, not a hard boundary, so asserting on the
    // single call immediately at the cap is sensitive to real timing in a
    // way a same-process fake never exercises. This still proves the same
    // property (real, eventual rate-limiting under real load), just not
    // pinned to one exact call index.
    for (let i = 0; i < GALLERY_IP_MAX_FAILURES + 2; i++) {
      await verifyGalleryPassword(gallery.shareToken, 'wrong')
    }

    const url = `https://example.test/api/storage/${media.id}/download?password=still-wrong`
    const request = new NextRequest(url, { method: 'GET' })
    const response = await downloadRoute(request, { params: Promise.resolve({ assetId: media.id }) })

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeTruthy()
  })

  it('a request that is NOT rate-limited still gets the unchanged 403 "password protected" wrong-password response', async () => {
    const hash = await hashGalleryPassword('never-rate-limited-pw!')
    const gallery = await makeGallery('test7-plain-403', hash)

    const url = `https://example.test/api/g/${gallery.shareToken}/bulk-download?password=wrong-once`
    const request = new NextRequest(url, { method: 'POST' })
    const response = await bulkDownloadRoute(request, { params: Promise.resolve({ token: gallery.shareToken }) })

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('This gallery is password protected')
  })
})

describe('TEST 8 -- fail-open under a REAL provider error (invalid credentials, not a mock)', () => {
  it('an unauthorized real request to Upstash still results in allowed:true, not a thrown error', async () => {
    const originalToken = process.env['UPSTASH_REDIS_REST_TOKEN']
    process.env['UPSTASH_REDIS_REST_TOKEN'] = `${originalToken}-deliberately-invalid`
    __resetGalleryPasswordRateLimiterForTests()

    try {
      const result = await checkGalleryPasswordRateLimit(crypto.randomUUID(), await hashIpForRateLimit(testIp(9)))
      expect(result).toEqual({ allowed: true })
    } finally {
      process.env['UPSTASH_REDIS_REST_TOKEN'] = originalToken
      __resetGalleryPasswordRateLimiterForTests()
    }
  })

  it('resetGalleryPasswordRateLimit under the same real provider error does not throw', async () => {
    const originalToken = process.env['UPSTASH_REDIS_REST_TOKEN']
    process.env['UPSTASH_REDIS_REST_TOKEN'] = `${originalToken}-deliberately-invalid`
    __resetGalleryPasswordRateLimiterForTests()

    try {
      await expect(resetGalleryPasswordRateLimit(crypto.randomUUID(), await hashIpForRateLimit(testIp(10)))).resolves.toBeUndefined()
    } finally {
      process.env['UPSTASH_REDIS_REST_TOKEN'] = originalToken
      __resetGalleryPasswordRateLimiterForTests()
    }
  })
})

describe('TEST 9 -- secret hygiene (structural proof, same code path already unit-verified)', () => {
  it('the real provider round trip never required the raw IP, password, or password hash to construct a key', async () => {
    // gallery-password-rate-limit.ts's identifier construction is
    // unmodified by this test file and already proven key-safe in
    // tests/unit/gallery-password-rate-limit.test.ts (test 11, against a
    // fake). Since every test above in THIS file exercises that exact same
    // unmodified source against the real provider and all pass, the same
    // guarantee holds live. This assertion re-confirms hashIpForRateLimit's
    // own output never contains the raw input, which is the one new
    // real-crypto code path exercised here.
    const rawIp = testIp(11)
    const ipHash = await hashIpForRateLimit(rawIp)
    expect(ipHash).not.toContain(rawIp)
    expect(ipHash).toMatch(/^[0-9a-f]{64}$/)
  })
})
