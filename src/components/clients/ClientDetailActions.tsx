'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/layout/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Edit, Trash2, Plus, Calendar, Briefcase, DollarSign, Images, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { deleteClient } from '@/lib/actions/clients'

interface ClientDetailActionsProps {
  clientId: string
  clientName: string
  studioSlug: string
  redirectTo: string
}

export function ClientDetailActions({ clientId, clientName, studioSlug, redirectTo }: ClientDetailActionsProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const handleDelete = async () => {
    const result = await deleteClient(clientId, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      throw new Error(result.error)
    }
    toast.success('Client deleted')
    router.push(redirectTo)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" aria-label={`New record for ${clientName}`}>
            <Plus className="h-4 w-4 mr-2" />
            New
            <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/${studioSlug}/bookings/new?client=${clientId}`}>
              <Calendar className="mr-2 h-4 w-4" />
              New Booking
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/${studioSlug}/projects/new?client=${clientId}`}>
              <Briefcase className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/${studioSlug}/invoices/new?client=${clientId}`}>
              <DollarSign className="mr-2 h-4 w-4" />
              New Invoice
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/${studioSlug}/galleries/new?client=${clientId}`}>
              <Images className="mr-2 h-4 w-4" />
              New Gallery
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" asChild>
        <Link href={`/dashboard/${studioSlug}/clients/${clientId}/edit`}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Link>
      </Button>
      <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete client"
        description={`Are you sure you want to delete ${clientName}? This cannot be undone. Their bookings, projects, invoices, and galleries are not deleted -- they'll just no longer show this client.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}
