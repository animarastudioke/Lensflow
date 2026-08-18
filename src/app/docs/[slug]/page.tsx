import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarkdownArticle } from '@/components/marketing/MarkdownArticle'
import { getAllDocs, getDoc } from '@/lib/content/docs'
import { APP_CONSTANTS } from '@/lib/constants'

export function generateStaticParams() {
  return getAllDocs().map((doc) => ({ slug: doc.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const doc = getDoc(slug)
  if (!doc) return {}

  return {
    title: doc.title,
    description: doc.description,
    openGraph: {
      type: 'article',
      title: doc.title,
      description: doc.description,
      url: `${APP_CONSTANTS.URL}/docs/${slug}`,
    },
  }
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = getDoc(slug)
  if (!doc) notFound()

  return (
    <MarketingShell>
      <article className="page-section">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl">
            <Link href="/docs" className="label-caption text-primary hover:underline">
              ← Documentation
            </Link>

            <p className="mt-6 label-caption text-primary">{doc.section}</p>

            <h1 className="mt-4 text-display-lg font-display font-semibold tracking-tight text-foreground text-balance">
              {doc.title}
            </h1>

            <div className="mt-10">
              <MarkdownArticle content={doc.content} />
            </div>
          </div>
        </div>
      </article>
    </MarketingShell>
  )
}
