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
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateInvoice } from '@/lib/actions/invoices'
import { formatCurrency } from '@/lib/currencies'
import { PageHeader } from '@/components/layout/PageHeader'

interface LineItem {
  description: string
  quantity: number
  unit_price: number
}

interface EditInvoiceFormProps {
  studioSlug: string
  clients: { id: string; name: string }[]
  currency: string
  initialValues: {
    id: string
    status: string
    clientId: string
    issueDate: string
    dueDate: string
    tax: number
    discount: number
    notes: string
    items: LineItem[]
  }
}

export function EditInvoiceForm({ studioSlug, clients, currency, initialValues }: EditInvoiceFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState(initialValues.status)
  const [clientId, setClientId] = React.useState<string>(initialValues.clientId || 'none')
  const [tax, setTax] = React.useState(initialValues.tax)
  const [discount, setDiscount] = React.useState(initialValues.discount)
  const [items, setItems] = React.useState<LineItem[]>(
    initialValues.items.length > 0 ? initialValues.items : [{ description: '', quantity: 1, unit_price: 0 }]
  )

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const addItem = () => {
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0)
  const total = Math.max(subtotal + tax - discount, 0)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const validItems = items.filter(item => item.description.trim().length > 0)
    if (validItems.length === 0) {
      setError('Add at least one line item')
      return
    }

    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.set('id', initialValues.id)
    formData.set('studio_slug', studioSlug)
    formData.set('status', status)
    formData.set('tax', String(tax))
    formData.set('discount', String(discount))
    formData.set('items_json', JSON.stringify(validItems))
    if (clientId !== 'none') {
      formData.set('client_id', clientId)
    }

    try {
      await updateInvoice(formData)
    } catch (err) {
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setError(err.message || 'Failed to update invoice')
        toast.error(err.message || 'Failed to update invoice')
        setIsSubmitting(false)
      } else if (!(err instanceof Error)) {
        throw err
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Edit Invoice"
        breadcrumbs={[
          { label: 'Invoices', href: `/dashboard/${studioSlug}/invoices` },
          { label: 'Invoice', href: `/dashboard/${studioSlug}/invoices/${initialValues.id}` },
          { label: 'Edit' },
        ]}
      />

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Invoice details</CardTitle>
            <CardDescription>Client and billing dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="viewed">Viewed</SelectItem>
                    {/* Only selectable if this invoice is already Partial/Paid --
                        moving INTO either from something else must go through a
                        real payment (M-Pesa) or the dedicated Mark-as-paid
                        action, both of which keep amount_paid in sync. */}
                    <SelectItem value="partial" disabled={initialValues.status !== 'partial'}>Partial</SelectItem>
                    <SelectItem value="paid" disabled={initialValues.status !== 'paid'}>Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Paid and Partial are set automatically when a payment is recorded.</p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="issue_date">Issue date</Label>
                <Input id="issue_date" name="issue_date" type="date" defaultValue={initialValues.issueDate} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due date</Label>
                <Input id="due_date" name="due_date" type="date" defaultValue={initialValues.dueDate} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Line items</CardTitle>
            <CardDescription>What this invoice is billing for</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-[1fr_90px_120px_auto] items-end">
                <div className="space-y-2">
                  {index === 0 && <Label>Description</Label>}
                  <Input
                    value={item.description}
                    onChange={e => updateItem(index, { description: e.target.value })}
                    placeholder="e.g. Wedding Photography - 8hr coverage"
                  />
                </div>
                <div className="space-y-2">
                  {index === 0 && <Label>Qty</Label>}
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={item.quantity}
                    onChange={e => updateItem(index, { quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  {index === 0 && <Label>Unit price</Label>}
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_price}
                    onChange={e => updateItem(index, { unit_price: Number(e.target.value) })}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add line item
            </Button>

            <div className="pt-4 border-t space-y-3">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tax">Tax</Label>
                  <Input
                    id="tax"
                    type="number"
                    min={0}
                    step="0.01"
                    value={tax}
                    onChange={e => setTax(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount</Label>
                  <Input
                    id="discount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={discount}
                    onChange={e => setDiscount(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-medium text-foreground">
                <span>Total</span>
                <span className="font-mono tabular-nums">{formatCurrency(total, currency)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
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
            <Link href={`/dashboard/${studioSlug}/invoices/${initialValues.id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
