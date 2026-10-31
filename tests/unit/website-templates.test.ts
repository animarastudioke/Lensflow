import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TEMPLATE_ID,
  SERVICE_IDS,
  TEMPLATES,
  TEMPLATE_IDS,
  getTemplate,
  isTemplateId,
  rankTemplatesForService,
} from '@/lib/website/templates'
import { websiteSectionsSchema } from '@/lib/website/section-schema'

// Templates are copied into the database once at creation and rendered from a
// registry afterwards, so a broken template would either fail every
// createWebsite call for it or publish something the editor then rejects.

const PAGE_PATH = /^\/[a-z0-9-/]*$/

describe('website template registry', () => {
  it('has unique ids and keeps the three originally shipped templates', () => {
    expect(new Set(TEMPLATE_IDS).size).toBe(TEMPLATE_IDS.length)
    for (const id of ['modern-minimal', 'elegant-wedding', 'bold-editorial']) {
      expect(TEMPLATE_IDS).toContain(id)
    }
    expect(TEMPLATE_IDS).toContain(DEFAULT_TEMPLATE_ID)
  })

  it('names at least one known service per template', () => {
    for (const template of TEMPLATES) {
      expect(template.services.length).toBeGreaterThan(0)
      for (const service of template.services) expect(SERVICE_IDS).toContain(service)
    }
  })

  it.each(TEMPLATES.map((template) => [template.id, template] as const))(
    '%s seeds valid, publishable starter pages',
    (_id, template) => {
      const pages = template.starterPages('Test Studio')
      expect(pages[0]?.path).toBe('/')

      const paths = pages.map((page) => page.path)
      expect(new Set(paths).size).toBe(paths.length)

      for (const page of pages) {
        expect(page.name.trim()).not.toBe('')
        expect(page.path).toMatch(PAGE_PATH)
        expect(page.path === '/' || !page.path.endsWith('/')).toBe(true)

        // The same schema the editor applies on save: starter content the
        // editor would refuse to re-save is a bug.
        const parsed = websiteSectionsSchema.safeParse(page.sections)
        expect(parsed.success, `${template.id} ${page.path}`).toBe(true)

        const sectionIds = page.sections.map((section) => section.id)
        expect(new Set(sectionIds).size).toBe(sectionIds.length)
      }
    }
  )

  it('only seeds in-page anchors for calls to action, which stay inside the studio site', () => {
    for (const template of TEMPLATES) {
      for (const page of template.starterPages('Test Studio')) {
        for (const section of page.sections) {
          if ('ctaHref' in section && section.ctaHref) expect(section.ctaHref, template.id).toMatch(/^#[a-z-]+$/)
        }
      }
    }
  })

  it('never seeds contact details or links to other sites', () => {
    for (const template of TEMPLATES) {
      const text = JSON.stringify(template.starterPages('Test Studio'))
      expect(text, template.id).not.toMatch(/@|https?:\/\/|\+?\d[\d\s-]{6,}\d/)
    }
  })

  it('puts the studio name only where the starter copy asks for it', () => {
    const pages = getTemplate('elegant-wedding').starterPages('Ada & Co')
    expect(JSON.stringify(pages)).toContain('Ada & Co')
  })
})

describe('getTemplate and isTemplateId', () => {
  it('falls back to the default for retired or missing ids instead of throwing', () => {
    expect(getTemplate('retired-template').id).toBe(DEFAULT_TEMPLATE_ID)
    expect(getTemplate(null).id).toBe(DEFAULT_TEMPLATE_ID)
    expect(getTemplate(undefined).id).toBe(DEFAULT_TEMPLATE_ID)
  })

  it('resolves a retired id to a registered one, which is what the editor starts from', () => {
    expect(isTemplateId(getTemplate('retired-template').id)).toBe(true)
  })

  it('only accepts registered ids', () => {
    expect(isTemplateId('bold-editorial')).toBe(true)
    expect(isTemplateId('Bold-Editorial')).toBe(false)
    expect(isTemplateId('../etc/passwd')).toBe(false)
    expect(isTemplateId(42)).toBe(false)
  })
})

describe('rankTemplatesForService', () => {
  it('returns every template when no service is chosen', () => {
    expect(rankTemplatesForService(null).map((t) => t.id)).toEqual(TEMPLATES.map((t) => t.id))
  })

  it.each(SERVICE_IDS)('lists %s templates first without dropping or repeating any', (service) => {
    const ranked = rankTemplatesForService(service)
    expect(ranked).toHaveLength(TEMPLATES.length)
    expect(new Set(ranked.map((t) => t.id)).size).toBe(TEMPLATES.length)

    const matching = TEMPLATES.filter((t) => t.services.includes(service)).length
    expect(matching).toBeGreaterThan(0)
    ranked.forEach((template, index) => {
      expect(template.services.includes(service)).toBe(index < matching)
    })
  })
})
