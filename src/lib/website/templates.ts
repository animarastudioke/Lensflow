import { createDefaultWebsiteSections } from './content'
import type { WebsiteSection } from './types'

// Single source of truth for website templates. It is deliberately pure (no
// 'server-only', no I/O) so the server action can validate ids against it, the
// renderer can read its theme from it, and the client picker can preview it.
// Templates are looks plus starter content: the starter pages are copied into
// the database once at creation and are then ordinary, editable pages. The
// stored `websites.template` column is free text, so an id that is later
// retired must still render -- getTemplate() falls back instead of throwing.

export const SERVICES = [
  { id: 'weddings', label: 'Weddings' },
  { id: 'portraits-family', label: 'Portraits and family' },
  { id: 'commercial-brand', label: 'Commercial and brand' },
  { id: 'events', label: 'Events' },
  { id: 'video-film', label: 'Video and film' },
] as const

export type ServiceId = (typeof SERVICES)[number]['id']

export const SERVICE_IDS = SERVICES.map((service) => service.id) as [ServiceId, ...ServiceId[]]

export interface TemplateTheme {
  /** Dark surface: switches button, nav and divider colours to the light-on-dark set. */
  dark: boolean
  /** Outer wrapper: background, text colour and, where it differs, body font. */
  site: string
  maxWidth: string
  radius: string
  display: string
  tracking: string
  headerBorder: string
  studioName: string
  siteName: string
  navIdle: string
  navActiveFallback: string
  footer: string
  heading: string
  body: string
  eyebrow: string
  heroLayout: 'split' | 'centered'
  heroImage: string
  galleryGrid: string
  galleryImage: string
  padHero: string
  padSection: string
  padContact: string
  card: string
  cardTitle: string
  cardText: string
  contactBg: string
  emptyNote: string
}

export interface TemplateStarterPage {
  name: string
  path: string
  sections: WebsiteSection[]
}

export interface WebsiteTemplate {
  id: string
  label: string
  description: string
  services: readonly ServiceId[]
  theme: TemplateTheme
  starterPages: (websiteName: string) => TemplateStarterPage[]
}

const lightColors = {
  dark: false,
  headerBorder: 'border-stone-200',
  studioName: 'text-stone-900',
  siteName: 'text-stone-500',
  navIdle: 'border-transparent text-stone-500 hover:text-stone-900',
  navActiveFallback: '#292524',
  footer: 'border-stone-200 text-stone-500',
  heading: 'text-stone-950',
  body: 'text-stone-600',
  eyebrow: 'text-stone-500',
  card: 'border-stone-200 bg-white/70',
  cardText: 'text-stone-600',
  contactBg: 'bg-stone-100',
  emptyNote: 'border-stone-300 text-stone-500',
} as const

const darkColors = {
  dark: true,
  headerBorder: 'border-white/10',
  studioName: 'text-white',
  siteName: 'text-white/55',
  navIdle: 'border-transparent text-white/60 hover:text-white',
  navActiveFallback: '#fff',
  footer: 'border-white/10 text-white/50',
  heading: 'text-white',
  body: 'text-white/70',
  eyebrow: 'text-stone-500',
  card: 'border-white/15 bg-white/5',
  cardText: 'text-white/65',
  contactBg: 'bg-white/5',
  emptyNote: 'border-stone-300 text-stone-500',
} as const

// The three shipped looks. Their values reproduce the renderer's original
// per-template classes exactly, so published sites do not change.
const shippedLayout = {
  maxWidth: 'max-w-6xl',
  radius: 'rounded-sm',
  display: 'font-display font-semibold',
  tracking: 'tracking-tight',
  heroLayout: 'split',
  heroImage: 'aspect-[4/5] w-full',
  galleryGrid: 'grid-cols-2 gap-3 md:grid-cols-3 md:gap-5',
  galleryImage: 'aspect-[4/5] w-full',
  padHero: 'py-16 md:py-24',
  padSection: 'py-14 md:py-20',
  padContact: 'py-16 md:py-24',
  cardTitle: 'font-display text-lg font-semibold',
} as const

const contactPage = (heading: string, body: string): TemplateStarterPage => ({
  name: 'Contact',
  path: '/contact',
  sections: [{ id: 'contact', type: 'contact', heading, body }],
})

