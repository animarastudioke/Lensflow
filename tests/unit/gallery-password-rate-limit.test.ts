import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Unit coverage for the durable gallery-password rate limiter
 * (src/lib/security/gallery-password-rate-limit.ts). @upstash/redis and
 * @upstash/ratelimit are mocked with a faithful in-memory sliding-window
 * implementation -- this proves the module's OWN orchestration (order of
 * operations, key/identifier hygiene, fail-open policy, reset semantics),
 * not Upstash's own atomicity guarantee (that's Upstash's tested contract,
 * not this codebase's to re-prove). No live Redis is used or required.
 */

interface FakeLimiterOpts {
  redis: unknown
  limiter: { tokens: number; windowMs: number }
  prefix: string
}

const store = new Map<string, number[]>()
let shouldThrowOnLimit = false
let shouldThrowOnReset = false
const limitCalls: { prefix: string; identifier: string }[] = []
const resetCalls: { prefix: string; identifier: string }[] = []

function parseWindow(window: string): number {
  const [amountStr, unit] = window.split(' ')
  const amount = Number(amountStr)
  const unitMs = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : unit === 'd' ? 86_400_000 : 1000
  return amount * unitMs
}

class FakeRatelimit {
  private opts: FakeLimiterOpts
  constructor(opts: { redis: unknown; limiter: { tokens: number; window: string }; prefix: string }) {
    this.opts = { redis: opts.redis, limiter: { tokens: opts.limiter.tokens, windowMs: parseWindow(opts.limiter.window) }, prefix: opts.prefix }
  }
  static slidingWindow(tokens: number, window: string) {
    return { tokens, window }
  }
  async limit(identifier: string) {
    limitCalls.push({ prefix: this.opts.prefix, identifier })
    if (shouldThrowOnLimit) {
      // Mirrors the REAL @upstash/redis/@upstash/ratelimit failure shape
      // confirmed during Phase 6b live provider verification: a rejected
      // command's Error.message embeds the full failed Redis command,
      // including this exact identifier (gallery id + IP hash). A naive
      // fake that just threw a short synthetic string (as this one
      // originally did) can never catch a logging leak of that content --
      // this reproduces the real shape so the leak-fix test below is a
      // genuine regression guard, not one that trivially passes regardless.
      throw new Error(`WRONGPASS invalid or missing auth token. command was: [["evalsha","abc123",3,"${this.opts.prefix}:${identifier}:5958908","${this.opts.prefix}:${identifier}:5958907","",5,1787672400844,300000,1]]`)
    }
    const key = `${this.opts.prefix}::${identifier}`
    const now = Date.now()
    const windowMs = this.opts.limiter.windowMs
    const kept = (store.get(key) ?? []).filter((t) => t > now - windowMs)
    kept.push(now)
    store.set(key, kept)
    const success = kept.length <= this.opts.limiter.tokens
    return { success, reset: now + windowMs, limit: this.opts.limiter.tokens, remaining: Math.max(0, this.opts.limiter.tokens - kept.length) }
  }
  async resetUsedTokens(identifier: string) {
    resetCalls.push({ prefix: this.opts.prefix, identifier })
    if (shouldThrowOnReset) {
      throw new Error(`WRONGPASS invalid or missing auth token. command was: [["evalsha","def456",1,"${this.opts.prefix}:${identifier}:*","null"]]`)
    }
    store.delete(`${this.opts.prefix}::${identifier}`)
  }
}

vi.mock('@upstash/redis', () => ({ Redis: vi.fn().mockImplementation(() => ({})) }))
vi.mock('@upstash/ratelimit', () => ({ Ratelimit: FakeRatelimit }))

