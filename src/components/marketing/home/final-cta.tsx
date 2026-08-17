'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { GALLERY_SHOWCASE_IMAGES } from '@/lib/constants/homepage'
import { ScrollReveal } from './lib/scroll-reveal'

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-[#0c0c0f] py-28 sm:py-36">
      <div className="absolute inset-0">
        <Image
          src={`https://images.unsplash.com/${GALLERY_SHOWCASE_IMAGES[6]!.src}?w=2000&q=55&auto=format&fit=crop`}
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-25"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c0f] via-[#0c0c0f]/90 to-[#0c0c0f]" />
      </div>

      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]"
        animate={{ x: [0, 60, -40, 0], y: [0, -30, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="container-wide relative">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance font-display text-3xl font-semibold tracking-tight text-white sm:text-6xl">
              Spend less time managing your business. More time creating.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg text-white/60">
              Everything you need to run your photography business — beautifully connected.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/auth/signup"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-6 py-3.5 text-base font-medium text-black transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/90 sm:w-auto"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/features/galleries"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/25 px-6 py-3.5 text-base font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/10 sm:w-auto"
              >
                Explore LensFlow
              </Link>
            </div>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-sm text-white/45">
              <CheckCircle2 className="h-4 w-4" />
              No credit card required
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
