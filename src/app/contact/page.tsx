import { Mail } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { APP_CONSTANTS } from '@/lib/constants'

export const metadata = {
  title: 'Contact',
  description: 'Get in touch with the LensFlow team.',
}

export default function ContactPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Company"
        title="Get in touch"
        description="Questions, feedback, or something not working the way it should — we read every message."
      />
      <section className="page-section border-t border-border">
        <div className="container-wide">
          <div className="mx-auto max-w-lg text-center">
            <a
              href={`mailto:${APP_CONSTANTS.SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-2 text-body-lg text-primary hover:underline"
            >
              <Mail className="h-5 w-5" strokeWidth={1.5} />
              {APP_CONSTANTS.SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
