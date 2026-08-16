import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Best-effort request fingerprint - never stores the raw IP/user-agent, only a hash. */
async function getRequestSignals(): Promise<{ ipHash: string | null; userAgentHash: string | null }> {
  try {
    const hdrs = headers()
    const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip')
    const userAgent = hdrs.get('user-agent')
    return {
      ipHash: ip ? await sha256Hex(ip) : null,
      userAgentHash: userAgent ? await sha256Hex(userAgent) : null,
    }
  } catch {
    return { ipHash: null, userAgentHash: null }
  }
}

const VELOCITY_WINDOW_24H_MS = 24 * 60 * 60 * 1000
const VELOCITY_WINDOW_7D_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Conservative, additive risk score for a free-workspace creation - never a
 * hard block on its own (per spec: "do not automatically block based on a
 * single signal"). Combines several weak signals so a single shared IP
 * (school, office, coworking space, mobile carrier NAT) doesn't get
 * flagged by itself; only genuine velocity across several of them adds up.
 * The score is recorded for review, not enforced here - see spawn_task
 * note in the PR description for a follow-up admin view / soft-block if
 * the business wants to act on it later.
 */
export async function recordFreeWorkspaceSignupRisk(params: {
  userId: string
  studioId: string
  userCreatedAt: string
}): Promise<{ score: number; flags: string[] }> {
  const { ipHash, userAgentHash } = await getRequestSignals()
  const flags: string[] = []
  let score = 0

  if (ipHash) {
    const now = Date.now()
    const { data: recentByIp } = await supabaseAdmin
      .from('signup_risk_signals')
      .select('created_at')
      .eq('ip_hash', ipHash)
      .gte('created_at', new Date(now - VELOCITY_WINDOW_7D_MS).toISOString())

    const count24h = (recentByIp ?? []).filter(
      (r) => now - new Date(r.created_at).getTime() <= VELOCITY_WINDOW_24H_MS
    ).length
    const count7d = recentByIp?.length ?? 0

    // Thresholds intentionally generous - a handful of signups from one
    // network is normal (shared Wi-Fi, a school, an office); only sustained
    // velocity contributes meaningfully to the score.
    if (count24h >= 3) {
      score += 2
      flags.push(`ip_velocity_24h:${count24h}`)
    }
    if (count7d >= 6) {
      score += 2
      flags.push(`ip_velocity_7d:${count7d}`)
    }
  }

  const accountAgeMs = Date.now() - new Date(params.userCreatedAt).getTime()
  if (accountAgeMs >= 0 && accountAgeMs < 5 * 60 * 1000) {
    score += 1
    flags.push('rapid_signup_to_workspace')
  }

  await supabaseAdmin.from('signup_risk_signals').insert({
    user_id: params.userId,
    studio_id: params.studioId,
    ip_hash: ipHash,
    user_agent_hash: userAgentHash,
    risk_score: score,
    risk_flags: flags,
  })

  if (score >= 4) {
    console.warn(`[signup-risk] Elevated free-workspace signup risk (score=${score}) for studio ${params.studioId}:`, flags)
  }

  return { score, flags }
}
