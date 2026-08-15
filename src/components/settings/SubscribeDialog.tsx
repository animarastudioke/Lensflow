'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Smartphone, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  initiatePlanSubscriptionPayment,
  pollPlanSubscriptionPaymentStatus,
} from '@/lib/actions/subscription-payments'
import { USD_TO_KES_RATE } from '@/lib/payments/mpesa'

type FlowState = 'form' | 'sending' | 'pending' | 'completed' | 'failed'

const POLL_INTERVAL_MS = 4000
const POLL_TIMEOUT_MS = 120_000

export function SubscribeDialog({
  studioSlug,
  planSlug,
  planName,
  priceUsd,
  trigger,
}: {
  studioSlug: string
  planSlug: 'starter' | 'studio' | 'team'
  planName: string
  priceUsd: number
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<FlowState>('form')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const pollHandle = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollDeadline = useRef<number>(0)

  const approxKes = Math.round(priceUsd * USD_TO_KES_RATE)

  function stopPolling() {
    if (pollHandle.current) {
      clearInterval(pollHandle.current)
      pollHandle.current = null
    }
  }

  function resetAndClose() {
    stopPolling()
    setOpen(false)
    window.setTimeout(() => {
      setState('form')
      setError(null)
    }, 200)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setState('sending')

    const result = await initiatePlanSubscriptionPayment(studioSlug, planSlug, phone)

    if ('error' in result) {
      setError(result.error)
      setState('form')
      return
    }

    setState('pending')
    toast.info(result.customerMessage || 'Check your phone to enter your M-Pesa PIN')

    pollDeadline.current = Date.now() + POLL_TIMEOUT_MS
    pollHandle.current = setInterval(async () => {
      if (Date.now() > pollDeadline.current) {
        stopPolling()
        setError('This is taking longer than expected. Refresh this page shortly — it may still complete.')
        setState('failed')
        return
      }

      const status = await pollPlanSubscriptionPaymentStatus(result.paymentId, studioSlug)
      if ('error' in status) return

      if (status.status === 'completed') {
        stopPolling()
        setState('completed')
        toast.success(`You're now on the ${planName} plan`)
      } else if (status.status === 'failed') {
        stopPolling()
        setError(status.failureReason || 'Payment was not completed')
        setState('failed')
      }
    }, POLL_INTERVAL_MS)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetAndClose()
        else setOpen(true)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subscribe to {planName}</DialogTitle>
          <DialogDescription>
            Sends an STK push to your phone — approve it with your M-Pesa PIN to activate the plan.
          </DialogDescription>
        </DialogHeader>

        {state === 'form' || state === 'sending' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{planName} plan</span>
                <span className="font-medium">${priceUsd}/month</span>
              </div>
              <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                <span>Charged via M-Pesa (KES)</span>
                <span>≈ KES {approxKes.toLocaleString()}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Approximate conversion at $1 ≈ KES {USD_TO_KES_RATE}. The exact KES amount is confirmed by M-Pesa before you approve.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subscribe-phone">Phone number</Label>
              <Input
                id="subscribe-phone"
                placeholder="0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={state === 'sending'}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={state === 'sending'} className="gap-2">
                {state === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
                {state === 'sending' ? 'Sending request…' : 'Send M-Pesa request'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}

        {state === 'pending' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Check your phone</p>
            <p className="text-sm text-muted-foreground">Waiting for you to enter your M-Pesa PIN to approve the request.</p>
          </div>
        )}

        {state === 'completed' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <p className="text-sm font-medium text-foreground">You&apos;re on the {planName} plan</p>
            <Button onClick={resetAndClose}>Done</Button>
          </div>
        )}

        {state === 'failed' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <XCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium text-foreground">Payment not completed</p>
            {error && <p className="text-sm text-muted-foreground">{error}</p>}
            <Button variant="outline" onClick={() => setState('form')}>
              Try again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
