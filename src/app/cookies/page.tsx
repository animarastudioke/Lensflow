import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { LegalDocument, LegalSection } from '@/components/marketing/LegalDocument'
import { APP_CONSTANTS } from '@/lib/constants'

export const metadata = {
  title: 'Cookie Policy',
  description: 'How LensFlow uses cookies.',
}

export default function CookiesPage() {
  return (
    <MarketingShell>
      <MarketingPageHeader label="Legal" title="Cookie Policy" />
      <LegalDocument lastUpdated="August 11, 2026">
        <LegalSection heading="What cookies are">
          <p>
            Cookies are small files stored on your device that help a website function and remember
            information between visits.
          </p>
        </LegalSection>

        <LegalSection heading="How we use them">
          <ul className="list-disc pl-5 space-y-1">
            <li>Essential cookies to keep you signed in and secure your session</li>
            <li>Preference cookies to remember settings like your studio and currency</li>
            <li>Analytics cookies to help us understand how the app is used, so we can improve it</li>
          </ul>
        </LegalSection>

        <LegalSection heading="Managing cookies">
          <p>
            Most browsers let you block or delete cookies in their settings. Blocking essential cookies
            may prevent parts of LensFlow, like staying signed in, from working correctly.
          </p>
        </LegalSection>

        <LegalSection heading="Contact">
          <p>
            Questions about this policy? Email{' '}
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
