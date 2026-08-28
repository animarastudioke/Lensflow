'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { createBrowserClient } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth/AuthShell'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

const passwordRequirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function ResetPasswordPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [password, setPassword] = React.useState('')
  const [isValidToken, setIsValidToken] = React.useState(true)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const watchedPassword = watch('password')
  React.useEffect(() => {
    setPassword(watchedPassword ?? '')
  }, [watchedPassword])

  // Validate token on mount
  React.useEffect(() => {
    const accessToken = searchParams.get('access_token')
    const type = searchParams.get('type')

    // Check if we have a valid recovery token
    if (!accessToken || type !== 'recovery') {
      // Try to get session anyway - Supabase might have already processed the token
      const supabase = createBrowserClient()
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setIsValidToken(false)
        }
      })
    }
  }, [searchParams])

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!isValidToken) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createBrowserClient()

      // First, try to verify the session exists
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // Try to get session from the URL fragment (Supabase uses fragment for tokens)
        // This is handled by the callback page, but we'll try to refresh
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          throw new Error('Invalid or expired reset link. Please request a new one.')
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (updateError) {
        const safeMessage = getAuthErrorMessage(updateError.message)
        setError(safeMessage)
        toast.error(safeMessage)
        return
      }

      toast.success('Password updated successfully!')
      router.push('/auth/login?reset=success' as string)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isValidToken) {
    return (
      <AuthShell>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-display-sm">Invalid reset link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The reset link may have already been used or expired. Reset links are valid for 1 hour.
              </AlertDescription>
            </Alert>
            <Link href="/auth/forgot-password" className="block text-center text-primary hover:underline">
              Request a new reset link
            </Link>
          </CardContent>
        </Card>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-display-sm">Reset your password</CardTitle>
            <CardDescription>
              Enter a new password below. Make sure it's different from your previous passwords.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-destructive/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    {...register('password')}
                    disabled={isLoading}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    aria-describedby="password-requirements"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive" role="alert">{errors.password.message}</p>
                )}
                <div id="password-requirements" className="space-y-1" role="list" aria-label="Password requirements">
                  {passwordRequirements.map((req) => (
                    <div key={req.label} className="flex items-center gap-2 text-xs">
                      {req.test(password) ? (
                        <CheckCircle className="h-3.5 w-3.5 text-success flex-shrink-0" />
                      ) : (
                        <span className="h-3.5 w-3.5 rounded-full border border-border flex-shrink-0" />
                      )}
                      <span className={cn(req.test(password) ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10"
                    {...register('confirmPassword')}
                    disabled={isLoading}
                    aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive" role="alert">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading} loading={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              <Link href="/auth/login" className="text-primary font-medium hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardFooter>
      </Card>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ResetPasswordPageContent />
    </React.Suspense>
  )
}