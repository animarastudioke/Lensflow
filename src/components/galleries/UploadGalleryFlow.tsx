'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dropzone } from '@/components/ui/dropzone'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  LayoutGrid,
  Columns,
  AlignJustify,
} from 'lucide-react'
import { toast } from 'sonner'
import { uploadGalleryMedia, updateGalleryLayout } from '@/lib/actions/galleries'
import type { GalleryLayoutType } from '@/lib/actions/galleries'

interface UploadGalleryFlowProps {
  studioSlug: string
  galleryId: string
  galleryName: string
  initialLayoutType: GalleryLayoutType
}

const LAYOUT_OPTIONS: { value: GalleryLayoutType; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'grid', label: 'Grid', description: 'Even squares in a uniform grid', icon: LayoutGrid },
  { value: 'masonry', label: 'Masonry', description: 'Pinterest-style columns that preserve each photo’s aspect ratio', icon: Columns },
  { value: 'justified', label: 'Justified', description: 'Full-width rows with photos scaled to fill each line', icon: AlignJustify },
]

type Step = 'upload' | 'layout'

export function UploadGalleryFlow({
  studioSlug,
  galleryId,
  galleryName,
  initialLayoutType,
}: UploadGalleryFlowProps) {
  const [step, setStep] = React.useState<Step>('upload')
  const [files, setFiles] = React.useState<File[]>([])
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadedCount, setUploadedCount] = React.useState<number | null>(null)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [layoutType, setLayoutType] = React.useState<GalleryLayoutType>(initialLayoutType)
  const [isSaving, setIsSaving] = React.useState(false)

  const galleryHref = `/dashboard/${studioSlug}/galleries/${galleryId}`

  const handleUpload = async () => {
    if (files.length === 0) return
    setIsUploading(true)
    setUploadError(null)

    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    const result = await uploadGalleryMedia(galleryId, studioSlug, formData)

    if ('error' in result) {
      setUploadError(result.error)
      toast.error(result.error)
      setIsUploading(false)
      return
    }

    setUploadedCount(result.uploaded)
    setIsUploading(false)
    setStep('layout')
  }

  const handleFinish = async () => {
    setIsSaving(true)
    try {
      await updateGalleryLayout(galleryId, studioSlug, layoutType)
    } catch (err) {
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        toast.error(err.message || 'Failed to save photo layout')
        setIsSaving(false)
      } else if (!(err instanceof Error)) {
        throw err
      }
    }
  }

  const steps: { key: Step; label: string }[] = [
    { key: 'upload', label: 'Upload photos' },
    { key: 'layout', label: 'Photo layout' },
  ]
  const stepIndex = steps.findIndex((s) => s.key === step)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={galleryHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to gallery
        </Link>
        <h1 className="text-display-md font-display font-semibold text-foreground">Upload Photos</h1>
        <p className="text-body text-muted-foreground mt-1">Add photos to &ldquo;{galleryName}&rdquo;</p>
      </div>

      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                  i < stepIndex ? 'bg-primary text-primary-foreground' :
                  i === stepIndex ? 'bg-primary/10 text-primary border border-primary' :
                  'bg-muted text-muted-foreground'
                )}
              >
                {i < stepIndex ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn('text-sm', i === stepIndex ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
          </React.Fragment>
        ))}
      </div>

      {step === 'upload' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Dropzone
              onFilesChange={setFiles}
              accept="image/*"
              maxFiles={100}
              maxSize={26214400}
              disabled={isUploading}
            />
            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
            <div className="flex justify-end">
              <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading {files.length} photo{files.length !== 1 ? 's' : ''}...
                  </>
                ) : (
                  <>
                    Upload {files.length > 0 ? `${files.length} photo${files.length !== 1 ? 's' : ''}` : 'photos'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'layout' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {uploadedCount != null && (
              <p className="text-sm text-success flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Uploaded {uploadedCount} photo{uploadedCount !== 1 ? 's' : ''}
              </p>
            )}
            <p className="text-sm text-muted-foreground">Choose how photos are arranged in this gallery.</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {LAYOUT_OPTIONS.map((option) => {
                const Icon = option.icon
                const selected = layoutType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLayoutType(option.value)}
                    className={cn(
                      'text-left rounded-lg border p-4 space-y-2 transition-colors',
                      selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Icon className={cn('h-6 w-6', selected ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="font-medium text-sm">{option.label}</div>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button type="button" onClick={handleFinish} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Choose cover design
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
