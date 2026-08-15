'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Link2, Check } from 'lucide-react'
import { toast } from 'sonner'

export function CopyShareLinkButton({ token, basePath }: { token: string; basePath: string }) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    const url = `${window.location.origin}${basePath}/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Share link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link — copy it from the address shown below instead')
    }
  }

  return (
    <Button variant="outline" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 mr-2 text-success" /> : <Link2 className="h-4 w-4 mr-2" />}
      {copied ? 'Copied' : 'Copy share link'}
    </Button>
  )
}
