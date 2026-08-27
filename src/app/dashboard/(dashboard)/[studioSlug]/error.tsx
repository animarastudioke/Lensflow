'use client'

import * as React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Next.js route-segment error boundary for the dashboard home page. No
 * error.tsx existed anywhere in the app before this -- this is the
 * framework's own built-in convention (the same mechanism loading.tsx
 * uses), not a new error-handling architecture. Never renders the raw
 * error message: Server Component data-fetching failures can carry
 * details (query text, internal identifiers) that shouldn't reach the
 * client.
 */
export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-border px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-heading-sm font-medium text-foreground">Your dashboard couldn&apos;t load</p>
        <p className="text-body-sm text-muted-foreground max-w-sm">
          Something went wrong while loading this page. Try again, and if the problem continues, refresh the page.
        </p>
      </div>
      <Button onClick={() => reset()} className="mt-1">
        Try again
      </Button>
    </div>
  )
}
