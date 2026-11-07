import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { websiteSectionsSchema } from '@/lib/website/section-schema'
import { getWebsiteSections } from '@/lib/website/content'
import {
  SECTION_TYPES,
  createSection,
  formatPricingItems,
  formatTestimonialItems,
  parsePricingItems,
  parseServiceItems,
  parseTestimonialItems,
} from '@/lib/website/section-defaults'
import { WebsiteRenderer } from '@/components/website/WebsiteRenderer'

// The schema (what a save accepts) and the content guard (what a page load
// will render) are two separate validators, so each new section type has to
// be accepted by both or a saved page would silently lose the section.

const pricing = { id: 'p1', type: 'pricing', heading: 'Investment', body: 'Packages', items: [{ name: 'Essential', price: 'KES 45,000', description: '4 hours' }] }
const testimonials = { id: 't1', type: 'testimonials', heading: 'Kind words', items: [{ quote: 'Lovely', author: 'Amina' }] }

describe('new section types: validation', () => {
  it('accepts pricing and testimonials in both validators', () => {
    expect(websiteSectionsSchema.safeParse([pricing, testimonials]).success).toBe(true)
    expect(getWebsiteSections({ version: 1, sections: [pricing, testimonials] }, 'Page')).toEqual([pricing, testimonials])
  })

  it('rejects over-long or oversized lists in the schema', () => {
    const tooMany = { ...pricing, items: Array.from({ length: 7 }, () => pricing.items[0]) }
    expect(websiteSectionsSchema.safeParse([tooMany]).success).toBe(false)
    expect(websiteSectionsSchema.safeParse([{ ...pricing, items: [{ name: 'x', price: 'y'.repeat(41), description: '' }] }]).success).toBe(false)
    expect(websiteSectionsSchema.safeParse([{ ...testimonials, items: [{ quote: 'q'.repeat(501), author: 'a' }] }]).success).toBe(false)
    expect(websiteSectionsSchema.safeParse([{ ...testimonials, items: [{ quote: 'q', author: 'a'.repeat(101) }] }]).success).toBe(false)
  })

  it('drops a malformed stored section on load instead of rendering it', () => {
    const bad = { ...pricing, items: [{ name: 1, price: 'x', description: '' }] }
    const loaded = getWebsiteSections({ version: 1, sections: [bad, testimonials] }, 'Page')
    expect(loaded.map((s) => s.id)).toEqual(['t1'])
  })

  it('every type the editor can add survives the schema', () => {
    for (const type of SECTION_TYPES) {
      expect(websiteSectionsSchema.safeParse([createSection(type, `s-${type}`)]).success, type).toBe(true)
    }
  })
})

describe('line parsers', () => {
  it('round-trips pricing lines and keeps dashes inside the description', () => {
    const items = [{ name: 'Essential', price: 'KES 45,000', description: '4 hours — 200 edits' }]
    expect(parsePricingItems(formatPricingItems(items))).toEqual(items)
  })

  it('takes the testimonial author from the last separator', () => {
    expect(parseTestimonialItems('Calm — and kind — Amina')).toEqual([{ quote: 'Calm — and kind', author: 'Amina' }])
    expect(parseTestimonialItems('No author here')).toEqual([{ quote: 'No author here', author: '' }])
    expect(parseTestimonialItems(formatTestimonialItems([{ quote: 'Lovely', author: 'Amina' }]))).toEqual([{ quote: 'Lovely', author: 'Amina' }])
  })

  it('trims to the schema limits and ignores blank lines and extra lines', () => {
    expect(parsePricingItems('\n\nA — B — C\n')).toHaveLength(1)
    expect(parsePricingItems(Array.from({ length: 9 }, (_, i) => `P${i} — 1`).join('\n'))).toHaveLength(6)
    expect(parseServiceItems(Array.from({ length: 12 }, (_, i) => `S${i}`).join('\n'))).toHaveLength(8)
    const [item] = parsePricingItems(`${'n'.repeat(150)} — ${'p'.repeat(60)} — ${'d'.repeat(700)}`)
    expect(item?.name).toHaveLength(100)
    expect(item?.price).toHaveLength(40)
    expect(item?.description).toHaveLength(500)
    expect(websiteSectionsSchema.safeParse([{ id: 'p', type: 'pricing', heading: 'h', items: [item] }]).success).toBe(true)
  })
})

function renderSections(sections: unknown[], preview = false) {
  return render(
    <WebsiteRenderer studioName="S" websiteName="S" navPages={[]} currentPath="/" page={{ name: 'Investment', content: { version: 1, sections } }} basePath="/p" preview={preview} />
  )
}

describe('new section types: rendering', () => {
  it('renders packages with name, price and description', () => {
    renderSections([pricing])
    expect(screen.getByRole('heading', { name: 'Essential' })).toBeInTheDocument()
    expect(screen.getByText('KES 45,000')).toBeInTheDocument()
    expect(screen.getByText('4 hours')).toBeInTheDocument()
  })

  it('renders testimonials as quotes with their author', () => {
    renderSections([testimonials])
    expect(screen.getByText('“Lovely”')).toBeInTheDocument()
    expect(screen.getByText('Amina')).toBeInTheDocument()
  })

  it('hides an empty section from visitors but shows a hint in the editor preview', () => {
    const empty = [{ ...pricing, items: [] }, { ...testimonials, items: [] }]
    const { unmount } = renderSections(empty)
    expect(screen.queryByText('Investment')).not.toBeInTheDocument()
    expect(screen.queryByText('Kind words')).not.toBeInTheDocument()
    unmount()
    renderSections(empty, true)
    expect(screen.getByText('Add your packages and prices to show them here.')).toBeInTheDocument()
    expect(screen.getByText('Add kind words from clients to show them here.')).toBeInTheDocument()
  })
})

