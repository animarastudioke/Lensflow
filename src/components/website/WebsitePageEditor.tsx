'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, Eye, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { WebsitePageRow } from '@/lib/actions/websites'
import { updateWebsitePageContent } from '@/lib/actions/websites'
import { getWebsiteSections, type WebsiteGalleryOption, type WebsiteSection } from '@/lib/website/content'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/layout/PageHeader'
import { WebsiteRenderer } from '@/components/website/WebsiteRenderer'

interface WebsitePageEditorProps {
  studioSlug: string
  websiteId: string
  websiteName: string
  studioName: string
  logoUrl?: string | null
  template: string
  primaryColor?: string | null
  navPages: { name: string; path: string }[]
  galleries: WebsiteGalleryOption[]
  page: WebsitePageRow
}

function previewHref(studioSlug: string, websiteId: string, path: string): string {
  const segments = path.split('/').filter(Boolean)
  const base = `/dashboard/${studioSlug}/website/${websiteId}/preview`
  return segments.length === 0 ? base : `${base}/${segments.join('/')}`
}

function createSection(type: WebsiteSection['type']): WebsiteSection {
  const id = crypto.randomUUID()
  if (type === 'hero') return { id, type, eyebrow: '', heading: 'Your story starts here', body: '', ctaLabel: '', ctaHref: '' }
  if (type === 'gallery') return { id, type, heading: 'Selected work', galleryId: '' }
  if (type === 'services') return { id, type, heading: 'What we offer', items: [] }
  if (type === 'contact') return { id, type, heading: 'Let’s work together', body: '', ctaLabel: 'Get in touch', ctaHref: '' }
  return { id, type: 'text', heading: 'A little about us', body: '' }
}

const sectionTitle: Record<WebsiteSection['type'], string> = {
  hero: 'Hero',
  text: 'Story',
  gallery: 'Photo gallery',
  services: 'Services',
  contact: 'Contact',
}

export function WebsitePageEditor({
  studioSlug,
  websiteId,
  websiteName,
  studioName,
  logoUrl,
  template,
  primaryColor,
  navPages,
  galleries,
  page,
}: WebsitePageEditorProps) {
  const [sections, setSections] = React.useState(() => getWebsiteSections(page.content, page.name))
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isDirty, setIsDirty] = React.useState(false)

  const updateSection = (id: string, updates: Record<string, string>) => {
    setSections((current) => current.map((section) => section.id === id ? { ...section, ...updates } as WebsiteSection : section))
    setIsDirty(true)
  }

  const updateServiceItems = (id: string, value: string) => {
    const items = value.split('\n').slice(0, 8).map((line) => {
      const [title = '', ...descriptionParts] = line.split(' — ')
      return { title: title.slice(0, 100), description: descriptionParts.join(' — ').slice(0, 500) }
    }).filter((item) => item.title.trim() || item.description.trim())
    setSections((current) => current.map((section) => section.id === id && section.type === 'services' ? { ...section, items } : section))
    setIsDirty(true)
  }

  const moveSection = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= sections.length) return
    setSections((current) => {
      const next = [...current]
      const sectionAtIndex = next[index]
      const sectionAtNextIndex = next[nextIndex]
      if (!sectionAtIndex || !sectionAtNextIndex) return current
      ;[next[index], next[nextIndex]] = [sectionAtNextIndex, sectionAtIndex]
      return next
    })
    setIsDirty(true)
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (sections.length === 0) {
      setError('Add at least one section before saving this page.')
      return
    }
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData()
    formData.set('page_id', page.id)
    formData.set('website_id', websiteId)
    formData.set('studio_slug', studioSlug)
    formData.set('sections', JSON.stringify(sections))

    try {
      const result = await updateWebsitePageContent(formData)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
      } else {
        setIsDirty(false)
        toast.success('Page saved')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save page content'
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title={page.name}
        description={`Build the ${page.path === '/' ? 'home page' : page.path} with reusable sections.`}
        breadcrumbs={[
          { label: 'Websites', href: `/dashboard/${studioSlug}/website` },
          { label: websiteName, href: `/dashboard/${studioSlug}/website/${websiteId}/editor` },
          { label: page.name },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href={previewHref(studioSlug, websiteId, page.path)} target="_blank" rel="noopener noreferrer">
              <Eye className="mr-2 h-4 w-4" /> Saved preview
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)]">
        <div className="space-y-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Page sections</CardTitle>
                <CardDescription>Add, edit, and reorder the parts of your portfolio page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sections.map((section, index) => (
                  <Card key={section.id} className="border-border/80 shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                      <div>
                        <CardTitle className="text-base">{sectionTitle[section.type]}</CardTitle>
                        <CardDescription>Section {index + 1} of {sections.length}</CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" size="icon" variant="ghost" aria-label="Move section up" disabled={index === 0} onClick={() => moveSection(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
                        <Button type="button" size="icon" variant="ghost" aria-label="Move section down" disabled={index === sections.length - 1} onClick={() => moveSection(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
                        <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${sectionTitle[section.type]} section`} onClick={() => { setSections((current) => current.filter((item) => item.id !== section.id)); setIsDirty(true) }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 px-4 pb-4">
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
                        <div className="space-y-2">
                          <Label htmlFor={`${section.id}-services`}>Offerings</Label>
                          <Textarea
                            id={`${section.id}-services`}
                            rows={5}
                            value={section.items.map((item) => `${item.title} — ${item.description}`).join('\n')}
                            onChange={(event) => updateServiceItems(section.id, event.target.value)}
                            placeholder={'Wedding photography — Full-day storytelling\nPortrait sessions — Relaxed studio or outdoor portraits'}
                          />
                          <p className="text-xs text-muted-foreground">One service per line. Separate the title and description with an em dash.</p>
                        </div>
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
                        <div className="grid gap-4 sm:grid-cols-2">
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
                    </CardContent>
                  </Card>
                ))}

                {sections.length === 0 && <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">Add a section to start building this page.</p>}

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {(['hero', 'gallery', 'text', 'services', 'contact'] as const).map((type) => (
                    <Button key={type} type="button" variant="outline" size="sm" onClick={() => { setSections((current) => [...current, createSection(type)]); setIsDirty(true) }}>
                      <Plus className="mr-1.5 h-4 w-4" /> Add {sectionTitle[type].toLowerCase()}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isSubmitting || sections.length === 0}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save page'}
              </Button>
              <span aria-live="polite" className="text-sm text-muted-foreground">{isDirty ? 'Unsaved changes' : 'All changes saved'}</span>
            </div>
          </form>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Live preview</h2>
              <p className="text-xs text-muted-foreground">Updates as you edit · {template.replaceAll('-', ' ')}</p>
            </div>
            {isDirty && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">Draft edits</span>}
          </div>
          <div className="max-h-[calc(100vh-9rem)] overflow-auto rounded-md border bg-background shadow-sm">
            <WebsiteRenderer
              studioName={studioName}
              logoUrl={logoUrl}
              websiteName={websiteName}
              template={template}
              primaryColor={primaryColor}
              navPages={navPages}
              currentPath={page.path}
              page={{ name: page.name, content: { sections } }}
              galleryOptions={galleries}
              basePath={`/dashboard/${studioSlug}/website/${websiteId}/preview`}
              previewLabel="Editor preview — updates as you edit; visitors see published content."
              previewLinksInNewTab
              preview
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

