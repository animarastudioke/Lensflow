'use server'

import { createClient } from '@/lib/supabase/server'

export type CalendarEventType = 'booking' | 'invoice_due' | 'contract_expiring' | 'task_due'

export interface CalendarEvent {
  id: string
  type: CalendarEventType
  date: string
  title: string
  subtitle: string | null
  href: string
  status: string
}

/**
 * Aggregates dated records already stored elsewhere (bookings, invoices,
 * contracts, tasks) into a single calendar view. There is no dedicated
 * "events" table — this reads the same rows their own pages already show.
 */
export async function getCalendarEvents(studioSlug: string, rangeStart: string, rangeEnd: string): Promise<CalendarEvent[]> {
  const supabase = await createClient()
  const { data: studio } = await supabase.from('studios').select('id').eq('slug', studioSlug).single()
  if (!studio) return []

  const [{ data: bookings }, { data: invoices }, { data: contracts }, { data: tasks }] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, session_name, session_date, status, client:clients(name)')
      .eq('studio_id', studio.id)
      .not('session_date', 'is', null)
      .gte('session_date', rangeStart)
      .lte('session_date', rangeEnd),
    supabase
      .from('invoices')
      .select('id, invoice_number, due_date, status, client:clients(name)')
      .eq('studio_id', studio.id)
      .not('due_date', 'is', null)
      .in('status', ['sent', 'partial', 'overdue'])
      .gte('due_date', rangeStart)
      .lte('due_date', rangeEnd),
    supabase
      .from('contracts')
      .select('id, title, expires_at, status, client:clients(name)')
      .eq('studio_id', studio.id)
      .not('expires_at', 'is', null)
      .neq('status', 'signed')
      .gte('expires_at', rangeStart)
      .lte('expires_at', rangeEnd),
    supabase
      .from('tasks')
      .select('id, title, due_date, status, priority')
      .eq('studio_id', studio.id)
      .not('due_date', 'is', null)
      .neq('status', 'done')
      .gte('due_date', rangeStart)
      .lte('due_date', rangeEnd),
  ])

  const events: CalendarEvent[] = []

  for (const b of bookings ?? []) {
    events.push({
      id: `booking-${b.id}`,
      type: 'booking',
      date: (b.session_date as string).slice(0, 10),
      title: b.session_name,
      subtitle: (b.client as unknown as { name: string } | null)?.name ?? null,
      href: `/dashboard/${studioSlug}/bookings`,
      status: b.status,
    })
  }

  for (const inv of invoices ?? []) {
    events.push({
      id: `invoice-${inv.id}`,
      type: 'invoice_due',
      date: (inv.due_date as string).slice(0, 10),
      title: `Invoice ${inv.invoice_number} due`,
      subtitle: (inv.client as unknown as { name: string } | null)?.name ?? null,
      href: `/dashboard/${studioSlug}/invoices`,
      status: inv.status,
    })
  }

  for (const c of contracts ?? []) {
    events.push({
      id: `contract-${c.id}`,
      type: 'contract_expiring',
      date: (c.expires_at as string).slice(0, 10),
      title: `${c.title} expires`,
      subtitle: (c.client as unknown as { name: string } | null)?.name ?? null,
      href: `/dashboard/${studioSlug}/contracts`,
      status: c.status,
    })
  }

  for (const t of tasks ?? []) {
    events.push({
      id: `task-${t.id}`,
      type: 'task_due',
      date: (t.due_date as string).slice(0, 10),
      title: t.title,
      subtitle: t.priority,
      href: `/dashboard/${studioSlug}/tasks`,
      status: t.status,
    })
  }

  return events.sort((a, b) => a.date.localeCompare(b.date))
}
