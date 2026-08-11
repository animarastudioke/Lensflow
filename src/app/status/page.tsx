import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { APP_CONSTANTS } from '@/lib/constants'

const services = ['Web app', 'Client galleries', 'Payments', 'Email delivery']

export const metadata = {
  title: 'Status',
  description: 'Current status of LensFlow services.',
}

export default function StatusPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Resources" title="Status" />
      <section className="page-section border-t border-border">
        <div className="container-wide">
          <div className="mx-auto max-w-lg">
            <ul className="divide-y divide-border border border-border rounded-md">
              {services.map((service) => (
                <li key={service} className="flex items-center justify-between px-4 py-3">
                  <span className="text-body text-foreground">{service}</span>
                  <span className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Operational
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-body-sm text-muted-foreground text-center">
              This page is updated manually, not by an automated monitor. If something looks wrong,
              email{' '}
              <a href={`mailto:${APP_CONSTANTS.SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {APP_CONSTANTS.SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
