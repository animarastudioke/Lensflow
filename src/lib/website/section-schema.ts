import { z } from 'zod'
import { MAX_SECTION_IMAGES, isWebsiteImageUrl } from './media'

const safeLink = z.string().max(500).refine((value) => {
  if (!value) return true
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
}, 'Use an HTTPS, mail, phone, anchor, or local link.')

const sectionId = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/)
const sectionHeading = z.string().max(200)
const sectionBody = z.string().max(5000)
const uploadedImage = z.string().refine(isWebsiteImageUrl, 'Use a photo uploaded from the website builder.')

export const websiteSectionSchema = z.discriminatedUnion('type', [
  z.object({
    id: sectionId,
    type: z.literal('hero'),
    eyebrow: z.string().max(80).optional(),
    heading: sectionHeading,
    body: sectionBody.optional(),
    ctaLabel: z.string().max(80).optional(),
    ctaHref: safeLink.optional(),
    galleryId: z.string().uuid().or(z.literal('')).optional(),
    imageUrl: uploadedImage.optional(),
  }),
  z.object({
    id: sectionId,
    type: z.literal('text'),
    heading: sectionHeading,
    body: sectionBody.optional(),
  }),
  z.object({
    id: sectionId,
    type: z.literal('gallery'),
    heading: sectionHeading,
    galleryId: z.string().uuid().or(z.literal('')).optional(),
    imageUrls: z.array(uploadedImage).max(MAX_SECTION_IMAGES).optional(),
  }),
  z.object({
    id: sectionId,
    type: z.literal('services'),
    heading: sectionHeading,
    items: z.array(z.object({
      title: z.string().max(100),
      description: z.string().max(500),
    })).max(8),
  }),
  z.object({
    id: sectionId,
    type: z.literal('testimonials'),
    heading: sectionHeading,
    items: z.array(z.object({
      quote: z.string().max(500),
      author: z.string().max(100),
    })).max(6),
  }),
  z.object({
    id: sectionId,
    type: z.literal('pricing'),
    heading: sectionHeading,
    body: sectionBody.optional(),
    items: z.array(z.object({
      name: z.string().max(100),
      price: z.string().max(40),
      description: z.string().max(500),
    })).max(6),
  }),
  z.object({
    id: sectionId,
    type: z.literal('contact'),
    heading: sectionHeading,
    body: sectionBody.optional(),
    ctaLabel: z.string().max(80).optional(),
    ctaHref: safeLink.optional(),
  }),
])

export const websiteSectionsSchema = z.array(websiteSectionSchema).min(1).max(30).superRefine((sections, context) => {
  const ids = new Set<string>()
  sections.forEach((section, index) => {
    if (ids.has(section.id)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Section IDs must be unique.', path: [index, 'id'] })
    }
    ids.add(section.id)
  })
})

