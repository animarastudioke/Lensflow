'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCalendarEvents, type CalendarEvent, type CalendarEventType } from '@/lib/actions/calendar'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TYPE_CONFIG: Record<CalendarEventType, { label: string; dot: string; pill: string }> = {
  booking: { label: 'Booking', dot: 'bg-primary', pill: 'bg-primary/10 text-primary' },
  invoice_due: { label: 'Invoice due', dot: 'bg-warning', pill: 'bg-warning/10 text-warning' },
  contract_expiring: { label: 'Contract expiring', dot: 'bg-destructive', pill: 'bg-destructive/10 text-destructive' },
  task_due: { label: 'Task due', dot: 'bg-info', pill: 'bg-info/10 text-info' },
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1)
  const gridStart = new Date(firstOfMonth)
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay())

  const days: Date[] = []
  const cursor = new Date(gridStart)
  for (let i = 0; i < 42; i++) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

interface CalendarViewProps {
  studioSlug: string
}

export function CalendarView({ studioSlug }: CalendarViewProps) {
  const today = React.useMemo(() => new Date(), [])
  const [cursor, setCursor] = React.useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [events, setEvents] = React.useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const days = React.useMemo(() => buildGrid(cursor.getFullYear(), cursor.getMonth()), [cursor])

  React.useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    const rangeStart = toDateKey(days[0]!)
    const rangeEnd = toDateKey(days[days.length - 1]!)
    getCalendarEvents(studioSlug, rangeStart, rangeEnd).then((result) => {
      if (!cancelled) {
        setEvents(result)
        setIsLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [studioSlug, days])

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const list = map.get(e.date) ?? []
      list.push(e)
      map.set(e.date, list)
    }
    return map
  }, [events])

  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-sm font-display font-semibold text-foreground">Calendar</h1>
          <p className="text-body text-muted-foreground mt-1">Bookings, invoice due dates, contract expirations, and tasks in one view</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="w-40 text-center font-medium">{monthLabel}</div>
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>
            Today
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {(Object.keys(TYPE_CONFIG) as CalendarEventType[]).map((type) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('h-2 w-2 rounded-full', TYPE_CONFIG[type].dot)} />
            {TYPE_CONFIG[type].label}
          </div>
        ))}
      </div>

      <Card className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const dateKey = toDateKey(day)
              const dayEvents = eventsByDate.get(dateKey) ?? []
              const isCurrentMonth = day.getMonth() === cursor.getMonth()
              const isToday = toDateKey(day) === toDateKey(today)
              const visibleEvents = dayEvents.slice(0, 3)
              const overflowCount = dayEvents.length - visibleEvents.length

              return (
                <div
                  key={i}
                  className={cn(
                    'min-h-[110px] border-b border-r border-border p-1.5',
                    i % 7 === 6 && 'border-r-0',
                    !isCurrentMonth && 'bg-muted/30'
                  )}
                >
                  <div
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                      isToday ? 'bg-primary text-primary-foreground font-semibold' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'
                    )}
                  >
                    {day.getDate()}
                  </div>
                  <div className="mt-1 space-y-1">
                    {visibleEvents.map((event) => (
                      <Link
                        key={event.id}
                        href={event.href}
                        className={cn('block truncate rounded px-1.5 py-0.5 text-[0.6875rem] leading-tight hover:opacity-80', TYPE_CONFIG[event.type].pill)}
                        title={`${event.title}${event.subtitle ? ` — ${event.subtitle}` : ''}`}
                      >
                        {event.title}
                      </Link>
                    ))}
                    {overflowCount > 0 && (
                      <div className="px-1.5 text-[0.6875rem] text-muted-foreground">+{overflowCount} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {!isLoading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <CalendarDays className="h-10 w-10 mb-2 text-muted-foreground/50" />
          <p>Nothing scheduled this month</p>
        </div>
      )}
    </div>
  )
}
