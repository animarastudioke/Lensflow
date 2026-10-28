import { TESTIMONIALS, EARLY_ACCESS_POINTS } from '@/lib/constants/homepage'
import { SectionHead } from './lib/section-head'

/**
 * Renders real testimonials once TESTIMONIALS has entries; until then,
 * shows an honest "early access" framing instead of implying customer
 * quotes that don't exist. Swapping to real testimonials later only
 * requires populating TESTIMONIALS in src/lib/constants/homepage.ts — no
 * component change needed.
 */
export function EarlyAccess() {
  const hasTestimonials = TESTIMONIALS.length > 0

  return (
    <section className="page-section">
      <div className="container-wide">
        <SectionHead
          title="Built with photographers, for photographers."
          caption={hasTestimonials ? 'What studios say' : 'Early access'}
          intro={
            hasTestimonials
              ? undefined
              : 'LensFlow is being shaped around the real workflows of photographers, videographers, studios, and creative teams.'
          }
        />

        {hasTestimonials ? (
          <div className="scrollbar-hide mt-10 flex snap-x gap-4 overflow-x-auto pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible">
            {TESTIMONIALS.map((testimonial) => (
              <div
                key={testimonial.name}
                className="w-[85%] shrink-0 snap-center rounded-md border border-border bg-card p-6 sm:w-auto sm:p-7"
              >
                <p className="font-display text-heading-md text-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
                <p className="mt-4 text-sm font-medium text-foreground">{testimonial.name}</p>
                <p className="label-caption mt-1">
                  {testimonial.role}
                  {testimonial.studio ? ` · ${testimonial.studio}` : ''}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="scrollbar-hide mt-10 flex snap-x gap-4 overflow-x-auto pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible">
            {EARLY_ACCESS_POINTS.map((point) => (
              <div
                key={point.title}
                className="w-[85%] shrink-0 snap-center rounded-md border border-border bg-card p-6 sm:w-auto sm:p-7"
              >
                <point.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                <h3 className="mt-4 font-display text-heading-lg font-medium text-foreground">{point.title}</h3>
                <p className="mt-2 text-body-sm text-muted-foreground">{point.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
