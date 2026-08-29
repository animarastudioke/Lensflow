'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/layout/ConfirmDialog'
import { Loader2, Mail, CheckCircle, Trash2 } from 'lucide-react'
import { deleteInvoice, updateInvoiceStatus, type InvoiceStatus } from '@/lib/actions/invoices'

interface InvoiceDetailActionsProps {
  invoiceId: string
  studioSlug: string
  status: InvoiceStatus
}

const MARK_PAID_STATUSES: InvoiceStatus[] = ['sent', 'viewed', 'partial', 'overdue']

export function InvoiceDetailActions({ invoiceId, studioSlug, status }: InvoiceDetailActionsProps) {
  const router = useRouter()
  const [isSending, setIsSending] = React.useState(false)
  const [isMarkingPaid, setIsMarkingPaid] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const handleSend = async () => {
    setIsSending(true)
    const result = await updateInvoiceStatus(invoiceId, 'sent', studioSlug)
    setIsSending(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Invoice sent')
    router.refresh()
  }

  const handleMarkPaid = async () => {
    setIsMarkingPaid(true)
    const result = await updateInvoiceStatus(invoiceId, 'paid', studioSlug)
    setIsMarkingPaid(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Invoice marked as paid')
    router.refresh()
  }

  const handleDelete = async () => {
    const result = await deleteInvoice(invoiceId, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      throw new Error(result.error)
    }
    toast.success('Invoice deleted')
    router.push(`/dashboard/${studioSlug}/invoices`)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status === 'draft' && (
          <Button variant="outline" onClick={handleSend} disabled={isSending}>
            {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Send invoice
          </Button>
        )}
        {MARK_PAID_STATUSES.includes(status) && (
          <Button variant="outline" onClick={handleMarkPaid} disabled={isMarkingPaid}>
            {isMarkingPaid ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2 text-success" />}
            Mark as paid
          </Button>
        )}
        <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete invoice"
        description="Are you sure you want to delete this invoice? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}
