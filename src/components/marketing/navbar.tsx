'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from './home/lib/logo'
import { NAV_PRODUCT_LINKS, NAV_RESOURCES_LINKS, NAV_SOLUTIONS_LINKS, type NavLink } from '@/lib/constants/navigation'

function DropdownPanel({ links }: { links: NavLink[] }) {
  return (
    <ul className="grid w-[320px] gap-1 p-2">
      {links.map((link) => (
        <li key={link.href}>
          <NavigationMenuPrimitive.Link asChild>
            <Link
              href={link.href}
              className="block rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
            >
              <span className="font-medium text-white">{link.label}</span>
              {link.description ? (
                <span className="mt-0.5 block text-xs text-white/55">{link.description}</span>
              ) : null}
            </Link>
          </NavigationMenuPrimitive.Link>
        </li>
      ))}
    </ul>
  )
}

const contentClass =
  'overflow-hidden rounded-md border border-white/10 bg-[#15151a]/95 text-white shadow-2xl shadow-black/50 backdrop-blur-xl data-[motion=from-start]:animate-in data-[motion=from-end]:animate-in data-[motion=from-start]:fade-in-0 data-[motion=from-end]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0'

function DesktopNav({ solid }: { solid: boolean }) {
  const triggerClass = cn(
    'group inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors',
    solid
      ? 'text-foreground/80 hover:text-foreground focus-visible:text-foreground data-[state=open]:text-foreground'
      : 'text-white/90 hover:text-white focus-visible:text-white data-[state=open]:text-white'
  )

  return (
    <NavigationMenuPrimitive.Root className="relative hidden lg:flex" delayDuration={80}>
      <NavigationMenuPrimitive.List className="flex list-none items-center gap-1">
        <NavigationMenuPrimitive.Item>
          <NavigationMenuPrimitive.Trigger className={triggerClass}>
            Product
            <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </NavigationMenuPrimitive.Trigger>
          <NavigationMenuPrimitive.Content className={cn(contentClass, 'absolute left-0 top-0')}>
            <DropdownPanel links={NAV_PRODUCT_LINKS} />
          </NavigationMenuPrimitive.Content>
        </NavigationMenuPrimitive.Item>

        <NavigationMenuPrimitive.Item>
          <NavigationMenuPrimitive.Trigger className={triggerClass}>
            Solutions
            <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </NavigationMenuPrimitive.Trigger>
          <NavigationMenuPrimitive.Content className={cn(contentClass, 'absolute left-0 top-0')}>
            <DropdownPanel links={NAV_SOLUTIONS_LINKS} />
          </NavigationMenuPrimitive.Content>
        </NavigationMenuPrimitive.Item>

        <NavigationMenuPrimitive.Item>
          <NavigationMenuPrimitive.Link asChild>
            <Link href="/pricing" className={triggerClass}>
              Pricing
            </Link>
          </NavigationMenuPrimitive.Link>
        </NavigationMenuPrimitive.Item>

        <NavigationMenuPrimitive.Item>
          <NavigationMenuPrimitive.Trigger className={triggerClass}>
            Resources
            <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </NavigationMenuPrimitive.Trigger>
          <NavigationMenuPrimitive.Content className={cn(contentClass, 'absolute left-0 top-0')}>
            <DropdownPanel links={NAV_RESOURCES_LINKS} />
          </NavigationMenuPrimitive.Content>
        </NavigationMenuPrimitive.Item>
      </NavigationMenuPrimitive.List>

      <div className="absolute left-0 top-full flex justify-start pt-2">
        <NavigationMenuPrimitive.Viewport className="origin-top-left data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 relative" />
      </div>
    </NavigationMenuPrimitive.Root>
  )
}

const MOBILE_GROUPS: { label: string; href?: string; links?: NavLink[] }[] = [
  { label: 'Product', links: NAV_PRODUCT_LINKS },
  { label: 'Solutions', links: NAV_SOLUTIONS_LINKS },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Resources', links: NAV_RESOURCES_LINKS },
]

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-[#0c0c0f] lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div className="flex h-20 items-center justify-between px-4 sm:px-6">
            <Logo dark />
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <motion.nav
            className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-8 sm:px-6"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
          >
            {MOBILE_GROUPS.map((group) => (
              <motion.div
                key={group.label}
                variants={{ hidden: { opacity: 0, x: 16 }, visible: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="border-b border-white/10"
              >
                {group.href ? (
                  <Link
                    href={group.href}
                    onClick={onClose}
                    className="block py-4 font-display text-2xl text-white"
                  >
                    {group.label}
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between py-4 font-display text-2xl text-white"
                      aria-expanded={expanded === group.label}
                      onClick={() => setExpanded((current) => (current === group.label ? null : group.label))}
                    >
                      {group.label}
                      <ChevronDown
                        className={cn(
                          'h-5 w-5 text-white/50 transition-transform duration-200',
                          expanded === group.label && 'rotate-180'
                        )}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {expanded === group.label ? (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          {group.links?.map((link) => (
                            <li key={link.href}>
                              <Link
                                href={link.href}
                                onClick={onClose}
                                className="block py-2.5 pl-1 text-base text-white/65 transition-colors hover:text-white"
                              >
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </motion.ul>
                      ) : null}
                    </AnimatePresence>
                  </>
                )}
              </motion.div>
            ))}
          </motion.nav>

          <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-6 sm:px-6">
            <Link
              href="/auth/login"
              onClick={onClose}
              className="rounded-md border border-white/15 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              onClick={onClose}
              className="rounded-md bg-white px-4 py-3 text-center text-sm font-medium text-black transition-colors hover:bg-white/90"
            >
              Start free
            </Link>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/**
 * The one marketing-site navigation, used on the homepage (over a dark
 * hero, `transparent`) and every other public marketing page (plain light
 * bar, not `transparent`). Previously two separate implementations —
 * consolidated so there's a single IA and visual system to maintain.
 */
export function Navbar({ transparent = false }: { transparent?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const ticking = useRef(false)

  useEffect(() => {
    if (!transparent) return
    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24)
        ticking.current = false
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [transparent])

  // "solid" = the light, opaque bar style. Always on for non-transparent
  // (plain marketing page) use; scroll-triggered when sitting over a dark hero.
  const solid = !transparent || scrolled

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter,height] duration-300 ease-out',
          solid
            ? 'border-b border-border bg-background/80 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        )}
      >
        <div
          className={cn(
            'mx-auto flex max-w-7xl items-center justify-between px-4 transition-[height] duration-300 ease-out sm:px-6 lg:px-8',
            transparent && !solid ? 'h-20' : 'h-16'
          )}
        >
          <Logo dark={!solid} />

          <DesktopNav solid={solid} />

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/auth/login"
              className={cn(
                'rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
                solid ? 'text-foreground hover:bg-accent' : 'text-white/90 hover:text-white'
              )}
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                solid
                  ? 'bg-primary text-primary-foreground hover:bg-primary/88'
                  : 'bg-white text-black hover:bg-white/90'
              )}
            >
              Start free
            </Link>
          </div>

          <button
            type="button"
            className={cn(
              'rounded-md p-2 transition-colors lg:hidden',
              solid ? 'text-foreground hover:bg-accent' : 'text-white hover:bg-white/10'
            )}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  )
}
