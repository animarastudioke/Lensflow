import Link from 'next/link'
import { Logo } from './home/lib/logo'
import { FOOTER_LINK_GROUPS, SOCIAL_LINKS } from '@/lib/constants/navigation'

/**
 * The one marketing-site footer, shared by the homepage and every other
 * public marketing page (via MarketingShell). Previously two separate
 * implementations with different link sets and different, unverified
 * social-account URLs — consolidated into a single source of truth.
 */
export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container-wide py-14 lg:py-20">
        <div className="grid grid-cols-2 gap-8 pb-12 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The business platform built for photographers and videographers.
            </p>
            {SOCIAL_LINKS.length > 0 ? (
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
            ) : null}
          </div>

          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.heading}>
              <h3 className="label-caption mb-4">{group.heading}</h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {group.links.map((link) => (
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
