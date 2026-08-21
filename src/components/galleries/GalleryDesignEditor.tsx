'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Image as ImageIcon, Type, Palette, LayoutGrid, ExternalLink, Check } from 'lucide-react'
import { toast } from 'sonner'
import { updateGalleryCoverTemplate, updateGalleryCoverImage, updateGalleryHeadingFont } from '@/lib/actions/galleries'
import {
  GalleryCoverPreview,
  COVER_TEMPLATE_OPTIONS,
  HEADING_FONT_OPTIONS,
  headingFontClass,
  type CoverTemplate,
  type HeadingFont,
  type GalleryCoverPreviewData,
} from '@/components/galleries/GalleryCoverPreview'

interface GalleryMediaOption {
  id: string
  url: string
  thumbnailUrl: string
}

interface GalleryDesignEditorProps {
  studioSlug: string
  galleryId: string
  galleryName: string
  galleryStatus: string
  shareToken: string
  initialTemplate: CoverTemplate
  initialHeadingFont: HeadingFont
  initialCoverImageUrl?: string
  media: GalleryMediaOption[]
  previewData: GalleryCoverPreviewData
}

function TemplateThumbnail({ template }: { template: CoverTemplate }) {
  const photo = 'bg-muted-foreground/25 rounded-[2px]'
  const text = 'bg-foreground/50 rounded-full'

  if (template === 'novel') {
    return (
      <div className="flex h-full w-full gap-1 p-1.5">
        <div className={cn(photo, 'w-2/5 h-full')} />
        <div className="flex-1 flex flex-col justify-center gap-1">
          <div className={cn(text, 'h-1.5 w-3/4')} />
          <div className={cn(text, 'h-1 w-1/2 opacity-60')} />
        </div>
      </div>
    )
  }
  if (template === 'vintage') {
    return (
      <div className="relative h-full w-full p-1.5">
        <div className={cn(photo, 'h-full w-full')} />
        <div className={cn(text, 'absolute bottom-3 left-1/2 -translate-x-1/2 h-1.5 w-1/3')} />
      </div>
    )
  }
  if (template === 'frame') {
    return (
      <div className="flex h-full w-full flex-col gap-1 p-1.5">
        <div className={cn(photo, 'flex-1 w-full')} />
        <div className={cn(text, 'h-1.5 w-1/2')} />
      </div>
    )
  }
  if (template === 'stripe') {
    return (
      <div className="relative h-full w-full p-1.5">
        <div className={cn(photo, 'h-full w-full')} />
        <div className="absolute left-1.5 right-1.5 bottom-4 h-2 bg-foreground/60" />
      </div>
    )
  }
  if (template === 'divider') {
    return (
      <div className="relative flex h-full w-full gap-0.5 p-1.5">
        <div className={cn(photo, 'w-1/2 h-full')} />
        <div className={cn(photo, 'w-1/2 h-full')} />
        <div className={cn(text, 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1/3 bg-background border border-foreground/30')} />
      </div>
    )
  }
  if (template === 'journal') {
    return (
      <div className="flex h-full w-full gap-1 p-1.5">
        <div className={cn(photo, 'w-1/2 h-full')} />
        <div className="flex-1 flex flex-col justify-end items-end gap-1">
          <div className={cn(text, 'h-1.5 w-3/4')} />
          <div className={cn(text, 'h-1 w-1/2 opacity-60')} />
        </div>
      </div>
    )
  }
  if (template === 'stamp') {
    return (
      <div className="flex h-full w-full items-center gap-2 p-1.5">
        <div className={cn(photo, 'h-3/4 aspect-square rotate-[-6deg]')} />
        <div className="flex-1 flex flex-col gap-1">
          <div className={cn(text, 'h-1.5 w-full')} />
          <div className={cn(text, 'h-1 w-2/3 opacity-60')} />
        </div>
      </div>
    )
  }
  // outline
  return (
    <div className="relative h-full w-full p-1.5">
      <div className={cn(photo, 'h-full w-full')} />
      <div className="absolute inset-3 border border-foreground/40 flex items-center justify-center">
        <div className={cn(text, 'h-1.5 w-2/3')} />
      </div>
    </div>
  )
}

const SOON_TABS = [
  { key: 'color', label: 'Color', icon: Palette },
  { key: 'grid', label: 'Grid', icon: LayoutGrid },
]

type EditorTab = 'cover' | 'typography'

export function GalleryDesignEditor({
  studioSlug,
  galleryId,
  galleryName,
  galleryStatus,
  shareToken,
  initialTemplate,
  initialHeadingFont,
  initialCoverImageUrl,
  media,
  previewData,
}: GalleryDesignEditorProps) {
  const [tab, setTab] = React.useState<EditorTab>('cover')
  const [template, setTemplate] = React.useState<CoverTemplate>(initialTemplate)
  const [headingFont, setHeadingFont] = React.useState<HeadingFont>(initialHeadingFont)
  const [coverImageUrl, setCoverImageUrl] = React.useState<string | undefined>(initialCoverImageUrl)
  const [isSaving, setIsSaving] = React.useState(false)

  const galleryHref = `/dashboard/${studioSlug}/galleries/${galleryId}`

  const handleSelect = async (next: CoverTemplate) => {
    if (next === template) return
    const previous = template
    setTemplate(next)
    setIsSaving(true)

    const result = await updateGalleryCoverTemplate(galleryId, studioSlug, next)

    setIsSaving(false)
    if ('error' in result) {
      setTemplate(previous)
      toast.error(result.error)
    }
  }

  const handleSelectCoverImage = async (next: GalleryMediaOption) => {
    if (next.url === coverImageUrl) return
    const previous = coverImageUrl
    setCoverImageUrl(next.url)
    setIsSaving(true)

    const result = await updateGalleryCoverImage(galleryId, studioSlug, next.url)

    setIsSaving(false)
    if ('error' in result) {
      setCoverImageUrl(previous)
      toast.error(result.error)
    }
  }

  const handleSelectHeadingFont = async (next: HeadingFont) => {
    if (next === headingFont) return
    const previous = headingFont
    setHeadingFont(next)
    setIsSaving(true)

    const result = await updateGalleryHeadingFont(galleryId, studioSlug, next)

    setIsSaving(false)
    if ('error' in result) {
      setHeadingFont(previous)
      toast.error(result.error)
    }
  }

  const livePreviewData: GalleryCoverPreviewData = {
    ...previewData,
    coverImageUrl: coverImageUrl ?? previewData.coverImageUrl,
    headingFont,
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 sm:-m-6 lg:-m-8">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-border overflow-y-auto">
        <div className="p-4 border-b border-border">
          <Link
            href={galleryHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {galleryName}
          </Link>
        </div>
        <div className="p-2">
          <button
            type="button"
            onClick={() => setTab('cover')}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
              tab === 'cover' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ImageIcon className="h-4 w-4" />
            Cover
          </button>
          <button
            type="button"
            onClick={() => setTab('typography')}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
              tab === 'typography' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Type className="h-4 w-4" />
            Typography
          </button>
          {SOON_TABS.map((soonTab) => (
            <button
              key={soonTab.key}
              disabled
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground/50 cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <soonTab.icon className="h-4 w-4" />
                {soonTab.label}
              </span>
              <span className="text-[10px] uppercase tracking-wide border border-border rounded px-1.5 py-0.5">Soon</span>
            </button>
          ))}
        </div>

        {tab === 'cover' && (
          <>
            {media.length > 0 && (
              <>
                <div className="px-4 py-3">
                  <p className="label-caption text-muted-foreground">Cover photo</p>
                </div>
                <div className="grid grid-cols-4 gap-2 px-4 pb-4">
                  {media.map((item) => {
                    const selected = item.url === coverImageUrl
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectCoverImage(item)}
                        className={cn(
                          'relative aspect-square rounded-md overflow-hidden border transition-colors',
                          selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/50'
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        {selected && (
                          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <div className="px-4 py-3">
              <p className="label-caption text-muted-foreground">Cover design</p>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 pb-6">
              {COVER_TEMPLATE_OPTIONS.map((option) => {
                const selected = template === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      'text-left rounded-lg border overflow-hidden transition-colors',
                      selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="aspect-[4/3] bg-muted/50">
                      <TemplateThumbnail template={option.value} />
                    </div>
                    <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                      <span className="text-xs font-medium truncate">{option.label}</span>
                      {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {tab === 'typography' && (
          <>
            <div className="px-4 py-3">
              <p className="label-caption text-muted-foreground">Heading font</p>
            </div>
            <div className="flex flex-col gap-2 px-4 pb-6">
              {HEADING_FONT_OPTIONS.map((option) => {
                const selected = headingFont === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelectHeadingFont(option.value)}
                    className={cn(
                      'text-left rounded-lg border px-3 py-2.5 transition-colors',
                      selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(headingFontClass(option.value), 'text-lg leading-none')}>Aa</span>
                      {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </div>
                    <p className="text-xs font-medium mt-1.5">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Preview panel */}
      <div className="flex-1 flex flex-col bg-muted/30 min-w-0">
        <div className="flex items-center justify-between gap-4 p-4 border-b border-border bg-background">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-display font-semibold text-lg truncate">{galleryName}</h1>
            <Badge variant="outline" className="uppercase text-[10px] tracking-wide shrink-0">
              {galleryStatus}
            </Badge>
            {isSaving && <span className="text-xs text-muted-foreground shrink-0">Saving...</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <a href={`/g/${shareToken}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                View public gallery
              </a>
            </Button>
            <Button size="sm" asChild>
              <Link href={galleryHref}>Done</Link>
            </Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 md:p-10 overflow-auto">
          <div className="w-full max-w-3xl aspect-[16/10] rounded-lg overflow-hidden shadow-lg border border-border bg-background">
            <GalleryCoverPreview template={template} data={livePreviewData} />
          </div>
        </div>
      </div>
    </div>
  )
}
