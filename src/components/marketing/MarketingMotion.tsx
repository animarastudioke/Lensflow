'use client'

import type { ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'

// "user" makes every framer-motion transform (y/x/scale reveals, parallax,
// mobile-menu slides) drop out under prefers-reduced-motion while keeping
// opacity fades - removing the movement, not just shortening it.
export function MarketingMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
