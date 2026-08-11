import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function MarketingCTA({
  title = 'Ready to transform your photography business?',
  description = 'Start your 14-day free trial today. No credit card required. Cancel anytime.',
}: {
  title?: string
  description?: string
}) {
  return (
    <section className="page-section border-t border-border">
      <div className="container-wide">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-display-md font-display font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-4 text-body-lg text-muted-foreground">{description}</p>
          <div className="flex justify-center">
            <Button size="lg" className="mt-8 gap-2" asChild>
              <Link href="/auth/signup">
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
