import type { MetadataRoute } from 'next'
import { APP_CONSTANTS } from '@/lib/constants'
import { getAllBlogPosts } from '@/lib/content/blog'

const baseUrl = APP_CONSTANTS.URL

interface RouteConfig {
  path: string
  priority: number
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
}

const routes: RouteConfig[] = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/features/galleries', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/features/booking', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/features/crm', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/features/store', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/features/website', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/features/analytics', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/solutions/wedding-photographers', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/solutions/portrait-photographers', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/solutions/videographers', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/solutions/studios', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/solutions/creative-teams', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/careers', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/partners', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/affiliates', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/community', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/press', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/docs', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/api-docs', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/help', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/status', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/security', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/cookies', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/gdpr', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/dpa', priority: 0.3, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = routes.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }))

  const blogRoutes = getAllBlogPosts().map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...blogRoutes]
}
