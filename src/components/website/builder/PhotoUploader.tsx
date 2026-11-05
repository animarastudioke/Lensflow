'use client'

import * as React from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export type UploadImage = (file: File) => Promise<{ url: string } | { error: string }>

interface PhotoUploaderProps {
  id: string
  label: string
  urls: string[]
  /** 1 for a single replaceable photo (hero), more for a gallery. */
  max: number
  onChange: (urls: string[]) => void
  onUpload: UploadImage
}

/**
 * Upload-from-device for a section's photos. Files are uploaded one at a time
 * as they are chosen; a failure names the file and leaves the others in place.
 */
export function PhotoUploader({ id, label, urls, max, onChange, onUpload }: PhotoUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  // Uploads finish asynchronously, so each one appends to the latest list
  // rather than to the `urls` captured when the files were chosen.
  const latest = React.useRef(urls)
  latest.current = urls

  const single = max === 1

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    setError(null)
    const chosen = Array.from(files).slice(0, single ? 1 : Math.max(0, max - latest.current.length))
    for (const file of chosen) {
      const result = await onUpload(file)
      if ('error' in result) {
        setError(`${file.name}: ${result.error}`)
        continue
      }
      const next = single ? [result.url] : [...latest.current, result.url]
      latest.current = next
      onChange(next)
    }
    if (!single && files.length > chosen.length) setError(`Only ${max} photos fit in one section.`)
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const full = !single && urls.length >= max

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {urls.length > 0 && (
        <ul className={single ? 'w-40' : 'grid grid-cols-4 gap-2'}>
          {urls.map((url, index) => (
            <li key={url} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                onClick={() => onChange(urls.filter((item) => item !== url))}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={!single}
        className="sr-only"
        disabled={busy || full}
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <Button type="button" variant="outline" size="sm" disabled={busy || full} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1.5 h-4 w-4" />}
        {busy ? 'Uploading…' : single ? (urls.length > 0 ? 'Replace photo' : 'Upload a photo') : 'Add photos'}
      </Button>
      <p className="text-xs text-muted-foreground">
        {single ? 'JPEG, PNG or WebP up to 12MB.' : `JPEG, PNG or WebP up to 12MB each. Up to ${max} photos.`}
      </p>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
