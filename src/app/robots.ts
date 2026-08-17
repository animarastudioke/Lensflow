import type { MetadataRoute } from 'next'
import { APP_CONSTANTS } from '@/lib/constants'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/auth', '/api'],
    },
    sitemap: `${APP_CONSTANTS.URL}/sitemap.xml`,
  }
}
