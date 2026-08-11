import type { CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Camera,
  CreditCard,
  Globe,
  Zap,
  ArrowRight,
  CheckCircle,
  Cloud,
  Mail,
  Phone,
  Image as ImageIcon,
  Users,
  Calendar,
  Store,
} from 'lucide-react'

const productSuite = [
  {
    title: 'Galleries',
    description: 'Deliver photos and videos in stunning, responsive galleries with proofing, favorites, and comments.',
    icon: ImageIcon,
  },
  {
    title: 'CRM',
    description: 'Manage clients, leads, projects, and notes with custom fields, tags, and activity history.',
    icon: Users,
  },
  {
    title: 'Booking',
    description: 'Availability, packages, mini-sessions, questionnaires, contracts, and automated reminders.',
    icon: Calendar,
  },
  {
    title: 'Payments',
    description: 'Accept payments via Stripe, Flutterwave, M-Pesa, and PayPal with multi-currency invoicing.',
    icon: CreditCard,
  },
  {
    title: 'Store',
    description: 'Sell prints and digital downloads directly from your galleries with zero setup.',
    icon: Store,
  },
  {
    title: 'Website',
    description: 'Build a beautiful portfolio website with a custom domain, SEO, and no-code page builder.',
    icon: Globe,
  },
]

const stats = [
  { value: '10K+', label: 'Photographers' },
  { value: '1M+', label: 'Photos delivered' },
  { value: '50K+', label: 'Galleries created' },
  { value: '99.9%', label: 'Uptime' },
]

const testimonials = [
  {
    quote: 'Finally, a platform that handles everything — galleries, bookings, contracts, invoices, and my website. Worth every penny.',
    author: 'Marcus Johnson',
    role: 'Portrait & Commercial',
  },
  {
    quote: 'The multi-currency support and M-Pesa integration let me serve clients across Africa seamlessly. Game changer for my studio.',
    author: 'Grace Ochieng',
    role: 'Event Photographer',
  },
]

const integrations = [
  { name: 'Stripe', icon: CreditCard },
  { name: 'Supabase', icon: Cloud },
  { name: 'Resend', icon: Mail },
  { name: "Africa's Talking", icon: Phone },
  { name: 'Flutterwave', icon: Globe },
  { name: 'M-Pesa', icon: Phone },
  { name: 'PayPal', icon: CreditCard },
  { name: 'Vercel', icon: Zap },
]

const galleryShowcase = [
  { src: 'https://images.unsplash.com/photo-1721401870202-8e2264ecced2', alt: 'Couple standing together outdoors', span: 'row-span-2' },
  { src: 'https://images.unsplash.com/photo-1735052712464-9d24b69be5f5', alt: 'Bride and groom on a woodland path', span: '' },
  { src: 'https://images.unsplash.com/photo-1611106211090-8f3c79eb8552', alt: 'Woman in a green and gold sari', span: '' },
  { src: 'https://images.unsplash.com/photo-1614566957872-9548817a3298', alt: 'Grayscale portrait of a bride', span: 'row-span-2' },
  { src: 'https://images.unsplash.com/photo-1505428215601-90f0007b9e83', alt: 'Grayscale photo of a couple embracing near a hill', span: '' },
  { src: 'https://images.unsplash.com/photo-1735052712489-f45220126a0c', alt: 'Bride and groom walking down a path', span: '' },
]

