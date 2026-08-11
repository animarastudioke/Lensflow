import { Sparkles, Users2, Wrench } from 'lucide-react'
import { ScrollReveal } from './lib/scroll-reveal'

const EARLY_ACCESS_CARDS = [
  {
    icon: Wrench,
    title: 'Built with working photographers',
    body: 'Every part of LensFlow — from proofing to payments — was shaped by conversations with photographers running real studios.',
  },
  {
    icon: Users2,
    title: 'Early access is open',
    body: 'We’re onboarding studios directly and shaping the roadmap around what they need most.',
  },
  {
    icon: Sparkles,
    title: 'Join the first LensFlow creators',
    body: 'Be part of the founding group of photographers and videographers helping define the platform.',
  },
]

export function Testimonials() {
  return (
    <section className="page-section bg-muted/40">
      <div className="container-wide">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="label-caption text-primary">Early access</span>
            <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Built with photographers, for photographers
            </h2>
          </div>
        </ScrollReveal>

        <div className="scrollbar-hide mt-12 flex snap-x gap-4 overflow-x-auto pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible">
          {EARLY_ACCESS_CARDS.map((card) => (
            <div
              key={card.title}
              className="w-[85%] shrink-0 snap-center rounded-xl border border-border bg-card p-6 sm:w-auto sm:p-7"
            >
              <card.icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
              <h3 className="mt-4 font-display text-lg font-medium text-foreground">{card.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
