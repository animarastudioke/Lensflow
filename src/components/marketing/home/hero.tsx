'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductPreview } from './product-preview'

// MarketingMotion's MotionConfig(reducedMotion="user") strips the y transform
// under prefers-reduced-motion and leaves only the opacity fade.
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
  }),
}

export function Hero() {
  return (
    <section className="pb-6 pt-16 sm:pb-10">
      <div className="container-wide pt-14 text-center sm:pt-20 lg:pt-24">
        <motion.span
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="label-caption inline-flex items-center gap-3 text-balance"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          The business platform for photographers &amp; videographers
        </motion.span>

        <motion.h1
          custom={0.08}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mx-auto mt-7 max-w-4xl text-balance font-display text-display-xl font-medium text-foreground"
        >
          Run your entire creative business from one place.
        </motion.h1>

        <motion.p
          custom={0.16}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mx-auto mt-7 max-w-2xl text-balance text-body-lg text-muted-foreground sm:text-xl"
        >
          Galleries, bookings, contracts, CRM, invoices and M-Pesa payments — connected in one
          workspace built for photographers and videographers.
        </motion.p>

        <motion.div
          custom={0.24}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button size="xl" className="w-full gap-2 sm:w-auto" asChild>
            <Link href="/auth/signup">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="xl" variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="#product-tour">See how it works</Link>
          </Button>
        </motion.div>

        <motion.p
          custom={0.32}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-5 flex items-center justify-center gap-1.5 text-body-sm text-muted-foreground"
        >
          <CheckCircle2 className="h-4 w-4" />
          No credit card required · Free plan available
        </motion.p>
      </div>

      <div className="container-wide mt-14 sm:mt-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <ProductPreview />
        </motion.div>
      </div>
    </section>
  )
}
