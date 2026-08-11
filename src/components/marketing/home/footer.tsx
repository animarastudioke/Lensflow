import Link from 'next/link'
import { Logo } from './lib/logo'

const COLUMNS = [
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

const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/lensflow',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
  },
  {
    label: 'TikTok',
    href: 'https://tiktok.com/@lensflow',
    path: 'M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z',
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@lensflow',
    path: 'M23.498 6.186a2.999 2.999 0 0 0-2.112-2.124C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.386.517A2.999 2.999 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a2.999 2.999 0 0 0 2.112 2.124c1.881.517 9.386.517 9.386.517s7.505 0 9.386-.517a2.999 2.999 0 0 0 2.112-2.124C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.6 15.6V8.4l6.4 3.6-6.4 3.6z',
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com/lensflow',
    path: 'M22.675 0h-21.35C.6 0 0 .6 0 1.325v21.351C0 23.4.6 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.464.099 2.795.143v3.24h-1.92c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.4 24 24 23.4 24 22.676V1.325C24 .6 23.4 0 22.675 0z',
  },
]

export function HomeFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container-wide py-14 lg:py-20">
        <div className="grid grid-cols-2 gap-8 pb-12 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The business platform built for photographers and videographers.
            </p>
            <div className="mt-6 flex items-center gap-4">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={social.label}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <h3 className="label-caption mb-4">{column.heading}</h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} LensFlow. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">Made with care for photographers worldwide.</p>
        </div>
      </div>
    </footer>
  )
}
