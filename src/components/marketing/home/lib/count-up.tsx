'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion, animate } from 'framer-motion'

export function CountUp({
  value,
  duration = 1.4,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}: {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.6 })
  const prefersReducedMotion = useReducedMotion()
  const [display, setDisplay] = useState(prefersReducedMotion ? value : 0)

  useEffect(() => {
    if (!isInView) return
    if (prefersReducedMotion) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    })
    return () => controls.stop()
  }, [isInView, value, duration, prefersReducedMotion])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}
