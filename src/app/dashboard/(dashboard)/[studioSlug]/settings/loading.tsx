import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-2 border-b border-border pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-md" />
        ))}
      </div>
      <div className="space-y-4">
        <div className="border border-border rounded-md p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        </div>
        <div className="border border-border rounded-md p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}
