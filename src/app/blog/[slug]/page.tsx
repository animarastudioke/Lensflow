import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { getAllBlogPosts, getBlogPost } from '@/lib/content/blog'
import { APP_CONSTANTS } from '@/lib/constants'

export function generateStaticParams() {
  return getAllBlogPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      url: `${APP_CONSTANTS.URL}/blog/${slug}`,
    },
  }
}

function ArticleStructuredData({ post, slug }: { post: NonNullable<ReturnType<typeof getBlogPost>>; slug: string }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    url: `${APP_CONSTANTS.URL}/blog/${slug}`,
    author: { '@type': 'Organization', name: 'LensFlow' },
    publisher: {
      '@type': 'Organization',
      name: 'LensFlow',
      logo: { '@type': 'ImageObject', url: `${APP_CONSTANTS.URL}/favicon.ico` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${APP_CONSTANTS.URL}/blog/${slug}` },
  }

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  return (
    <MarketingShell>
      <ArticleStructuredData post={post} slug={slug} />
      <article className="page-section">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl">
            <Link href="/blog" className="label-caption text-primary hover:underline">
              ← Blog
            </Link>

            <div className="mt-6 flex items-center gap-3">
              <span className="label-caption text-primary">{post.pillar}</span>
              <span className="text-muted-foreground">·</span>
              <time dateTime={post.date} className="label-caption">
                {format(new Date(post.date), 'MMMM d, yyyy')}
              </time>
            </div>

            <h1 className="mt-4 text-display-lg font-display font-semibold tracking-tight text-foreground text-balance">
              {post.title}
            </h1>

            <div className="mt-10 space-y-5 text-body text-muted-foreground leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => (
                    <h2 className="pt-4 text-heading-lg font-display font-semibold text-foreground">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="pt-2 text-heading-md font-display font-semibold text-foreground">{children}</h3>
                  ),
                  p: ({ children }) => <p>{children}</p>,
                  a: ({ href, children }) => (
                    <Link href={href ?? '#'} className="text-primary hover:underline">
                      {children}
                    </Link>
                  ),
                  ul: ({ children }) => <ul className="list-disc pl-5 space-y-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2">{children}</ol>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary pl-4 italic text-foreground/80">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="border-border" />,
                  table: ({ children }) => (
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full text-body-sm">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                  th: ({ children }) => (
                    <th className="px-4 py-3 text-left font-medium text-foreground">{children}</th>
                  ),
                  td: ({ children }) => <td className="px-4 py-3 border-t border-border">{children}</td>,
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </article>
    </MarketingShell>
  )
}