describe('gallery-password-rate-limit', () => {
  beforeEach(() => {
    vi.resetModules()
    store.clear()
    limitCalls.length = 0
    resetCalls.length = 0
    shouldThrowOnLimit = false
    shouldThrowOnReset = false
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake-upstash.example.com')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('1. first attempt is allowed', async () => {
    const { checkGalleryPasswordRateLimit } = await import('@/lib/security/gallery-password-rate-limit')
    const result = await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    expect(result.allowed).toBe(true)
  })

  it('2. a failed attempt leaves the consumed unit in place (no automatic reset)', async () => {
    const { checkGalleryPasswordRateLimit } = await import('@/lib/security/gallery-password-rate-limit')
    await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    const second = await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    expect(second.allowed).toBe(true) // still under the 5-failure cap
    // internal store still holds both consumed units -- proven indirectly by test 3 reaching the cap after 5 total calls
  })

  it('3. gallery-ip limit is reached after GALLERY_IP_MAX_FAILURES consecutive attempts', async () => {
    const { checkGalleryPasswordRateLimit, GALLERY_IP_MAX_FAILURES } = await import('@/lib/security/gallery-password-rate-limit')
    let last
    for (let i = 0; i < GALLERY_IP_MAX_FAILURES; i++) {
      last = await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
      expect(last.allowed).toBe(true)
    }
    expect(last!.allowed).toBe(true)
  })

  it('4. the request immediately after the cap is rejected before any further work', async () => {
    const { checkGalleryPasswordRateLimit, GALLERY_IP_MAX_FAILURES } = await import('@/lib/security/gallery-password-rate-limit')
    for (let i = 0; i < GALLERY_IP_MAX_FAILURES; i++) {
      await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    }
    const blocked = await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('5. a successful verification resets the gallery-ip layer for that gallery+IP', async () => {
    const { checkGalleryPasswordRateLimit, resetGalleryPasswordRateLimit, GALLERY_IP_MAX_FAILURES } = await import('@/lib/security/gallery-password-rate-limit')
    for (let i = 0; i < GALLERY_IP_MAX_FAILURES; i++) {
      await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    }
    await resetGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    const afterReset = await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    expect(afterReset.allowed).toBe(true)
  })

  it('5b. reset does NOT touch the global per-IP layer', async () => {
    const { checkGalleryPasswordRateLimit, resetGalleryPasswordRateLimit } = await import('@/lib/security/gallery-password-rate-limit')
    await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    await resetGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    expect(resetCalls).toHaveLength(1)
    expect(resetCalls[0]!.prefix).toContain('gallery-ip')
    expect(resetCalls.some((c) => c.prefix.endsWith(':ip'))).toBe(false)
  })

  it('6. different galleries under the same IP have independent gallery-ip limits', async () => {
    const { checkGalleryPasswordRateLimit, GALLERY_IP_MAX_FAILURES } = await import('@/lib/security/gallery-password-rate-limit')
    for (let i = 0; i < GALLERY_IP_MAX_FAILURES; i++) {
      await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    }
    const blockedA = await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    const galleryB = await checkGalleryPasswordRateLimit('gallery-b', 'iphash-1')
    expect(blockedA.allowed).toBe(false)
    expect(galleryB.allowed).toBe(true)
  })

  it('7. different IPs against the same gallery have independent gallery-ip limits', async () => {
    const { checkGalleryPasswordRateLimit, GALLERY_IP_MAX_FAILURES } = await import('@/lib/security/gallery-password-rate-limit')
    for (let i = 0; i < GALLERY_IP_MAX_FAILURES; i++) {
      await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    }
    const blockedIp1 = await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    const ip2 = await checkGalleryPasswordRateLimit('gallery-a', 'iphash-2')
    expect(blockedIp1.allowed).toBe(false)
    expect(ip2.allowed).toBe(true)
  })

  it('8. global per-IP layer blocks after GLOBAL_IP_MAX_FAILURES spread across many different galleries', async () => {
    const { checkGalleryPasswordRateLimit, GLOBAL_IP_MAX_FAILURES } = await import('@/lib/security/gallery-password-rate-limit')
    let last
    for (let i = 0; i < GLOBAL_IP_MAX_FAILURES; i++) {
      last = await checkGalleryPasswordRateLimit(`gallery-${i}`, 'iphash-1')
      expect(last.allowed).toBe(true)
    }
    const blocked = await checkGalleryPasswordRateLimit('gallery-overflow', 'iphash-1')
    expect(blocked.allowed).toBe(false)
  })

  it('9. sliding window expiry: a blocked identifier is allowed again once the window elapses', async () => {
    vi.useFakeTimers()
    const { checkGalleryPasswordRateLimit, GALLERY_IP_MAX_FAILURES } = await import('@/lib/security/gallery-password-rate-limit')
    for (let i = 0; i < GALLERY_IP_MAX_FAILURES; i++) {
      await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    }
    const blocked = await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    expect(blocked.allowed).toBe(false)

    vi.advanceTimersByTime(5 * 60 * 1000 + 1000) // past the 5-minute window

    const afterWindow = await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    expect(afterWindow.allowed).toBe(true)
  })

  it('10. concurrent attempts at the boundary cannot collectively exceed the configured max', async () => {
    const { checkGalleryPasswordRateLimit, GALLERY_IP_MAX_FAILURES } = await import('@/lib/security/gallery-password-rate-limit')
    const results = await Promise.all(
      Array.from({ length: GALLERY_IP_MAX_FAILURES + 10 }, () => checkGalleryPasswordRateLimit('gallery-concurrent', 'iphash-1'))
    )
    const allowedCount = results.filter((r) => r.allowed).length
    expect(allowedCount).toBe(GALLERY_IP_MAX_FAILURES)
  })

  it('11. the identifier passed to the provider never contains the raw IP, password, or password hash', async () => {
    const { checkGalleryPasswordRateLimit, hashIpForRateLimit } = await import('@/lib/security/gallery-password-rate-limit')
    const rawIp = '203.0.113.42'
    const ipHash = await hashIpForRateLimit(rawIp)
    await checkGalleryPasswordRateLimit('gallery-a', ipHash)

    for (const call of limitCalls) {
      expect(call.identifier).not.toContain(rawIp)
      expect(call.identifier).not.toContain('correct horse battery staple')
      expect(call.identifier).not.toMatch(/^\$argon2/)
    }
    expect(limitCalls.some((c) => c.identifier.includes(ipHash))).toBe(true)
  })

  it('13. a malformed/null IP hash still fails safe -- gallery-ip layer still applies, keyed on "unknown"', async () => {
    const { checkGalleryPasswordRateLimit, GALLERY_IP_MAX_FAILURES } = await import('@/lib/security/gallery-password-rate-limit')
    let last
    for (let i = 0; i < GALLERY_IP_MAX_FAILURES; i++) {
      last = await checkGalleryPasswordRateLimit('gallery-a', null)
      expect(last.allowed).toBe(true)
    }
    const blocked = await checkGalleryPasswordRateLimit('gallery-a', null)
    expect(blocked.allowed).toBe(false)
    // Global layer never invoked when there's no IP to attribute it to.
    expect(limitCalls.some((c) => c.prefix.endsWith(':ip'))).toBe(false)
  })

  it('14a. provider throwing on limit() fails open -- request is allowed, error is not surfaced to the caller', async () => {
    shouldThrowOnLimit = true
    const { checkGalleryPasswordRateLimit } = await import('@/lib/security/gallery-password-rate-limit')
    const result = await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    expect(result).toEqual({ allowed: true })
  })

  it('14b. provider throwing on resetUsedTokens() is non-fatal and does not throw', async () => {
    shouldThrowOnReset = true
    const { resetGalleryPasswordRateLimit } = await import('@/lib/security/gallery-password-rate-limit')
    await expect(resetGalleryPasswordRateLimit('gallery-a', 'iphash-1')).resolves.toBeUndefined()
  })

  it('14d. a provider error on check() never logs the caught error -- only a fixed generic diagnostic (regression guard for the Phase 6b live-provider leak)', async () => {
    shouldThrowOnLimit = true
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { checkGalleryPasswordRateLimit } = await import('@/lib/security/gallery-password-rate-limit')
      const galleryId = 'gallery-secret-42'
      const ipHash = 'iphash-secret-99'
      await checkGalleryPasswordRateLimit(galleryId, ipHash)

      expect(spy).toHaveBeenCalled()
      const loggedText = spy.mock.calls.map((args) => args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')).join('\n')
      // The identifiers this specific call used must never appear -- proves
      // the fix, not just that logging happened at all.
      expect(loggedText).not.toContain(galleryId)
      expect(loggedText).not.toContain(ipHash)
      expect(loggedText).not.toMatch(/evalsha|WRONGPASS|command was/i)
      expect(loggedText).toContain('failing open')
    } finally {
      spy.mockRestore()
    }
  })

  it('14e. a provider error on reset() never logs the caught error -- only a fixed generic diagnostic (regression guard for the Phase 6b live-provider leak)', async () => {
    shouldThrowOnReset = true
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { resetGalleryPasswordRateLimit } = await import('@/lib/security/gallery-password-rate-limit')
      const galleryId = 'gallery-secret-43'
      const ipHash = 'iphash-secret-100'
      await resetGalleryPasswordRateLimit(galleryId, ipHash)

      expect(spy).toHaveBeenCalled()
      const loggedText = spy.mock.calls.map((args) => args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')).join('\n')
      expect(loggedText).not.toContain(galleryId)
      expect(loggedText).not.toContain(ipHash)
      expect(loggedText).not.toMatch(/evalsha|WRONGPASS|command was/i)
      expect(loggedText).toContain('failing open')
    } finally {
      spy.mockRestore()
    }
  })

  it('14c. no Upstash env vars configured at all fails open without ever constructing a client', async () => {
    vi.unstubAllEnvs()
    const { checkGalleryPasswordRateLimit } = await import('@/lib/security/gallery-password-rate-limit')
    const result = await checkGalleryPasswordRateLimit('gallery-a', 'iphash-1')
    expect(result).toEqual({ allowed: true })
    expect(limitCalls).toHaveLength(0)
  })

  it('hashIpForRateLimit never returns the raw input and is deterministic', async () => {
    const { hashIpForRateLimit } = await import('@/lib/security/gallery-password-rate-limit')
    const a = await hashIpForRateLimit('198.51.100.7')
    const b = await hashIpForRateLimit('198.51.100.7')
    const c = await hashIpForRateLimit('198.51.100.8')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).not.toContain('198.51.100.7')
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })
})
