'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
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
  Sparkles,
} from 'lucide-react'

const features = [
  {
    title: 'Beautiful Client Galleries',
    description:
      'Deliver photos and videos in stunning, responsive galleries with albums, collections, proofing, favorites, and comments.',
  },
  {
    title: 'Complete CRM',
    description:
      'Manage clients, leads, projects, tasks, and notes with custom fields, tags, and activity history all in one place.',
  },
  {
    title: 'Smart Booking System',
    description:
      'Availability management, packages, mini-sessions, questionnaires, contracts, deposits, and automated reminders.',
  },
  {
    title: 'Multi-Payment Support',
    description:
      'Accept payments via Stripe, Flutterwave, M-Pesa, and PayPal with multi-currency support and automated invoicing.',
  },
  {
    title: 'Portfolio Websites',
    description:
      'Build beautiful portfolio websites with custom domains, SEO, blog, themes, and no-code page builder.',
  },
  {
    title: 'Business Analytics',
    description:
      'Revenue tracking, expense management, profit reports, tax reports, and actionable insights for growth.',
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
    quote:
      'LensFlow transformed how I deliver photos to clients. The galleries are beautiful, and the booking system saves me hours every week.',
    author: 'Sarah Chen',
    role: 'Wedding Photographer',
  },
  {
    quote:
      'Finally, a platform that handles everything — galleries, bookings, contracts, invoices, and my website. Worth every penny.',
    author: 'Marcus Johnson',
    role: 'Portrait & Commercial',
  },
  {
    quote:
      'The multi-currency support and M-Pesa integration let me serve clients across Africa seamlessly. Game changer for my studio.',
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

type VariantKey = 'editorial' | 'bold' | 'warm'

interface VariantConfig {
  key: VariantKey
  label: string
  image: string
  imageAlt: string
  vars: Record<string, string>
  headline: React.ReactNode
  subhead: string
}

const VARIANTS: Record<VariantKey, VariantConfig> = {
  editorial: {
    key: 'editorial',
    label: 'Editorial',
    image: '/images/homepage/editorial.webp',
    imageAlt: 'Photographer adjusting a camera in a sunlit minimalist studio',
    vars: {
      '--background': '40 30% 97%',
      '--foreground': '30 20% 14%',
      '--primary': '32 45% 42%',
      '--primary-foreground': '40 30% 98%',
      '--muted': '36 22% 92%',
      '--muted-foreground': '30 12% 42%',
      '--accent': '36 25% 90%',
      '--accent-foreground': '30 20% 14%',
      '--secondary': '36 25% 90%',
      '--secondary-foreground': '30 20% 14%',
      '--border': '34 16% 85%',
    },
    headline: (
      <>
        The complete platform for
        <br />
        <em className="font-display italic">photographers &amp; videographers</em>
      </>
    ),
    subhead:
      'Deliver stunning galleries, manage bookings, sign contracts, accept payments, sell prints, and build your portfolio website — all in one elegant platform.',
  },
  bold: {
    key: 'bold',
    label: 'Bold',
    image: '/images/homepage/bold-v2.webp',
    imageAlt: 'Dramatic backlit photographer silhouette in a dark studio',
    vars: {
      '--background': '220 18% 7%',
      '--foreground': '40 10% 96%',
      '--primary': '42 92% 56%',
      '--primary-foreground': '220 18% 8%',
      '--muted': '220 14% 13%',
      '--muted-foreground': '220 8% 62%',
      '--accent': '220 14% 15%',
      '--accent-foreground': '40 10% 96%',
      '--secondary': '220 14% 15%',
      '--secondary-foreground': '40 10% 96%',
      '--border': '220 14% 19%',
    },
    headline: (
      <>
        Run your studio.
        <br />
        <em className="font-display italic">Command every shot.</em>
      </>
    ),
    subhead:
      'One powerful platform for galleries, bookings, contracts, payments, and your website — built for photographers who mean business.',
  },
  warm: {
    key: 'warm',
    label: 'Warm',
    image: '/images/homepage/warm.webp',
    imageAlt: 'Photographer capturing a laughing couple at golden hour',
    vars: {
      '--background': '28 45% 97%',
      '--foreground': '18 30% 20%',
      '--primary': '14 68% 54%',
      '--primary-foreground': '28 45% 98%',
      '--muted': '24 38% 93%',
      '--muted-foreground': '20 16% 44%',
      '--accent': '24 32% 91%',
      '--accent-foreground': '18 30% 20%',
      '--secondary': '24 32% 91%',
      '--secondary-foreground': '18 30% 20%',
      '--border': '24 22% 86%',
    },
    headline: (
      <>
        Deliver the moments
        <br />
        <em className="font-display italic">that matter most.</em>
      </>
    ),
    subhead:
      'From first booking to final gallery, LensFlow helps you capture, deliver, and grow — with warmth, not just software.',
  },
}

function VariantSwitcher({ active, onChange }: { active: VariantKey; onChange: (v: VariantKey) => void }) {
  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="flex items-center gap-1 rounded-full border border-border bg-background/95 p-1 shadow-lg backdrop-blur">
        <span className="flex items-center gap-1.5 pl-3 pr-2 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Design preview
        </span>
        {(Object.values(VARIANTS)).map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => onChange(v.key)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              active === v.key
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function EditorialHero({ config }: { config: VariantConfig }) {
  return (
    <section className="py-20 sm:py-28 lg:py-32">
      <div className="container-wide">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="max-w-xl">
            <h1 className="text-display-xl font-display font-semibold tracking-tight text-foreground text-balance">
              {config.headline}
            </h1>
            <p className="mt-6 text-body-lg text-muted-foreground">{config.subhead}</p>
            <HeroCtas />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border shadow-sm">
            <Image src={config.image} alt={config.imageAlt} fill className="object-cover" priority />
          </div>
        </div>
        <StatPlaque />
      </div>
    </section>
  )
}

function BoldHero({ config }: { config: VariantConfig }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image src={config.image} alt={config.imageAlt} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
      </div>
      <div className="relative container-wide py-28 sm:py-36 lg:py-44">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-display-xl font-display font-semibold tracking-tight text-foreground text-balance">
            {config.headline}
          </h1>
          <p className="mt-6 text-body-lg text-muted-foreground">{config.subhead}</p>
          <div className="flex justify-center">
            <HeroCtas />
          </div>
        </div>
        <StatPlaque />
      </div>
    </section>
  )
}

function WarmHero({ config }: { config: VariantConfig }) {
  return (
    <section className="py-20 sm:py-28 lg:py-32">
      <div className="container-wide">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-display-xl font-display font-semibold tracking-tight text-foreground text-balance">
            {config.headline}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-body-lg text-muted-foreground">{config.subhead}</p>
          <div className="flex justify-center">
            <HeroCtas />
          </div>
        </div>
        <div className="relative mx-auto mt-14 aspect-[21/9] max-w-4xl overflow-hidden rounded-3xl shadow-lg">
          <Image src={config.image} alt={config.imageAlt} fill className="object-cover" priority />
        </div>
        <StatPlaque />
      </div>
    </section>
  )
}

function HeroCtas() {
  return (
    <>
      <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Button size="lg" className="gap-2" asChild>
          <Link href="/auth/signup">
            Start free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/demo">Watch demo</Link>
        </Button>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-success" />
          No credit card required
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-success" />
          14-day free trial
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-success" />
          Cancel anytime
        </span>
      </div>
    </>
  )
}

function StatPlaque() {
  return (
    <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border border border-border">
      {stats.map((stat) => (
        <div key={stat.label} className="px-6 py-6">
          <div className="font-mono text-2xl sm:text-3xl font-medium text-foreground tabular-nums">
            {stat.value}
          </div>
          <div className="label-caption mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

const HEROES: Record<VariantKey, React.ComponentType<{ config: VariantConfig }>> = {
  editorial: EditorialHero,
  bold: BoldHero,
  warm: WarmHero,
}

export function HomeVariants() {
  const [variant, setVariant] = React.useState<VariantKey>('editorial')
  const config = VARIANTS[variant]
  const Hero = HEROES[variant]

  return (
    <div style={config.vars as React.CSSProperties} className="bg-background text-foreground transition-colors">
      <main className="min-h-screen">
        {/* Nav */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
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

        <Hero config={config} />

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

        {/* Features: editorial listing, not a card grid */}
        <section className="page-section">
          <div className="container-wide">
            <div className="max-w-2xl mb-14">
              <h2 className="text-display-md font-display font-semibold tracking-tight text-foreground">
                Everything you need to run your studio
              </h2>
              <p className="mt-4 text-body-lg text-muted-foreground">
                Powerful features designed for professional photographers and videographers.
              </p>
            </div>

            <div className="border-y border-border divide-y divide-border">
              {features.map((feature, index) => (
                <div key={feature.title} className="grid md:grid-cols-12 gap-x-6 gap-y-2 py-8">
                  <div className="md:col-span-1 font-mono text-sm text-muted-foreground/70 tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <h3 className="md:col-span-4 text-heading-xl font-display text-foreground">
                    {feature.title}
                  </h3>
                  <p className="md:col-span-7 text-body text-muted-foreground max-w-prose">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="page-section bg-muted/40">
          <div className="container-wide">
            <div className="max-w-2xl mb-14">
              <h2 className="text-display-md font-display font-semibold tracking-tight text-foreground">
                Trusted by photographers worldwide
              </h2>
              <p className="mt-4 text-body-lg text-muted-foreground">
                See what our customers have to say about their experience with LensFlow.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 md:gap-10">
              {testimonials.map((testimonial) => (
                <figure key={testimonial.author} className="border-t border-foreground/20 pt-6">
                  <blockquote className="font-display text-xl italic leading-snug text-foreground">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 label-caption">
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

      <VariantSwitcher active={variant} onChange={setVariant} />
    </div>
  )
}
