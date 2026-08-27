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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createGallery } from '@/lib/actions/galleries'

interface NewGalleryFormProps {
  studioSlug: string
  clients: { id: string; name: string }[]
  initialClientId?: string
}

export function NewGalleryForm({ studioSlug, clients, initialClientId }: NewGalleryFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [type, setType] = React.useState('wedding')
  const [status, setStatus] = React.useState('draft')
  const [clientId, setClientId] = React.useState<string>(initialClientId ?? 'none')
  const [passwordProtected, setPasswordProtected] = React.useState(false)
  const [allowDownload, setAllowDownload] = React.useState(true)
  const [allowFavorites, setAllowFavorites] = React.useState(true)
  const [allowComments, setAllowComments] = React.useState(true)
  const [watermarkEnabled, setWatermarkEnabled] = React.useState(false)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.set('studio_slug', studioSlug)
    formData.set('type', type)
    formData.set('status', status)
    if (clientId !== 'none') {
      formData.set('client_id', clientId)
    }
    formData.set('password_protected', String(passwordProtected))
    formData.set('allow_download', String(allowDownload))
    formData.set('allow_favorites', String(allowFavorites))
    formData.set('allow_comments', String(allowComments))
    formData.set('watermark_enabled', String(watermarkEnabled))

    try {
      await createGallery(formData)
    } catch (err) {
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setError(err.message || 'Failed to create gallery')
        toast.error(err.message || 'Failed to create gallery')
        setIsSubmitting(false)
      } else if (!(err instanceof Error)) {
        throw err
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/dashboard/${studioSlug}/galleries`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to galleries
        </Link>
        <h1 className="text-display-md font-display font-semibold text-foreground">New Gallery</h1>
        <p className="text-body text-muted-foreground mt-1">Set up a new client gallery</p>
      </div>

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Gallery details</CardTitle>
            <CardDescription>Basic information about this gallery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Gallery name</Label>
              <Input id="name" name="name" placeholder="Smith Wedding" required maxLength={100} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Optional notes about this shoot" rows={3} maxLength={1000} />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shoot_date">Shoot date</Label>
                <Input id="shoot_date" name="shoot_date" type="date" />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Access &amp; privacy</CardTitle>
            <CardDescription>Control how clients can view and interact with this gallery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={passwordProtected}
                onChange={(e) => setPasswordProtected(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
              />
              Password protect this gallery
            </label>
            {passwordProtected && (
              <div className="space-y-2 pl-7">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="text" placeholder="Enter a password" required={passwordProtected} />
              </div>
            )}
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary" />
              Allow clients to download photos
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={allowFavorites} onChange={(e) => setAllowFavorites(e.target.checked)} className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary" />
              Allow clients to favorite photos
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary" />
              Allow clients to comment on photos
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={watermarkEnabled} onChange={(e) => setWatermarkEnabled(e.target.checked)} className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary" />
              Watermark photos
            </label>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive mt-4">{error}</p>}

        <div className="flex items-center gap-3 mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create gallery'
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/dashboard/${studioSlug}/galleries`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
