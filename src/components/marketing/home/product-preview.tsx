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
import { cn } from '@/lib/utils'

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

const MONO_TAG =
  'rounded-sm border border-input px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground'

/**
 * Direction A "plate": a bordered card holding a browser-framed product
 * preview, with a mono figure caption beneath. All figures are fabricated
 * illustration, labeled "Sample data" in the dashboard and the caption.
 */
export function ProductPreview() {
  return (
    <figure id="product-tour" className="mx-auto max-w-5xl scroll-mt-24">
      <div className="rounded-md border border-border bg-card p-3 sm:p-5">
        <div className="overflow-hidden rounded-md border border-border bg-background">
          <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-border" />
            <span className="h-2 w-2 rounded-full bg-border" />
            <span className="h-2 w-2 rounded-full bg-border" />
            <span className="ml-3 font-mono text-xs text-muted-foreground">app.lensflow.co.ke</span>
          </div>

          <div className="grid grid-cols-[56px_1fr] text-foreground sm:grid-cols-[190px_1fr]">
            <nav
              className="flex flex-col gap-1 border-r border-border bg-card p-2 sm:p-4"
              aria-hidden="true"
            >
              {SIDEBAR_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2 py-2 text-body-sm sm:px-3',
                    item.active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span className="hidden truncate sm:inline">{item.label}</span>
                </div>
              ))}
              <div className="mt-auto flex items-center gap-2.5 rounded-md px-2 py-2 text-body-sm text-muted-foreground sm:px-3">
                <Settings className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="hidden truncate sm:inline">Settings</span>
              </div>
            </nav>

            <div className="min-w-0 p-4 text-left sm:p-7" aria-hidden="true">
              <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="font-display text-heading-xl font-medium text-foreground">
                  Good morning, Amina
                </p>
                <span className={MONO_TAG}>Sample data</span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <StatCard label="Revenue" value="$8,420" sublabel="this month" />
                <StatCard label="Bookings" value="12" sublabel="upcoming" />
                <StatCard label="Clients" value="34" sublabel="active" />
              </div>

              <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4">
                <div className="rounded-md border border-border bg-card p-3 sm:p-4">
                  <p className="label-caption mb-3">Recent galleries</p>
                  <ul className="space-y-2.5">
                    {RECENT_GALLERIES.map((gallery) => (
                      <li key={gallery.name} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-foreground">{gallery.name}</span>
                        <span className={cn(MONO_TAG, 'shrink-0 py-0 normal-case tracking-normal')}>
                          {gallery.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-md border border-border bg-card p-3 sm:p-4">
                  <p className="label-caption mb-3">Upcoming sessions</p>
                  <ul className="space-y-2.5">
                    {UPCOMING_SESSIONS.map((session) => (
                      <li key={session.client} className="text-xs">
                        <p className="text-foreground">{session.label}</p>
                        <p className="text-muted-foreground">
                          {session.client} · {session.date}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
                    <HardDrive className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1">Storage — 68 GB of 200 GB used</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-sm bg-border">
                    <div className="h-full w-[34%] bg-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <figcaption className="label-caption mt-3.5 flex flex-wrap justify-between gap-x-4 gap-y-1">
        <span>Fig. 1 — The studio dashboard</span>
        <span>Sample data</span>
      </figcaption>
    </figure>
  )
}

function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-2.5 sm:p-4">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 font-display text-heading-xl font-medium tabular-nums text-foreground sm:text-display-sm">
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground sm:text-xs">{sublabel}</p>
    </div>
  )
}
