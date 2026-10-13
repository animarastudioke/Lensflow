import { Skeleton } from '@/components/ui/skeleton'

// Mirrors ClientGalleryContent's real layout (nav, split hero, filter row, then
// a masonry-style photo field) in the same scoped dark theme, so the swap from
// loading -> loaded doesn't flash light or shift anything. A bare spinner here
// would otherwise flash before a page that is mostly large photography.
const TILE_ASPECTS = ['aspect-[4/5]', 'aspect-[3/2]', 'aspect-[3/4]', 'aspect-square', 'aspect-[4/5]', 'aspect-[3/2]']

export default function PublicGalleryLoading() {
  return (
    <div className="gallery-viewer min-h-screen" aria-busy="true" aria-label="Loading gallery">
      <div className="h-16 border-b border-border" />
      <div className="mx-auto grid max-w-[1600px] border-b border-border lg:grid-cols-12">
        <Skeleton className="order-1 aspect-[4/3] w-full rounded-none sm:aspect-[16/10] lg:order-2 lg:col-span-7 lg:aspect-auto lg:min-h-[560px]" />
        <div className="order-2 space-y-4 px-5 py-10 sm:px-8 lg:order-1 lg:col-span-5 lg:px-12 lg:py-20">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-14 w-4/5" />
          <Skeleton className="h-14 w-2/5" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="mx-auto flex max-w-[1600px] gap-2 px-4 py-6 sm:px-6 lg:px-10">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="mx-auto max-w-[1600px] columns-2 gap-3 px-4 sm:px-6 lg:columns-3 lg:gap-4 lg:px-10 2xl:columns-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className={`${TILE_ASPECTS[i % TILE_ASPECTS.length]} mb-3 w-full break-inside-avoid lg:mb-4`} />
        ))}
      </div>
    </div>
  )
}
