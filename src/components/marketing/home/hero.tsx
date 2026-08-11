'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { HERO_IMAGE } from '@/lib/constants/homepage'
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
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 120])

  return (
    <section
      ref={sectionRef}
      className="relative flex flex-col justify-center overflow-hidden bg-[#0c0c0f] pb-12 pt-28 sm:min-h-[90vh] sm:pb-16 sm:pt-32 lg:min-h-[100vh] lg:pb-72"
    >
      <motion.div
        className="absolute inset-0 hidden lg:block"
        style={{ y: parallaxY }}
      >
        <Image
          src={`https://images.unsplash.com/${HERO_IMAGE.src}?w=2400&q=80&auto=format&fit=crop`}
          alt={HERO_IMAGE.alt}
          fill
          priority
          sizes="100vw"
          className="scale-110 object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 lg:hidden">
        <Image
          src={`https://images.unsplash.com/${HERO_IMAGE.src}?w=1600&q=75&auto=format&fit=crop`}
          alt={HERO_IMAGE.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-[#0c0c0f]"
        aria-hidden="true"
      />

      <div className="container-wide relative">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            custom={0}
            initial={prefersReducedMotion ? undefined : 'hidden'}
            animate="visible"
            variants={fadeUp}
            className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-white/70"
          >
            Built for photographers &amp; videographers
          </motion.span>

          <motion.h1
            custom={0.1}
            initial={prefersReducedMotion ? undefined : 'hidden'}
            animate="visible"
            variants={fadeUp}
            className="mt-5 text-balance font-display text-[2.5rem] font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-[5.5rem]"
          >
            Everything your creative business
            <br />
            needs. In one place.
          </motion.h1>

          <motion.p
            custom={0.2}
            initial={prefersReducedMotion ? undefined : 'hidden'}
            animate="visible"
            variants={fadeUp}
            className="mx-auto mt-6 max-w-xl text-balance text-lg text-white/75 sm:text-xl"
          >
            Deliver stunning galleries, book clients, send contracts, get paid, and run your
            business — without juggling a dozen different tools.
          </motion.p>

          <motion.div
            custom={0.3}
            initial={prefersReducedMotion ? undefined : 'hidden'}
            animate="visible"
            variants={fadeUp}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/auth/signup"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-6 py-3.5 text-base font-medium text-black transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-lg hover:shadow-black/20 sm:w-auto"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#product-tour"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/25 px-6 py-3.5 text-base font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/10 sm:w-auto"
            >
              See how it works
            </Link>
          </motion.div>

          <motion.p
            custom={0.4}
            initial={prefersReducedMotion ? undefined : 'hidden'}
            animate="visible"
            variants={fadeUp}
            className="mt-5 flex items-center justify-center gap-1.5 text-sm text-white/55"
          >
            <CheckCircle2 className="h-4 w-4" />
            No credit card required
          </motion.p>
        </div>
      </div>

      <motion.div
        custom={0.5}
        initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-12 px-4 sm:px-6 lg:absolute lg:inset-x-0 lg:bottom-0 lg:mt-0 lg:translate-y-1/2 lg:px-8"
      >
        <ProductPreview sectionRef={sectionRef} />
      </motion.div>
    </section>
  )
}
