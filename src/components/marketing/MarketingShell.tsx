import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/marketing/home/lib/logo'

// The marketing site always presents the same light, editorial look,
// regardless of a visitor's dashboard dark-mode preference (dark mode is a
// workspace setting, not a brand choice) - so every design token is pinned
// to its light value here rather than left to inherit the global theme.
export const LIGHT_THEME_VARS = {
  '--background': '0 0% 100%',
  '--foreground': '220 20% 11%',
  '--card': '0 0% 100%',
  '--card-foreground': '220 20% 11%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '220 20% 11%',
  '--primary': '350 62% 30%',
  '--primary-foreground': '40 20% 97%',
  '--secondary': '210 10% 93%',
  '--secondary-foreground': '220 20% 15%',
  '--muted': '210 10% 94%',
  '--muted-foreground': '220 10% 40%',
  '--accent': '210 10% 93%',
  '--accent-foreground': '220 20% 15%',
  '--destructive': '10 75% 46%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '210 12% 88%',
  '--input': '210 12% 85%',
  '--ring': '350 62% 30%',
  '--success': '150 45% 26%',
  '--success-foreground': '0 0% 98%',
  '--warning': '38 75% 38%',
  '--warning-foreground': '0 0% 98%',
  '--info': '210 40% 32%',
  '--info-foreground': '0 0% 98%',
} as CSSProperties

function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="container-wide flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-xl italic text-foreground">
          <LogoMark className="h-5 w-5 text-primary" />
          <span>LensFlow</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container-wide py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-display italic text-xl text-foreground mb-4">
              <LogoMark className="h-5 w-5 text-primary" />
              <span>LensFlow</span>
            </Link>
            <p className="text-body text-muted-foreground max-w-xs mb-6">
              The premium platform for photographers and videographers to deliver, sell, and grow.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://twitter.com/lensflow" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://github.com/lensflow" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="https://linkedin.com/company/lensflow" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="LinkedIn">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="label-caption mb-4">Product</h4>
            <ul className="space-y-2 text-body-sm text-muted-foreground">
              <li><Link href="/features/galleries" className="hover:text-foreground transition-colors">Client Galleries</Link></li>
              <li><Link href="/features/booking" className="hover:text-foreground transition-colors">Booking System</Link></li>
              <li><Link href="/features/crm" className="hover:text-foreground transition-colors">CRM</Link></li>
              <li><Link href="/features/store" className="hover:text-foreground transition-colors">Online Store</Link></li>
              <li><Link href="/features/website" className="hover:text-foreground transition-colors">Website Builder</Link></li>
              <li><Link href="/features/analytics" className="hover:text-foreground transition-colors">Analytics</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="label-caption mb-4">Resources</h4>
            <ul className="space-y-2 text-body-sm text-muted-foreground">
              <li><Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
              <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link href="/community" className="hover:text-foreground transition-colors">Community</Link></li>
              <li><Link href="/help" className="hover:text-foreground transition-colors">Help Center</Link></li>
              <li><Link href="/api-docs" className="hover:text-foreground transition-colors">API Reference</Link></li>
              <li><Link href="/status" className="hover:text-foreground transition-colors">Status</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="label-caption mb-4">Company</h4>
            <ul className="space-y-2 text-body-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link href="/careers" className="hover:text-foreground transition-colors">Careers</Link></li>
              <li><Link href="/press" className="hover:text-foreground transition-colors">Press</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              <li><Link href="/partners" className="hover:text-foreground transition-colors">Partners</Link></li>
              <li><Link href="/affiliates" className="hover:text-foreground transition-colors">Affiliates</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="label-caption mb-4">Legal</h4>
            <ul className="space-y-2 text-body-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="/cookies" className="hover:text-foreground transition-colors">Cookie Policy</Link></li>
              <li><Link href="/security" className="hover:text-foreground transition-colors">Security</Link></li>
              <li><Link href="/gdpr" className="hover:text-foreground transition-colors">GDPR</Link></li>
              <li><Link href="/dpa" className="hover:text-foreground transition-colors">DPA</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
          <p className="text-body-sm text-muted-foreground">
            © {new Date().getFullYear()} LensFlow. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-body-sm text-muted-foreground">
            <span>Made with care for photographers worldwide</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>99.9% uptime</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground" style={LIGHT_THEME_VARS}>
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </main>
  )
}
