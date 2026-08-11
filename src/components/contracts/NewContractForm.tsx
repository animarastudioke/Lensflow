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
import { createContract } from '@/lib/actions/contracts'

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

interface NewContractFormProps {
  studioSlug: string
  clients: { id: string; name: string; email: string }[]
}

export function NewContractForm({ studioSlug, clients }: NewContractFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [type, setType] = React.useState('other')
  const [clientId, setClientId] = React.useState<string>('none')

  const selectedClient = clients.find(c => c.id === clientId)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.set('studio_slug', studioSlug)
    formData.set('type', type)
    if (clientId !== 'none') {
      formData.set('client_id', clientId)
      if (selectedClient) {
        formData.set('signer_name', selectedClient.name)
        formData.set('signer_email', selectedClient.email)
      }
    }

    try {
      await createContract(formData)
    } catch (err) {
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setError(err.message || 'Failed to create contract')
        toast.error(err.message || 'Failed to create contract')
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
          href={`/dashboard/${studioSlug}/contracts`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contracts
        </Link>
        <h1 className="text-display-md font-display font-semibold text-foreground">New Contract</h1>
        <p className="text-body text-muted-foreground mt-1">Create a new agreement</p>
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
              <Input id="title" name="title" placeholder="Wedding Photography Agreement" required maxLength={200} />
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
                <Input id="total_value" name="total_value" type="number" min={0} step="0.01" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit_required">Deposit required</Label>
                <Input id="deposit_required" name="deposit_required" type="number" min={0} step="0.01" placeholder="0.00" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires_at">Expires</Label>
              <Input id="expires_at" name="expires_at" type="date" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Anything worth noting about this agreement" rows={3} maxLength={2000} />
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
              'Create contract'
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/dashboard/${studioSlug}/contracts`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
