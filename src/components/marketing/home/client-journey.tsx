'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { JOURNEY_STAGES } from '@/lib/constants/homepage'
import { SectionHead } from './lib/section-head'

export function ClientJourney() {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = JOURNEY_STAGES[activeIndex]!

  return (
    <section className="page-section">
      <div className="container-wide">
        <SectionHead
          title="From first inquiry to final delivery."
          caption="The client journey"
          intro="One connected workflow for every client relationship."
        />

        {/* Desktop: interactive horizontal timeline */}
        <div className="mt-12 hidden lg:block">
          <div className="relative">
            <div className="absolute left-0 right-0 top-5 h-px bg-border" aria-hidden="true" />
            <div className="relative grid grid-cols-8">
              {JOURNEY_STAGES.map((stage, index) => (
                <button
                  key={stage.number}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className="group focus-ring flex flex-col items-center gap-3 rounded-md pt-0"
                  aria-current={activeIndex === index}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-md border bg-background font-mono text-xs font-medium transition-colors',
                      activeIndex === index
                        ? 'border-primary text-primary'
                        : 'border-input text-muted-foreground group-hover:border-foreground/40'
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
              <active.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
              <div>
                <h3 className="font-display text-heading-lg font-medium text-foreground">{active.heading}</h3>
                <p className="mt-1.5 text-body-sm text-muted-foreground">{active.copy}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile / tablet: ruled numbered list */}
        <ol className="mt-8 lg:hidden">
          {JOURNEY_STAGES.map((stage) => (
            <li
              key={stage.number}
              className="grid grid-cols-[2.5rem_1fr] gap-x-2 border-b border-border py-5 first:pt-2"
            >
              <span className="pt-1 font-mono text-[0.6875rem] tracking-[0.1em] text-primary">
                {stage.number}
              </span>
              <div>
                <h3 className="font-display text-heading-lg text-foreground">{stage.heading}</h3>
                <p className="mt-1 text-body-sm text-muted-foreground">{stage.copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
