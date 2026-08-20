'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'

/**
 * OAuth sign-in redirects here instead of /auth/callback whenever Supabase's
 * Site URL is used as a fallback (e.g. the callback URL isn't yet on the
 * project's redirect allow-list). The Supabase client still picks the
 * session up from the URL hash on mount, but nothing then navigates the now
 * signed-in visitor off the marketing page — so this catches that case.
 */
export function HomeSessionRedirect() {
  const router = useRouter()

  React.useEffect(() => {
    const supabase = createBrowserClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return null
}
