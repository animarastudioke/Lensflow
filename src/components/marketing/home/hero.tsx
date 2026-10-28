'use client'

import { useRef, type RefObject } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { HERO_IMAGE } from '@/lib/constants/homepage'
import { Button } from '@/components/ui/button'
import { ProductPreview } from './product-preview'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] },
  }),
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    // framer-motion's types still expect a non-nullable RefObject; React 19
    // correctly infers useRef<T>(null) as RefObject<T | null> now.
    target: sectionRef as RefObject<HTMLElement>,
    offset: ['start start', 'end start'],
    // sectionRef is also passed down to ProductPreview's own useScroll() call,
    // which reads it before this component's layout effect has attached it -
    // framer-motion's own hydration-timing warning for this exact pattern
    // recommends this option (deferring setup to a regular effect instead of
    // a layout effect, which runs too early relative to hydration).
    layoutEffect: false,
  })
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 120])

  return (
    <section
      ref={sectionRef}
      className="relative flex flex-col justify-center overflow-hidden bg-[#0c0c0f] pb-12 pt-28 sm:min-h-[90vh] sm:pb-16 sm:pt-32 lg:min-h-[100vh] lg:pb-72"
    >
      {/*
        A single Image (one upstream fetch, one preload hint) rather than
        two breakpoint-toggled <Image priority> elements - Next.js's own
        `sizes`-driven responsive srcset already serves an appropriately
        sized variant per device from one source, so a second element
        wasn't buying real art-direction, only doubling what got eagerly
        preloaded regardless of which was actually visible. `lg:scale-110`
        keeps the desktop-only subtle zoom; the parallax drift is now
        shared across breakpoints too, at a small enough magnitude (see
        parallaxY above) to stay unobtrusive on mobile and still respect
        prefers-reduced-motion via the same `prefersReducedMotion` check.
      */}
      <motion.div className="absolute inset-0" style={{ y: parallaxY }}>
        <Image
          src={`https://images.unsplash.com/${HERO_IMAGE.src}?w=2400&q=80&auto=format&fit=crop`}
          alt={HERO_IMAGE.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover lg:scale-110"
        />
      </motion.div>
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-[#0c0c0f]"
        aria-hidden="true"
      />

      <div className="container-wide relative">
        <div className="mx-auto max-w-3xl text-center lg:max-w-5xl">
          <motion.span
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-white/70"
          >
            The business platform for photographers &amp; videographers
          </motion.span>

          <motion.h1
            custom={0.1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-5 text-balance font-display text-display-xl font-semibold text-white"
          >
            Run your entire creative business from one place.
          </motion.h1>

          <motion.p
            custom={0.2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mx-auto mt-6 max-w-xl text-balance text-lg text-white/75 sm:text-xl"
          >
            Galleries, bookings, contracts, CRM, invoices and M-Pesa payments — connected in one
            workspace built for photographers and videographers.
          </motion.p>

          <motion.div
            custom={0.3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button size="xl" variant="secondary" className="w-full gap-2 sm:w-auto" asChild>
              <Link href="/auth/signup">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="w-full border-white/25 bg-transparent text-white hover:border-white/50 hover:bg-white/10 hover:text-white sm:w-auto"
              asChild
            >
              <Link href="#product-tour">See how it works</Link>
            </Button>
          </motion.div>

          <motion.p
            custom={0.4}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-5 flex items-center justify-center gap-1.5 text-sm text-white/70"
          >
            <CheckCircle2 className="h-4 w-4" />
            No credit card required · Free plan available
          </motion.p>
        </div>
      </div>

      {/*
        Positioning (incl. the lg:translate-y-1/2 straddle into the next
        section) lives on this plain div, not on the motion.div below -
        framer-motion writes its own inline `transform` for the entrance
        animation, which would silently override a Tailwind `transform`
        utility class on the same element (inline styles beat class-based
        CSS), so the two transform sources need separate elements to both
        take effect.
      */}
      <div className="relative mt-12 px-4 sm:px-6 lg:absolute lg:inset-x-0 lg:bottom-0 lg:mt-0 lg:translate-y-1/2 lg:px-8">
        <motion.div
          custom={0.5}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <ProductPreview sectionRef={sectionRef} />
        </motion.div>
      </div>
    </section>
  )
}
