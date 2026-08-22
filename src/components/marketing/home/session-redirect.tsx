'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

/**
 * OAuth sign-in redirects here instead of /auth/callback whenever
 * Supabase's Site URL is used as a fallback (e.g. the callback URL isn't
 * yet on the project's redirect allow-list). When that happens, the
 * session tokens land in the URL hash (e.g. `#access_token=...`) — the
 * Supabase browser client will pick that up and establish a session on
 * mount, but nothing then navigates the now-signed-in visitor off the
 * marketing page, so this catches that case.
 *
 * A plain cold visit to `/` has no such hash, which is the overwhelming
 * majority of homepage traffic — so this only creates a Supabase client
 * and checks for a session when the hash actually looks like a post-OAuth
 * token payload, rather than doing that work (and subscribing to auth
 * state) on every anonymous page view.
 */
export function HomeSessionRedirect() {
  const router = useRouter()

  React.useEffect(() => {
    if (!/access_token=/.test(window.location.hash)) return

    let unsubscribe: (() => void) | undefined

    import('@/lib/supabase/client').then(({ createBrowserClient }) => {
      const supabase = createBrowserClient()

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) router.replace('/dashboard')
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) router.replace('/dashboard')
      })
      unsubscribe = () => subscription.unsubscribe()
    })

    return () => unsubscribe?.()
  }, [router])

  return null
}
