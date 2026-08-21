import { cn } from '@/lib/utils'

export type CoverTemplate = 'novel' | 'vintage' | 'frame' | 'stripe' | 'divider' | 'journal' | 'stamp' | 'outline'

export type HeadingFont = 'default' | 'playfair' | 'cormorant' | 'archivo' | 'bodoni'

// 'default' keeps the pre-existing font-display (Spectral) class so galleries
// that never touch the typography tab render identically to before it shipped.
const HEADING_FONT_CLASS: Record<HeadingFont, string> = {
  default: 'font-display',
  playfair: 'font-heading-playfair',
  cormorant: 'font-heading-cormorant',
  archivo: 'font-sans',
  bodoni: 'font-heading-bodoni',
}

export function headingFontClass(font: HeadingFont | undefined): string {
  return HEADING_FONT_CLASS[font ?? 'default']
}

export const HEADING_FONT_OPTIONS: { value: HeadingFont; label: string; description: string }[] = [
  { value: 'default', label: 'Spectral', description: 'Warm editorial serif (default)' },
  { value: 'playfair', label: 'Playfair Display', description: 'Classic high-contrast serif' },
  { value: 'cormorant', label: 'Cormorant Garamond', description: 'Light, elegant serif' },
  { value: 'archivo', label: 'Archivo', description: 'Clean modern sans' },
  { value: 'bodoni', label: 'Bodoni Moda', description: 'Bold fashion-editorial serif' },
]

export interface GalleryCoverPreviewData {
  name: string
  description?: string
  clientName?: string
  dateLabel?: string
  coverImageUrl?: string
  secondaryImageUrl?: string
  logoUrl?: string
  brandName: string
  brandColor: string
  headingFont?: HeadingFont
}

interface GalleryCoverPreviewProps {
  template: CoverTemplate
  data: GalleryCoverPreviewData
  className?: string
}

function Logo({ data, dark = false }: { data: GalleryCoverPreviewData; dark?: boolean }) {
  if (data.logoUrl) {
    return <img src={data.logoUrl} alt={data.brandName} className="h-7 w-auto" />
  }
  return (
    <div
      className={cn(
        'h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold',
        dark ? 'bg-white/20 text-white' : 'text-white'
      )}
      style={dark ? undefined : { backgroundColor: data.brandColor }}
    >
      {data.brandName.charAt(0) || 'L'}
    </div>
  )
}

function ViewButton({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-[11px] font-semibold tracking-wide uppercase px-4 py-2 rounded-full',
        dark ? 'bg-white text-black' : 'bg-foreground text-background'
      )}
    >
      View Gallery
    </span>
  )
}

function CoverImage({ src, className }: { src?: string; className?: string }) {
  if (!src) {
    return <div className={cn('bg-muted', className)} />
  }
  return <img src={src} alt="" className={cn('object-cover', className)} />
}

