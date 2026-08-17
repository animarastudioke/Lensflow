'use client'

import { motion } from 'framer-motion'
import { CreditCard, FolderKanban, HardDrive, TrendingUp, Users } from 'lucide-react'
import { CountUp } from './lib/count-up'
import { ScrollReveal } from './lib/scroll-reveal'
import { BrowserFrame } from './lib/browser-frame'

const REVENUE_POINTS = [18, 24, 21, 32, 29, 40, 38, 48, 44, 56, 52, 64]
const BOOKING_BARS = [4, 7, 5, 9, 8, 12, 10, 14]
const PIPELINE = [
  { label: 'Leads', count: 18, color: 'bg-white/25' },
  { label: 'Booked', count: 11, color: 'bg-[#d6415a]/50' },
  { label: 'In progress', count: 7, color: 'bg-[#d6415a]/75' },
  { label: 'Delivered', count: 23, color: 'bg-[#d6415a]' },
]
const pipelineTotal = PIPELINE.reduce((sum, stage) => sum + stage.count, 0)

function buildLinePath(points: number[], width: number, height: number) {
  const max = Math.max(...points)
  const step = width / (points.length - 1)
  return points
    .map((point, index) => {
      const x = index * step
      const y = height - (point / max) * height
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function RevenueChart() {
  const width = 320
  const height = 120
  const path = buildLinePath(REVENUE_POINTS, width, height)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full overflow-visible" aria-hidden="true">
      <motion.path
        d={path}
        fill="none"
        stroke="#d6415a"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  )
}

function BookingsChart() {
  const max = Math.max(...BOOKING_BARS)
  return (
    <div className="flex h-32 items-end gap-2" aria-hidden="true">
      {BOOKING_BARS.map((value, index) => (
        <motion.div
          key={index}
          className="flex-1 rounded-t-sm bg-[#d6415a]/70"
          initial={{ height: 0 }}
          whileInView={{ height: `${(value / max) * 100}%` }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  )
}

export function DashboardShowcase() {
  return (
    <section className="page-section bg-background">
      <div className="container-wide">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="label-caption text-primary">Business insights</span>
            <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Know how your business is doing.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Revenue, bookings, and pipeline — at a glance, without a spreadsheet.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal variant="scaleIn" delay={0.1} className="mx-auto mt-14 max-w-4xl">
          <BrowserFrame>
            <div className="p-4 text-white sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-medium">Studio overview</p>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white/50">
                  Demo data
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatTile icon={TrendingUp} label="Revenue this month" value={8420} prefix="$" />
                <StatTile icon={FolderKanban} label="Active projects" value={12} />
                <StatTile icon={Users} label="Clients" value={64} />
                <StatTile icon={CreditCard} label="Outstanding invoices" value={2140} prefix="$" />
                <StatTile icon={HardDrive} label="Storage used" value={68} suffix=" GB" />
                <StatTile icon={Users} label="Team members" value={3} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">
                    Revenue — last 12 months
                  </p>
                  <div className="mt-3">
                    <RevenueChart />
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">
                    Bookings — last 8 weeks
                  </p>
                  <div className="mt-3">
                    <BookingsChart />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-white/40">
                  Project pipeline
                </p>
                <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label="Project pipeline breakdown">
                  {PIPELINE.map((stage) => (
                    <motion.div
                      key={stage.label}
                      className={stage.color}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(stage.count / pipelineTotal) * 100}%` }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                  {PIPELINE.map((stage) => (
                    <span key={stage.label} className="flex items-center gap-1.5 text-[11px] text-white/60">
                      <span className={`h-2 w-2 rounded-full ${stage.color}`} />
                      {stage.label} — {stage.count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </BrowserFrame>
        </ScrollReveal>
      </div>
    </section>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  prefix = '',
  suffix = '',
}: {
  icon: typeof TrendingUp
  label: string
  value: number
  prefix?: string
  suffix?: string
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <Icon className="h-4 w-4 text-white/40" strokeWidth={1.5} />
      <p className="mt-2 text-lg font-semibold tabular-nums text-white">
        <CountUp value={value} prefix={prefix} suffix={suffix} />
      </p>
      <p className="text-[11px] text-white/45">{label}</p>
    </div>
  )
}
