import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase/env'

const PUBLIC_PATHS = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/callback',
  '/auth/confirmed',
  '/g',
  '/api/g',
  '/api/storage',
  '/api/payments',
  '/store',
  '/portfolio',
  '/api/webhooks',
  '/api/public',
  '/features',
  '/solutions',
  '/pricing',
  '/docs',
  '/blog',
  '/community',
  '/help',
  '/api-docs',
  '/status',
  '/about',
  '/careers',
  '/press',
  '/contact',
  '/partners',
  '/affiliates',
  '/privacy',
  '/terms',
  '/cookies',
  '/security',
  '/gdpr',
  '/dpa',
]

const AUTH_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and API routes that don't need auth
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next()
  }

  // Check if path is public
  const isPublicPath = PUBLIC_PATHS.some((path) =>
    pathname === path || pathname.startsWith(path + '/')
  )

  // Check if path is auth-related
  const isAuthPath = AUTH_PATHS.some((path) =>
    pathname === path || pathname.startsWith(path + '/')
  )

  const response = NextResponse.next()

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // If accessing auth page while logged in, redirect to dashboard
  if (isAuthPath && session) {
    const studioSlug = request.nextUrl.searchParams.get('studio')
    const redirectUrl = studioSlug
      ? `/dashboard/${studioSlug}`
      : '/dashboard'
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  // If accessing protected path without session, redirect to login
  if (!isPublicPath && !session) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  // CSP for non-authenticated pages
  if (!session) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;"
    )
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}