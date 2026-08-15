'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, Loader2, PenLine } from 'lucide-react'
import { toast } from 'sonner'
import { submitQuestionnaireResponse, type PublicQuestionnaire, type QuestionnaireField } from '@/lib/actions/questionnaires'

interface QuestionnaireFormProps {
  token: string
  questionnaire: PublicQuestionnaire
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: QuestionnaireField
  value: unknown
  onChange: (value: unknown) => void
}) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'file_upload':
      return (
        <Input
          type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.type === 'file_upload' ? 'Paste a link to the file...' : undefined}
          required={field.required}
        />
      )
    case 'long_text':
      return (
        <Textarea value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} rows={4} required={field.required} />
      )
    case 'number':
      return (
        <Input type="number" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} required={field.required} />
      )
    case 'date':
      return (
        <Input type="date" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} required={field.required} />
      )
    case 'time':
      return (
        <Input type="time" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} required={field.required} />
      )
    case 'dropdown':
      return (
        <Select value={(value as string) ?? ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'radio':
      return (
        <RadioGroup value={(value as string) ?? ''} onValueChange={onChange}>
          {(field.options ?? []).map((option) => (
            <div key={option} className="flex items-center gap-2">
              <RadioGroupItem value={option} id={`${field.id}-${option}`} />
              <Label htmlFor={`${field.id}-${option}`} className="font-normal">{option}</Label>
            </div>
          ))}
        </RadioGroup>
      )
    case 'checkbox': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      return (
        <div className="space-y-2">
          {(field.options ?? []).map((option) => (
            <div key={option} className="flex items-center gap-2">
              <Checkbox
                id={`${field.id}-${option}`}
                checked={selected.includes(option)}
                onCheckedChange={(checked) =>
                  onChange(checked ? [...selected, option] : selected.filter((o) => o !== option))
                }
              />
              <Label htmlFor={`${field.id}-${option}`} className="font-normal">{option}</Label>
            </div>
          ))}
        </div>
      )
    }
    case 'signature':
      return (
        <div className="space-y-1.5">
          <div className="relative">
            <PenLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={(value as string) ?? ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type your full name to sign"
              className="pl-9 text-lg italic"
              required={field.required}
            />
          </div>
          <p className="text-xs text-muted-foreground">By typing your name, you agree this counts as your signature.</p>
        </div>
      )
    default:
      return null
  }
}

export function QuestionnaireForm({ token, questionnaire }: QuestionnaireFormProps) {
  const [answers, setAnswers] = React.useState<Record<string, unknown>>(questionnaire.answers ?? {})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSubmitted, setIsSubmitted] = React.useState(!!questionnaire.submittedAt)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const missing = questionnaire.fields.find((f) => {
      if (!f.required) return false
      const v = answers[f.id]
      return v === undefined || v === '' || (Array.isArray(v) && v.length === 0)
    })
    if (missing) {
      setError(`Please fill in "${missing.label}"`)
      return
    }

    setError(null)
    setIsSubmitting(true)
    const result = await submitQuestionnaireResponse(token, answers)
    if ('error' in result) {
      setError(result.error)
      toast.error(result.error)
      setIsSubmitting(false)
      return
    }
    setIsSubmitted(true)
    setIsSubmitting(false)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10 space-y-3">
            <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
            <h1 className="text-xl font-semibold">Thank you!</h1>
            <p className="text-muted-foreground">Your response has been submitted to {questionnaire.studioName}.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">{questionnaire.studioName}</p>
            <CardTitle className="text-2xl">{questionnaire.templateName}</CardTitle>
            {questionnaire.templateDescription && <CardDescription>{questionnaire.templateDescription}</CardDescription>}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {questionnaire.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label>
                    {field.label}
                    {field.required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  <FieldInput
                    field={field}
                    value={answers[field.id]}
                    onChange={(value) => setAnswers((prev) => ({ ...prev, [field.id]: value }))}
                  />
                </div>
              ))}

              {questionnaire.fields.length === 0 && (
                <p className="text-muted-foreground text-center py-6">This questionnaire has no fields yet.</p>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              {questionnaire.fields.length > 0 && (
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
