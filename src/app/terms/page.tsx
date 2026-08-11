import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { LegalDocument, LegalSection } from '@/components/marketing/LegalDocument'
import { APP_CONSTANTS } from '@/lib/constants'

export const metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of LensFlow.',
}

export default function TermsPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Legal" title="Terms of Service" />
      <LegalDocument lastUpdated="August 11, 2026">
        <LegalSection heading="Acceptance of terms">
          <p>
            By creating a LensFlow account or using the platform, you agree to these terms. If you don&apos;t
            agree, please don&apos;t use LensFlow.
          </p>
        </LegalSection>

        <LegalSection heading="The service">
          <p>
            LensFlow is a platform for photographers and videographers to deliver galleries, manage
            clients and bookings, accept payments, sell prints and downloads, and publish a portfolio
            website.
          </p>
        </LegalSection>

        <LegalSection heading="Your account">
          <p>
            You&apos;re responsible for the accuracy of the information you provide and for keeping your
            account credentials secure. You&apos;re responsible for the content you upload and the way you
            use LensFlow to run your business.
          </p>
        </LegalSection>

        <LegalSection heading="Your content">
          <p>
            You retain ownership of the photos, videos, and other content you upload. By using LensFlow to
            deliver that content, you grant us only the limited rights needed to store, process, and
            display it to you and the clients you share it with.
          </p>
        </LegalSection>

        <LegalSection heading="Billing and cancellation">
          <p>
            Paid plans are billed as described at checkout. You may cancel at any time; cancellation takes
            effect at the end of your current billing period, and you retain access until then.
          </p>
        </LegalSection>

        <LegalSection heading="Acceptable use">
          <p>
            You agree not to use LensFlow to upload unlawful content, infringe on others&apos; rights, or
            interfere with the operation or security of the platform.
          </p>
        </LegalSection>

        <LegalSection heading="Termination">
          <p>
            You may stop using LensFlow at any time. We may suspend or terminate accounts that violate
            these terms or pose a risk to the platform or other users.
          </p>
        </LegalSection>

        <LegalSection heading="Disclaimer and limitation of liability">
          <p>
            LensFlow is provided &ldquo;as is&rdquo; without warranties of any kind. To the fullest extent permitted
            by law, LensFlow is not liable for indirect, incidental, or consequential damages arising from
            your use of the platform.
          </p>
        </LegalSection>

        <LegalSection heading="Changes to these terms">
          <p>
            We may update these terms from time to time. Continued use of LensFlow after a change means
            you accept the updated terms.
          </p>
        </LegalSection>

        <LegalSection heading="Contact">
          <p>
            Questions about these terms? Email{' '}
            <a href={`mailto:${APP_CONSTANTS.SUPPORT_EMAIL}`} className="text-primary hover:underline">
              {APP_CONSTANTS.SUPPORT_EMAIL}
            </a>
            .
          </p>
        </LegalSection>
      </LegalDocument>
    </MarketingShell>
  )
}