const MODERN_MINIMAL: WebsiteTemplate = {
  id: 'modern-minimal',
  label: 'Modern Minimal',
  description: 'White space and a calm grid that lets the photographs lead.',
  services: ['portraits-family', 'commercial-brand', 'events'],
  theme: { ...lightColors, ...shippedLayout, site: 'bg-white text-stone-900' },
  starterPages: (name) => [
    { name: 'Home', path: '/', sections: createDefaultWebsiteSections(name) },
    {
      name: 'About',
      path: '/about',
      sections: [{
        id: 'about',
        type: 'text',
        heading: `About ${name}`,
        body: 'Say who you are, how you like to work and what clients can expect. Two or three short paragraphs is plenty.',
      }],
    },
    contactPage('Let’s talk about your project.', 'Share what you have in mind and the dates you are considering.'),
  ],
}

const ELEGANT_WEDDING: WebsiteTemplate = {
  id: 'elegant-wedding',
  label: 'Elegant Wedding',
  description: 'A warm ivory page with a classic serif voice for wedding work.',
  services: ['weddings', 'portraits-family'],
  theme: { ...lightColors, ...shippedLayout, site: 'bg-[#fbf8f3] text-stone-800 font-serif' },
  starterPages: (name) => [
    {
      name: 'Home',
      path: '/',
      sections: [
        {
          id: 'hero',
          type: 'hero',
          eyebrow: 'Weddings and celebrations',
          heading: name,
          body: 'Honest, unhurried photographs of your day as it unfolded.',
          ctaLabel: 'Enquire about your date',
          ctaHref: '#contact',
        },
        { id: 'portfolio', type: 'gallery', heading: 'Recent weddings', galleryId: '' },
        {
          id: 'services',
          type: 'services',
          heading: 'How we can help',
          items: [
            { title: 'Wedding day', description: 'Coverage planned around your timeline, from getting ready to the celebration.' },
            { title: 'Engagement session', description: 'A relaxed session before the day, so you are comfortable in front of the camera.' },
            { title: 'Albums and prints', description: 'Ways to keep your photographs beyond the screen.' },
          ],
        },
        {
          id: 'contact',
          type: 'contact',
          heading: 'Tell us about your day.',
          body: 'Share your date, venue and the kind of day you are imagining.',
        },
      ],
    },
    {
      name: 'About',
      path: '/about',
      sections: [{
        id: 'about',
        type: 'text',
        heading: `The people behind ${name}`,
        body: 'Introduce yourself and describe how you work with couples, from the first conversation to delivery.',
      }],
    },
    contactPage('Say hello.', 'Share your wedding date and location and we will get back to you.'),
  ],
}

const BOLD_EDITORIAL: WebsiteTemplate = {
  id: 'bold-editorial',
  label: 'Bold Editorial',
  description: 'Dark, high-impact pages with large type, made for striking work.',
  services: ['events', 'commercial-brand', 'video-film'],
  theme: { ...darkColors, ...shippedLayout, site: 'bg-[#171717] text-white' },
  starterPages: (name) => [
    {
      name: 'Home',
      path: '/',
      sections: [
        {
          id: 'hero',
          type: 'hero',
          eyebrow: 'Photography and film',
          heading: name,
          body: 'Strong images made for people who want their story told with confidence.',
          ctaLabel: 'Start a project',
          ctaHref: '#contact',
        },
        { id: 'portfolio', type: 'gallery', heading: 'Selected work', galleryId: '' },
        {
          id: 'contact',
          type: 'contact',
          heading: 'Have a project in mind?',
          body: 'Tell us what you are making and when you need it.',
        },
      ],
    },
    {
      name: 'Services',
      path: '/services',
      sections: [{
        id: 'services',
        type: 'services',
        heading: 'What we do',
        items: [
          { title: 'Photography', description: 'Describe the photography you offer and who it is for.' },
          { title: 'Video', description: 'Describe the video work you offer and who it is for.' },
          { title: 'Custom projects', description: 'Explain how clients can ask for something specific.' },
        ],
      }],
    },
    contactPage('Let’s work together.', 'Share a short brief and your preferred dates.'),
  ],
}

