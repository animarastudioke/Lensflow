'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PAYMENT_METHODS } from '@/lib/constants/homepage'

const LINE_ITEMS = [
  { label: 'Full Day Wedding Package', amount: 2400 },
  { label: 'Second shooter', amount: 350 },
  { label: 'Album — 30x30cm, 40 pages', amount: 480 },
]

export function PaymentsDemo() {
  const [method, setMethod] = useState(PAYMENT_METHODS[0]!.label)
  const total = LINE_ITEMS.reduce((sum, item) => sum + item.amount, 0)
  const deposit = Math.round(total * 0.3)
  const balance = total - deposit

  return (
    <div className="p-4 text-white sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Invoice #INV-0142</p>
          <p className="text-xs text-white/45">Amara &amp; David Otieno</p>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
          Deposit paid
        </span>
      </div>

      <ul className="space-y-2 border-y border-white/10 py-4">
        {LINE_ITEMS.map((item) => (
          <li key={item.label} className="flex items-center justify-between text-xs text-white/70">
            <span>{item.label}</span>
            <span className="tabular-nums">${item.amount.toLocaleString()}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-1.5 py-4">
        <div className="flex items-center justify-between text-xs text-white/45">
          <span>Total</span>
          <span className="tabular-nums">${total.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-emerald-300">
          <span>Deposit paid</span>
          <span className="tabular-nums">-${deposit.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-1.5 text-sm font-medium text-white">
          <span>Balance due</span>
          <span className="tabular-nums">${balance.toLocaleString()}</span>
        </div>
      </div>

      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/40">Pay balance with</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PAYMENT_METHODS.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setMethod(option.label)}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-md border px-2 py-2.5 text-center transition-colors',
              method === option.label
                ? 'border-[#d6415a] bg-[#d6415a]/10'
                : 'border-white/10 bg-white/[0.03] hover:border-white/25'
            )}
          >
            <span className="flex items-center gap-1 text-xs font-medium text-white">
              {method === option.label ? <Check className="h-3 w-3 text-[#d6415a]" /> : null}
              {option.label}
            </span>
            <span className="text-[10px] text-white/40">{option.description}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="mt-4 w-full rounded-md bg-[#d6415a] py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#c23751]"
      >
        Pay ${balance.toLocaleString()} with {method}
      </button>
    </div>
  )
}
