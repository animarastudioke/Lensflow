'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/layout/ConfirmDialog'
import { Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteProject } from '@/lib/actions/projects'

interface ProjectDetailActionsProps {
  projectId: string
  studioSlug: string
}

export function ProjectDetailActions({ projectId, studioSlug }: ProjectDetailActionsProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const handleDelete = async () => {
    const result = await deleteProject(projectId, studioSlug)
    if (result?.error) {
      toast.error(result.error)
      throw new Error(result.error)
    }
    toast.success('Project deleted')
    router.push(`/dashboard/${studioSlug}/projects`)
  }

  return (
    <>
      <Button variant="outline" asChild>
        <Link href={`/dashboard/${studioSlug}/projects/${projectId}/edit`}>
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
        title="Delete project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}