const SOFT_PORTRAIT: WebsiteTemplate = {
  id: 'soft-portrait',
  label: 'Soft Portrait',
  description: 'Warm, rounded and gentle, suited to families and personal portraits.',
  services: ['portraits-family', 'weddings'],
  theme: {
    ...lightColors,
    site: 'bg-[#f7f0e8] text-stone-800',
    maxWidth: 'max-w-5xl',
    radius: 'rounded-2xl',
    display: 'font-display font-medium',
    tracking: 'tracking-normal',
    headerBorder: 'border-[#e6d8c8]',
    footer: 'border-[#e6d8c8] text-stone-500',
    heroLayout: 'centered',
    heroImage: 'aspect-[4/3] w-full',
    galleryGrid: 'grid-cols-2 gap-4 md:grid-cols-3 md:gap-6',
    galleryImage: 'aspect-[3/4] w-full',
    padHero: 'py-16 md:py-24',
    padSection: 'py-14 md:py-20',
    padContact: 'py-16 md:py-24',
    card: 'border-[#e6d8c8] bg-white/60',
    cardTitle: 'font-display text-xl font-medium',
    contactBg: 'bg-[#efe2d3]',
    emptyNote: 'border-[#d6c3ae] text-stone-500',
  },
  starterPages: (name) => [
    {
      name: 'Home',
      path: '/',
      sections: [
        {
          id: 'hero',
          type: 'hero',
          eyebrow: 'Portraits and family sessions',
          heading: name,
          body: 'Relaxed sessions and natural photographs of the people who matter most to you.',
          ctaLabel: 'Book a session',
          ctaHref: '#contact',
        },
        { id: 'portfolio', type: 'gallery', heading: 'Recent sessions', galleryId: '' },
        {
          id: 'services',
          type: 'services',
          heading: 'Sessions',
          items: [
            { title: 'Family', description: 'A relaxed session for the whole family, at a place that suits you.' },
            { title: 'Portraits', description: 'Individual or couple portraits for personal or professional use.' },
            { title: 'Milestones', description: 'Photographs for birthdays, graduations and other occasions worth remembering.' },
          ],
        },
        {
          id: 'contact',
          type: 'contact',
          heading: 'Let’s plan your session.',
          body: 'Tell us who the session is for and when you would like it.',
        },
      ],
    },
    {
      name: 'About',
      path: '/about',
      sections: [{
        id: 'about',
        type: 'text',
        heading: `Hello, we are ${name}`,
        body: 'Share a little about yourself and what a session with you feels like, so new clients know what to expect.',
      }],
    },
    contactPage('Get in touch.', 'Share who the session is for, where you are and when you would like it.'),
  ],
}

const CLEAN_COMMERCIAL: WebsiteTemplate = {
  id: 'clean-commercial',
  label: 'Clean Commercial',
  description: 'Crisp, high-contrast and sans-serif, built for brands and businesses.',
  services: ['commercial-brand', 'events'],
  theme: {
    ...lightColors,
    site: 'bg-white text-neutral-950',
    maxWidth: 'max-w-6xl',
    radius: 'rounded-none',
    display: 'font-sans font-bold',
    tracking: 'tracking-tighter',
    headerBorder: 'border-neutral-950',
    studioName: 'text-neutral-950',
    footer: 'border-neutral-950 text-neutral-600',
    heading: 'text-neutral-950',
    body: 'text-neutral-700',
    eyebrow: 'text-neutral-600',
    heroLayout: 'split',
    heroImage: 'aspect-[4/5] w-full',
    galleryGrid: 'grid-cols-1 gap-3 md:grid-cols-2 md:gap-4',
    galleryImage: 'aspect-[3/2] w-full',
    padHero: 'py-14 md:py-24',
    padSection: 'py-12 md:py-20',
    padContact: 'py-14 md:py-24',
    card: 'border-2 border-neutral-950 bg-white',
    cardTitle: 'font-sans text-lg font-bold',
    cardText: 'text-neutral-700',
    contactBg: 'bg-neutral-100',
    emptyNote: 'border-neutral-400 text-neutral-600',
  },
  starterPages: (name) => [
    {
      name: 'Home',
      path: '/',
      sections: [
        {
          id: 'hero',
          type: 'hero',
          eyebrow: 'Commercial and brand photography',
          heading: name,
          body: 'Clear, well-lit imagery for products, teams and brands.',
          ctaLabel: 'Request a quote',
          ctaHref: '#contact',
        },
        { id: 'portfolio', type: 'gallery', heading: 'Selected work', galleryId: '' },
        {
          id: 'contact',
          type: 'contact',
          heading: 'Briefing a shoot?',
          body: 'Send the scope, the usage you need and your timeline.',
        },
      ],
    },
    {
      name: 'Services',
      path: '/services',
      sections: [{
        id: 'services',
        type: 'services',
        heading: 'Services',
        items: [
          { title: 'Product', description: 'Describe the product photography you offer and what clients receive.' },
          { title: 'Brand and team', description: 'Describe portraits, lifestyle and brand imagery you offer.' },
          { title: 'Events', description: 'Describe the event coverage you offer for businesses.' },
        ],
      }],
    },
    contactPage('Request a quote.', 'Tell us about the shoot, how the images will be used and when you need them.'),
  ],
}

