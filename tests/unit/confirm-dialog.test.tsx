import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ConfirmDialog } from '@/components/layout/ConfirmDialog'

function Harness({ onConfirm, destructive = false }: { onConfirm: () => void | Promise<void>; destructive?: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Delete gallery?"
      description="This cannot be undone."
      confirmLabel="Delete"
      destructive={destructive}
      onConfirm={onConfirm}
    />
  )
}

describe('ConfirmDialog', () => {
  it('renders title and description when open', () => {
    render(<Harness onConfirm={vi.fn()} />)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Delete gallery?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<Harness onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
  })

  it('disables Cancel while onConfirm is in flight, then closes once it resolves', async () => {
    let resolveConfirm!: () => void
    const onConfirm = vi.fn().mockReturnValue(new Promise<void>((resolve) => { resolveConfirm = resolve }))
    render(<Harness onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled())

    resolveConfirm()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('does not call onConfirm a second time from a rapid double click while pending', async () => {
    let resolveConfirm!: () => void
    const onConfirm = vi.fn().mockReturnValue(new Promise<void>((resolve) => { resolveConfirm = resolve }))
    render(<Harness onConfirm={onConfirm} />)

    const confirmButton = screen.getByRole('button', { name: 'Delete' })
    fireEvent.click(confirmButton)
    fireEvent.click(confirmButton)

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
    resolveConfirm()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('closes after a successful confirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<Harness onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('stays open and re-enables the confirm button if onConfirm rejects', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('failed'))
    render(<Harness onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeDisabled())
  })
})