// The marketing homepage always presents the same light, editorial look,
// regardless of a visitor's dashboard dark-mode preference (dark mode is a
// workspace setting, not a brand choice) - so every design token is pinned
// to its light value here rather than left to inherit the global theme.
const LIGHT_THEME_VARS = {
  '--background': '210 10% 97%',
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

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground" style={LIGHT_THEME_VARS}>
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="container-wide flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display text-xl italic text-foreground">
            <Camera className="h-5 w-5 text-primary" strokeWidth={1.5} />
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

      {/* Hero: dark band, full-bleed photo, light everything below */}
      <section className="relative overflow-hidden bg-foreground text-background">
        <div className="container-wide grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="label-caption text-primary">LensFlow Photographer Platform</span>
            <h1 className="mt-4 text-display-xl font-display font-semibold tracking-tight text-balance">
              Built for photographers.
              <br />
              <em className="font-display italic">Made to help you grow.</em>
            </h1>
            <p className="mt-6 max-w-md text-body-lg text-background/70">
              Deliver stunning galleries, manage bookings, sign contracts, accept payments, and grow your
              business — all from one beautifully simple platform.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/auth/signup">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="border border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" asChild>
                <Link href="/demo">Watch demo</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-background/60">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-success" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-success" />
                14-day free trial
              </span>
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-2xl lg:aspect-[3/4]">
            <Image
              src="https://images.unsplash.com/photo-1499417267106-45cebb7187c9?w=1200&q=80&auto=format&fit=crop"
              alt="Photographer silhouetted with a tripod at dusk"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* Gallery showcase: real masonry collage */}
      <section className="page-section">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <span className="label-caption text-primary">Client Galleries</span>
            <h2 className="mt-3 text-display-md font-display font-semibold tracking-tight text-foreground">
              A gallery experience clients remember
            </h2>
            <p className="mt-4 text-body-lg text-muted-foreground">
              Beautiful, fast, and effortless to use — deliver photos your clients will love opening.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 auto-rows-[140px] sm:auto-rows-[180px] gap-3">
            {galleryShowcase.map((item) => (
              <div key={item.src} className={`relative overflow-hidden rounded-xl ${item.span}`}>
                <Image src={`${item.src}?w=900&q=80&auto=format&fit=crop`} alt={item.alt} fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats: editorial split */}
      <section className="page-section bg-muted/40">
        <div className="container-wide grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="label-caption text-primary">Trusted worldwide</span>
            <h2 className="mt-3 text-display-md font-display font-semibold tracking-tight text-foreground">
              Built for photographers everywhere
            </h2>
            <p className="mt-4 max-w-md text-body-lg text-muted-foreground">
              Join thousands of studios who trust LensFlow to run their business, every single day.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="font-mono text-3xl sm:text-4xl font-medium text-foreground tabular-nums">
                  {stat.value}
                </div>
                <div className="label-caption mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product suite: icon + card grid */}
      <section className="page-section">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <span className="label-caption text-primary">All-in-one platform</span>
            <h2 className="mt-3 text-display-md font-display font-semibold tracking-tight text-foreground">
              Everything your studio needs
            </h2>
            <p className="mt-4 text-body-lg text-muted-foreground">
              A complete toolkit built for photographers — powerful individually, unstoppable together.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {productSuite.map((product) => (
              <div key={product.title} className="rounded-2xl border border-border p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <product.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="mt-5 text-heading-xl font-display text-foreground">{product.title}</h3>
                <p className="mt-2 text-body text-muted-foreground">{product.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="py-10 border-y border-border">
        <div className="container-wide">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {integrations.map((integration) => (
              <span key={integration.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                <integration.icon className="h-4 w-4" strokeWidth={1.5} />
                {integration.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial: bold pull-quote */}
      <section className="page-section bg-muted/40">
        <div className="container-wide">
          <div className="mx-auto max-w-3xl text-center">
            <span className="label-caption text-primary">Trusted by photographers</span>
            <blockquote className="mt-6 font-display text-display-sm italic leading-snug text-foreground text-balance">
              &ldquo;LensFlow transformed how I deliver photos to clients. The galleries are beautiful, and the
              booking system saves me hours every week.&rdquo;
            </blockquote>
            <p className="mt-6 label-caption">Sarah Chen — Wedding Photographer</p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
            {testimonials.map((testimonial) => (
              <figure key={testimonial.author} className="border-t border-foreground/20 pt-6">
                <blockquote className="text-body text-foreground">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 label-caption">
                  {testimonial.author} — {testimonial.role}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA: full-bleed committed color plate */}
      <section className="bg-primary text-primary-foreground">
        <div className="container-wide py-16 lg:py-24">
          <div className="max-w-2xl">
            <h2 className="text-display-md font-display font-semibold">
              Ready to transform your photography business?
            </h2>
            <p className="mt-4 text-body-lg text-primary-foreground/80">
              Start your 14-day free trial today. No credit card required. Cancel anytime.
            </p>
            <Button size="lg" variant="secondary" className="mt-8 gap-2" asChild>
              <Link href="/auth/signup">
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container-wide py-12 lg:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2 font-display italic text-xl text-foreground mb-4">
                <Camera className="h-5 w-5 text-primary" strokeWidth={1.5} />
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
    </main>
  )
}
