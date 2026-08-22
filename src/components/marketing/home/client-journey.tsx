'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { JOURNEY_STAGES } from '@/lib/constants/homepage'
import { ScrollReveal } from './lib/scroll-reveal'

export function ClientJourney() {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = JOURNEY_STAGES[activeIndex]!

  return (
    <section className="page-section bg-muted/40">
      <div className="container-wide">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="label-caption text-primary">The client journey</span>
            <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              From first inquiry to final delivery.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              One connected workflow for every client relationship.
            </p>
          </div>
        </ScrollReveal>

        {/* Desktop: interactive horizontal timeline */}
        <div className="mt-16 hidden lg:block">
          <div className="relative">
            <div className="absolute left-0 right-0 top-5 h-px bg-foreground/15" aria-hidden="true" />
            <div className="relative grid grid-cols-8">
              {JOURNEY_STAGES.map((stage, index) => (
                <button
                  key={stage.number}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className="group flex flex-col items-center gap-3 pt-0"
                  aria-current={activeIndex === index}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background font-mono text-xs font-medium transition-colors',
                      activeIndex === index
                        ? 'border-primary text-primary'
                        : 'border-border text-muted-foreground group-hover:border-foreground/40'
                    )}
                  >
                    {stage.number}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-medium transition-colors',
                      activeIndex === index ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {stage.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active.number}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mt-10 flex max-w-xl items-start gap-4 rounded-md border border-border bg-card p-6"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <active.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-display text-lg font-medium text-foreground">{active.heading}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{active.copy}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile / tablet: vertical timeline */}
        <div className="mt-14 space-y-0 lg:hidden">
          {JOURNEY_STAGES.map((stage, index) => (
            <div key={stage.number} className="relative flex gap-4 pb-8 last:pb-0">
              {index < JOURNEY_STAGES.length - 1 ? (
                <span className="absolute left-5 top-11 h-full w-px bg-border" aria-hidden="true" />
              ) : null}
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-background font-mono text-xs font-medium text-primary">
                {stage.number}
              </span>
              <div className="pt-1.5">
                <h3 className="font-display text-base font-medium text-foreground">{stage.heading}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{stage.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
