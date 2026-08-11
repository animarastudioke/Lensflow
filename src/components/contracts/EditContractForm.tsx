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
import { updateContract } from '@/lib/actions/contracts'

const CONTRACT_TYPES = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'family', label: 'Family' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'event', label: 'Event' },
  { value: 'model-release', label: 'Model Release' },
  { value: 'license', label: 'License' },
  { value: 'other', label: 'Other' },
]

interface EditContractFormProps {
  studioSlug: string
  clients: { id: string; name: string }[]
  initialValues: {
    id: string
    title: string
    type: string
    clientId: string
    totalValue: number
    depositRequired: number
    notes: string
    expiresAt: string
  }
}

export function EditContractForm({ studioSlug, clients, initialValues }: EditContractFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [type, setType] = React.useState(initialValues.type)
  const [clientId, setClientId] = React.useState(initialValues.clientId)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.set('id', initialValues.id)
    formData.set('studio_slug', studioSlug)
    formData.set('type', type)
    if (clientId !== 'none') {
      formData.set('client_id', clientId)
    }

    try {
      await updateContract(formData)
    } catch (err) {
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setError(err.message || 'Failed to update contract')
        toast.error(err.message || 'Failed to update contract')
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
          href={`/dashboard/${studioSlug}/contracts/${initialValues.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contract
        </Link>
        <h1 className="text-display-md font-display font-semibold text-foreground">Edit Contract</h1>
      </div>

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Contract details</CardTitle>
            <CardDescription>Basic information about this agreement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={initialValues.title} required maxLength={200} />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
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

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="total_value">Total value</Label>
                <Input id="total_value" name="total_value" type="number" min={0} step="0.01" defaultValue={initialValues.totalValue} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit_required">Deposit required</Label>
                <Input id="deposit_required" name="deposit_required" type="number" min={0} step="0.01" defaultValue={initialValues.depositRequired} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires_at">Expires</Label>
              <Input id="expires_at" name="expires_at" type="date" defaultValue={initialValues.expiresAt} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={initialValues.notes} rows={3} maxLength={2000} />
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
            <Link href={`/dashboard/${studioSlug}/contracts/${initialValues.id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
