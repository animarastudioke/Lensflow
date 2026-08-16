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
import {
  finalizeGalleryMediaUpload,
  finalizeVideoUpload,
  requestGalleryUploadUrls,
  requestVideoUploadUrls,
  updateGalleryLayout,
} from '@/lib/actions/galleries'
import type { GalleryLayoutType } from '@/lib/actions/galleries'
import { mapWithConcurrency } from '@/lib/utils/concurrency'

// Cap on simultaneous PUTs to R2 — high enough to overlap network latency
// across files, low enough not to saturate the browser's connection pool.
const UPLOAD_CONCURRENCY = 5

const MAX_IMAGE_SIZE_BYTES = 26214400 // 25MB
const MAX_VIDEO_SIZE_BYTES = 524288000 // 500MB — must match galleries.ts's server-side cap

/**
 * Captures a poster frame from a video file entirely client-side (a couple
 * of seconds into the clip rather than frame 0, which is often black) and
 * downsamples it to preview/thumb sizes matching the photo pipeline's
 * conventions. There is no reliable way to do this server-side on Vercel's
 * serverless runtime, so unlike photos, video gets no server-side processing
 * at all — the raw file uploads straight to its final R2 key.
 */
function captureVideoPoster(file: File): Promise<{ previewBlob: Blob; thumbBlob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const videoEl = document.createElement('video')
    videoEl.preload = 'metadata'
    videoEl.muted = true
    videoEl.playsInline = true
    const objectUrl = URL.createObjectURL(file)
    videoEl.src = objectUrl

    const cleanup = () => URL.revokeObjectURL(objectUrl)

    const toWebp = (canvas: HTMLCanvasElement, quality: number) =>
      new Promise<Blob>((res, rej) => {
        canvas.toBlob((blob) => (blob ? res(blob) : rej(new Error('Failed to encode poster image'))), 'image/webp', quality)
      })

    videoEl.onloadedmetadata = () => {
      videoEl.currentTime = Math.min(1, videoEl.duration / 2 || 0)
    }

    videoEl.onseeked = async () => {
      try {
        const width = videoEl.videoWidth
        const height = videoEl.videoHeight

        const drawScaled = (maxDim: number) => {
          const scale = Math.min(1, maxDim / Math.max(width, height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.max(1, Math.round(width * scale))
          canvas.height = Math.max(1, Math.round(height * scale))
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Canvas is not supported in this browser')
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
          return canvas
        }

        const [previewBlob, thumbBlob] = await Promise.all([
          toWebp(drawScaled(1600), 0.9),
          toWebp(drawScaled(600), 0.8),
        ])

        cleanup()
        resolve({ previewBlob, thumbBlob, width, height })
      } catch (err) {
        cleanup()
        reject(err instanceof Error ? err : new Error('Failed to capture video poster'))
      }
    }

    videoEl.onerror = () => {
      cleanup()
      reject(new Error('Failed to read video file'))
    }
  })
}

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

  const uploadImages = async (imageFiles: File[]): Promise<{ uploaded: number; error: string | null }> => {
    if (imageFiles.length === 0) return { uploaded: 0, error: null }

    let quotaError: string | null = null

    // Auth/permission/quota checks for the whole batch happen in one round
    // trip; only the presign itself is per file.
    const presignResponse = await requestGalleryUploadUrls(
      galleryId,
      imageFiles.map((file) => ({ filename: file.name, contentType: file.type, sizeBytes: file.size }))
    )

    if ('error' in presignResponse) {
      return { uploaded: 0, error: presignResponse.error }
    }

    // requestGalleryUploadUrls returns results in the same order as the
    // input files, so pair by index rather than filename — duplicate
    // filenames in one batch (e.g. two "IMG_0001.jpg" from different folders)
    // would otherwise collide on a filename-keyed lookup.
    const presignResults = presignResponse.results

    // Files PUT to R2 in parallel (bounded) instead of one at a time — the
    // browser talks directly to R2, not through this Vercel function, so the
    // 4.5MB serverless body-size cap never applies.
    const uploadResults = await mapWithConcurrency(imageFiles, UPLOAD_CONCURRENCY, async (file, index) => {
      const presigned = presignResults[index]

      if (!presigned || 'error' in presigned) {
        console.error('Failed to get upload URL:', presigned?.error)
        quotaError = presigned?.error ?? quotaError
        return null
      }

      const putResponse = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      if (!putResponse.ok) {
        console.error('Direct R2 upload error:', putResponse.status, putResponse.statusText)
        return null
      }

      return { mediaId: presigned.mediaId, key: presigned.key, filename: file.name }
    })

    const uploaded = uploadResults.filter(
      (r): r is { mediaId: string; key: string; filename: string } => r !== null
    )

    if (uploaded.length === 0) {
      return { uploaded: 0, error: quotaError || 'Failed to upload photos. Please try again.' }
    }

    const result = await finalizeGalleryMediaUpload(galleryId, studioSlug, uploaded)

    if ('error' in result) {
      return { uploaded: 0, error: result.error }
    }

    return { uploaded: result.uploaded, error: null }
  }

  const uploadVideos = async (videoFiles: File[]): Promise<{ uploaded: number; error: string | null }> => {
    if (videoFiles.length === 0) return { uploaded: 0, error: null }

    let firstError: string | null = null

    const presignResponse = await requestVideoUploadUrls(
      galleryId,
      videoFiles.map((file) => ({ filename: file.name, contentType: file.type, sizeBytes: file.size }))
    )

    if ('error' in presignResponse) {
      return { uploaded: 0, error: presignResponse.error }
    }

    const presignResults = presignResponse.results

    // Video uploads are heavier (poster-frame capture + a large PUT), so a
    // lower concurrency than photos keeps the browser from choking on
    // several simultaneous multi-hundred-MB requests.
    const uploadResults = await mapWithConcurrency(videoFiles, 2, async (file, index) => {
      const presigned = presignResults[index]

      if (!presigned || 'error' in presigned) {
        console.error('Failed to get video upload URL:', presigned?.error)
        firstError = firstError ?? presigned?.error ?? null
        return null
      }

      let poster: { previewBlob: Blob; thumbBlob: Blob; width: number; height: number }
      try {
        poster = await captureVideoPoster(file)
      } catch (err) {
        console.error('Video poster capture error:', err)
        firstError = firstError ?? (err instanceof Error ? err.message : 'Failed to process video')
        return null
      }

      const [videoPut, previewPut, thumbPut] = await Promise.all([
        fetch(presigned.videoUploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } }),
        fetch(presigned.posterPreviewUploadUrl, { method: 'PUT', body: poster.previewBlob, headers: { 'Content-Type': 'image/webp' } }),
        fetch(presigned.posterThumbUploadUrl, { method: 'PUT', body: poster.thumbBlob, headers: { 'Content-Type': 'image/webp' } }),
      ])

      if (!videoPut.ok || !previewPut.ok || !thumbPut.ok) {
        console.error('Direct R2 video upload error:', videoPut.status, previewPut.status, thumbPut.status)
        return null
      }

      return {
        mediaId: presigned.mediaId,
        videoKey: presigned.videoKey,
        posterPreviewKey: presigned.posterPreviewKey,
        posterThumbKey: presigned.posterThumbKey,
        filename: file.name,
        width: poster.width,
        height: poster.height,
      }
    })

    const uploaded = uploadResults.filter((r): r is NonNullable<typeof r> => r !== null)

    if (uploaded.length === 0) {
      return { uploaded: 0, error: firstError || 'Failed to upload videos. Please try again.' }
    }

    const result = await finalizeVideoUpload(galleryId, studioSlug, uploaded)

    if ('error' in result) {
      return { uploaded: 0, error: result.error }
    }

    return { uploaded: result.uploaded, error: null }
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setIsUploading(true)
    setUploadError(null)

    const imageFiles = files.filter((f) => f.type.startsWith('image/') && f.size <= MAX_IMAGE_SIZE_BYTES)
    const oversizedImages = files.filter((f) => f.type.startsWith('image/') && f.size > MAX_IMAGE_SIZE_BYTES)
    const videoFiles = files.filter((f) => f.type.startsWith('video/') && f.size <= MAX_VIDEO_SIZE_BYTES)
    const oversizedVideos = files.filter((f) => f.type.startsWith('video/') && f.size > MAX_VIDEO_SIZE_BYTES)

    const [imageResult, videoResult] = await Promise.all([uploadImages(imageFiles), uploadVideos(videoFiles)])

    const totalUploaded = imageResult.uploaded + videoResult.uploaded
    const errors = [imageResult.error, videoResult.error].filter((e): e is string => !!e)

    if (oversizedImages.length > 0) {
      toast.error(`${oversizedImages.length} photo${oversizedImages.length !== 1 ? 's' : ''} skipped — over the 25MB limit`)
    }
    if (oversizedVideos.length > 0) {
      toast.error(`${oversizedVideos.length} video${oversizedVideos.length !== 1 ? 's' : ''} skipped — over the 500MB limit`)
    }

    if (totalUploaded === 0) {
      const message = errors[0] || 'Failed to upload files. Please try again.'
      setUploadError(message)
      toast.error(message)
      setIsUploading(false)
      return
    }

    if (errors.length > 0) {
      errors.forEach((e) => toast.error(e))
    }
    if (totalUploaded < files.length) {
      toast.warning(`${totalUploaded} of ${files.length} files uploaded successfully`)
    }

    setUploadedCount(totalUploaded)
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
    { key: 'upload', label: 'Upload media' },
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
        <h1 className="text-display-md font-display font-semibold text-foreground">Upload Media</h1>
        <p className="text-body text-muted-foreground mt-1">Add photos and videos to &ldquo;{galleryName}&rdquo;</p>
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
              accept="image/*,video/*"
              maxFiles={100}
              maxSize={MAX_VIDEO_SIZE_BYTES}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">Photos up to 25MB, videos up to 500MB.</p>
            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
            <div className="flex justify-end">
              <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading {files.length} file{files.length !== 1 ? 's' : ''}...
                  </>
                ) : (
                  <>
                    Upload {files.length > 0 ? `${files.length} file${files.length !== 1 ? 's' : ''}` : 'media'}
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
                Uploaded {uploadedCount} file{uploadedCount !== 1 ? 's' : ''}
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
