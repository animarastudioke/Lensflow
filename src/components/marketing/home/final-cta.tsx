'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

      <div className="container-wide relative">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance font-display text-display-md font-semibold text-white">
              Spend less time managing your business. More time creating.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg text-white/60">
              Everything you need to run your photography or videography business — beautifully connected.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
                <Link href="/features/galleries">Explore LensFlow</Link>
              </Button>
            </div>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-sm text-white/70">
              <CheckCircle2 className="h-4 w-4" />
              No credit card required
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
