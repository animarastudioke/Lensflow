import { Skeleton } from '@/components/ui/skeleton'

// Mirrors ClientGalleryContent's real layout (cover header, then a photo
// grid) so the swap from loading -> loaded doesn't shift anything -- a bare
// spinner here would otherwise flash before a page that's mostly a large
// photo grid, which is the one thing this loading state should not do.
export default function PublicGalleryLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[420px] md:h-[480px] w-full rounded-none" />
      <div className="flex items-center gap-4 px-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="grid gap-3 px-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
