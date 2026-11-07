'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'

export type PreviewDevice = 'desktop' | 'mobile'

interface PreviewFrameProps {
  device: PreviewDevice
  /** Prefix the renderer builds page links from; clicks on those switch the editor's page instead of navigating. */
  basePath: string
  onNavigate: (path: string) => void
  /** A sample photo was clicked; the argument is the id of the section it belongs to. */
  onSelectSection?: (sectionId: string) => void
  title: string
  children: React.ReactNode
}

const BLANK_DOCUMENT = '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>'

/**
 * Link clicks inside the preview must never take the editor away from the
 * unsaved draft. Page links switch the selected page; mail/phone and other
 * local links are inert; in-page anchors and external links keep working.
 */
export function resolvePreviewClick(href: string, basePath: string): { kind: 'page'; path: string } | { kind: 'block' } | { kind: 'allow' } {
  if (href.startsWith('#') || /^https:\/\//i.test(href)) return { kind: 'allow' }
  if (href === basePath || href.startsWith(`${basePath}/`)) {
    const rest = href.slice(basePath.length).split(/[?#]/)[0] ?? ''
    return { kind: 'page', path: rest === '' ? '/' : rest }
  }
  return { kind: 'block' }
}

function ClickGuard({ basePath, onNavigate, onSelectSection, children }: Pick<PreviewFrameProps, 'basePath' | 'onNavigate' | 'onSelectSection' | 'children'>) {
  const handle = (event: React.MouseEvent<HTMLDivElement>, navigate: boolean) => {
    const sample = (event.target as HTMLElement).closest('[data-sample-section]')
    if (sample) {
      event.preventDefault()
      const sectionId = sample.getAttribute('data-sample-section')
      if (navigate && sectionId) onSelectSection?.(sectionId)
      return
    }
    const anchor = (event.target as HTMLElement).closest('a')
    if (!anchor) return
    const result = resolvePreviewClick(anchor.getAttribute('href') ?? '', basePath)
    if (result.kind === 'allow') return
    event.preventDefault()
    if (navigate && result.kind === 'page') onNavigate(result.path)
  }
  // A middle-click fires auxclick, not click; without this it would open the
  // saved preview route in a new tab instead of staying in the editor.
  return (
    <div onClickCapture={(event) => handle(event, true)} onAuxClickCapture={(event) => handle(event, false)}>
      {children}
    </div>
  )
}

// Responsive styles key off the viewport width, and a narrow <div> does not
// change that. A real iframe gives the preview its own 390px viewport, so the
// template's mobile layout is what gets shown. The page's stylesheets are
// copied in because an iframe does not inherit them.
function MobileFrame({ title, basePath, onNavigate, onSelectSection, children }: Omit<PreviewFrameProps, 'device'>) {
  const frameRef = React.useRef<HTMLIFrameElement>(null)
  const [mountNode, setMountNode] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const prepare = () => {
      const doc = frame.contentDocument
      if (!doc?.body) return
      doc.documentElement.className = document.documentElement.className
      doc.body.className = document.body.className
      doc.body.style.margin = '0'
      doc.head.querySelectorAll('[data-builder-copy]').forEach((node) => node.remove())
      document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
        const copy = node.cloneNode(true) as HTMLElement
        copy.setAttribute('data-builder-copy', '')
        doc.head.appendChild(copy)
      })
      setMountNode(doc.body)
    }
    if (frame.contentDocument?.readyState === 'complete') prepare()
    frame.addEventListener('load', prepare)
    return () => frame.removeEventListener('load', prepare)
  }, [])

  return (
    <div className="flex h-full justify-center overflow-auto bg-muted/40 p-4">
      <iframe ref={frameRef} title={title} srcDoc={BLANK_DOCUMENT} className="h-full min-h-[600px] w-[390px] max-w-full shrink-0 rounded-xl border bg-white shadow-sm" />
      {mountNode && createPortal(<ClickGuard basePath={basePath} onNavigate={onNavigate} onSelectSection={onSelectSection}>{children}</ClickGuard>, mountNode)}
    </div>
  )
}

export function PreviewFrame({ device, basePath, onNavigate, onSelectSection, title, children }: PreviewFrameProps) {
  if (device === 'mobile') {
    return <MobileFrame title={title} basePath={basePath} onNavigate={onNavigate} onSelectSection={onSelectSection}>{children}</MobileFrame>
  }
  return (
    <div className="h-full overflow-auto" aria-label={title} role="region">
      <ClickGuard basePath={basePath} onNavigate={onNavigate} onSelectSection={onSelectSection}>{children}</ClickGuard>
    </div>
  )
}
