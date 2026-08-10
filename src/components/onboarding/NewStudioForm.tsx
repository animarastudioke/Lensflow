'use client'

import * as React from 'react'
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
import { Loader2, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { createStudio, checkSlugAvailable } from '@/lib/actions/studios'

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

interface NewStudioFormProps {
  defaultName: string
}

export function NewStudioForm({ defaultName }: NewStudioFormProps) {
  const [name, setName] = React.useState(defaultName)
  const [slug, setSlug] = React.useState(slugify(defaultName))
  const [slugTouched, setSlugTouched] = React.useState(false)
  const [slugStatus, setSlugStatus] = React.useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(name))
    }
  }, [name, slugTouched])

  React.useEffect(() => {
    if (slug.length < 2) {
      setSlugStatus('invalid')
      return
    }

    setSlugStatus('checking')
    const timeout = setTimeout(async () => {
      const available = await checkSlugAvailable(slug)
      setSlugStatus(available ? 'available' : 'taken')
    }, 400)

    return () => clearTimeout(timeout)
  }, [slug])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (slugStatus === 'taken' || slugStatus === 'invalid') {
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.set('name', name)
      formData.set('slug', slug)

      const result = await createStudio(formData)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
        setIsSubmitting(false)
      }
    } catch (err) {
      // NEXT_REDIRECT is thrown by the server action on success and handled by the framework
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setError('An unexpected error occurred')
        toast.error('An unexpected error occurred')
        setIsSubmitting(false)
      } else if (!(err instanceof Error)) {
        throw err
      }
    }
  }

  return (
    <Card className="max-w-md w-full">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Camera className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-display-sm">Set up your studio</CardTitle>
        <CardDescription>Tell us a bit about your photography business to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Studio name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Animara Studio"
              required
              minLength={2}
              maxLength={100}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Studio URL</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">lensflow.app/</span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(slugify(e.target.value))
                }}
                placeholder="animara-studio"
                required
                minLength={2}
                maxLength={50}
                className="flex-1"
              />
            </div>
            <p className="text-sm">
              {slugStatus === 'checking' && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Checking availability...
                </span>
              )}
              {slugStatus === 'available' && <span className="text-success">This URL is available</span>}
              {slugStatus === 'taken' && <span className="text-destructive">This URL is already taken</span>}
              {slugStatus === 'invalid' && (
                <span className="text-muted-foreground">Use lowercase letters, numbers, and hyphens</span>
              )}
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || slugStatus === 'checking' || slugStatus === 'taken' || slugStatus === 'invalid'}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating studio...
              </>
            ) : (
              'Create studio'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