export function GalleryCoverPreview({ template, data, className }: GalleryCoverPreviewProps) {
  const dateLine = [data.dateLabel, data.clientName].filter(Boolean).join(' · ')

  if (template === 'novel') {
    return (
      <div className={cn('relative w-full h-full flex overflow-hidden bg-background', className)}>
        <CoverImage src={data.coverImageUrl} className="h-full w-[45%] shrink-0" />
        <div className="flex-1 flex flex-col justify-center px-6 md:px-10 py-6">
          <Logo data={data} />
          {dateLine && (
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-6">{dateLine}</p>
          )}
          <h1 className={cn(headingFontClass(data.headingFont), 'font-semibold text-2xl md:text-4xl text-foreground mt-2 leading-tight')}>
            {data.name}
          </h1>
          {data.description && (
            <p className="text-sm text-muted-foreground mt-3 max-w-xs line-clamp-3">{data.description}</p>
          )}
          <div className="mt-6">
            <ViewButton />
          </div>
        </div>
      </div>
    )
  }

  if (template === 'vintage') {
    return (
      <div className={cn('relative w-full h-full overflow-hidden', className)}>
        <CoverImage src={data.coverImageUrl} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-4 left-4 md:top-6 md:left-6">
          <Logo data={data} dark />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-center">
          <div className="h-px w-16 bg-white/70 mx-auto mb-3" />
          <h1 className={cn(headingFontClass(data.headingFont), 'text-lg md:text-2xl tracking-[0.25em] uppercase text-white')}>
            {data.name}
          </h1>
          {dateLine && <p className="text-[11px] text-white/70 mt-2 tracking-widest">{dateLine}</p>}
          <div className="h-px w-16 bg-white/70 mx-auto mt-3" />
        </div>
      </div>
    )
  }

  if (template === 'frame') {
    return (
      <div className={cn('relative w-full h-full flex flex-col bg-background p-4 md:p-6', className)}>
        <div className="flex-1 min-h-0 overflow-hidden rounded-sm">
          <CoverImage src={data.coverImageUrl} className="h-full w-full" />
        </div>
        <div className="flex items-center justify-between pt-4">
          <div>
            <h1 className={cn(headingFontClass(data.headingFont), 'font-semibold text-lg md:text-2xl text-foreground')}>{data.name}</h1>
            {dateLine && <p className="text-xs text-muted-foreground mt-1">{dateLine}</p>}
          </div>
          <Logo data={data} />
        </div>
      </div>
    )
  }

  if (template === 'stripe') {
    return (
      <div className={cn('relative w-full h-full overflow-hidden', className)}>
        <CoverImage src={data.coverImageUrl} className="absolute inset-0 h-full w-full" />
        <div
          className="absolute left-0 right-0 bottom-[18%] py-3 md:py-4 px-6 md:px-8 flex items-center justify-between"
          style={{ backgroundColor: data.brandColor }}
        >
          <h1 className={cn(headingFontClass(data.headingFont), 'font-semibold text-base md:text-2xl text-white truncate')}>{data.name}</h1>
          {dateLine && <p className="text-[11px] md:text-xs text-white/80 shrink-0 ml-3">{dateLine}</p>}
        </div>
      </div>
    )
  }

  if (template === 'divider') {
    return (
      <div className={cn('relative w-full h-full flex overflow-hidden', className)}>
        <CoverImage src={data.coverImageUrl} className="h-full w-1/2" />
        <CoverImage src={data.secondaryImageUrl || data.coverImageUrl} className="h-full w-1/2" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-background/95 backdrop-blur px-5 py-3 md:px-8 md:py-4 rounded-sm text-center shadow-sm">
            <h1 className={cn(headingFontClass(data.headingFont), 'font-semibold text-base md:text-2xl text-foreground')}>{data.name}</h1>
            {dateLine && <p className="text-[11px] text-muted-foreground mt-1">{dateLine}</p>}
          </div>
        </div>
      </div>
    )
  }

  if (template === 'journal') {
    return (
      <div className={cn('relative w-full h-full flex overflow-hidden bg-background', className)}>
        <CoverImage src={data.coverImageUrl} className="h-full w-1/2 md:w-[55%]" />
        <div className="flex-1 flex flex-col justify-between p-5 md:p-8">
          <div className="flex justify-start">
            <Logo data={data} />
          </div>
          <div className="text-right">
            {dateLine && (
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{dateLine}</p>
            )}
            <h1 className={cn(headingFontClass(data.headingFont), 'font-bold text-xl md:text-3xl text-foreground leading-tight')}>
              {data.name}
            </h1>
            <div className="mt-4 flex justify-end">
              <ViewButton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (template === 'stamp') {
    return (
      <div className={cn('relative w-full h-full flex items-center justify-center bg-muted/40 p-6 md:p-10 gap-6 md:gap-10', className)}>
        <div className="shrink-0 rounded-sm border-4 border-background shadow-md rotate-[-3deg] overflow-hidden h-[70%] aspect-square">
          <CoverImage src={data.coverImageUrl} className="h-full w-full" />
        </div>
        <div className="min-w-0">
          <Logo data={data} />
          <h1 className={cn(headingFontClass(data.headingFont), 'font-semibold text-lg md:text-3xl text-foreground mt-3 leading-tight')}>
            {data.name}
          </h1>
          {dateLine && <p className="text-xs text-muted-foreground mt-2">{dateLine}</p>}
        </div>
      </div>
    )
  }

  // outline
  return (
    <div className={cn('relative w-full h-full overflow-hidden', className)}>
      <CoverImage src={data.coverImageUrl} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 flex items-center justify-center p-8 md:p-12">
        <div className="border border-white/80 text-center px-6 py-8 md:px-10 md:py-12 max-w-md">
          <h1 className={cn(headingFontClass(data.headingFont), 'font-semibold text-lg md:text-2xl text-white tracking-wide')}>
            {data.name}
          </h1>
          {dateLine && <p className="text-[11px] text-white/80 mt-3 tracking-widest uppercase">{dateLine}</p>}
        </div>
      </div>
    </div>
  )
}

export const COVER_TEMPLATE_OPTIONS: { value: CoverTemplate; label: string; description: string }[] = [
  { value: 'novel', label: 'Novel', description: 'Split cover with a text-forward panel' },
  { value: 'vintage', label: 'Vintage', description: 'Full-bleed photo, letterspaced title' },
  { value: 'frame', label: 'Frame', description: 'Framed photo with title below' },
  { value: 'stripe', label: 'Stripe', description: 'Bold color band across the photo' },
  { value: 'divider', label: 'Divider', description: 'Two photos split by the title' },
  { value: 'journal', label: 'Journal', description: 'Editorial split with right-aligned text' },
  { value: 'stamp', label: 'Stamp', description: 'Small framed photo beside the title' },
  { value: 'outline', label: 'Outline', description: 'Full photo with an outlined title box' },
]
