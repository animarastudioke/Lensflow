import type { CSSProperties, ReactNode } from 'react'
import { Navbar } from './navbar'
import { Footer } from './footer'

// The marketing site always presents the same light, editorial look,
// regardless of a visitor's dashboard dark-mode preference (dark mode is a
// workspace setting, not a brand choice) - so every design token is pinned
// to its light value here rather than left to inherit the global theme.
export const LIGHT_THEME_VARS = {
  '--background': '0 0% 100%',
  '--foreground': '220 20% 11%',
  '--card': '0 0% 100%',
  '--card-foreground': '220 20% 11%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '220 20% 11%',
  '--primary': '350 62% 30%',
  '--primary-foreground': '40 20% 97%',
  '--secondary': '210 10% 93%',
  '--secondary-foreground': '220 20% 15%',
  '--muted': '210 10% 94%',
  '--muted-foreground': '220 10% 40%',
  '--accent': '210 10% 93%',
  '--accent-foreground': '220 20% 15%',
  '--destructive': '10 75% 46%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '210 12% 88%',
  '--input': '210 12% 85%',
  '--ring': '350 62% 30%',
  '--success': '150 45% 26%',
  '--success-foreground': '0 0% 98%',
  '--warning': '38 75% 38%',
  '--warning-foreground': '0 0% 98%',
  '--info': '210 40% 32%',
  '--info-foreground': '0 0% 98%',
} as CSSProperties

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground" style={LIGHT_THEME_VARS}>
      <Navbar />
      <main className="pt-16">{children}</main>
      <Footer />
    </div>
  )
}
