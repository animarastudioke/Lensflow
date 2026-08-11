'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CRM_CLIENTS } from '@/lib/constants/homepage'

const STATUS_STYLES: Record<string, string> = {
  Lead: 'bg-white/10 text-white/70',
  Booked: 'bg-[#d6415a]/15 text-[#f08ba0]',
  'In progress': 'bg-emerald-500/15 text-emerald-300',
}

export function CrmDemo() {
  const [activeId, setActiveId] = useState(CRM_CLIENTS[0]!.id)
  const active = CRM_CLIENTS.find((client) => client.id === activeId) ?? CRM_CLIENTS[0]!

  return (
    <div className="grid grid-cols-1 text-white sm:grid-cols-[220px_1fr]">
      <div className="border-b border-white/10 p-2 sm:border-b-0 sm:border-r sm:p-3">
        <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wide text-white/40">Clients</p>
        <ul className="flex gap-2 overflow-x-auto sm:block sm:space-y-1 sm:overflow-visible">
          {CRM_CLIENTS.map((client) => (
            <li key={client.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActiveId(client.id)}
                className={cn(
                  'w-full whitespace-nowrap rounded-md px-3 py-2 text-left text-xs transition-colors sm:whitespace-normal',
                  activeId === client.id ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5'
                )}
              >
                <span className="block font-medium">{client.name}</span>
                <span className="mt-0.5 block text-[10px] text-white/40">{client.project}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <motion.div
        key={active.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="p-4 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{active.name}</p>
            <p className="text-xs text-white/45">{active.project}</p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium',
              STATUS_STYLES[active.status]
            )}
          >
            {active.status}
          </span>
        </div>

        <p className="mt-5 text-[11px] font-medium uppercase tracking-wide text-white/40">Project timeline</p>
        <ul className="mt-3 space-y-3">
          {active.timeline.map((step, index) => (
            <motion.li
              key={step.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex items-center gap-2.5 text-xs"
            >
              {step.done ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-white/25" />
              )}
              <span className={step.done ? 'text-white/80' : 'text-white/40'}>{step.label}</span>
            </motion.li>
          ))}
        </ul>

        <div className="mt-5 rounded-md border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">Next action</p>
          <p className="mt-1 text-xs text-white/75">{active.nextAction}</p>
        </div>
      </motion.div>
    </div>
  )
}
