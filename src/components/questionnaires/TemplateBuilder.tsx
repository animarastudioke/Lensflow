'use client'

import * as React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  ArrowLeft,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Save,
  Send,
  Copy,
  Check,
  Inbox,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  updateTemplateFields,
  sendQuestionnaire,
  type QuestionnaireField,
  type QuestionnaireFieldType,
  type QuestionnaireTemplateRow,
  type QuestionnaireResponseRow,
} from '@/lib/actions/questionnaires'

const FIELD_TYPE_LABELS: Record<QuestionnaireFieldType, string> = {
  text: 'Short Text',
  long_text: 'Long Text',
  email: 'Email',
  phone: 'Phone',
  date: 'Date',
  time: 'Time',
  number: 'Number',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
  radio: 'Multiple Choice',
  file_upload: 'File Link',
  signature: 'Signature (typed name)',
}

const OPTION_TYPES: QuestionnaireFieldType[] = ['dropdown', 'checkbox', 'radio']

function newField(type: QuestionnaireFieldType): QuestionnaireField {
  return {
    id: crypto.randomUUID(),
    type,
    label: '',
    required: false,
    options: OPTION_TYPES.includes(type) ? ['Option 1'] : undefined,
  }
}

interface ClientOption {
  id: string
  name: string
}

interface TemplateBuilderProps {
  studioSlug: string
  template: QuestionnaireTemplateRow
  clients: ClientOption[]
  initialResponses: QuestionnaireResponseRow[]
}

export function TemplateBuilder({ studioSlug, template, clients, initialResponses }: TemplateBuilderProps) {
  const [fields, setFields] = React.useState<QuestionnaireField[]>(template.fields)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDirty, setIsDirty] = React.useState(false)
  const [responses] = React.useState(initialResponses)
  const [isSendOpen, setIsSendOpen] = React.useState(false)
  const [selectedClientId, setSelectedClientId] = React.useState<string>('none')
  const [isSending, setIsSending] = React.useState(false)
  const [generatedLink, setGeneratedLink] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [viewResponse, setViewResponse] = React.useState<QuestionnaireResponseRow | null>(null)

  function updateField(id: string, patch: Partial<QuestionnaireField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    setIsDirty(true)
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id))
    setIsDirty(true)
  }

  function addField(type: QuestionnaireFieldType) {
    setFields((prev) => [...prev, newField(type)])
    setIsDirty(true)
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target]!, next[index]!]
      return next
    })
    setIsDirty(true)
  }

  function updateOption(fieldId: string, optionIndex: number, value: string) {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId || !f.options) return f
        const options = [...f.options]
        options[optionIndex] = value
        return { ...f, options }
      })
    )
    setIsDirty(true)
  }

  function addOption(fieldId: string) {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId && f.options ? { ...f, options: [...f.options, `Option ${f.options.length + 1}`] } : f))
    )
    setIsDirty(true)
  }

  function removeOption(fieldId: string, optionIndex: number) {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId && f.options ? { ...f, options: f.options.filter((_, i) => i !== optionIndex) } : f))
    )
    setIsDirty(true)
  }

  async function handleSave() {
    if (fields.some((f) => !f.label.trim())) {
      toast.error('Every field needs a label')
      return
    }
    setIsSaving(true)
    const result = await updateTemplateFields(template.id, studioSlug, fields)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Template saved')
      setIsDirty(false)
    }
    setIsSaving(false)
  }

  async function handleSend() {
    setIsSending(true)
    const result = await sendQuestionnaire(template.id, studioSlug, selectedClientId === 'none' ? null : selectedClientId)
    if ('error' in result) {
      toast.error(result.error)
      setIsSending(false)
      return
    }
    const link = `${window.location.origin}/q/${result.shareToken}`
    setGeneratedLink(link)
    setIsSending(false)
  }

  async function copyLink() {
    if (!generatedLink) return
    await navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function closeSendDialog() {
    setIsSendOpen(false)
    setGeneratedLink(null)
    setSelectedClientId('none')
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href={`/dashboard/${studioSlug}/questionnaires`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            Questionnaires
          </Link>
          <h1 className="text-display-sm font-display font-semibold text-foreground">{template.name}</h1>
          {template.description && <p className="text-body text-muted-foreground mt-1">{template.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsSendOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !isDirty}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder">Fields</TabsTrigger>
          <TabsTrigger value="responses">Responses ({responses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4 mt-4">
          {fields.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No fields yet — add one below to start building the form.
              </CardContent>
            </Card>
          )}

          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 pt-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => moveField(index, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === fields.length - 1} onClick={() => moveField(index, 1)}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="secondary">{FIELD_TYPE_LABELS[field.type]}</Badge>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        placeholder="Field label"
                        className="flex-1 min-w-[200px]"
                      />
                      <div className="flex items-center gap-2">
                        <Switch checked={field.required} onCheckedChange={(checked) => updateField(field.id, { required: checked })} />
                        <Label className="text-sm text-muted-foreground">Required</Label>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeField(field.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>

                    {field.options && (
                      <div className="space-y-2 pl-1">
                        {field.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <Input
                              value={option}
                              onChange={(e) => updateOption(field.id, optionIndex, e.target.value)}
                              className="max-w-xs"
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeOption(field.id, optionIndex)} disabled={field.options!.length <= 1}>
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => addOption(field.id)}>
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add option
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add a field</CardTitle>
              <CardDescription>Choose a field type to add it to the form</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(FIELD_TYPE_LABELS) as QuestionnaireFieldType[]).map((type) => (
                  <Button key={type} variant="outline" size="sm" onClick={() => addField(type)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {FIELD_TYPE_LABELS[type]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">No questionnaires sent yet</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    responses.map((response) => (
                      <TableRow key={response.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{response.clientName ?? 'No client linked'}</TableCell>
                        <TableCell>
                          <Badge variant={response.submittedAt ? 'success' : 'outline'}>
                            {response.submittedAt ? 'Submitted' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(response.createdAt), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {response.submittedAt ? format(new Date(response.submittedAt), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell>
                          {response.submittedAt && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewResponse(response)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isSendOpen} onOpenChange={(open) => (open ? setIsSendOpen(true) : closeSendDialog())}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Questionnaire</DialogTitle>
            <DialogDescription>Generates a unique link you can share with a client.</DialogDescription>
          </DialogHeader>
          {!generatedLink ? (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Client (optional)</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client — just generate a link</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeSendDialog}>Cancel</Button>
                <Button onClick={handleSend} disabled={isSending}>
                  {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Generate Link
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="py-4 space-y-3">
                <Label>Share this link with your client</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={generatedLink} className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={copyLink}>
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closeSendDialog}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewResponse} onOpenChange={(open) => !open && setViewResponse(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewResponse?.clientName ?? 'Response'}</DialogTitle>
            <DialogDescription>
              Submitted {viewResponse?.submittedAt ? format(new Date(viewResponse.submittedAt), 'MMM d, yyyy \'at\' h:mm a') : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {fields.map((field) => {
              const answer = viewResponse?.answers[field.id]
              return (
                <div key={field.id} className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{field.label}</p>
                  <p className="text-sm">
                    {Array.isArray(answer) ? answer.join(', ') : (answer as string) || <span className="text-muted-foreground">No answer</span>}
                  </p>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