const CINEMATIC_REEL: WebsiteTemplate = {
  id: 'cinematic-reel',
  label: 'Cinematic Reel',
  description: 'A dark, wide, widescreen-framed look for film and video work.',
  services: ['video-film', 'weddings'],
  theme: {
    ...darkColors,
    site: 'bg-[#0b0b0c] text-white',
    maxWidth: 'max-w-7xl',
    radius: 'rounded-none',
    display: 'font-display font-medium',
    tracking: 'tracking-tight',
    heroLayout: 'centered',
    heroImage: 'aspect-video w-full',
    galleryGrid: 'grid-cols-1 gap-4 md:grid-cols-2 md:gap-6',
    galleryImage: 'aspect-video w-full',
    padHero: 'py-20 md:py-32',
    padSection: 'py-14 md:py-24',
    padContact: 'py-20 md:py-32',
    cardTitle: 'font-display text-xl font-medium',
    body: 'text-white/65',
    contactBg: 'bg-white/[0.04]',
  },
  starterPages: (name) => [
    {
      name: 'Home',
      path: '/',
      sections: [
        {
          id: 'hero',
          type: 'hero',
          eyebrow: 'Film and video',
          heading: name,
          body: 'Moving pictures with a considered eye for light, sound and story.',
          ctaLabel: 'Discuss your film',
          ctaHref: '#contact',
        },
        { id: 'portfolio', type: 'gallery', heading: 'Stills from recent films', galleryId: '' },
        {
          id: 'contact',
          type: 'contact',
          heading: 'Have a film in mind?',
          body: 'Tell us about the story, the location and the dates you are considering.',
        },
      ],
    },
    {
      name: 'Services',
      path: '/services',
      sections: [{
        id: 'services',
        type: 'services',
        heading: 'What we make',
        items: [
          { title: 'Highlight films', description: 'Describe the short films you make for weddings and events.' },
          { title: 'Brand films', description: 'Describe the video work you offer to businesses.' },
          { title: 'Edits and delivery', description: 'Explain how editing and delivery work with you.' },
        ],
      }],
    },
    contactPage('Let’s talk about your film.', 'Share the story, the location and your preferred dates.'),
  ],
}

export const TEMPLATES: readonly WebsiteTemplate[] = [
  MODERN_MINIMAL,
  ELEGANT_WEDDING,
  BOLD_EDITORIAL,
  SOFT_PORTRAIT,
  CLEAN_COMMERCIAL,
  CINEMATIC_REEL,
]

export const DEFAULT_TEMPLATE_ID = MODERN_MINIMAL.id

export type TemplateId = 'modern-minimal' | 'elegant-wedding' | 'bold-editorial' | 'soft-portrait' | 'clean-commercial' | 'cinematic-reel'

export const TEMPLATE_IDS = TEMPLATES.map((template) => template.id) as [string, ...string[]]

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && TEMPLATES.some((template) => template.id === value)
}

export function getTemplate(id: string | null | undefined): WebsiteTemplate {
  return TEMPLATES.find((template) => template.id === id) ?? MODERN_MINIMAL
}

/** Templates that suit a service first (registry order kept), then the rest. */
export function rankTemplatesForService(service: ServiceId | null): WebsiteTemplate[] {
  if (!service) return [...TEMPLATES]
  const matching = TEMPLATES.filter((template) => template.services.includes(service))
  return [...matching, ...TEMPLATES.filter((template) => !template.services.includes(service))]
}
