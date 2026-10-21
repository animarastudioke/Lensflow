import { FRAGMENTED_WORKFLOW } from '@/lib/constants/homepage'
import { cn } from '@/lib/utils'
import { ScrollReveal } from './lib/scroll-reveal'
import { LogoMark } from './lib/logo'

export function ProblemSection() {
  const last = FRAGMENTED_WORKFLOW.length - 1

  return (
    <section className="page-section">
      <div className="container-wide grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
        <ScrollReveal>
          <span className="label-caption text-primary">The problem</span>
          <h2 className="mt-3 text-balance font-display text-display-md font-medium text-foreground">
            Your work is creative. Your workflow shouldn&apos;t be complicated.
          </h2>
          <p className="mt-5 text-body-lg text-muted-foreground">
            Your galleries are in one place. Bookings somewhere else. Contracts in another.
            Invoices somewhere else. LensFlow connects the workflow from inquiry to delivery.
          </p>

          <div className="mt-8 rounded-md border border-border bg-card p-6">
            <p className="label-caption mb-4">With LensFlow</p>
            <div className="mb-4 flex items-center gap-2">
              <LogoMark className="h-5 w-5 text-primary" />
              <span className="font-display text-heading-md text-foreground">LensFlow workspace</span>
            </div>
            <p className="font-display text-heading-xl font-medium text-foreground">
              One client. One project. One connected workflow.
            </p>
            <p className="mt-3 text-body-sm text-muted-foreground">
              Every tool, one login, one client record — connected from inquiry to delivery.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <p className="label-caption mb-4">Before LensFlow</p>
          <ol>
            {FRAGMENTED_WORKFLOW.map((step, index) => (
              <li
                key={step.stage}
                className={cn(
                  'grid grid-cols-[2rem_1fr] items-baseline gap-x-2 border-t py-4 sm:grid-cols-[2rem_1fr_auto]',
                  index === last ? 'border-t-foreground border-b border-b-border' : 'border-border'
                )}
              >
                <span
                  className={cn(
                    'font-mono text-xs',
                    index === last ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {index + 1}
                </span>
                <span className="font-display text-heading-lg text-foreground">{step.stage}</span>
                <span className="label-caption col-start-2 mt-1 sm:col-start-3 sm:mt-0 sm:text-right">
                  {step.tool}
                </span>
              </li>
            ))}
          </ol>
        </ScrollReveal>
      </div>
    </section>
  )
}
