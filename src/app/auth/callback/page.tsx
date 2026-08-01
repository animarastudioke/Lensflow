'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, AlertCircle, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { createBrowserClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = React.useState('')
  const [redirectTo, setRedirectTo] = React.useState('/dashboard')

  React.useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createBrowserClient()

      // Get redirect URL from search params
      const redirect = searchParams.get('redirect')
      if (redirect) {
        setRedirectTo(decodeURIComponent(redirect))
      }

      // Check for error parameters
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      const errorCode = searchParams.get('error_code')

      if (error) {
        setStatus('error')
        setMessage(errorDescription || error)
        toast.error(errorDescription || error)
        return
      }

      // Check if we have a session already (from fragment)
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
          setMessage(exchangeError.message)
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
  }, [searchParams, router, redirectTo])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
        <Card className="shadow-xl max-w-md w-full">
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
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
        <Card className="shadow-xl max-w-md w-full">
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
      </div>
    )
  }

  // Success state
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="shadow-xl max-w-md w-full">
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
    </div>
  )
}