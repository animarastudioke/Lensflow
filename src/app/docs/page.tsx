import Link from 'next/link'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { getAllDocs } from '@/lib/content/docs'

export const metadata = {
  title: 'Documentation',
  description: 'Guides for getting started with LensFlow and using galleries, booking, CRM, invoicing, the store, and the website builder.',
}

export default function DocsPage() {
  const docs = getAllDocs()
  const gettingStarted = docs.filter((doc) => doc.section === 'Getting Started')
  const features = docs.filter((doc) => doc.section === 'Features')

  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Resources"
        title="Documentation"
        description="Everything you need to set up your studio and get the most out of LensFlow."
      />
      <section className="page-section border-t border-border">
        <div className="container-wide">
          <div className="mx-auto max-w-3xl space-y-12">
            <div>
              <h2 className="label-caption text-primary mb-4">Getting Started</h2>
              <div className="space-y-2">
                {gettingStarted.map((doc) => (
                  <DocRow key={doc.slug} doc={doc} />
                ))}
              </div>
            </div>
            <div>
              <h2 className="label-caption text-primary mb-4">Features</h2>
              <div className="space-y-2">
                {features.map((doc) => (
                  <DocRow key={doc.slug} doc={doc} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}

function DocRow({ doc }: { doc: { slug: string; title: string; description: string } }) {
  return (
    <Link
      href={`/docs/${doc.slug}`}
      className="card-hover group block rounded-lg border border-transparent p-6 -mx-6 hover:border-border"
    >
      <h3 className="text-heading-md font-display font-semibold text-foreground group-hover:text-primary transition-colors">
        {doc.title}
      </h3>
      <p className="mt-1 text-body-sm text-muted-foreground max-w-2xl">{doc.description}</p>
    </Link>
  )
}
