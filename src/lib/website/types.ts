export interface WebsiteHeroSection {
  id: string
  type: 'hero'
  eyebrow?: string
  heading: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
  galleryId?: string
  /** An uploaded photo; takes precedence over `galleryId`. */
  imageUrl?: string
}

export interface WebsiteTextSection {
  id: string
  type: 'text'
  heading: string
  body?: string
}

export interface WebsiteGallerySection {
  id: string
  type: 'gallery'
  heading: string
  galleryId?: string
  /** Uploaded photos; shown instead of `galleryId` when present. */
  imageUrls?: string[]
}

export interface WebsiteServicesSection {
  id: string
  type: 'services'
  heading: string
  items: { title: string; description: string }[]
}

export interface WebsiteContactSection {
  id: string
  type: 'contact'
  heading: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
}

export interface WebsiteTestimonialsSection {
  id: string
  type: 'testimonials'
  heading: string
  items: { quote: string; author: string }[]
}

export interface WebsitePricingSection {
  id: string
  type: 'pricing'
  heading: string
  body?: string
  /** `price` is free text on purpose ("KES 45,000", "From KES 12,000", "On request"). */
  items: { name: string; price: string; description: string }[]
}

export type WebsiteSection =
  | WebsiteHeroSection
  | WebsiteTextSection
  | WebsiteGallerySection
  | WebsiteServicesSection
  | WebsiteTestimonialsSection
  | WebsitePricingSection
  | WebsiteContactSection

export interface WebsiteGalleryImage {
  src: string
  alt: string
}

export interface WebsiteGalleryOption {
  id: string
  name: string
  images: WebsiteGalleryImage[]
}

