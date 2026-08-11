import Link from 'next/link'
import { Mail } from 'lucide-react'
import { APP_CONSTANTS } from '@/lib/constants'

export function MarketingComingSoon({ note }: { note: string }) {
  return (
    <section className="page-section border-t border-border">
      <div className="container-wide">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-body-lg text-muted-foreground">{note}</p>
          <Link
            href={`mailto:${APP_CONSTANTS.SUPPORT_EMAIL}`}
            className="mt-6 inline-flex items-center gap-2 text-body text-primary hover:underline"
          >
            <Mail className="h-4 w-4" strokeWidth={1.5} />
            {APP_CONSTANTS.SUPPORT_EMAIL}
          </Link>
        </div>
      </div>
    </section>
  )
}
