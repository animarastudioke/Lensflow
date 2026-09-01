import Link from 'next/link'
import { LogoMark } from '@/components/marketing/home/lib/logo'

interface AuthShellProps {
  children: React.ReactNode
}

/**
 * The one shared chrome for every unauthenticated auth screen (login,
 * signup, forgot/reset password, confirmed, callback). Previously each page
 * hand-rolled the same `min-h-screen flex items-center justify-center
 * bg-muted/30` wrapper independently -- purely a composition change, no
 * auth logic lives here.
 *
 * The right-side panel is deliberately not a photograph: docs/DESIGN-SYSTEM.md
 * explicitly rules out "stock-photography-portfolio framing" for LensFlow's
 * own chrome ("the product should read as software, not as another gallery
 * on the internet"). Its aperture motif is the existing LogoMark geometry
 * enlarged -- a photography *concept* (the iris/aperture) expressed as
 * restrained, monochrome, single-accent geometry, matching the brand
 * direction instead of contradicting it. bg-foreground/text-background
 * deliberately inverts with the theme: a dark "viewing room" panel in light
 * mode, a lit "gallery wall" panel in dark mode.
 */
export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2" aria-label="LensFlow Home">
              <LogoMark className="h-10 w-10 text-primary" />
              <span className="font-display italic text-2xl text-foreground">LensFlow</span>
            </Link>
          </div>
          {children}
        </div>
      </div>

      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden bg-foreground text-background flex-col justify-between p-12">
        <LogoMark className="absolute -right-28 -bottom-28 h-[30rem] w-[30rem] opacity-[0.07]" />

        <Link href="/" className="relative flex items-center gap-2" aria-label="LensFlow Home">
          <LogoMark className="h-7 w-7" />
          <span className="font-display italic text-xl">LensFlow</span>
        </Link>

        <div className="relative space-y-4 max-w-sm">
          <p className="font-display text-display-sm italic leading-snug">
            Every gallery, every booking, every invoice — one considered place to run your studio.
          </p>
          <p className="text-body-sm text-background/70">
            Built for photographers and videographers who want their business to feel as considered as their work.
          </p>
        </div>
      </div>
    </div>
  )
}
