'use client'

import { ArrowDown, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { DISCONNECTED_TOOLS } from '@/lib/constants/homepage'
import { ScrollReveal, StaggerGroup, StaggerItem } from './lib/scroll-reveal'
import { LogoMark } from './lib/logo'
import { PRODUCT_ICONS } from '@/lib/constants/homepage'

const UNIFIED_ICONS = [
  PRODUCT_ICONS.ImageIcon,
  PRODUCT_ICONS.Calendar,
  PRODUCT_ICONS.Users,
  PRODUCT_ICONS.CreditCard,
  PRODUCT_ICONS.Store,
  PRODUCT_ICONS.Globe,
]

export function ProblemSection() {
  return (
    <section className="page-section bg-muted/40">
      <div className="container-wide">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="label-caption text-primary">The problem</span>
            <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Your work is creative. Your workflow shouldn&apos;t be complicated.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Your galleries are in one place. Bookings somewhere else. Invoices in another.
              Payments somewhere else. LensFlow brings the entire workflow together.
            </p>
          </div>
        </ScrollReveal>

        <div className="mx-auto mt-16 grid max-w-5xl items-center gap-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
          <div>
            <p className="label-caption mb-5 text-center lg:text-left">Before LensFlow</p>
            <StaggerGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2" staggerDelay={0.07}>
              {DISCONNECTED_TOOLS.map((tool, index) => (
                <StaggerItem key={tool.label}>
                  <motion.div
                    initial={{ rotate: index % 2 === 0 ? -3 : 3 }}
                    whileInView={{ rotate: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-3 py-5 text-center shadow-sm"
                  >
                    <tool.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-xs font-medium text-muted-foreground">{tool.label}</span>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>

          <div className="flex justify-center text-muted-foreground/50" aria-hidden="true">
            <ArrowRight className="hidden h-8 w-8 lg:block" strokeWidth={1.25} />
            <ArrowDown className="h-8 w-8 lg:hidden" strokeWidth={1.25} />
          </div>

          <div>
            <p className="label-caption mb-5 text-center lg:text-left">With LensFlow</p>
            <ScrollReveal variant="scaleIn" amount={0.4}>
              <div className="rounded-xl border border-primary/25 bg-card p-6 shadow-lg shadow-primary/5 sm:p-8">
                <div className="mb-5 flex items-center gap-2">
                  <LogoMark className="h-5 w-5 text-primary" />
                  <span className="font-display text-lg text-foreground">LensFlow workspace</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {UNIFIED_ICONS.map((Icon, index) => (
                    <div
                      key={index}
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10"
                    >
                      <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-sm text-muted-foreground">
                  Every tool, one login, one client record — connected from inquiry to delivery.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  )
}
