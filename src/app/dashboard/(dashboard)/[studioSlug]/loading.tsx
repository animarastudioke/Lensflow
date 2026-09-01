import { Skeleton } from '@/components/ui/skeleton'

/**
 * Mirrors the actual dashboard home layout (PageHeader, needs-attention
 * strip, stats plaque, quick actions + sidebar cards) rather than a
 * generic centered spinner, so the page doesn't blank-flash while its
 * several parallel queries resolve.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* PageHeader */}
      <div className="mb-6 space-y-3 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      {/* Needs attention strip */}
      <Skeleton className="h-12 w-full" />

      {/* Stats plaque */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border border border-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-5 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-5 w-28" />
          <div className="border-y border-border divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3.5">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="border border-border rounded-md p-4 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
