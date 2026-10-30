export interface WebsiteHeroSection {
  id: string
  type: 'hero'
  eyebrow?: string
  heading: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
  galleryId?: string
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

export type WebsiteSection = WebsiteHeroSection | WebsiteTextSection | WebsiteGallerySection | WebsiteServicesSection | WebsiteContactSection

export interface WebsiteGalleryImage {
  src: string
  alt: string
}

export interface WebsiteGalleryOption {
  id: string
  name: string
  images: WebsiteGalleryImage[]
}

