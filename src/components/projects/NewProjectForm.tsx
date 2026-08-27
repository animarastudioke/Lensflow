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
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { createProject } from '@/lib/actions/projects'

interface NewProjectFormProps {
  studioSlug: string
  clients: { id: string; name: string }[]
  bookings: { id: string; label: string }[]
}

export function NewProjectForm({ studioSlug, clients, bookings }: NewProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [type, setType] = React.useState('wedding')
  const [status, setStatus] = React.useState('planning')
  const [clientId, setClientId] = React.useState<string>('none')
  const [bookingId, setBookingId] = React.useState<string>('none')

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
    if (bookingId !== 'none') {
      formData.set('booking_id', bookingId)
    }

    try {
      await createProject(formData)
    } catch (err) {
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setError(err.message || 'Failed to create project')
        toast.error(err.message || 'Failed to create project')
        setIsSubmitting(false)
      } else if (!(err instanceof Error)) {
        throw err
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="New Project" description="Track a new shoot from planning to delivery" backHref={`/dashboard/${studioSlug}/projects`} />

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Project details</CardTitle>
            <CardDescription>Basic information about this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project name</Label>
              <Input id="name" name="name" placeholder="Smith Wedding" required maxLength={150} />
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
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            </div>

            {bookings.length > 0 && (
              <div className="space-y-2">
                <Label>Related booking (optional)</Label>
                <Select value={bookingId} onValueChange={setBookingId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No booking" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No booking</SelectItem>
                    {bookings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start date</Label>
                <Input id="start_date" name="start_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End date</Label>
                <Input id="end_date" name="end_date" type="date" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="e.g. Central Park, NYC" maxLength={200} />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="editing">Editing</SelectItem>
                  <SelectItem value="review">Client Review</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Optional notes about this project" rows={3} maxLength={2000} />
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
              'Create project'
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/dashboard/${studioSlug}/projects`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
