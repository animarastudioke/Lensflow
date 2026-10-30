import type { WebsiteSection } from './types'
export type { WebsiteGalleryImage, WebsiteGalleryOption, WebsiteSection } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalText(value: unknown, maxLength: number): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.length <= maxLength)
}

function isValidLink(value: unknown): value is string | undefined {
  if (value === undefined || value === '') return true
  if (typeof value !== 'string' || value.length > 500) return false
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true
  if (value.startsWith('#')) return /^#[a-zA-Z0-9_-]*$/.test(value)
  if (/^https:\/\//i.test(value)) {
    try {
      return new URL(value).protocol === 'https:'
    } catch {
      return false
    }
  }
  return /^(mailto:[^\s]+|tel:\+?[0-9(). -]+)$/i.test(value)
}

function isWebsiteSection(value: unknown): value is WebsiteSection {
  if (!isRecord(value) || typeof value.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value.id)) return false
  if (typeof value.heading !== 'string' || value.heading.length > 200) return false
  if (!optionalText(value.body, 5000)) return false

  const galleryIdValid = value.galleryId === undefined
    || value.galleryId === ''
    || (typeof value.galleryId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.galleryId))

  if (value.type === 'hero') {
    return optionalText(value.eyebrow, 80)
      && optionalText(value.ctaLabel, 80)
      && isValidLink(value.ctaHref)
      && galleryIdValid
  }
  if (value.type === 'text') return true
  if (value.type === 'gallery') return galleryIdValid
  if (value.type === 'services') {
    return Array.isArray(value.items)
      && value.items.length <= 8
      && value.items.every((item) => isRecord(item)
        && typeof item.title === 'string' && item.title.length <= 100
        && typeof item.description === 'string' && item.description.length <= 500)
  }
  if (value.type === 'contact') return optionalText(value.ctaLabel, 80) && isValidLink(value.ctaHref)
  return false
}

export function getWebsiteSections(content: unknown, pageName: string): WebsiteSection[] {
  if (isRecord(content)) {
    if (Array.isArray(content.sections)) {
      const seenIds = new Set<string>()
      return content.sections.slice(0, 30).filter((candidate) => {
        if (!isWebsiteSection(candidate) || seenIds.has(candidate.id)) return false
        seenIds.add(candidate.id)
        return true
      })
    }

    // Read older pages without changing their stored data until the user saves.
    if (typeof content.heading === 'string' || typeof content.body === 'string') {
      return [{
        id: 'legacy-content',
        type: 'text',
        heading: typeof content.heading === 'string' && content.heading ? content.heading.slice(0, 200) : pageName,
        body: typeof content.body === 'string' ? content.body.slice(0, 5000) : '',
      }]
    }
  }

  return [{ id: 'hero', type: 'hero', heading: pageName, body: '' }]
}

export function createDefaultWebsiteSections(websiteName: string): WebsiteSection[] {
  return [
    {
      id: 'hero',
      type: 'hero',
      eyebrow: 'Photography & films',
      heading: websiteName,
      body: 'Stories, portraits, and moments made to be remembered.',
      ctaLabel: 'Get in touch',
      ctaHref: '#contact',
    },
    { id: 'portfolio', type: 'gallery', heading: 'Selected work', galleryId: '' },
    {
      id: 'contact',
      type: 'contact',
      heading: 'Let’s make something memorable.',
      body: 'Tell us a little about what you have in mind.',
    },
  ]
}

export function isSafeWebsitePreviewUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.origin === 'https://media.lensflow.co.ke'
      && /^\/studios\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/galleries\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/assets\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/(?:preview|thumb)\.webp$/i.test(url.pathname)
      && !url.search
      && !url.hash
  } catch {
    return false
  }
}

