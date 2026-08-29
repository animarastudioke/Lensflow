'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { ConfirmDialog } from '@/components/layout/ConfirmDialog'
import { StatusBadge } from '@/components/layout/StatusBadge'
import { Loader2, Plus, Trash2, CheckCircle, XCircle, Eye, FileText, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { WebsiteRow, WebsitePageRow } from '@/lib/actions/websites'
import {
  updateWebsiteSettings,
  addWebsitePage,
  deleteWebsitePage,
  setPagePublished,
} from '@/lib/actions/websites'

interface WebsiteEditorProps {
  studioSlug: string
  website: WebsiteRow
}

function previewHref(studioSlug: string, websiteId: string, path: string): string {
  const segments = path.split('/').filter(Boolean)
  const base = `/dashboard/${studioSlug}/website/${websiteId}/preview`
  return segments.length === 0 ? base : `${base}/${segments.join('/')}`
}

export function WebsiteEditor({ studioSlug, website }: WebsiteEditorProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [passwordProtected, setPasswordProtected] = React.useState(website.password_protected)
  const [pages, setPages] = React.useState(website.pages || [])
  const [newPageName, setNewPageName] = React.useState('')
  const [newPagePath, setNewPagePath] = React.useState('')
  const [isAddingPage, setIsAddingPage] = React.useState(false)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.set('id', website.id)
    formData.set('studio_slug', studioSlug)
    formData.set('password_protected', String(passwordProtected))

    try {
      await updateWebsiteSettings(formData)
      toast.success('Website updated')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update website'
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const onAddPage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newPageName.trim() || !newPagePath.trim()) return
    setIsAddingPage(true)

    const formData = new FormData()
    formData.set('website_id', website.id)
    formData.set('studio_slug', studioSlug)
    formData.set('name', newPageName)
    formData.set('path', newPagePath)

    try {
      await addWebsitePage(formData)
      setPages(prev => [...prev, {
        id: `pending-${Date.now()}`,
        website_id: website.id,
        name: newPageName,
        path: newPagePath,
        is_published: false,
        content: {},
        order: prev.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      setNewPageName('')
      setNewPagePath('')
      toast.success('Page added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add page')
    } finally {
      setIsAddingPage(false)
    }
  }

  const onTogglePublished = async (pageId: string, current: boolean) => {
    const result = await setPagePublished(pageId, !current, website.id, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, is_published: !current } : p))
  }

  const [pageToDelete, setPageToDelete] = React.useState<WebsitePageRow | null>(null)

  const onDeletePage = async () => {
    if (!pageToDelete) return
    const result = await deleteWebsitePage(pageToDelete.id, website.id, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      throw new Error(result.error)
    }
    setPages(prev => prev.filter(p => p.id !== pageToDelete.id))
    toast.success('Page deleted')
  }

  const homePath = pages.find(p => p.path === '/')?.path ?? pages[0]?.path

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={website.name}
        description={website.subdomain}
        breadcrumbs={[
          { label: 'Websites', href: `/dashboard/${studioSlug}/website` },
          { label: website.name },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={website.status} />
            {homePath !== undefined && (
              <Button variant="outline" size="sm" asChild>
                <Link href={previewHref(studioSlug, website.id, homePath)} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Site settings</CardTitle>
            <CardDescription>Basic information and branding for this website</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Website name</Label>
              <Input id="name" name="name" defaultValue={website.name} required maxLength={200} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom_domain">Custom domain</Label>
              <Input id="custom_domain" name="custom_domain" placeholder="www.yourstudio.com" defaultValue={website.custom_domain ?? ''} maxLength={255} />
              <p className="text-xs text-muted-foreground">
                Saved for reference. DNS and hosting for custom domains isn&apos;t set up yet.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary color</Label>
              <Input id="primary_color" name="primary_color" type="color" defaultValue={website.theme?.primaryColor || '#3B82F6'} className="h-10 w-20 p-1" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo_title">SEO title</Label>
              <Input id="seo_title" name="seo_title" defaultValue={website.seo?.title ?? ''} maxLength={200} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo_description">SEO description</Label>
              <Input id="seo_description" name="seo_description" defaultValue={website.seo?.description ?? ''} maxLength={500} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="password_protected" checked={passwordProtected} onCheckedChange={(checked) => setPasswordProtected(checked === true)} />
                <Label htmlFor="password_protected" className="font-normal">Require a password to view this site</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Password verification for visitors isn&apos;t built yet, so while this is on, the site won&apos;t be publicly
                reachable at all rather than reachable without a real password check.
              </p>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive mt-4">{error}</p>}

        <div className="flex items-center gap-3 mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Pages</CardTitle>
          <CardDescription>Manage the pages on this website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pages.length === 0 ? (
            <EmptyState icon={FileText} title="No pages yet" description="Add your first page below." compact />
          ) : (
            <ul className="divide-y divide-border border border-border rounded-md">
              {pages.map((page) => (
                <li key={page.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{page.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{page.path}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Edit content">
                      <Link href={`/dashboard/${studioSlug}/website/${website.id}/editor/pages/${page.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Preview">
                      <Link href={previewHref(studioSlug, website.id, page.path)} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onTogglePublished(page.id, page.is_published)}>
                      {page.is_published ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-success" />
                          Published
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                          Draft
                        </>
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setPageToDelete(page)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={onAddPage} className="flex items-end gap-3 pt-2">
            <div className="space-y-2 flex-1">
              <Label htmlFor="new_page_name">Page name</Label>
              <Input id="new_page_name" placeholder="About" value={newPageName} onChange={(e) => setNewPageName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="new_page_path">Path</Label>
              <Input id="new_page_path" placeholder="/about" value={newPagePath} onChange={(e) => setNewPagePath(e.target.value)} maxLength={200} />
            </div>
            <Button type="submit" variant="outline" disabled={isAddingPage}>
              {isAddingPage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

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
