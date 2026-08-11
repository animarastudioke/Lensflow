import type { Metadata, Viewport } from 'next'
import { Archivo, Spectral, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { APP_CONSTANTS } from '@/lib/constants'

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  metadataBase: new URL(APP_CONSTANTS.URL),
  title: {
    default: 'LensFlow - Premium Gallery Platform for Photographers',
    template: '%s | LensFlow',
  },
  description:
    'Deliver photos, manage clients, book sessions, sell prints, and grow your photography business with LensFlow.',
  keywords: [
    'photography',
    'client galleries',
    'photo delivery',
    'studio management',
    'photographer software',
    'portfolio website',
    'photo sales',
  ],
  authors: [{ name: 'LensFlow' }],
  creator: 'LensFlow',
  publisher: 'LensFlow',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://lensflow.io',
    siteName: 'LensFlow',
    title: 'LensFlow - Premium Gallery Platform for Photographers',
    description:
      'Deliver photos, manage clients, book sessions, sell prints, and grow your photography business.',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'LensFlow',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LensFlow - Premium Gallery Platform for Photographers',
    description:
      'Deliver photos, manage clients, book sessions, sell prints, and grow your photography business.',
    images: ['/og-default.png'],
    creator: '@lensflow',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${archivo.variable} ${spectral.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://*.supabase.co" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}