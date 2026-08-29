import { Skeleton } from '@/components/ui/skeleton'

export default function InvoiceDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-40" />
        </div>
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="border border-border rounded-md p-6 space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}
