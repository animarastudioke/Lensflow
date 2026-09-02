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
import { initiateMpesaInvoicePaymentPublic, pollMpesaPaymentStatusPublic } from '@/lib/actions/mpesa-payments'
import { formatCurrency } from '@/lib/currencies'

type FlowState = 'form' | 'sending' | 'pending' | 'completed' | 'failed'

const POLL_INTERVAL_MS = 4000
const POLL_TIMEOUT_MS = 120_000

export function PublicMpesaPaymentDialog({
  token,
  balanceDue,
  defaultPhone,
}: {
  token: string
  balanceDue: number
  defaultPhone?: string
}) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<FlowState>('form')
  const [phone, setPhone] = useState(defaultPhone ?? '')
  const [amount, setAmount] = useState(String(balanceDue))
  const [error, setError] = useState<string | null>(null)
  const pollHandle = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollDeadline = useRef<number>(0)

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

    const result = await initiateMpesaInvoicePaymentPublic(token, phone, Number(amount))

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
        setError('This is taking longer than expected. Check back shortly — it may still complete.')
        setState('failed')
        return
      }

      const status = await pollMpesaPaymentStatusPublic(result.paymentId, token)
      if ('error' in status) return

      if (status.status === 'completed') {
        stopPolling()
        setState('completed')
        toast.success('Payment received')
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
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Smartphone className="h-4 w-4" />
          Pay with M-Pesa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay with M-Pesa</DialogTitle>
          <DialogDescription>
            Enter your phone number — you&apos;ll get an M-Pesa prompt to approve with your PIN.
          </DialogDescription>
        </DialogHeader>

        {state === 'form' || state === 'sending' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mpesa-phone">Phone number</Label>
              <Input
                id="mpesa-phone"
                placeholder="0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={state === 'sending'}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mpesa-amount">Amount (KES)</Label>
              <Input
                id="mpesa-amount"
                type="number"
                min={1}
                max={balanceDue}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={state === 'sending'}
                required
              />
              <p className="text-xs text-muted-foreground">
                Balance due: {formatCurrency(balanceDue, 'KES')} — pay in full or enter a smaller amount as a deposit.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              You&apos;ll get a payment prompt from Animara Studio — that&apos;s Lensflow&apos;s registered business
              name.
            </p>
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
            <p className="text-sm font-medium text-foreground">Check your phone</p>
            <p className="text-sm text-muted-foreground">
              Enter your M-Pesa PIN to approve the request.
            </p>
          </div>
        )}

        {state === 'completed' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <p className="text-sm font-medium text-foreground">Payment received</p>
            <p className="text-xs text-muted-foreground">
              Your M-Pesa confirmation SMS will show Animara Studio — that&apos;s Lensflow&apos;s registered business
              name.
            </p>
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
