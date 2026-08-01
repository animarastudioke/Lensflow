'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Mail, Clock, Shield, ArrowRight } from 'lucide-react'

export default function ConfirmedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </div>
            <CardTitle className="text-display-sm">Account created!</CardTitle>
            <CardDescription className="text-lg">
              Your LensFlow account has been successfully created.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <Mail className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium">Check your email</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    We've sent a verification email to your inbox. Click the link in the email to verify your account.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-warning/5 rounded-xl border border-warning/10">
                <Clock className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium">Link expires in 1 hour</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    The verification link is valid for 1 hour. If it expires, you can request a new one.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl border border-border">
                <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium">Didn't receive the email?</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Check your spam or promotions folder. If you still don't see it, you can request a new verification email.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Link href="/auth/login">
                <Button className="w-full" size="lg">
                  <span className="flex items-center justify-center gap-2">
                    Sign in to your account
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Button>
              </Link>

              <p className="text-sm text-muted-foreground text-center">
                Need to resend the email?{' '}
                <Link href="/auth/login" className="text-primary font-medium hover:underline">
                  Sign in and request a new one
                </Link>
              </p>
            </div>

            {/* What's next section */}
            <div className="pt-4 border-t border-border space-y-4">
              <h4 className="font-medium text-center">What's next?</h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2 text-primary">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-xs font-medium">Galleries</p>
                  <p className="text-xs text-muted-foreground">Deliver photos beautifully</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2 text-primary">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-xs font-medium">Clients</p>
                  <p className="text-xs text-muted-foreground">Manage relationships</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2 text-primary">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-xs font-medium">Bookings</p>
                  <p className="text-xs text-muted-foreground">Schedule sessions easily</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}