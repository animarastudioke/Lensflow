'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Sidebar, MobileSidebarTrigger } from './sidebar'
import { Header } from './header'

const SIDEBAR_COLLAPSED_KEY = 'lensflow:sidebar-collapsed'

interface DashboardLayoutProps {
  children: React.ReactNode
  studioSlug: string
  studioName?: string
  studioLogoUrl?: string | null
}

export function DashboardLayout({ children, studioSlug, studioName, studioLogoUrl }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  React.useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (stored !== null) {
      setSidebarCollapsed(stored === 'true')
    }
  }, [])

  const handleCollapsedChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed)
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar trigger */}
      <MobileSidebarTrigger studioSlug={studioSlug} />

      {/* Desktop sidebar */}
      <Sidebar studioSlug={studioSlug} collapsed={sidebarCollapsed} onCollapsedChange={handleCollapsedChange} />

      {/* Main content */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out min-h-screen',
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        )}
      >
        <Header studioSlug={studioSlug} studioName={studioName} studioLogoUrl={studioLogoUrl} />

        <main className="p-4 sm:p-6 lg:p-8" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}