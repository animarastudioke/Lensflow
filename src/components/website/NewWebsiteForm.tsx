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
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createWebsite } from '@/lib/actions/websites'
import { PageHeader } from '@/components/layout/PageHeader'
import { TemplatePicker } from '@/components/website/TemplatePicker'
import { DEFAULT_TEMPLATE_ID, type ServiceId } from '@/lib/website/templates'

interface NewWebsiteFormProps {
  studioSlug: string
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
}

export function NewWebsiteForm({ studioSlug }: NewWebsiteFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [name, setName] = React.useState('')
  const [subdomain, setSubdomain] = React.useState('')
  const [subdomainTouched, setSubdomainTouched] = React.useState(false)
  const [template, setTemplate] = React.useState<string>(DEFAULT_TEMPLATE_ID)
  const [service, setService] = React.useState<ServiceId | null>(null)

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
    if (service) formData.set('service', service)

    try {
      const result = await createWebsite(formData)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
        setIsSubmitting(false)
      }
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
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="New Website"
        description="Start a new portfolio website"
        breadcrumbs={[
          { label: 'Websites', href: `/dashboard/${studioSlug}/website` },
          { label: 'New' },
        ]}
      />

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

          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Choose a look</CardTitle>
            <CardDescription>
              Your site starts with sample pages in the style you pick. You can edit every word and change the style later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TemplatePicker
              value={template}
              onValueChange={setTemplate}
              service={service}
              onServiceChange={setService}
              selectOnServiceChange
            />
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
