import type { WebsiteSection } from './types'

export type WebsiteSectionType = WebsiteSection['type']

/** Order matters: it is the order the "Add a section" buttons appear in. */
export const SECTION_TYPES: WebsiteSectionType[] = ['hero', 'gallery', 'text', 'services', 'contact']

export const SECTION_LABELS: Record<WebsiteSectionType, string> = {
  hero: 'Hero',
  text: 'Story',
  gallery: 'Photo gallery',
  services: 'Services',
  contact: 'Contact',
}

// A fresh id per section keeps keys stable while sections are reordered, and
// the schema requires ids to be unique within a page.
export function createSection(type: WebsiteSectionType, id: string = crypto.randomUUID()): WebsiteSection {
  if (type === 'hero') return { id, type, eyebrow: '', heading: 'Your story starts here', body: '', ctaLabel: '', ctaHref: '' }
  if (type === 'gallery') return { id, type, heading: 'Selected work', galleryId: '' }
  if (type === 'services') return { id, type, heading: 'What we offer', items: [] }
  if (type === 'contact') return { id, type, heading: 'Let’s work together', body: '', ctaLabel: 'Get in touch', ctaHref: '' }
  return { id, type: 'text', heading: 'A little about us', body: '' }
}

/** Returns a new array with the item at `index` moved by `direction`, or the same array if it cannot move. */
export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= items.length) return items
  const next = [...items]
  const current = next[index]
  const swapped = next[nextIndex]
  if (current === undefined || swapped === undefined) return items
  next[index] = swapped
  next[nextIndex] = current
  return next
}
