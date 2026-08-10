'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Users,
  Image,
  Calendar,
  FileText,
  DollarSign,
  Store,
  Globe,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Menu,
  Building2,
  Briefcase,
  Megaphone,
  NotepadText,
  LogOut,
  User,
} from 'lucide-react'
import { useAuthUser, type UserRole } from '@/lib/auth/hooks'

interface SidebarProps {
  studioSlug: string
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

const navigation = [
  {
    title: 'Dashboard',
    href: (studioSlug: string) => `/dashboard/${studioSlug}`,
    icon: LayoutDashboard,
    permission: 'studios:read',
  },
  {
    title: 'Galleries',
    href: (studioSlug: string) => `/dashboard/${studioSlug}/galleries`,
    icon: Image,
    permission: 'galleries:read',
  },
  {
    title: 'Clients',
    href: (studioSlug: string) => `/dashboard/${studioSlug}/clients`,
    icon: Users,
    permission: 'clients:read',
  },
  {
    title: 'Leads',
    href: (studioSlug: string) => `/dashboard/${studioSlug}/leads`,
    icon: Briefcase,
    permission: 'leads:read',
  },
  {
    title: 'Projects',
    href: (studioSlug: string) => `/dashboard/${studioSlug}/projects`,
    icon: Building2,
    permission: 'projects:read',
  },
  {
    title: 'Bookings',
    href: (studioSlug: string) => `/dashboard/${studioSlug}/bookings`,
    icon: Calendar,
    permission: 'bookings:read',
  },
  {
    title: 'Contracts',
    href: (studioSlug: string) => `/dashboard/${studioSlug}/contracts`,
    icon: FileText,
    permission: 'contracts:read',
  },
  {
    title: 'Quotes',
    href: (studioSlug: string) => `/dashboard/${studioSlug}/quotes`,
    icon: NotepadText,
    permission: 'quotes:read',
  },
  {
    title: 'Invoices',
    href: (studioSlug: string) => `/dashboard/${studioSlug}/invoices`,
    icon: DollarSign,
    permission: 'invoices:read',
  },
  {
    title: 'Payments',
    href: (studioSlug: string) => `/dashboard/${studioSlug}/payments`,
    icon: DollarSign,
    permission: 'payments:read',
  },
  {
    title: 'Store',
    href: (studioSlug: string) => `/dashboard/${studioSlug}/store`,
    icon: Store,
    permission: 'store:read',
  },
  {
    title: 'Website',
    href: (studioSlug: string) => `/dashboard/${studioSlug}/website`,
    icon: Globe,
    permission: 'website:read',
  },
  {
    title: 'Marketing',
    href: (studioSlug: string) => `/dashboard/${studioSlug}/marketing`,
    icon: Megaphone,
    permission: 'analytics:read',
  },
  {
    title: 'Analytics',
    href: (studioSlug: string) => `/dashboard/${studioSlug}/analytics`,
    icon: BarChart3,
    permission: 'analytics:read',
  },
  {
    title: 'Team',
    href: (studioSlug: string) => `/dashboard/${studioSlug}/team`,
    icon: Users,
    permission: 'team:read',
    roles: ['studio_owner', 'super_admin'],
  },
  {
    title: 'Settings',
    href: (studioSlug: string) => `/dashboard/${studioSlug}/settings`,
    icon: Settings,
    permission: 'settings:read',
  },
]

function hasAccess(userRole: UserRole | undefined, item: typeof navigation[0]): boolean {
  if (!userRole) return false

  // Check role restrictions
  if (item.roles && !item.roles.includes(userRole)) {
    return false
  }

  // Check permission
  if (item.permission) {
    // Import hasPermission dynamically to avoid circular dependency
    const { hasPermission } = require('@/lib/auth/permissions')
    return hasPermission(userRole, item.permission)
  }

  return true
}

export function Sidebar({ studioSlug, collapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuthUser()

  const accessibleNavigation = navigation.filter((item) => hasAccess(user?.role, item))

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300',
          collapsed ? 'w-20' : 'w-64'
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-full flex-col">
          {/* Logo / Brand */}
          <div
            className={cn(
              'flex h-16 items-center justify-between px-4 border-b border-border transition-all duration-300',
              collapsed && 'justify-center'
            )}
          >
            {!collapsed && (
              <Link
                href={`/dashboard/${studioSlug}`}
                className="flex items-center gap-2 font-display text-xl italic text-foreground"
                aria-label="LensFlow Dashboard"
              >
                <Building2 className="h-6 w-6 text-primary" strokeWidth={1.5} />
                <span className="truncate">LensFlow</span>
              </Link>
            )}
            {collapsed && (
              <Link
                href={`/dashboard/${studioSlug}`}
                className="flex items-center justify-center"
                aria-label="LensFlow Dashboard"
              >
                <Building2 className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8 transition-all duration-300', collapsed && 'rotate-180')}
              onClick={() => onCollapsedChange(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3" aria-label="Main navigation">
            <ul className="space-y-1" role="list">
              {accessibleNavigation.map((item) => {
                const isActive = pathname === item.href(studioSlug)
                const Icon = item.icon
                return (
                  <li key={item.title}>
                    <Link
                      href={item.href(studioSlug)}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        collapsed && 'justify-center'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                      title={collapsed ? item.title : undefined}
                    >
                      <Icon className={cn('h-5 w-5 flex-shrink-0', collapsed && 'mx-auto')} aria-hidden="true" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Footer with user info */}
          {!collapsed && user && (
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      <MobileSidebarTrigger studioSlug={studioSlug} />
    </>
  )
}

export function MobileSidebarTrigger({ studioSlug }: { studioSlug: string }) {
  const { user } = useAuthUser()
  const accessibleNavigation = navigation.filter((item) => hasAccess(user?.role, item))

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden fixed top-4 left-4 z-50 h-10 w-10 rounded-md bg-background border border-border"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-border">
            <Link
              href={`/dashboard/${studioSlug}`}
              className="flex items-center gap-2 font-display text-xl italic text-foreground"
            >
              <Building2 className="h-6 w-6 text-primary" strokeWidth={1.5} />
              <span>LensFlow</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3" aria-label="Mobile navigation">
            <ul className="space-y-1" role="list">
              {accessibleNavigation.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.title}>
                    <Link
                      href={item.href(studioSlug)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      <span>{item.title}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User section */}
          {user && (
            <div className="border-t border-border p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => {}}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}