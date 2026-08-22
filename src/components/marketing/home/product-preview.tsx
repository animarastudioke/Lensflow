'use client'

import { type RefObject, useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import {
  LayoutGrid,
  Image as ImageIcon,
  Calendar,
  Users,
  CreditCard,
  Store,
  Globe,
  Settings,
  HardDrive,
} from 'lucide-react'
import { BrowserFrame } from './lib/browser-frame'

const SIDEBAR_ITEMS = [
  { label: 'Dashboard', icon: LayoutGrid, active: true },
  { label: 'Galleries', icon: ImageIcon },
  { label: 'Bookings', icon: Calendar },
  { label: 'Clients', icon: Users },
  { label: 'Payments', icon: CreditCard },
  { label: 'Store', icon: Store },
  { label: 'Website', icon: Globe },
]

const RECENT_GALLERIES = [
  { name: 'Amara & David — Wedding', photos: 482, status: 'Delivered' },
  { name: 'Mwangi Family Portraits', photos: 96, status: 'In review' },
  { name: 'Nia & Co. Product Shoot', photos: 214, status: 'Editing' },
]

const UPCOMING_SESSIONS = [
  { label: 'Engagement session', client: 'Wanjiru & Otieno', date: 'Thu, 2:00 PM' },
  { label: 'Studio portraits', client: 'James Mwangi', date: 'Fri, 10:00 AM' },
]

export function ProductPreview({ sectionRef }: { sectionRef?: RefObject<HTMLElement | null> }) {
  const localRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    // framer-motion's types still expect a non-nullable RefObject; React 19
    // correctly infers useRef<T>(null) as RefObject<T | null> now.
    target: (sectionRef ?? localRef) as RefObject<HTMLElement>,
    offset: ['start start', 'end start'],
    // sectionRef (when provided) is owned by a parent component (Hero) -
    // framer-motion's own hydration-timing warning for cross-component refs
    // recommends this option (see hero.tsx for the matching comment).
    layoutEffect: false,
  })
  const floatY = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : -48])

  return (
    <motion.div
      id="product-tour"
      ref={localRef}
      style={{ y: floatY }}
      className="mx-auto max-w-5xl scroll-mt-24"
    >
      <BrowserFrame>
        <div className="grid grid-cols-[56px_1fr] text-white sm:grid-cols-[180px_1fr]">
          <nav className="flex flex-col gap-1 border-r border-white/10 bg-black/20 p-2 sm:p-3" aria-hidden="true">
            {SIDEBAR_ITEMS.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-xs font-medium sm:px-3 ${
                  item.active ? 'bg-white/10 text-white' : 'text-white/45'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="hidden truncate sm:inline">{item.label}</span>
              </div>
            ))}
            <div className="mt-auto flex items-center gap-2.5 rounded-md px-2 py-2 text-xs font-medium text-white/45 sm:px-3">
              <Settings className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="hidden truncate sm:inline">Settings</span>
            </div>
          </nav>

          <div className="min-w-0 p-4 sm:p-6" aria-hidden="true">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white">Good morning, Amina</p>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/50">
                    Demo data
                  </span>
                </div>
                <p className="text-xs text-white/45">Here&apos;s what&apos;s happening in your studio</p>
              </div>
              <div className="hidden h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-[#d6415a] to-[#7a2338] sm:block" />
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <StatCard label="Revenue" value="$8,420" sublabel="this month" />
              <StatCard label="Bookings" value="12" sublabel="upcoming" />
              <StatCard label="Clients" value="34" sublabel="active" />
            </div>

            <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4">
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-white/45">
                  Recent galleries
                </p>
                <ul className="space-y-2">
                  {RECENT_GALLERIES.map((gallery) => (
                    <li key={gallery.name} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-white/80">{gallery.name}</span>
                      <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/55">
                        {gallery.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-white/45">
                  Upcoming sessions
                </p>
                <ul className="space-y-2.5">
                  {UPCOMING_SESSIONS.map((session) => (
                    <li key={session.client} className="text-xs">
                      <p className="text-white/80">{session.label}</p>
                      <p className="text-white/45">
                        {session.client} · {session.date}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-[11px] text-white/45">
                  <HardDrive className="h-3.5 w-3.5" />
                  <span className="flex-1">Storage — 68 GB of 200 GB used</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[34%] rounded-full bg-[#d6415a]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </BrowserFrame>
    </motion.div>
  )
}

function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-2.5 sm:p-3.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-white/40 sm:text-[11px]">{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums text-white sm:text-xl">{value}</p>
      <p className="text-[10px] text-white/40 sm:text-xs">{sublabel}</p>
    </div>
  )
}
