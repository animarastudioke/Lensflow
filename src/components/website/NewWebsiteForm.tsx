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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createWebsite } from '@/lib/actions/websites'

interface NewWebsiteFormProps {
  studioSlug: string
  templates: readonly { value: string; label: string }[]
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
}

export function NewWebsiteForm({ studioSlug, templates }: NewWebsiteFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [name, setName] = React.useState('')
  const [subdomain, setSubdomain] = React.useState('')
  const [subdomainTouched, setSubdomainTouched] = React.useState(false)
  const [template, setTemplate] = React.useState(templates[0]?.value ?? '')

  React.useEffect(() => {
    if (!subdomainTouched) {
      setSubdomain(slugify(name))
    }
  }, [name, subdomainTouched])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.set('studio_slug', studioSlug)
    formData.set('template', template)

    try {
      await createWebsite(formData)
    } catch (err) {
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setError(err.message || 'Failed to create website')
        toast.error(err.message || 'Failed to create website')
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
          href={`/dashboard/${studioSlug}/website`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to websites
        </Link>
        <h1 className="text-display-md font-display font-semibold text-foreground">New Website</h1>
        <p className="text-body text-muted-foreground mt-1">Start a new portfolio website</p>
      </div>

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Website details</CardTitle>
            <CardDescription>You can change all of this later</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Website name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Main Portfolio"
                required
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input
                id="subdomain"
                name="subdomain"
                placeholder="my-studio"
                required
                maxLength={63}
                value={subdomain}
                onChange={(e) => {
                  setSubdomainTouched(true)
                  setSubdomain(slugify(e.target.value))
                }}
              />
              <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only.</p>
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              'Create website'
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/dashboard/${studioSlug}/website`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
