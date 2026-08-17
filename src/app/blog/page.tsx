import Link from 'next/link'
import { format } from 'date-fns'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { getAllBlogPosts } from '@/lib/content/blog'

export const metadata = {
  title: 'Blog',
  description: 'Running a photography or videography business — pricing, contracts, client delivery, and payments in Kenya.',
}

export default function BlogPage() {
  const posts = getAllBlogPosts()

  return (
    <MarketingShell>
      <MarketingPageHeader
        label="Resources"
        title="Blog"
        description="Practical guidance for running a photography or videography business — from pricing packages to getting paid."
      />
      <section className="page-section border-t border-border">
        <div className="container-wide">
          <div className="mx-auto max-w-3xl space-y-2">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="card-hover group block rounded-lg border border-transparent p-6 -mx-6 hover:border-border"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="label-caption text-primary">{post.pillar}</span>
                  <span className="text-muted-foreground">·</span>
                  <time dateTime={post.date} className="label-caption">
                    {format(new Date(post.date), 'MMMM d, yyyy')}
                  </time>
                </div>
                <h2 className="text-heading-lg font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="mt-2 text-body text-muted-foreground max-w-2xl">{post.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
