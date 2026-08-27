'use client'

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Renders the confirm action in the destructive color and copy tone. */
  destructive?: boolean
  /** May return a promise -- the dialog stays open with a pending confirm
   *  button and blocks Escape/outside-click/Cancel until it resolves. */
  onConfirm: () => void | Promise<void>
}

/**
 * The one shared destructive/blocking-confirmation dialog. Previously every
 * list (clients, galleries, invoices, team) hand-rolled its own plain
 * Dialog with near-identical markup, and only Settings used AlertDialog's
 * proper semantics. This is the single source of truth going forward --
 * existing hand-rolled confirms are migrated incrementally, not all at once.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = React.useState(false)

  const handleOpenChange = (next: boolean) => {
    if (isConfirming) return
    onOpenChange(next)
  }

  const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (isConfirming) return
    setIsConfirming(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // Left open on failure. The caller's onConfirm is expected to
      // report its own error (toast, inline message, etc.) -- this
      // component only needs to know whether to keep the dialog open.
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent onEscapeKeyDown={(e: KeyboardEvent) => isConfirming && e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isConfirming}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            asChild
            disabled={isConfirming}
            onClick={handleConfirm}
          >
            <Button variant={destructive ? 'destructive' : 'default'} loading={isConfirming}>
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
