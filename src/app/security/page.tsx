import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { LegalDocument, LegalSection } from '@/components/marketing/LegalDocument'
import { APP_CONSTANTS } from '@/lib/constants'

export const metadata = {
  title: 'Security',
  description: 'How LensFlow protects your data.',
}

export default function SecurityPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Legal" title="Security" />
      <LegalDocument lastUpdated="August 11, 2026">
        <LegalSection heading="Encryption">
          <p>All traffic to and from LensFlow is encrypted in transit using HTTPS.</p>
        </LegalSection>

        <LegalSection heading="Data isolation">
          <p>
            Each studio&apos;s data — clients, galleries, bookings, and invoices — is scoped to that studio
            at the database level, so one studio can never see another studio&apos;s data.
          </p>
        </LegalSection>

        <LegalSection heading="Payments">
          <p>
            Payment card details are handled directly by our payment processors and are never stored on
            LensFlow&apos;s own servers.
          </p>
        </LegalSection>

        <LegalSection heading="Account access">
          <p>
            Access to your account is protected by authentication, and you control who on your team has
            access to your studio.
          </p>
        </LegalSection>

        <LegalSection heading="Reporting a vulnerability">
          <p>
            If you believe you&apos;ve found a security issue, please report it to{' '}
            <a href={`mailto:${APP_CONSTANTS.SUPPORT_EMAIL}`} className="text-primary hover:underline">
              {APP_CONSTANTS.SUPPORT_EMAIL}
            </a>{' '}
            rather than disclosing it publicly. We take these reports seriously and will follow up
            directly.
          </p>
        </LegalSection>
      </LegalDocument>
    </MarketingShell>
  )
}
