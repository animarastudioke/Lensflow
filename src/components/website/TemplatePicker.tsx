'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WebsiteRenderer } from '@/components/website/WebsiteRenderer'
import {
  SERVICES,
  rankTemplatesForService,
  type ServiceId,
  type WebsiteTemplate,
} from '@/lib/website/templates'
import type { WebsiteGalleryOption, WebsiteSection } from '@/lib/website/types'

// Neutral grey blocks stand in for photographs so a template is judged on its
// layout and type, and no photo of a person or remote asset is ever fetched.
// A fixed all-zero v4-shaped id satisfies the section schema's galleryId check.
const PLACEHOLDER_GALLERY_ID = '00000000-0000-4000-8000-000000000000'
const PLACEHOLDER_GREYS = ['#d6d3d1', '#a8a29e', '#e7e5e4', '#78716c', '#c4c0bc', '#57534e']
const placeholderGallery: WebsiteGalleryOption = {
  id: PLACEHOLDER_GALLERY_ID,
  name: 'Placeholder',
  images: PLACEHOLDER_GREYS.map((fill) => ({
    src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50"><rect width="40" height="50" fill="${fill}"/></svg>`)}`,
    alt: '',
  })),
}
const PREVIEW_NAME = 'Your Studio'

// The renderer's md: breakpoints follow the viewport, not this box, so the
// miniature is laid out at the width of the viewport class it is shown in
// (desktop layout on md+, the real phone layout below) and scaled to fit.
function useDesignWidth(): number {
  const [width, setWidth] = React.useState(1200)
  React.useEffect(() => {
    // matchMedia is absent in some test environments and very old browsers;
    // the desktop layout is a fine fallback there.
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(min-width: 768px)')
    const update = () => setWidth(query.matches ? 1200 : 420)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return width
}

function TemplatePreview({ template }: { template: WebsiteTemplate }) {
  const frameRef = React.useRef<HTMLDivElement>(null)
  const [frameWidth, setFrameWidth] = React.useState(0)
  const designWidth = useDesignWidth()

  React.useEffect(() => {
    const frame = frameRef.current
    if (!frame || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setFrameWidth(entry.contentRect.width)
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  const pages = React.useMemo(() => template.starterPages(PREVIEW_NAME), [template])
  const home = pages[0]
  const sections: WebsiteSection[] = React.useMemo(
    () => (home?.sections ?? []).map((section) =>
      section.type === 'hero' || section.type === 'gallery'
        ? { ...section, galleryId: PLACEHOLDER_GALLERY_ID }
        : section),
    [home]
  )
  const scale = frameWidth > 0 ? frameWidth / designWidth : 0

  return (
    <div ref={frameRef} className="relative aspect-[4/3] w-full overflow-hidden border-b border-border bg-muted" aria-hidden="true">
      <div
        inert
        className="pointer-events-none absolute left-0 top-0 select-none [&>div]:min-h-0"
        style={{ width: designWidth, transform: `scale(${scale})`, transformOrigin: 'top left', visibility: scale === 0 ? 'hidden' : 'visible' }}
      >
        <WebsiteRenderer
          studioName={PREVIEW_NAME}
          websiteName={PREVIEW_NAME}
          template={template.id}
          navPages={pages.map((page) => ({ name: page.name, path: page.path }))}
          currentPath="/"
          page={{ name: 'Home', content: { sections } }}
          galleryOptions={[placeholderGallery]}
          basePath="/preview"
        />
      </div>
    </div>
  )
}

function serviceLabels(template: WebsiteTemplate): string {
  return template.services
    .map((id) => SERVICES.find((service) => service.id === id)?.label)
    .filter(Boolean)
    .join(', ')
}

function TemplateCard({ template, name, checked, onSelect }: {
  template: WebsiteTemplate
  name: string
  checked: boolean
  onSelect: () => void
}) {
  return (
    <label className="relative block cursor-pointer">
      <input
        type="radio"
        name={name}
        value={template.id}
        checked={checked}
        onChange={onSelect}
        className="peer sr-only"
      />
      <div className="overflow-hidden rounded-md border border-border bg-card transition-colors duration-150 hover:border-foreground/25 peer-checked:border-primary peer-checked:outline peer-checked:outline-1 peer-checked:-outline-offset-2 peer-checked:outline-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background motion-reduce:transition-none">
        <TemplatePreview template={template} />
        <div className="space-y-1.5 p-4">
          <p className="font-display text-lg font-semibold leading-tight">{template.label}</p>
          <p className="text-sm text-muted-foreground">{template.description}</p>
          <p className="label-caption pt-1">{serviceLabels(template)}</p>
        </div>
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-3 hidden h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground peer-checked:flex"
      >
        <Check className="h-4 w-4" />
      </span>
    </label>
  )
}

export interface TemplatePickerProps {
  /** Selected template id. */
  value: string
  onValueChange: (templateId: string) => void
  /** Service the studio shoots; only ranks templates (and optionally picks a default). */
  service: ServiceId | null
  onServiceChange: (service: ServiceId | null) => void
  /** Also select the best match when the service changes (new sites only). */
  selectOnServiceChange?: boolean
  className?: string
  gridClassName?: string
}

export function TemplatePicker({
  value,
  onValueChange,
  service,
  onServiceChange,
  selectOnServiceChange = false,
  className,
  gridClassName = 'sm:grid-cols-2 lg:grid-cols-3',
}: TemplatePickerProps) {
  const uid = React.useId()
  const serviceName = `${uid}-service`
  const templateName = `${uid}-template`
  const ranked = rankTemplatesForService(service)
  const suggested = service ? ranked.filter((template) => template.services.includes(service)) : []
  const others = service ? ranked.filter((template) => !template.services.includes(service)) : ranked
  const serviceLabel = SERVICES.find((item) => item.id === service)?.label

  const chooseService = (next: ServiceId | null) => {
    onServiceChange(next)
    if (selectOnServiceChange && next) {
      const first = rankTemplatesForService(next)[0]
      if (first) onValueChange(first.id)
    }
  }

  const renderGrid = (templates: WebsiteTemplate[]) => (
    <div className={cn('grid gap-4', gridClassName)}>
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          name={templateName}
          checked={value === template.id}
          onSelect={() => onValueChange(template.id)}
        />
      ))}
    </div>
  )

  const chipClass = 'inline-flex min-h-10 cursor-pointer items-center rounded-md border border-border bg-background px-3 text-sm transition-colors duration-150 hover:border-foreground/25 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:font-medium peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background motion-reduce:transition-none'

  return (
    <div className={cn('space-y-6', className)}>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">What do you mainly shoot?</legend>
        <div className="flex flex-wrap gap-2">
          <label className="relative">
            <input type="radio" name={serviceName} checked={service === null} onChange={() => chooseService(null)} className="peer sr-only" />
            <span className={chipClass}>Not sure / show all</span>
          </label>
          {SERVICES.map((item) => (
            <label key={item.id} className="relative">
              <input type="radio" name={serviceName} value={item.id} checked={service === item.id} onChange={() => chooseService(item.id)} className="peer sr-only" />
              <span className={chipClass}>{item.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="sr-only">Website template</legend>
        {suggested.length > 0 && (
          <div className="space-y-3">
            <p className="label-caption">Suggested for {serviceLabel?.toLowerCase()}</p>
            {renderGrid(suggested)}
          </div>
        )}
        {others.length > 0 && (
          <div className="space-y-3">
            {suggested.length > 0 && <p className="label-caption">Other styles</p>}
            {renderGrid(others)}
          </div>
        )}
      </fieldset>
    </div>
  )
}
