import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import {
  CreditCard,
  Globe,
  ArrowRight,
  CheckCircle,
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
    description: 'Accept payments from clients anywhere with fast, secure multi-currency invoicing.',
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
    quote: 'The multi-currency support lets me serve clients across Africa seamlessly. Game changer for my studio.',
    author: 'Grace Ochieng',
    role: 'Event Photographer',
  },
]

const galleryShowcase = [
  { src: 'https://images.unsplash.com/photo-1721401870202-8e2264ecced2', alt: 'Couple standing together outdoors' },
  { src: 'https://images.unsplash.com/photo-1735052712464-9d24b69be5f5', alt: 'Bride and groom on a woodland path' },
  { src: 'https://images.unsplash.com/photo-1611106211090-8f3c79eb8552', alt: 'Woman in a green and gold sari' },
  { src: 'https://images.unsplash.com/photo-1614566957872-9548817a3298', alt: 'Grayscale portrait of a bride' },
  { src: 'https://images.unsplash.com/photo-1735052712489-f45220126a0c', alt: 'Bride and groom walking down a path' },
  { src: 'https://images.unsplash.com/photo-1571753217087-980e556e16ea', alt: 'Bride and groom about to kiss' },
]

export default function HomePage() {
  return (
    <MarketingShell>
      {/* Hero: pure typography, no image, maximum whitespace */}
      <section className="py-24 sm:py-32 lg:py-40">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <span className="label-caption text-primary">LensFlow Photographer Platform</span>
            <h1 className="mt-4 text-display-xl font-display font-semibold tracking-tight text-foreground text-balance">
              Built for photographers.
              <br />
              <em className="font-display italic">Made to help you grow.</em>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-body-lg text-muted-foreground">
              Deliver stunning galleries, manage bookings, sign contracts, accept payments, and grow your
              business — all from one beautifully simple platform.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/auth/signup">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
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
        </div>
      </section>

      {/* Gallery showcase: real photos, plain white background */}
      <section className="page-section border-t border-border">
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

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {galleryShowcase.map((item) => (
              <div key={item.src} className="relative aspect-[3/4] overflow-hidden">
                <Image src={`${item.src}?w=800&q=80&auto=format&fit=crop`} alt={item.alt} fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats: plain, bordered, no fill */}
      <section className="page-section border-t border-border">
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

      {/* Product suite: plain icon, no badge fill */}
      <section className="page-section border-t border-border">
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

          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {productSuite.map((product) => (
              <div key={product.title}>
                <product.icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                <h3 className="mt-4 text-heading-xl font-display text-foreground">{product.title}</h3>
                <p className="mt-2 text-body text-muted-foreground">{product.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial: bold pull-quote, plain background */}
      <section className="page-section border-t border-border">
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
              <figure key={testimonial.author} className="border-t border-border pt-6">
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

      {/* CTA: plain background, accent lives only in the button */}
      <section className="page-section border-t border-border">
        <div className="container-wide">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-display-md font-display font-semibold tracking-tight text-foreground">
              Ready to transform your photography business?
            </h2>
            <p className="mt-4 text-body-lg text-muted-foreground">
              Start your 14-day free trial today. No credit card required. Cancel anytime.
            </p>
            <div className="flex justify-center">
              <Button size="lg" className="mt-8 gap-2" asChild>
                <Link href="/auth/signup">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

    </MarketingShell>
  )
}
