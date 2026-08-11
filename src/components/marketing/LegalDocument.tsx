import type { ReactNode } from 'react'

export function LegalDocument({ lastUpdated, children }: { lastUpdated: string; children: ReactNode }) {
  return (
    <section className="page-section border-t border-border">
      <div className="container-wide">
        <div className="mx-auto max-w-2xl">
          <p className="label-caption">Last updated {lastUpdated}</p>
          <div className="mt-8 space-y-8">{children}</div>
        </div>
      </div>
    </section>
  )
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-heading-lg font-display font-semibold text-foreground mb-3">{heading}</h2>
      <div className="space-y-3 text-body text-muted-foreground leading-relaxed">{children}</div>
    </div>
  )
}
