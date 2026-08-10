'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Sidebar, MobileSidebarTrigger } from './sidebar'
import { Header } from './header'

interface DashboardLayoutProps {
  children: React.ReactNode
  studioSlug: string
  studioName?: string
}

export function DashboardLayout({ children, studioSlug, studioName }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar trigger */}
      <MobileSidebarTrigger studioSlug={studioSlug} />

      {/* Desktop sidebar */}
      <Sidebar studioSlug={studioSlug} collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />

      {/* Main content */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out min-h-screen',
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        )}
      >
        <Header studioSlug={studioSlug} studioName={studioName} />

        <main className="p-4 sm:p-6 lg:p-8" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}