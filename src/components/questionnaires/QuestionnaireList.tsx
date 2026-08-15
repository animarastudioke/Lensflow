'use client'

import * as React from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ClipboardList, Plus, Loader2, Trash2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createTemplate, deleteTemplate, type QuestionnaireTemplateRow } from '@/lib/actions/questionnaires'

interface QuestionnaireListProps {
  studioSlug: string
  initialTemplates: QuestionnaireTemplateRow[]
}

export function QuestionnaireList({ studioSlug, initialTemplates }: QuestionnaireListProps) {
  const router = useRouter()
  const [templates, setTemplates] = React.useState(initialTemplates)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)

  async function handleCreate(formData: FormData) {
    setIsSubmitting(true)
    setFormError(null)
    const result = await createTemplate(studioSlug, formData)
    if ('error' in result) {
      setFormError(result.error)
      setIsSubmitting(false)
      return
    }
    setIsCreateOpen(false)
    setIsSubmitting(false)
    router.push(`/dashboard/${studioSlug}/questionnaires/${result.templateId}`)
  }

  async function confirmDelete(templateId: string) {
    const result = await deleteTemplate(templateId, studioSlug)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      setTemplates((prev) => prev.filter((t) => t.id !== templateId))
      toast.success('Template deleted')
    }
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-sm font-display font-semibold text-foreground">Questionnaires</h1>
          <p className="text-body text-muted-foreground mt-1">Build client intake forms and collect responses</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Responses</TableHead>
                <TableHead className="hidden md:table-cell">Updated</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No questionnaire templates yet</p>
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/dashboard/${studioSlug}/questionnaires/${template.id}`} className="font-medium hover:underline">
                        {template.name}
                      </Link>
                      {template.description && <p className="text-sm text-muted-foreground truncate max-w-[280px]">{template.description}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.fields.length} field{template.fields.length === 1 ? '' : 's'}</Badge>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{template.responseCount}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/dashboard/${studioSlug}/questionnaires/${template.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteConfirm(template.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form action={handleCreate}>
            <DialogHeader>
              <DialogTitle>New Questionnaire Template</DialogTitle>
              <DialogDescription>You&apos;ll add fields on the next screen.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" placeholder="Wedding Day Details" required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea name="description" placeholder="Optional description shown to clients..." rows={3} />
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create & Continue
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete template</DialogTitle>
            <DialogDescription>This deletes the template and all of its responses. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && confirmDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
