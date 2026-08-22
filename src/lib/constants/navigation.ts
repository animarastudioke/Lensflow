// Shared marketing-site navigation and footer link data — used by the one
// unified Navbar/Footer (src/components/marketing/navbar.tsx,
// src/components/marketing/footer.tsx) rendered on every public marketing
// page, including the homepage. Previously duplicated across a
// homepage-only nav/footer and a separate MarketingShell nav/footer with
// different link sets; consolidated here as the single source of truth.

export interface NavLink {
  label: string
  href: string
  description?: string
}

export const NAV_PRODUCT_LINKS: NavLink[] = [
  { label: 'Client Galleries', href: '/features/galleries', description: 'Deliver photos and videos beautifully' },
  { label: 'Proofing', href: '/features/galleries#proofing', description: 'Favorites, comments, and approvals' },
  { label: 'Booking', href: '/features/booking', description: 'Availability, packages, and contracts' },
  { label: 'CRM', href: '/features/crm', description: 'Clients, leads, and project timelines' },
  { label: 'Invoicing', href: '/features/analytics#payments', description: 'Quotes, invoices, and payments' },
  { label: 'Online Store', href: '/features/store', description: 'Prints, albums, and digital downloads' },
  { label: 'Website Builder', href: '/features/website', description: 'A portfolio site with your own domain' },
]

export const NAV_SOLUTIONS_LINKS: NavLink[] = [
  { label: 'Wedding Photographers', href: '/solutions/wedding-photographers' },
  { label: 'Portrait Photographers', href: '/solutions/portrait-photographers' },
  { label: 'Videographers', href: '/solutions/videographers' },
  { label: 'Studios', href: '/solutions/studios' },
  { label: 'Creative Teams', href: '/solutions/creative-teams' },
]

export const NAV_RESOURCES_LINKS: NavLink[] = [
  { label: 'Help Center', href: '/help' },
  { label: 'Blog', href: '/blog' },
  { label: 'Guides', href: '/docs' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact', href: '/contact' },
]

export interface FooterLinkGroup {
  heading: string
  links: { label: string; href: string }[]
}

export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Galleries', href: '/features/galleries' },
      { label: 'Booking', href: '/features/booking' },
      { label: 'CRM', href: '/features/crm' },
      { label: 'Payments', href: '/features/analytics' },
      { label: 'Store', href: '/features/store' },
      { label: 'Websites', href: '/features/website' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'Blog', href: '/blog' },
      { label: 'Guides', href: '/docs' },
      { label: 'Documentation', href: '/api-docs' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Cookies', href: '/cookies' },
      { label: 'Security', href: '/security' },
    ],
  },
]

export interface SocialLink {
  label: string
  href: string
  /** SVG path data for a 24x24 viewBox icon, drawn with fill="currentColor". */
  path: string
}

/**
 * Deliberately empty. The previous homepage footer and the previous
 * MarketingShell footer each linked a different, unverified set of social
 * accounts (Instagram/TikTok/YouTube/Facebook vs. Twitter/GitHub/LinkedIn)
 * — neither was confirmed to be a real LensFlow account. Rather than guess,
 * this is left empty (the footer renders no social row when empty) until
 * real, verified account URLs are added here.
 */
export const SOCIAL_LINKS: SocialLink[] = []
