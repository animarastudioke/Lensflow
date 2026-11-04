import type { WebsiteSection } from './types'

export type WebsiteSectionType = WebsiteSection['type']

/** Order matters: it is the order the "Add a section" buttons appear in. */
export const SECTION_TYPES: WebsiteSectionType[] = ['hero', 'gallery', 'text', 'services', 'pricing', 'testimonials', 'contact']

export const SECTION_LABELS: Record<WebsiteSectionType, string> = {
  hero: 'Hero',
  text: 'Story',
  gallery: 'Photo gallery',
  services: 'Services',
  pricing: 'Pricing',
  testimonials: 'Testimonials',
  contact: 'Contact',
}

// A fresh id per section keeps keys stable while sections are reordered, and
// the schema requires ids to be unique within a page.
export function createSection(type: WebsiteSectionType, id: string = crypto.randomUUID()): WebsiteSection {
  if (type === 'hero') return { id, type, eyebrow: '', heading: 'Your story starts here', body: '', ctaLabel: '', ctaHref: '' }
  if (type === 'gallery') return { id, type, heading: 'Selected work', galleryId: '' }
  if (type === 'services') return { id, type, heading: 'What we offer', items: [] }
  if (type === 'pricing') return { id, type, heading: 'Investment', body: '', items: [] }
  if (type === 'testimonials') return { id, type, heading: 'Kind words', items: [] }
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

// Line-based fields: one item per line, parts separated by an em dash. The
// parsers cap lengths to the schema limits so a long paste is trimmed instead of rejected on save.
const SEPARATOR = ' — '

function lines(value: string, max: number): string[] {
  return value.split('\n').slice(0, max)
}

export function parseServiceItems(value: string) {
  return lines(value, 8).map((line) => {
    const [title = '', ...rest] = line.split(SEPARATOR)
    return { title: title.slice(0, 100), description: rest.join(SEPARATOR).slice(0, 500) }
  }).filter((item) => item.title.trim() || item.description.trim())
}

export function formatServiceItems(items: { title: string; description: string }[]): string {
  return items.map((item) => `${item.title}${SEPARATOR}${item.description}`).join('\n')
}

/** "Name — Price — Description"; the description may itself contain dashes. */
export function parsePricingItems(value: string) {
  return lines(value, 6).map((line) => {
    const [name = '', price = '', ...rest] = line.split(SEPARATOR)
    return { name: name.slice(0, 100), price: price.slice(0, 40), description: rest.join(SEPARATOR).slice(0, 500) }
  }).filter((item) => item.name.trim() || item.price.trim() || item.description.trim())
}

export function formatPricingItems(items: { name: string; price: string; description: string }[]): string {
  return items.map((item) => `${item.name}${SEPARATOR}${item.price}${SEPARATOR}${item.description}`).join('\n')
}

/** "Quote — Author"; the author is the part after the last separator, so quotes may contain dashes. */
export function parseTestimonialItems(value: string) {
  return lines(value, 6).map((line) => {
    const at = line.lastIndexOf(SEPARATOR)
    const quote = at === -1 ? line : line.slice(0, at)
    const author = at === -1 ? '' : line.slice(at + SEPARATOR.length)
    return { quote: quote.slice(0, 500), author: author.slice(0, 100) }
  }).filter((item) => item.quote.trim() || item.author.trim())
}

export function formatTestimonialItems(items: { quote: string; author: string }[]): string {
  return items.map((item) => `${item.quote}${SEPARATOR}${item.author}`).join('\n')
}
