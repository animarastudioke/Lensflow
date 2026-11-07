'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Eye, Loader2, Monitor, Palette, Settings, Smartphone, Trash2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import {
  addWebsitePage,
  deleteWebsitePage,
  renameWebsitePage,
  reorderWebsitePages,
  setPagePublished,
  setWebsiteStatus,
  updateWebsitePageContent,
  updateWebsiteSettings,
  uploadWebsiteImage,
  type WebsitePageRow,
  type WebsiteRow,
  type WebsiteStatus,
} from '@/lib/actions/websites'
import { getWebsiteSections, type WebsiteGalleryOption, type WebsiteSection } from '@/lib/website/content'
import { buildNavItems, filterVisiblePages, getParentPath, hasChildPages } from '@/lib/website/page-tree'
import { getTemplate, type ServiceId } from '@/lib/website/templates'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/layout/ConfirmDialog'
import { StatusBadge } from '@/components/layout/StatusBadge'
import { TemplatePicker } from '@/components/website/TemplatePicker'
import { WebsiteRenderer } from '@/components/website/WebsiteRenderer'
import { PagesPanel } from '@/components/website/builder/PagesPanel'
import { PreviewFrame, type PreviewDevice } from '@/components/website/builder/PreviewFrame'
import { SectionEditor } from '@/components/website/builder/SectionEditor'
import { cn } from '@/lib/utils'

interface WebsiteBuilderProps {
  studioSlug: string
  website: WebsiteRow
  galleries: WebsiteGalleryOption[]
  initialPageId?: string
}

interface SiteDraft {
  name: string
  customDomain: string
  primaryColor: string
  template: string
  seoTitle: string
  seoDescription: string
  passwordProtected: boolean
}

type PanelTab = 'pages' | 'design' | 'settings'

function previewHref(studioSlug: string, websiteId: string, path: string): string {
  const segments = path.split('/').filter(Boolean)
  const base = `/dashboard/${studioSlug}/website/${websiteId}/preview`
  return segments.length === 0 ? base : `${base}/${segments.join('/')}`
}

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record }
  delete next[key]
  return next
}

function visibilityNote(page: WebsitePageRow, pages: WebsitePageRow[]): string {
  if (!page.is_published) return hasChildPages(pages, page.path) ? 'Hidden from visitors, along with its sub-pages.' : 'Hidden from visitors.'
  const parentPath = getParentPath(page.path)
  const parent = parentPath ? pages.find((item) => item.path === parentPath) : undefined
  if (parent && !parent.is_published) return `Hidden because “${parent.name}” is hidden.`
  return hasChildPages(pages, page.path) ? 'Visitors can open this page and its sub-pages.' : 'Visitors can open this page.'
}

function sectionsOf(page: WebsitePageRow): WebsiteSection[] {
  return getWebsiteSections(page.content, page.name)
}

