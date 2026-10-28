import { SectionHead } from './lib/section-head'
import { ScrollReveal } from './lib/scroll-reveal'

/**
 * A capability index, not a trust/social-proof strip — it is explicitly about
 * product comprehension: what LensFlow actually covers. Every line describes
 * something the product does today (payments = M-Pesa only).
 */
const AREAS = [
  { title: 'Client galleries', body: 'Proofing and download for every client.' },
  { title: 'Bookings', body: 'Take inquiries and confirm dates in one place.' },
  { title: 'Contracts & quotes', body: 'Send, sign and keep them with the client.' },
  { title: 'Invoicing', body: 'Invoices paid by M-Pesa.' },
  { title: 'Client records', body: 'A CRM that follows each client from first message to final gallery.' },
  { title: 'Store & website', body: 'Sell digital products and publish a simple site.' },
]

export function ValueStrip() {
  return (
    <section className="page-section">
      <div className="container-wide">
        <SectionHead
          title="Everything between inquiry and delivery."
          caption="One workspace · One client record"
        />
        <ScrollReveal variant="fadeIn" duration={0.5}>
          <ol className="grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
            {AREAS.map((area, index) => (
              <li key={area.title} className="border-b border-border py-7">
                <span className="font-mono text-[0.6875rem] font-medium tracking-[0.1em] text-primary">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 font-display text-heading-xl font-medium text-foreground">
                  {area.title}
                </h3>
                <p className="mt-2 text-body-sm text-muted-foreground">{area.body}</p>
              </li>
            ))}
          </ol>
        </ScrollReveal>
      </div>
    </section>
  )
}
