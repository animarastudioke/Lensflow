import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Durable, cross-instance rate limiting for gallery password verification.
 * Independent from gallery-password.ts (Argon2id hashing) on purpose — this
 * module only decides whether an attempt gets to run, never how a password
 * is hashed or verified.
 *
 * Two layers, both keyed off values that are never the raw IP, the
 * plaintext password, or the password hash:
 *   - gallery-ip: per-gallery + per-IP, the primary brute-force guard.
 *   - ip: per-IP global, a looser guard against one source spraying guesses
 *     across many galleries to dodge the gallery-ip layer.
 *
 * Both use Ratelimit.slidingWindow, whose .limit() call is a single atomic
 * Redis round trip (Lua script) -- there is no separate non-atomic
 * check-then-increment anywhere in this module.
 *
 * FAIL-OPEN: if UPSTASH_REDIS_REST_URL/_TOKEN aren't configured, or the
 * provider throws/times out, every check here reports "allowed" and logs a
 * safe (no IP/hash/password/credential) diagnostic. This trades temporary
 * loss of brute-force protection for availability -- a Redis outage must
 * never take down every password-protected public gallery. Argon2id
 * verification remains the actual security boundary regardless of whether
 * this module is enabled.
 */

const KEY_PREFIX = 'lensflow:security:gallery-password:v1'
const IP_HASH_DOMAIN = 'lensflow-gallery-password-rl-v1'

// Named constants, not magic numbers -- see the Phase design writeup for the
// brute-force/Argon2id-cost/shared-NAT reasoning behind each value.
export const GALLERY_IP_MAX_FAILURES = 5
export const GALLERY_IP_WINDOW = '5 m'
export const GLOBAL_IP_MAX_FAILURES = 30
export const GLOBAL_IP_WINDOW = '15 m'

let galleryIpLimiter: Ratelimit | null = null
let globalIpLimiter: Ratelimit | null = null
let configChecked = false

/** Lazily built once per process -- cheap to call repeatedly, never throws. */
function getLimiters(): { galleryIp: Ratelimit; globalIp: Ratelimit } | null {
  if (!configChecked) {
    configChecked = true
    const url = process.env['UPSTASH_REDIS_REST_URL']
    const token = process.env['UPSTASH_REDIS_REST_TOKEN']
    if (url && token) {
      try {
        const redis = new Redis({ url, token })
        galleryIpLimiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(GALLERY_IP_MAX_FAILURES, GALLERY_IP_WINDOW),
          prefix: `${KEY_PREFIX}:gallery-ip`,
        })
        globalIpLimiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(GLOBAL_IP_MAX_FAILURES, GLOBAL_IP_WINDOW),
          prefix: `${KEY_PREFIX}:ip`,
        })
      } catch {
        // Never log the caught error itself: a real (non-mocked) Upstash
        // client/command failure's message can embed the full failed Redis
        // command, including this module's own key names (gallery id, IP
        // hash) -- confirmed live during Phase 6b provider verification.
        // A fixed, generic diagnostic is deliberately all that's logged.
        console.error('Gallery password rate limiter: provider initialization error -- failing open (rate limiting disabled)')
        galleryIpLimiter = null
        globalIpLimiter = null
      }
    } else {
      console.warn('Gallery password rate limiter: UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not configured -- rate limiting is disabled (fail-open).')
    }
  }
  return galleryIpLimiter && globalIpLimiter ? { galleryIp: galleryIpLimiter, globalIp: globalIpLimiter } : null
}

/** Test-only escape hatch to force re-reading env/config between test cases. */
export function __resetGalleryPasswordRateLimiterForTests(): void {
  galleryIpLimiter = null
  globalIpLimiter = null
  configChecked = false
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Never stores or logs the raw IP -- only this hash ever reaches Redis or a key string. */
export async function hashIpForRateLimit(ip: string): Promise<string> {
  return sha256Hex(`${IP_HASH_DOMAIN}:${ip}`)
}

export interface GalleryPasswordRateLimitCheck {
  /** False if either layer is currently exceeded. */
  allowed: boolean
  /** Only meaningful when allowed is false. */
  retryAfterSeconds?: number
}

/**
 * Consumes one unit from both layers atomically (each layer's .limit() call
 * is itself atomic; this function is not a single joint transaction across
 * both, but each layer is individually race-free, which is what matters --
 * two layers momentarily disagreeing under concurrency only ever makes the
 * result MORE conservative, never less).
 *
 * Call this BEFORE running Argon2id. galleryId must be server-resolved
 * (verifyGalleryPassword's own DB lookup), never client-supplied.
 */
export async function checkGalleryPasswordRateLimit(galleryId: string, ipHash: string | null): Promise<GalleryPasswordRateLimitCheck> {
  const limiters = getLimiters()
  if (!limiters) return { allowed: true }

  try {
    // No IP could be attributed to this request (see hashIpForRateLimit's
    // caller) -- the global per-IP layer can't meaningfully run, but the
    // per-gallery layer still can, keyed on the gallery alone, so a
    // brute-force attempt still gets bounded even in this degenerate case.
    const galleryIpIdentifier = `${galleryId}:${ipHash ?? 'unknown'}`

    const [galleryIpResult, globalIpResult] = await Promise.all([
      limiters.galleryIp.limit(galleryIpIdentifier),
      ipHash ? limiters.globalIp.limit(ipHash) : Promise.resolve(null),
    ])

    const blocked = !galleryIpResult.success || (globalIpResult && !globalIpResult.success)
    if (!blocked) return { allowed: true }

    const soonestResetMs = Math.max(
      galleryIpResult.success ? 0 : galleryIpResult.reset,
      globalIpResult && !globalIpResult.success ? globalIpResult.reset : 0
    )
    const retryAfterSeconds = Math.max(1, Math.ceil((soonestResetMs - Date.now()) / 1000))
    return { allowed: false, retryAfterSeconds }
  } catch {
    // Never log the caught error itself -- see the comment in getLimiters().
    console.error('Gallery password rate limiter: provider error on check -- failing open')
    return { allowed: true }
  }
}

/**
 * Called after a SUCCESSFUL verification. Resets only the gallery-ip layer
 * for this specific gallery -- never the global per-IP layer. Resetting the
 * global layer here would let an attacker alternate "one correct guess on a
 * gallery I legitimately know" with "N guesses elsewhere" to perpetually
 * launder their global counter; the per-gallery layer resets so a
 * legitimate visitor who mistyped a couple of times isn't left sitting
 * near their limit after finally getting it right.
 */
export async function resetGalleryPasswordRateLimit(galleryId: string, ipHash: string | null): Promise<void> {
  const limiters = getLimiters()
  if (!limiters) return

  try {
    const galleryIpIdentifier = `${galleryId}:${ipHash ?? 'unknown'}`
    await limiters.galleryIp.resetUsedTokens(galleryIpIdentifier)
  } catch {
    // Best-effort -- a failed reset just means a legitimate user's budget
    // isn't refunded this time, not that their successful login fails.
    // Never log the caught error itself -- see the comment in getLimiters().
    console.error('Gallery password rate limiter: provider error on reset -- failing open (non-fatal)')
  }
}
