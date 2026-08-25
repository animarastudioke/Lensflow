import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2'

/**
 * Gallery password hashing — Argon2id, with transparent verify-time upgrade
 * from the legacy unsalted SHA-256 scheme this replaces.
 *
 * Format is self-describing: @node-rs/argon2 produces the standard PHC
 * string ("$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>"), so a hash's
 * algorithm is always readable from the value itself — no separate
 * "algorithm version" column or flag is needed. The old scheme's output
 * (64 lowercase hex chars, no `$`) can never collide with that format,
 * so detecting which verifier to use is unambiguous.
 *
 * Parameters (memoryCost 19 MiB, timeCost 2, parallelism 1) are
 * @node-rs/argon2's own defaults, matching OWASP's second recommended
 * Argon2id configuration for password hashing — chosen deliberately over
 * hand-picked values so this stays a standard, reviewable configuration
 * rather than a one-off.
 */

const LEGACY_SHA256_HASH_RE = /^[0-9a-f]{64}$/i

export function isArgon2Hash(hash: string): boolean {
  return hash.startsWith('$argon2')
}

function isLegacySha256Hash(hash: string): boolean {
  return LEGACY_SHA256_HASH_RE.test(hash)
}

async function hashLegacySha256(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function verifyLegacySha256(password: string, hash: string): Promise<boolean> {
  const candidate = await hashLegacySha256(password)
  return candidate === hash
}

export async function hashGalleryPassword(password: string): Promise<string> {
  return argon2Hash(password)
}

export interface GalleryPasswordVerifyResult {
  valid: boolean
  /** True only when `valid` is also true — a legacy hash that just verified successfully. */
  needsRehash: boolean
}

/**
 * Verifies a password against a stored hash of either format. Never rehashes
 * on a failed verification, and never rehashes an already-Argon2id hash —
 * the caller (verifyGalleryPassword in galleries.ts) is responsible for
 * actually writing the upgraded hash, scoped to the exact row it just read.
 */
export async function verifyGalleryPasswordHash(password: string, hash: string): Promise<GalleryPasswordVerifyResult> {
  if (isArgon2Hash(hash)) {
    // argon2Verify throws (rather than returning false) on a malformed/
    // undecodable PHC string — treat that the same as "wrong password",
    // never as an error that propagates past this check.
    try {
      const valid = await argon2Verify(hash, password)
      return { valid, needsRehash: false }
    } catch (err) {
      console.error('Gallery password: malformed argon2 hash failed to decode:', err)
      return { valid: false, needsRehash: false }
    }
  }

  if (isLegacySha256Hash(hash)) {
    const valid = await verifyLegacySha256(password, hash)
    return { valid, needsRehash: valid }
  }

  // Unrecognized format — fail closed, never rehash.
  return { valid: false, needsRehash: false }
}
