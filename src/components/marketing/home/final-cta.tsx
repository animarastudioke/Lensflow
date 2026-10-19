import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollReveal } from './lib/scroll-reveal'

// Ink band: the foreground token as a surface, background token as its text.
// The default focus ring (wine accent, white offset) is poor on ink, so the
// buttons here re-point ring/offset to the light token.
const RING_ON_INK = 'focus-visible:ring-background focus-visible:ring-offset-foreground'

export function FinalCta() {
  return (
    <section className="bg-foreground text-background">
      <div className="container-wide py-20 text-center sm:py-24">
        <ScrollReveal>
          <h2 className="mx-auto max-w-3xl text-balance font-display text-display-lg font-medium">
            Spend less time managing your business. More time creating.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-body-lg text-background/70">
            Everything you need to run your photography or videography business — beautifully connected.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="xl"
              className={`w-full gap-2 bg-background text-foreground hover:bg-background/90 sm:w-auto ${RING_ON_INK}`}
              asChild
            >
              <Link href="/auth/signup">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="xl"
              variant="outline"
              className={`w-full border-background/30 bg-transparent text-background hover:border-background/60 hover:bg-background/10 hover:text-background sm:w-auto ${RING_ON_INK}`}
              asChild
            >
              <Link href="/features/galleries">Explore LensFlow</Link>
            </Button>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-body-sm text-background/70">
            <CheckCircle2 className="h-4 w-4" />
            No credit card required
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
