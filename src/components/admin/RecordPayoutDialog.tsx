'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { recordPayout } from '@/lib/actions/payouts'

export function RecordPayoutDialog({
  studioId,
  studioName,
  owed,
}: {
  studioId: string
  studioName: string
  owed: number
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(owed))
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)

    const result = await recordPayout(studioId, Number(amount), note, reference)

    setIsSubmitting(false)

    if ('error' in result) {
      toast.error(result.error)
      return
    }

    toast.success(`Payout recorded for ${studioName}`)
    setOpen(false)
    setNote('')
    setReference('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Send className="h-3.5 w-3.5" />
          Record payout
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payout to {studioName}</DialogTitle>
          <DialogDescription>
            Log money you&apos;ve already sent them (M-Pesa, bank transfer, etc.) — this doesn&apos;t send
            anything itself, it just keeps the ledger accurate.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="payout-amount">Amount (KES)</Label>
            <Input
              id="payout-amount"
              type="number"
              min={1}
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Currently owed: KES {owed.toLocaleString()}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payout-reference">Reference (optional)</Label>
            <Input
              id="payout-reference"
              placeholder="M-Pesa transaction code, e.g. QGH7XXXX"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payout-note">Note (optional)</Label>
            <Textarea
              id="payout-note"
              placeholder="Sent via M-Pesa to 0712..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Recording…' : 'Record payout'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
