'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar as CalendarIcon, Check, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BOOKING_DEMO_TIMES } from '@/lib/constants/homepage'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const AVAILABLE_DAY_INDEXES = new Set([1, 3, 4, 6])

export function BookingDemo() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  function pickDay(index: number) {
    if (!AVAILABLE_DAY_INDEXES.has(index)) return
    setSelectedDay(index)
    setSelectedTime(null)
    setConfirmed(false)
  }

  if (confirmed && selectedDay !== null && selectedTime) {
    return (
      <div className="flex min-h-[340px] flex-col items-center justify-center p-6 text-center text-white sm:min-h-[400px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d6415a]/20 text-[#d6415a]">
          <Check className="h-6 w-6" />
        </div>
        <p className="mt-4 text-base font-medium">Session request sent</p>
        <p className="mt-1 text-sm text-white/50">
          {DAYS[selectedDay]} · {selectedTime} — Portrait Session
        </p>
        <button
          type="button"
          onClick={() => {
            setSelectedDay(null)
            setSelectedTime(null)
            setConfirmed(false)
          }}
          className="mt-6 text-xs font-medium text-white/60 underline underline-offset-4 hover:text-white"
        >
          Preview another date
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 text-white sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-white/50" />
        <p className="text-sm font-medium">Portrait Session — 60 min</p>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {DAYS.map((day, index) => {
          const available = AVAILABLE_DAY_INDEXES.has(index)
          const active = selectedDay === index
          return (
            <button
              key={day}
              type="button"
              disabled={!available}
              onClick={() => pickDay(index)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md border py-2.5 text-[11px] font-medium transition-colors sm:py-3 sm:text-xs',
                active
                  ? 'border-[#d6415a] bg-[#d6415a]/15 text-white'
                  : available
                    ? 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/25'
                    : 'cursor-not-allowed border-white/5 text-white/20'
              )}
            >
              <span>{day}</span>
              <span className={cn('h-1 w-1 rounded-full', available ? 'bg-[#d6415a]' : 'bg-transparent')} />
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {selectedDay !== null ? (
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="mb-2 mt-5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/45">
              <Clock className="h-3.5 w-3.5" /> Available times — {DAYS[selectedDay]}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {BOOKING_DEMO_TIMES.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={cn(
                    'rounded-md border px-2 py-2 text-xs font-medium transition-colors',
                    selectedTime === time
                      ? 'border-[#d6415a] bg-[#d6415a]/15 text-white'
                      : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25'
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTime ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            className="mt-5 flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] p-3"
          >
            <div>
              <p className="text-xs text-white/45">
                {DAYS[selectedDay!]} · {selectedTime}
              </p>
              <p className="text-sm font-medium">Portrait Session</p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmed(true)}
              className="rounded-md bg-[#d6415a] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#c23751]"
            >
              Book a session
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