export function WebsiteBuilder({ studioSlug, website, galleries, initialPageId }: WebsiteBuilderProps) {
  const [pages, setPages] = React.useState<WebsitePageRow[]>(website.pages ?? [])
  const requestedPage = pages.find((page) => page.id === initialPageId)
  const firstPage = requestedPage ?? pages.find((page) => page.path === '/') ?? pages[0]
  const [selectedId, setSelectedId] = React.useState<string | null>(firstPage?.id ?? null)
  const [tab, setTab] = React.useState<PanelTab>('pages')
  // Only a page that really exists opens straight into its editor; a stale link just lands on Home.
  const [showPageDetail, setShowPageDetail] = React.useState(Boolean(requestedPage))
  const [mobileView, setMobileView] = React.useState<'edit' | 'preview'>('edit')
  const [device, setDevice] = React.useState<PreviewDevice>('desktop')
  const [status, setStatus] = React.useState<WebsiteStatus>(website.status)

  // Unsaved section edits live here, keyed by page, so the preview, the dirty
  // markers and the save buttons all read the same draft.
  const [drafts, setDrafts] = React.useState<Record<string, WebsiteSection[]>>({})

  const initialSite = React.useMemo<SiteDraft>(() => ({
    name: website.name,
    customDomain: website.custom_domain ?? '',
    primaryColor: website.theme?.primaryColor || '#3B82F6',
    // A stored id that is no longer in the registry renders as the default, so the
    // picker must start there too or the next save would be rejected.
    template: getTemplate(website.template).id,
    seoTitle: website.seo?.title ?? '',
    seoDescription: website.seo?.description ?? '',
    passwordProtected: website.password_protected,
  }), [website])
  const [site, setSite] = React.useState<SiteDraft>(initialSite)
  const [savedSite, setSavedSite] = React.useState<SiteDraft>(initialSite)
  const [service, setService] = React.useState<ServiceId | null>(null)

  const [isSaving, setIsSaving] = React.useState(false)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [isReordering, setIsReordering] = React.useState(false)
  const [pageToDelete, setPageToDelete] = React.useState<WebsitePageRow | null>(null)
  const [focusRequest, setFocusRequest] = React.useState<{ id: string } | null>(null)
  const [renameValue, setRenameValue] = React.useState('')

  const selectedPage = pages.find((page) => page.id === selectedId) ?? null

  const dirtyPageIds = React.useMemo(() => {
    const dirty = new Set<string>()
    for (const [id, sections] of Object.entries(drafts)) {
      const page = pages.find((item) => item.id === id)
      if (page && JSON.stringify(sections) !== JSON.stringify(sectionsOf(page))) dirty.add(id)
    }
    return dirty
  }, [drafts, pages])
  const siteDirty = JSON.stringify(site) !== JSON.stringify(savedSite)
  const hasUnsaved = dirtyPageIds.size > 0 || siteDirty

  React.useEffect(() => {
    setRenameValue(selectedPage?.name ?? '')
  }, [selectedPage?.id, selectedPage?.name])

  React.useEffect(() => {
    if (!hasUnsaved) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasUnsaved])

  const samplePhotoSections = pages
    .filter((page) => page.is_published)
    .flatMap((page) => drafts[page.id] ?? sectionsOf(page))
    .filter((section) => (section.type === 'hero' && !section.galleryId && !section.imageUrl)
      || (section.type === 'gallery' && !section.galleryId && !(section.imageUrls?.length)))
    .length

  const exampleSections = pages
    .filter((page) => page.is_published)
    .flatMap((page) => drafts[page.id] ?? sectionsOf(page))
    .filter((section) => (section.type === 'testimonials' || section.type === 'pricing') && section.sample).length

  const currentSections = selectedPage ? drafts[selectedPage.id] ?? sectionsOf(selectedPage) : []

  const selectPage = (pageId: string) => {
    setSelectedId(pageId)
    setShowPageDetail(true)
    setTab('pages')
  }

  const uploadImage = async (file: File): Promise<{ url: string } | { error: string }> => {
    const formData = new FormData()
    formData.set('image', file)
    try {
      const result = await uploadWebsiteImage(formData)
      return 'error' in result ? result : { url: result.url }
    } catch {
      // A request that never reaches the action (offline, over the body limit).
      return { error: 'The upload failed. Check your connection and try again.' }
    }
  }

  // Clicking a sample photo in the preview opens that section's photo picker,
  // so a first-time user never has to hunt for where to replace it.
  const selectSectionFromPreview = (sectionId: string) => {
    setShowPageDetail(true)
    setTab('pages')
    setMobileView('edit')
    setFocusRequest({ id: sectionId })
  }

  const navigateFromPreview = (path: string) => {
    const target = pages.find((page) => page.path === path)
    if (!target) return
    setSelectedId(target.id)
    if (showPageDetail) setTab('pages')
  }

  const basePath = `/dashboard/${studioSlug}/website/${website.id}/preview`
  // The same rule the public site uses, so the preview menu shows what visitors will see.
  const navItems = React.useMemo(() => buildNavItems(filterVisiblePages(pages)), [pages])

  const savePages = async (): Promise<boolean> => {
    for (const id of dirtyPageIds) {
      const sections = drafts[id]
      const page = pages.find((item) => item.id === id)
      if (!sections || !page) continue
      if (sections.length === 0) {
        toast.error(`Add at least one section to “${page.name}” before saving.`)
        return false
      }
      const formData = new FormData()
      formData.set('page_id', id)
      formData.set('website_id', website.id)
      formData.set('studio_slug', studioSlug)
      formData.set('sections', JSON.stringify(sections))
      const result = await updateWebsitePageContent(formData)
      if (result?.error) {
        toast.error(`${page.name}: ${result.error}`)
        return false
      }
      setPages((current) => current.map((item) => (item.id === id ? { ...item, content: { version: 1, sections } } : item)))
      setDrafts((current) => without(current, id))
    }
    return true
  }

  const saveSite = async (): Promise<boolean> => {
    if (!siteDirty) return true
    const formData = new FormData()
    formData.set('id', website.id)
    formData.set('studio_slug', studioSlug)
    formData.set('name', site.name)
    formData.set('custom_domain', site.customDomain)
    formData.set('primary_color', site.primaryColor)
    formData.set('template', site.template)
    formData.set('seo_title', site.seoTitle)
    formData.set('seo_description', site.seoDescription)
    formData.set('password_protected', String(site.passwordProtected))
    try {
      await updateWebsiteSettings(formData)
      setSavedSite(site)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update website')
      return false
    }
  }

  const saveAll = async (): Promise<boolean> => {
    setIsSaving(true)
    try {
      const pagesSaved = await savePages()
      const siteSaved = pagesSaved ? await saveSite() : false
      if (pagesSaved && siteSaved) toast.success('Changes saved')
      return pagesSaved && siteSaved
    } finally {
      setIsSaving(false)
    }
  }

  const togglePublish = async () => {
    const next: WebsiteStatus = status === 'published' ? 'draft' : 'published'
    setIsPublishing(true)
    try {
      // Publishing what the visitor will see means saving first; otherwise the
      // live site would silently lack the edits the author just watched in the preview.
      if (next === 'published' && hasUnsaved && !(await saveAll())) return
      const result = await setWebsiteStatus(website.id, next, studioSlug)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      setStatus(next)
      toast.success(next === 'published' ? 'Website published' : 'Website unpublished')
    } finally {
      setIsPublishing(false)
    }
  }

  const onAddPage = async ({ name, path }: { name: string; path: string }): Promise<boolean> => {
    const formData = new FormData()
    formData.set('website_id', website.id)
    formData.set('studio_slug', studioSlug)
    formData.set('name', name)
    formData.set('path', path)
    try {
      const page = await addWebsitePage(formData)
      setPages((current) => [...current, page])
      selectPage(page.id)
      toast.success('Page added')
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add page')
      return false
    }
  }

  const onReorder = async (orderedIds: string[]) => {
    const previous = pages
    const position = new Map(orderedIds.map((id, index) => [id, index]))
    setPages((current) => current.map((page) => ({ ...page, order: position.get(page.id) ?? page.order })))
    setIsReordering(true)
    const result = await reorderWebsitePages(website.id, studioSlug, orderedIds)
    setIsReordering(false)
    if ('error' in result) {
      setPages(previous)
      toast.error(result.error)
    }
  }

  const onTogglePageVisibility = async (page: WebsitePageRow) => {
    const result = await setPagePublished(page.id, !page.is_published, website.id, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setPages((current) => current.map((item) => (item.id === page.id ? { ...item, is_published: !page.is_published } : item)))
  }

  const onRename = async () => {
    if (!selectedPage) return
    const next = renameValue.trim()
    if (!next || next === selectedPage.name) {
      setRenameValue(selectedPage.name)
      return
    }
    const result = await renameWebsitePage(selectedPage.id, website.id, studioSlug, next)
    if ('error' in result) {
      toast.error(result.error)
      setRenameValue(selectedPage.name)
      return
    }
    setPages((current) => current.map((item) => (item.id === selectedPage.id ? { ...item, name: next } : item)))
  }

  const onDeletePage = async () => {
    if (!pageToDelete) return
    const result = await deleteWebsitePage(pageToDelete.id, website.id, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      throw new Error(result.error)
    }
    const remaining = pages.filter((page) => page.id !== pageToDelete.id)
    setPages(remaining)
    setDrafts((current) => without(current, pageToDelete.id))
    if (selectedId === pageToDelete.id) {
      setSelectedId((remaining.find((page) => page.path === '/') ?? remaining[0])?.id ?? null)
      setShowPageDetail(false)
    }
    toast.success('Page deleted')
  }

  const updateSite = <K extends keyof SiteDraft>(key: K, value: SiteDraft[K]) => setSite((current) => ({ ...current, [key]: value }))

  const publicHref = `/portfolio/${website.subdomain}`

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[620px] flex-col overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href={`/dashboard/${studioSlug}/website`} aria-label="Back to websites"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{site.name || website.name}</h1>
          <p className="truncate text-xs text-muted-foreground">{website.subdomain}</p>
        </div>
        <StatusBadge status={status} />
        {hasUnsaved && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">Unsaved changes</span>}

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-md border p-0.5 lg:hidden" role="group" aria-label="Editor view">
            <Button type="button" size="sm" variant={mobileView === 'edit' ? 'secondary' : 'ghost'} className="h-7 px-3" aria-pressed={mobileView === 'edit'} onClick={() => setMobileView('edit')}>Edit</Button>
            <Button type="button" size="sm" variant={mobileView === 'preview' ? 'secondary' : 'ghost'} className="h-7 px-3" aria-pressed={mobileView === 'preview'} onClick={() => setMobileView('preview')}>Preview</Button>
          </div>
          <div className="hidden rounded-md border p-0.5 lg:flex" role="group" aria-label="Preview size">
            <Button type="button" size="sm" variant={device === 'desktop' ? 'secondary' : 'ghost'} className="h-7 px-2.5" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>
              <Monitor className="mr-1.5 h-4 w-4" /> Desktop
            </Button>
            <Button type="button" size="sm" variant={device === 'mobile' ? 'secondary' : 'ghost'} className="h-7 px-2.5" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>
              <Smartphone className="mr-1.5 h-4 w-4" /> Mobile
            </Button>
          </div>
          {status === 'published' && (
            <Button variant="outline" size="sm" asChild>
              <Link href={publicHref} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1.5 h-4 w-4" /> View live</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className={cn('min-h-0 w-full flex-col border-r lg:flex lg:w-[340px] lg:shrink-0', mobileView === 'edit' ? 'flex' : 'hidden')}>
          <Tabs value={tab} onValueChange={(value) => setTab(value as PanelTab)} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="grid h-11 w-full grid-cols-3 rounded-none border-b bg-transparent p-0">
              {([['pages', 'Pages', FileText], ['design', 'Design', Palette], ['settings', 'Settings', Settings]] as const).map(([value, label, Icon]) => (
                <TabsTrigger key={value} value={value} className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <Icon className="mr-1.5 h-4 w-4" aria-hidden="true" /> {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="pages" className="mt-0 min-h-0 flex-1 overflow-y-auto p-4">
              {showPageDetail && selectedPage ? (
                <div className="space-y-5">
                  <Button type="button" variant="ghost" size="sm" className="-ml-2 h-8" onClick={() => setShowPageDetail(false)}>
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> All pages
                  </Button>

                  <div className="space-y-2">
                    <Label htmlFor="page-name">Page name</Label>
                    <Input id="page-name" value={renameValue} maxLength={100} onChange={(event) => setRenameValue(event.target.value)} onBlur={onRename} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} />
                    <p className="text-xs text-muted-foreground">Address: <span className="font-mono">{selectedPage.path}</span></p>
                  </div>

                  <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
                    <div>
                      <Label htmlFor="page-visible" className="text-sm">Show in the site</Label>
                      <p className="text-xs text-muted-foreground">{visibilityNote(selectedPage, pages)}</p>
                    </div>
                    <Switch id="page-visible" checked={selectedPage.is_published} onCheckedChange={() => onTogglePageVisibility(selectedPage)} />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-sm font-semibold">Sections</h2>
                    <SectionEditor
                      key={selectedPage.id}
                      sections={currentSections}
                      galleries={galleries}
                      onUploadImage={uploadImage}
                      focusRequest={focusRequest}
                      onChange={(sections) => setDrafts((current) => ({ ...current, [selectedPage.id]: sections }))}
                    />
                  </div>

                  <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setPageToDelete(selectedPage)}>
                    <Trash2 className="mr-1.5 h-4 w-4" /> Delete “{selectedPage.name}”
                  </Button>
                </div>
              ) : (
                <PagesPanel
                  pages={pages}
                  selectedId={selectedId}
                  dirtyPageIds={dirtyPageIds}
                  isReordering={isReordering}
                  onSelect={selectPage}
                  onReorder={onReorder}
                  onAddPage={onAddPage}
                />
              )}
            </TabsContent>

            <TabsContent value="design" className="mt-0 min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Accent colour</Label>
                <Input id="primary-color" type="color" value={site.primaryColor} onChange={(event) => updateSite('primaryColor', event.target.value)} className="h-10 w-20 p-1" />
              </div>
              <div className="space-y-2">
                <h2 className="text-sm font-semibold">Style</h2>
                <TemplatePicker value={site.template} onValueChange={(value) => updateSite('template', value)} service={service} onServiceChange={setService} gridClassName="grid-cols-1" />
                <p className="text-xs text-muted-foreground">Changing the style only changes how your site looks. Your pages and text are not touched.</p>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0 min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
              <div className="space-y-2">
                <Label htmlFor="site-name">Website name</Label>
                <Input id="site-name" value={site.name} maxLength={200} onChange={(event) => updateSite('name', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-domain">Custom domain</Label>
                <Input id="custom-domain" value={site.customDomain} maxLength={255} placeholder="www.yourstudio.com" onChange={(event) => updateSite('customDomain', event.target.value)} />
                <p className="text-xs text-muted-foreground">Saved for reference. DNS and hosting for custom domains isn&apos;t set up yet.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo-title">SEO title</Label>
                <Input id="seo-title" value={site.seoTitle} maxLength={200} onChange={(event) => updateSite('seoTitle', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo-description">SEO description</Label>
                <Input id="seo-description" value={site.seoDescription} maxLength={500} onChange={(event) => updateSite('seoDescription', event.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="password-protected" checked={site.passwordProtected} onCheckedChange={(checked) => updateSite('passwordProtected', checked === true)} />
                  <Label htmlFor="password-protected" className="font-normal">Require a password to view this site</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Password verification for visitors isn&apos;t built yet, so while this is on, the site won&apos;t be publicly
                  reachable at all rather than reachable without a real password check.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {exampleSections > 0 && (
            <p className="border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {exampleSections === 1 ? '1 section of example testimonials or prices is' : `${exampleSections} sections of example testimonials or prices are`} hidden from visitors until you edit {exampleSections === 1 ? 'it' : 'them'}.
            </p>
          )}
          {samplePhotoSections > 0 && (
            <p className="border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {samplePhotoSections === 1 ? '1 section still shows' : `${samplePhotoSections} sections still show`} sample photos here. Visitors won&apos;t see them: upload photos or pick a gallery in {samplePhotoSections === 1 ? 'that section' : 'each'}.
            </p>
          )}
          <div className="flex items-center gap-2 border-t p-3">
            {selectedPage && (
              <Button variant="outline" size="sm" asChild title="Open the saved version in a new tab">
                <Link href={previewHref(studioSlug, website.id, selectedPage.path)} target="_blank" rel="noopener noreferrer"><Eye className="mr-1.5 h-4 w-4" /> Preview</Link>
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" className="flex-1" disabled={isSaving || isPublishing || !hasUnsaved} onClick={saveAll}>
              {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
            <Button type="button" size="sm" className="flex-1" disabled={isSaving || isPublishing} onClick={togglePublish}>
              {isPublishing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {status === 'published' ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
        </aside>

        <section className={cn('min-w-0 flex-1 bg-muted/30', mobileView === 'preview' ? 'block' : 'hidden lg:block')} aria-label="Live preview">
          {selectedPage ? (
            <PreviewFrame device={device} basePath={basePath} onNavigate={navigateFromPreview} onSelectSection={selectSectionFromPreview} title="Live preview of your website">
              <WebsiteRenderer
                studioName={website.studio?.name ?? site.name}
                logoUrl={website.studio?.logo_url}
                websiteName={site.name}
                template={site.template}
                primaryColor={site.primaryColor}
                navPages={navItems}
                currentPath={selectedPage.path}
                page={{ name: selectedPage.name, content: { version: 1, sections: currentSections } }}
                galleryOptions={galleries}
                basePath={basePath}
                previewLabel="Live preview — updates as you edit. Save to keep your changes."
                preview
              />
            </PreviewFrame>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">Add a page to see your website here.</div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={pageToDelete !== null}
        onOpenChange={(open) => !open && setPageToDelete(null)}
        title={`Delete "${pageToDelete?.name ?? ''}"?`}
        description="This page will be permanently removed from the website. This can't be undone."
        confirmLabel="Delete page"
        destructive
        onConfirm={onDeletePage}
      />
    </div>
  )
}