describe('sample photos never reach visitors', () => {
  const sections = [
    { id: 'hero', type: 'hero' as const, heading: 'Hello', galleryId: '' },
    { id: 'portfolio', type: 'gallery' as const, heading: 'Work', galleryId: '' },
  ]
  const renderPage = (preview: boolean) => render(
    <WebsiteRenderer
      studioName="S"
      websiteName="S"
      template="modern-minimal"
      navPages={[]}
      currentPath="/"
      page={{ name: 'Home', content: { version: 1, sections } }}
      galleryOptions={[]}
      basePath="/portfolio/s"
      preview={preview}
    />,
  )

  it('renders samples in preview mode', () => {
    renderPage(true)
    expect(screen.getAllByRole('button', { name: /sample photo/i }).length).toBeGreaterThan(0)
  })

  it('renders none on the public site', () => {
    const { container } = renderPage(false)
    expect(screen.queryByRole('button', { name: /sample photo/i })).not.toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})

describe('uploaded photos render for visitors', () => {
  const url = 'https://media.lensflow.co.ke/studios/123e4567-e89b-42d3-a456-426614174000/website/img-123e4567-e89b-42d3-a456-426614174002.webp'
  it('shows the hero and gallery photos on the public site, and no sample', () => {
    const sections = [
      { id: 'hero', type: 'hero' as const, heading: 'Hello', imageUrl: url },
      { id: 'portfolio', type: 'gallery' as const, heading: 'Work', imageUrls: [url, url] },
    ]
    render(
      <WebsiteRenderer studioName="S" websiteName="S" template="modern-minimal" navPages={[]} currentPath="/" page={{ name: 'Home', content: { version: 1, sections } }} galleryOptions={[]} basePath="/portfolio/s" />,
    )
    expect(screen.getByRole('img', { name: 'Hello' })).toHaveAttribute('src', url)
    expect(screen.getAllByRole('img', { name: /Work \d/ })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /sample photo/i })).not.toBeInTheDocument()
  })
})

describe('call-to-action buttons without a saved brand colour', () => {
  const sections = [{ id: 'hero', type: 'hero' as const, heading: 'Hi', ctaLabel: 'Book now', ctaHref: 'mailto:hello@example.com' }]
  const renderWith = (primaryColor: string | null) => render(
    <WebsiteRenderer studioName="S" websiteName="S" template="modern-minimal" primaryColor={primaryColor} navPages={[]} currentPath="/" page={{ name: 'Home', content: { version: 1, sections } }} basePath="/portfolio/s" />,
  )
  it('still get a visible background on a light template', () => {
    renderWith(null)
    expect(screen.getByRole('link', { name: 'Book now' })).toHaveStyle({ backgroundColor: '#292524' })
  })
  it('use the saved brand colour when there is one', () => {
    renderWith('#3B82F6')
    expect(screen.getByRole('link', { name: 'Book now' })).toHaveStyle({ backgroundColor: '#3B82F6' })
  })
})

describe('example testimonials and pricing', () => {
  const sections = [
    { id: 't', type: 'testimonials' as const, heading: 'Kind words', sample: true as const, items: [{ quote: 'Lovely work', author: 'Client name' }] },
    { id: 'p', type: 'pricing' as const, heading: 'Packages', sample: true as const, items: [{ name: 'Essential', price: 'KES 25,000', description: 'x' }] },
  ]
  const renderPage = (preview: boolean, list = sections) => render(
    <WebsiteRenderer studioName="S" websiteName="S" template="modern-minimal" navPages={[]} currentPath="/" page={{ name: 'Home', content: { version: 1, sections: list } }} basePath="/portfolio/s" preview={preview} />,
  )

  it('are hidden from visitors', () => {
    renderPage(false)
    expect(screen.queryByText(/Lovely work/)).not.toBeInTheDocument()
    expect(screen.queryByText('KES 25,000')).not.toBeInTheDocument()
  })

  it('show in the preview with a note that visitors do not see them', () => {
    renderPage(true)
    expect(screen.getByText(/Lovely work/)).toBeInTheDocument()
    expect(screen.getAllByText(/Visitors don.t see this until you edit it/)).toHaveLength(2)
  })

  it('show to visitors once the example flag is gone', () => {
    renderPage(false, sections.map(({ sample: _sample, ...rest }) => rest) as never)
    expect(screen.getByText(/Lovely work/)).toBeInTheDocument()
    expect(screen.getByText('KES 25,000')).toBeInTheDocument()
  })

  it('pass both validators with the flag, and reject a value other than true', () => {
    expect(websiteSectionsSchema.safeParse(sections).success).toBe(true)
    expect(getWebsiteSections({ version: 1, sections }, 'P')).toEqual(sections)
    const bad = [{ ...sections[0], sample: false }]
    expect(websiteSectionsSchema.safeParse(bad).success).toBe(false)
    expect(getWebsiteSections({ version: 1, sections: bad }, 'P')).not.toEqual(bad)
  })
})
