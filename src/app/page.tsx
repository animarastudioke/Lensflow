import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Camera,
  Users,
  Calendar,
  CreditCard,
  Globe,
  Shield,
  Zap,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Star,
  BarChart3,
  Palette,
  Lock,
  Cloud,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react'

const features = [
  {
    icon: Camera,
    title: 'Beautiful Client Galleries',
    description:
      'Deliver photos and videos in stunning, responsive galleries with albums, collections, proofing, favorites, and comments.',
  },
  {
    icon: Users,
    title: 'Complete CRM',
    description:
      'Manage clients, leads, projects, tasks, and notes with custom fields, tags, and activity history all in one place.',
  },
  {
    icon: Calendar,
    title: 'Smart Booking System',
    description:
      'Availability management, packages, mini-sessions, questionnaires, contracts, deposits, and automated reminders.',
  },
  {
    icon: CreditCard,
    title: 'Multi-Payment Support',
    description:
      'Accept payments via Stripe, Flutterwave, M-Pesa, and PayPal with multi-currency support and automated invoicing.',
  },
  {
    icon: Globe,
    title: 'Portfolio Websites',
    description:
      'Build beautiful portfolio websites with custom domains, SEO, blog, themes, and no-code page builder.',
  },
  {
    icon: BarChart3,
    title: 'Business Analytics',
    description:
      'Revenue tracking, expense management, profit reports, tax reports, and actionable insights for growth.',
  },
]

const stats = [
  { value: '10K+', label: 'Photographers' },
  { value: '1M+', label: 'Photos Delivered' },
  { value: '50K+', label: 'Galleries Created' },
  { value: '99.9%', label: 'Uptime' },
]

const testimonials = [
  {
    quote:
      'LensFlow transformed how I deliver photos to clients. The galleries are beautiful, and the booking system saves me hours every week.',
    author: 'Sarah Chen',
    role: 'Wedding Photographer',
    avatar: '/avatars/sarah.jpg',
  },
  {
    quote:
      'Finally, a platform that handles everything - galleries, bookings, contracts, invoices, and my website. Worth every penny.',
    author: 'Marcus Johnson',
    role: 'Portrait & Commercial',
    avatar: '/avatars/marcus.jpg',
  },
  {
    quote:
      'The multi-currency support and M-Pesa integration let me serve clients across Africa seamlessly. Game changer for my studio.',
    author: 'Grace Ochieng',
    role: 'Event Photographer',
    avatar: '/avatars/grace.jpg',
  },
]

const integrations = [
  { name: 'Stripe', icon: CreditCard },
  { name: 'Supabase', icon: Cloud },
  { name: 'Resend', icon: Mail },
  { name: 'Africa\'s Talking', icon: Phone },
  { name: 'Flutterwave', icon: Globe },
  { name: 'M-Pesa', icon: Phone },
  { name: 'PayPal', icon: CreditCard },
  { name: 'Vercel', icon: Zap },
]

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
        <div className="container-wide">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6 animate-in">
              <Sparkles className="h-4 w-4" />
              <span>Now with Video Galleries & Multi-Currency Payments</span>
            </div>

            <h1 className="text-display-xl font-display font-bold tracking-tight text-foreground mb-6 animate-in" style={{ animationDelay: '100ms' }}>
              The Complete Platform for
              <br />
              <span className="text-gradient">Photographers & Videographers</span>
            </h1>

            <p className="text-body-lg text-muted-foreground mb-8 max-w-2xl mx-auto animate-in" style={{ animationDelay: '200ms' }}>
              Deliver stunning galleries, manage bookings, sign contracts, accept payments,
              sell prints, and build your portfolio website — all in one elegant platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in" style={{ animationDelay: '300ms' }}>
              <Button size="lg" className="gap-2" asChild>
                <Link href="/auth/signup">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/demo">Watch Demo</Link>
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground animate-in" style={{ animationDelay: '400ms' }}>
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
          </div>

          {/* Floating stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 animate-in" style={{ animationDelay: '500ms' }}>
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-display-md font-display font-bold text-foreground">{stat.value}</div>
                <div className="text-body-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 border-y border-border/50">
        <div className="container-wide">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60">
            {integrations.map((integration) => (
              <span key={integration.name} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <integration.icon className="h-5 w-5" />
                {integration.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="page-section">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-display-lg font-display font-bold tracking-tight text-foreground mb-4">
              Everything You Need to Run Your Studio
            </h2>
            <p className="text-body-lg text-muted-foreground">
              Powerful features designed for professional photographers and videographers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="group relative rounded-2xl bg-card p-6 border border-border/50 card-hover animate-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-heading-md font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-body text-muted-foreground">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="page-section bg-muted/30">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-display-lg font-display font-bold tracking-tight text-foreground mb-4">
              Trusted by Photographers Worldwide
            </h2>
            <p className="text-body-lg text-muted-foreground">
              See what our customers have to say about their experience with LensFlow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <article
                key={testimonial.author}
                className="rounded-2xl bg-card p-6 border border-border/50 card-hover animate-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-body text-foreground mb-6 italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{testimonial.author}</div>
                    <div className="text-body-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="page-section">
        <div className="container-wide">
          <div className="mx-auto max-w-3xl text-center rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-primary p-8 sm:p-12 lg:p-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white mb-6">
              <Zap className="h-4 w-4" />
              <span>Join 10,000+ photographers already using LensFlow</span>
            </div>

            <h2 className="text-display-lg font-display font-bold text-white mb-4">
              Ready to Transform Your Photography Business?
            </h2>

            <p className="text-body-lg text-white/80 mb-8 max-w-xl mx-auto">
              Start your 14-day free trial today. No credit card required. Cancel anytime.
            </p>

            <Button size="lg" variant="secondary" className="gap-2" asChild>
              <Link href="/auth/signup">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background/50 backdrop-blur-sm">
        <div className="container-wide py-12 lg:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl text-foreground mb-4">
                <Camera className="h-6 w-6 text-primary" />
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
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
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
              <h4 className="font-semibold text-foreground mb-4">Resources</h4>
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
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
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
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
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

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border/50">
            <p className="text-body-sm text-muted-foreground">
              © {new Date().getFullYear()} LensFlow. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-body-sm text-muted-foreground">
              <span>Made with care for photographers worldwide</span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span>99.9% uptime</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}