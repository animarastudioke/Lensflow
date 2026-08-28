'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/PageHeader'
import { Loader2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import type { WebsitePageRow } from '@/lib/actions/websites'
import { updateWebsitePageContent } from '@/lib/actions/websites'

interface WebsitePageEditorProps {
  studioSlug: string
  websiteId: string
  websiteName: string
  page: WebsitePageRow
}

function previewHref(studioSlug: string, websiteId: string, path: string): string {
  const segments = path.split('/').filter(Boolean)
  const base = `/dashboard/${studioSlug}/website/${websiteId}/preview`
  return segments.length === 0 ? base : `${base}/${segments.join('/')}`
}

export function WebsitePageEditor({ studioSlug, websiteId, websiteName, page }: WebsitePageEditorProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const content = (page.content ?? {}) as { heading?: string; body?: string }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.set('page_id', page.id)
    formData.set('website_id', websiteId)
    formData.set('studio_slug', studioSlug)

    try {
      const result = await updateWebsitePageContent(formData)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
      } else {
        toast.success('Page content saved')
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
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={page.name}
        description={`Content for ${page.path}`}
        breadcrumbs={[
          { label: 'Websites', href: `/dashboard/${studioSlug}/website` },
          { label: websiteName, href: `/dashboard/${studioSlug}/website/${websiteId}/editor` },
          { label: page.name },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href={previewHref(studioSlug, websiteId, page.path)} target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Link>
          </Button>
        }
      />

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Page content</CardTitle>
            <CardDescription>A heading and a block of text for this page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="heading">Heading</Label>
              <Input id="heading" name="heading" defaultValue={content.heading ?? ''} maxLength={200} placeholder={page.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Body text</Label>
              <Textarea id="body" name="body" defaultValue={content.body ?? ''} maxLength={5000} rows={10} placeholder="What do you want visitors to read here?" />
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
          <Button type="button" variant="outline" asChild>
            <Link href={`/dashboard/${studioSlug}/website/${websiteId}/editor`}>Back to website</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
