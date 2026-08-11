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
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { WebsiteRow } from '@/lib/actions/websites'
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

  const onDeletePage = async (pageId: string) => {
    const result = await deleteWebsitePage(pageId, website.id, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setPages(prev => prev.filter(p => p.id !== pageId))
    toast.success('Page deleted')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/dashboard/${studioSlug}/website`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to websites
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-display-md font-display font-semibold text-foreground">{website.name}</h1>
          <Badge variant={website.status === 'published' ? 'success' : 'secondary'}>
            {website.status === 'published' ? 'Published' : website.status === 'draft' ? 'Draft' : 'Archived'}
          </Badge>
        </div>
        <p className="text-body text-muted-foreground mt-1 font-mono text-sm">{website.subdomain}</p>
      </div>

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

            <div className="flex items-center gap-2">
              <Checkbox id="password_protected" checked={passwordProtected} onCheckedChange={(checked) => setPasswordProtected(checked === true)} />
              <Label htmlFor="password_protected" className="font-normal">Require a password to view this site</Label>
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
            <p className="text-sm text-muted-foreground">No pages yet.</p>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-md">
              {pages.map((page) => (
                <li key={page.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{page.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{page.path}</p>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDeletePage(page.id)}>
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
    </div>
  )
}
