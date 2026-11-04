'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { WebsiteGalleryOption, WebsiteSection } from '@/lib/website/content'
import {
  SECTION_LABELS,
  SECTION_TYPES,
  createSection,
  formatPricingItems,
  formatServiceItems,
  formatTestimonialItems,
  moveItem,
  parsePricingItems,
  parseServiceItems,
  parseTestimonialItems,
} from '@/lib/website/section-defaults'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface SectionEditorProps {
  sections: WebsiteSection[]
  onChange: (sections: WebsiteSection[]) => void
  galleries: WebsiteGalleryOption[]
}

interface LineListFieldProps<T> {
  id: string
  label: string
  help: string
  placeholder: string
  rows?: number
  items: T[]
  format: (items: T[]) => string
  parse: (text: string) => T[]
  onItems: (items: T[]) => void
}

// The stored value is a parsed list that drops blank lines, so rendering the
// textarea straight from it would swallow the newline the moment it is typed.
// The raw text is kept locally and only re-read from the items when they
// change from somewhere else.
function LineListField<T>({ id, label, help, placeholder, rows = 5, items, format, parse, onItems }: LineListFieldProps<T>) {
  const [text, setText] = React.useState(() => format(items))
  React.useEffect(() => {
    if (JSON.stringify(parse(text)) !== JSON.stringify(items)) setText(format(items))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `text` is intentionally not a dependency: only external item changes should overwrite what is being typed.
  }, [items])

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={rows}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          onItems(parse(event.target.value))
        }}
        placeholder={placeholder}
      />
      <p className="text-xs text-muted-foreground">{help}</p>
    </div>
  )
}

/**
 * Controlled editor for one page's sections. The parent owns the array so the
 * live preview and the save button always see the same unsaved draft.
 */
export function SectionEditor({ sections, onChange, galleries }: SectionEditorProps) {
  const [openId, setOpenId] = React.useState<string | null>(sections[0]?.id ?? null)

  const updateSection = (id: string, updates: Record<string, unknown>) => {
    onChange(sections.map((section) => (section.id === id ? ({ ...section, ...updates } as WebsiteSection) : section)))
  }

  const addSection = (type: WebsiteSection['type']) => {
    const section = createSection(type)
    onChange([...sections, section])
    setOpenId(section.id)
  }

  return (
    <div className="space-y-3">
      {sections.length === 0 && (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Add a section to start building this page.</p>
      )}

      {sections.map((section, index) => {
        const isOpen = openId === section.id
        const label = SECTION_LABELS[section.type]
        return (
          <div key={section.id} className="rounded-md border bg-card">
            <div className="flex items-center gap-1 pr-1">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left"
                aria-expanded={isOpen}
                aria-controls={`${section.id}-panel`}
                onClick={() => setOpenId(isOpen ? null : section.id)}
              >
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', !isOpen && '-rotate-90')} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{section.heading || 'No heading'}</span>
                </span>
              </button>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Move ${label} section up`} disabled={index === 0} onClick={() => onChange(moveItem(sections, index, -1))}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Move ${label} section down`} disabled={index === sections.length - 1} onClick={() => onChange(moveItem(sections, index, 1))}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Remove ${label} section`} onClick={() => onChange(sections.filter((item) => item.id !== section.id))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            {isOpen && (
              <div id={`${section.id}-panel`} className="space-y-4 border-t px-3 pb-4 pt-3">
                {'eyebrow' in section && (
                  <div className="space-y-2">
                    <Label htmlFor={`${section.id}-eyebrow`}>Small introduction</Label>
                    <Input id={`${section.id}-eyebrow`} maxLength={80} value={section.eyebrow ?? ''} onChange={(event) => updateSection(section.id, { eyebrow: event.target.value })} placeholder="Wedding photographer · Mombasa" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor={`${section.id}-heading`}>Heading</Label>
                  <Input id={`${section.id}-heading`} maxLength={200} value={section.heading} onChange={(event) => updateSection(section.id, { heading: event.target.value })} />
                </div>
                {'body' in section && (
                  <div className="space-y-2">
                    <Label htmlFor={`${section.id}-body`}>{section.type === 'hero' ? 'Description' : 'Text'}</Label>
                    <Textarea id={`${section.id}-body`} maxLength={5000} rows={4} value={section.body ?? ''} onChange={(event) => updateSection(section.id, { body: event.target.value })} placeholder="Write a few sentences for your visitors." />
                  </div>
                )}
                {section.type === 'services' && (
                  <LineListField
                    id={`${section.id}-services`}
                    label="Offerings"
                    items={section.items}
                    format={formatServiceItems}
                    parse={parseServiceItems}
                    onItems={(items) => updateSection(section.id, { items })}
                    placeholder={'Wedding photography — Full-day storytelling\nPortrait sessions — Relaxed studio or outdoor portraits'}
                    help="One service per line. Separate the title and description with an em dash."
                  />
                )}
                {section.type === 'pricing' && (
                  <LineListField
                    id={`${section.id}-pricing`}
                    label="Packages"
                    items={section.items}
                    format={formatPricingItems}
                    parse={parsePricingItems}
                    onItems={(items) => updateSection(section.id, { items })}
                    placeholder={'Essential — KES 45,000 — 4 hours, 200 edited photos\nSignature — KES 85,000 — Full day, album included'}
                    help="One package per line: name — price — what is included. Up to 6."
                  />
                )}
                {section.type === 'testimonials' && (
                  <LineListField
                    id={`${section.id}-testimonials`}
                    label="Kind words"
                    items={section.items}
                    format={formatTestimonialItems}
                    parse={parseTestimonialItems}
                    onItems={(items) => updateSection(section.id, { items })}
                    placeholder={'They made us feel completely at ease. — Amina & Joseph'}
                    help="One testimonial per line: the quote — who said it. Up to 6."
                  />
                )}
                {(section.type === 'hero' || section.type === 'gallery') && (
                  <div className="space-y-2">
                    <Label htmlFor={`${section.id}-gallery`}>{section.type === 'hero' ? 'Hero image' : 'Photos to show'}</Label>
                    <Select value={section.galleryId || 'none'} onValueChange={(value) => updateSection(section.id, { galleryId: value === 'none' ? '' : value })}>
                      <SelectTrigger id={`${section.id}-gallery`}><SelectValue placeholder="Choose a published gallery" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No gallery selected</SelectItem>
                        {galleries.map((gallery) => <SelectItem key={gallery.id} value={gallery.id}>{gallery.name} · {gallery.images.length} photos</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {galleries.length === 0 && <p className="text-xs text-muted-foreground">Publish a gallery and enable portfolio display in its sharing settings. Password-protected, email-gated, and expired galleries stay private.</p>}
                  </div>
                )}
                {(section.type === 'hero' || section.type === 'contact') && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${section.id}-cta-label`}>Button label</Label>
                      <Input id={`${section.id}-cta-label`} maxLength={80} value={section.ctaLabel ?? ''} onChange={(event) => updateSection(section.id, { ctaLabel: event.target.value })} placeholder="Get in touch" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${section.id}-cta-href`}>Button link</Label>
                      <Input id={`${section.id}-cta-href`} maxLength={500} value={section.ctaHref ?? ''} onChange={(event) => updateSection(section.id, { ctaHref: event.target.value })} placeholder="mailto:hello@yourstudio.com" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Add a section">
        {SECTION_TYPES.map((type) => (
          <Button key={type} type="button" variant="outline" size="sm" onClick={() => addSection(type)}>
            <Plus className="mr-1.5 h-4 w-4" /> {SECTION_LABELS[type]}
          </Button>
        ))}
      </div>
    </div>
  )
}
