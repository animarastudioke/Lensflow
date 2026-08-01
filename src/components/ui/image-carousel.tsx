import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageCarouselProps {
  images: Array<{
    src: string
    alt?: string
    width?: number
    height?: number
  }>
  selectedIndex?: number
  onSelect?: (index: number) => void
  showThumbnails?: boolean
  showArrows?: boolean
  aspectRatio?: '16/9' | '4/3' | '1/1' | 'auto'
  className?: string
}

export function ImageCarousel({
  images,
  selectedIndex = 0,
  onSelect,
  showThumbnails = true,
  showArrows = true,
  aspectRatio = '16/9',
  className,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(selectedIndex)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setCurrentIndex(selectedIndex)
  }, [selectedIndex])

  const aspectRatios = {
    '16/9': 'relative aspect-video',
    '4/3': 'relative aspect-[4/3]',
    '1/1': 'relative aspect-square',
    auto: 'relative',
  }

  const goToPrevious = () => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1
    setCurrentIndex(newIndex)
    onSelect?.(newIndex)
  }

  const goToNext = () => {
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1
    setCurrentIndex(newIndex)
    onSelect?.(newIndex)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious()
    if (e.key === 'ArrowRight') goToNext()
  }

  if (images.length === 0) {
    return (
      <div className={cn('bg-muted rounded-lg flex items-center justify-center min-h-[200px]', className)}>
        <p className="text-muted-foreground">No images</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg overflow-hidden', className)} onKeyDown={handleKeyDown} tabIndex={0}>
      <div className={cn(aspectRatios[aspectRatio], 'overflow-hidden bg-muted')}>
        {images.map((image, index) => (
          <div
            key={index}
            className={cn(
              'absolute inset-0 flex items-center justify-center transition-opacity duration-300',
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
            )}
          >
            <img
              src={image.src}
              alt={image.alt ?? `Image ${index + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ))}

        {showArrows && images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground shadow-lg',
                'hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={goToNext}
              className={cn(
                'absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground shadow-lg',
                'hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {showThumbnails && images.length > 1 && (
        <div className="flex items-center justify-center gap-2 p-4 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index)
                onSelect?.(index)
              }}
              className={cn(
                'relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all',
                index === currentIndex
                  ? 'border-primary ring-2 ring-primary ring-offset-2'
                  : 'border-transparent hover:border-border/50'
              )}
              aria-label={`View image ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            >
              <img
                src={image.src}
                alt={image.alt ?? `Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}