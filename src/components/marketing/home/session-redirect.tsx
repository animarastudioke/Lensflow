'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

/**
 * OAuth sign-in redirects here instead of /auth/callback whenever
 * Supabase's Site URL is used as a fallback (e.g. the callback URL isn't
 * yet on the project's redirect allow-list). When that happens, the
 * session tokens land in the URL hash (e.g. `#access_token=...`).
 *
 * This can't rely on the Supabase browser client's own automatic hash
 * detection (getSession()/onAuthStateChange picking it up on mount): our
 * client is created via @supabase/ssr's createBrowserClient, which hardcodes
 * flowType: 'pkce'. GoTrue's _getSessionFromURL() rejects an implicit-style
 * `#access_token=` hash outright with AuthPKCEGrantCodeExchangeError
 * ("Not a valid PKCE flow url.") whenever flowType is 'pkce' — regardless of
 * what's actually in the URL — so the automatic detection silently no-ops
 * and the visitor is left signed out on this page with a dead hash. Pulling
 * the tokens out of the hash and calling setSession() directly establishes
 * the session from the token pair itself, bypassing that flow-type check.
 *
 * A plain cold visit to `/` has no such hash, which is the overwhelming
 * majority of homepage traffic — so this only creates a Supabase client
 * and does this work when the hash actually looks like a post-OAuth token
 * payload, rather than on every anonymous page view.
 */
export function HomeSessionRedirect() {
  const router = useRouter()

  React.useEffect(() => {
    if (!/access_token=/.test(window.location.hash)) return

    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    if (!accessToken || !refreshToken) return

    let cancelled = false

    import('@/lib/supabase/client').then(async ({ createBrowserClient }) => {
      if (cancelled) return
      const supabase = createBrowserClient()

      const { data: { session } } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (cancelled) return

      // Drop the tokens from the URL whether or not this succeeded, so a
      // refresh or copy-pasted link never re-processes a stale/used hash.
      window.history.replaceState(null, '', window.location.pathname + window.location.search)

      if (session) router.replace('/dashboard')
    })

    return () => {
      cancelled = true
    }
  }, [router])

  return null
}
