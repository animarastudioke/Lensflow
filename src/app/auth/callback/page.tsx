'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createBrowserClient } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth/AuthShell'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'

function AuthCallbackPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = React.useState('')
  const redirectTo = (searchParams.get('redirect') || '/dashboard') as string

  React.useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createBrowserClient()

      // Get redirect URL from search params
      const redirect = searchParams.get('redirect')
      if (redirect) {
        // redirectTo is already set from searchParams
      }

      // Check for error parameters. error/error_description come straight
      // from the redirect URL -- untrusted, not something Supabase signs --
      // so they're translated through the same allowlist as every other
      // auth error rather than rendered verbatim.
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (error) {
        const safeMessage = getAuthErrorMessage(errorDescription || error)
        setStatus('error')
        setMessage(safeMessage)
        toast.error(safeMessage)
        return
      }

      // Magic links, signup confirmation, email-change confirmation, and
      // password recovery all deliver their tokens as an implicit-grant URL
      // hash (`#access_token=...&refresh_token=...`) -- Supabase can't do a
      // PKCE code exchange for these since the link may be opened in a
      // different browser/session than the one that requested it. Our
      // client (createBrowserClient from @supabase/ssr) hardcodes
      // flowType: 'pkce', which makes the SDK's own automatic hash
      // detection (what a plain getSession() call would rely on picking up
      // on mount) throw internally and silently report no session for any
      // hash-based callback -- so that hash has to be parsed and applied
      // via setSession() directly, same as HomeSessionRedirect does for the
      // homepage-fallback case.
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      const hashAccessToken = hashParams.get('access_token')
      const hashRefreshToken = hashParams.get('refresh_token')

      if (hashAccessToken && hashRefreshToken) {
        const { data: { session: hashSession }, error: setSessionError } = await supabase.auth.setSession({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken,
        })

        // Drop the tokens from the URL regardless of outcome so a refresh
        // or copy-pasted link never re-processes a stale/used hash.
        window.history.replaceState(null, '', window.location.pathname + window.location.search)

        if (setSessionError) {
          setStatus('error')
          setMessage(getAuthErrorMessage(setSessionError.message))
          toast.error('Authentication failed. Please try again.')
          return
        }

        if (hashSession) {
          setStatus('success')
          setMessage('Successfully signed in!')
          toast.success('Welcome back!')

          setTimeout(() => {
            router.push(redirectTo)
            router.refresh()
          }, 1000)
          return
        }
      }

      // Check if we have a session already (covers a plain revisit of this
      // page while already signed in)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        setStatus('error')
        setMessage('Failed to get session')
        toast.error('Authentication failed. Please try again.')
        return
      }

      if (session) {
        // We have a valid session, redirect to dashboard
        setStatus('success')
        setMessage('Successfully signed in!')
        toast.success('Welcome back!')

        // Small delay to show success message
        setTimeout(() => {
          router.push(redirectTo)
          router.refresh()
        }, 1000)
        return
      }

      // Try to exchange code for session (for PKCE flow)
      const code = searchParams.get('code')
      const type = searchParams.get('type')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          setStatus('error')
          setMessage(getAuthErrorMessage(exchangeError.message))
          toast.error('Authentication failed. Please try again.')
          return
        }

        // After successful exchange, get the session
        const { data: { session: newSession } } = await supabase.auth.getSession()

        if (newSession) {
          setStatus('success')
          setMessage('Successfully signed in!')
          toast.success('Welcome back!')

          setTimeout(() => {
            router.push(redirectTo)
            router.refresh()
          }, 1000)
          return
        }
      }

      // For magic links / email verification
      if (type === 'signup' || type === 'email_change' || type === 'recovery') {
        // Supabase handles these via the fragment automatically
        // Just wait a bit and check again
        await new Promise(resolve => setTimeout(resolve, 2000))

        const { data: { session: lateSession } } = await supabase.auth.getSession()

        if (lateSession) {
          setStatus('success')
          setMessage('Successfully verified!')
          toast.success('Email verified successfully!')

          setTimeout(() => {
            router.push(redirectTo)
            router.refresh()
          }, 1000)
          return
        }

        setStatus('success')
        setMessage(`Check your email to complete the ${type === 'signup' ? 'signup' : 'verification'} process.`)
        toast.info(`Please check your email to complete the ${type === 'signup' ? 'signup' : 'verification'} process.`)
        return
      }

      // If we get here, try one more time to get session
      await new Promise(resolve => setTimeout(resolve, 1000))
      const { data: { session: finalSession } } = await supabase.auth.getSession()

      if (finalSession) {
        setStatus('success')
        setMessage('Successfully signed in!')
        toast.success('Welcome back!')

        setTimeout(() => {
          router.push(redirectTo)
          router.refresh()
        }, 1000)
        return
      }

      // If still no session, show error
      setStatus('error')
      setMessage('Authentication timed out. Please try signing in again.')
      toast.error('Authentication timed out. Please try signing in again.')
    }

    handleAuthCallback()
  }, [searchParams, router])

  if (status === 'loading') {
    return (
      <AuthShell>
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
            <CardTitle className="text-display-sm">Completing sign in...</CardTitle>
            <CardDescription>Please wait while we verify your authentication.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>If this takes too long, you can:</p>
              <Link href="/auth/login" className="text-primary hover:underline block">
                Return to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </AuthShell>
    )
  }

  if (status === 'error') {
    return (
      <AuthShell>
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-display-sm">Authentication failed</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/auth/login" className="block">
              <Button className="w-full">Try signing in again</Button>
            </Link>
            <p className="text-sm text-muted-foreground text-center">
              Or{' '}
              <Link href="/auth/forgot-password" className="text-primary hover:underline">
                reset your password
              </Link>
            </p>
          </CardContent>
        </Card>
      </AuthShell>
    )
  }

  // Success state
  return (
    <AuthShell>
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
          </div>
          <CardTitle className="text-display-sm">Signed in successfully!</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <Button onClick={() => { router.push(redirectTo); router.refresh(); }}>
              Continue to dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  )
}

export default function AuthCallbackPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AuthCallbackPageContent />
    </React.Suspense>
  )
}