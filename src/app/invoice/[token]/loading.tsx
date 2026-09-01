import { Skeleton } from '@/components/ui/skeleton'

// Mirrors the real page layout (a single centered billing-document card) so
// the loading -> loaded swap doesn't shift anything.
export default function PublicInvoiceLoading() {
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="bg-background border border-border rounded-lg shadow-sm p-6 sm:p-10 space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    </div>
  )
}
