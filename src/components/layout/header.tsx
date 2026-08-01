'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, Bell, Moon, Sun, LogOut, User, Settings, HelpCircle, Shield, Crown } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuthUser } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'

interface HeaderProps {
  studioSlug: string
  studioName?: string
}

export function Header({ studioSlug, studioName = 'Studio' }: HeaderProps) {
  const pathname = usePathname()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { user, isLoading, signOut } = useAuthUser()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [notificationsOpen, setNotificationsOpen] = React.useState(false)
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  if (isLoading) {
    return (
      <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Studio info + Search */}
        <div className="flex flex-1 items-center gap-4 min-w-0">
          <Link
            href={`/dashboard/${studioSlug}`}
            className="flex items-center gap-2 font-semibold text-foreground hover:opacity-80 transition-opacity"
            aria-label={`Go to ${studioName} dashboard`}
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">{studioName.charAt(0)}</span>
            </div>
            <span className="hidden sm:block truncate max-w-[200px]">{studioName}</span>
          </Link>

          {/* Search */}
          <div className="relative hidden md:block w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search galleries, clients, projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Search"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="h-9 w-9"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Notifications */}
          <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications
                <Badge variant="outline">3 new</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col gap-1 p-3 hover:bg-accent" asChild>
                <Link href="/dashboard/notifications/1">
                  <p className="font-medium">New gallery comment</p>
                  <p className="text-xs text-muted-foreground">Sarah Chen commented on Wedding Gallery</p>
                  <p className="text-xs text-muted-foreground">2 minutes ago</p>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col gap-1 p-3 hover:bg-accent" asChild>
                <Link href="/dashboard/notifications/2">
                  <p className="font-medium">Payment received</p>
                  <p className="text-xs text-muted-foreground">Invoice #INV-001 paid by Marcus Johnson</p>
                  <p className="text-xs text-muted-foreground">1 hour ago</p>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col gap-1 p-3 hover:bg-accent" asChild>
                <Link href="/dashboard/notifications/3">
                  <p className="font-medium">Booking confirmed</p>
                  <p className="text-xs text-muted-foreground">Wedding package booked for June 15</p>
                  <p className="text-xs text-muted-foreground">3 hours ago</p>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/notifications" className="text-center text-primary font-medium">
                  View all notifications
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2" aria-label="User menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.firstName} />
                  <AvatarFallback className="text-xs">{user?.firstName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:block font-medium">{user?.firstName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-1">
                <span className="font-medium">{user?.firstName} {user?.lastName}</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
                <Badge variant={user?.role === 'super_admin' ? 'destructive' : user?.role === 'studio_owner' ? 'default' : 'secondary'}>
                  {user?.role.replace('_', ' ')}
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              {user?.role === 'super_admin' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              {user?.role === 'studio_owner' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/billing">
                      <Crown className="mr-2 h-4 w-4" />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/help">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help & Support
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}