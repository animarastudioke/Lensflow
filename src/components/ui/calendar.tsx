'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type CalendarMode = 'single' | 'multiple' | 'range'

interface CalendarProps {
  mode?: CalendarMode
  selected?: Date | Date[] | { from: Date; to: Date } | undefined
  onSelect?: (date: Date | Date[] | { from: Date; to: Date }) => void
  fromDate?: Date
  toDate?: Date
  disabled?: (date: Date) => boolean
  className?: string
  showWeekNumbers?: boolean
  locale?: string
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  fixedWeeks?: boolean
  numberOfMonths?: number
  initialFocus?: boolean
  onMonthChange?: (month: Date) => void
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function getFirstDayOfMonth(date: Date, weekStartsOn: number): number {
  const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  return (day - weekStartsOn + 7) % 7
}

function formatMonthYear(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date)
}

function formatWeekday(day: number, locale: string): string {
  const date = new Date(2024, 0, day)
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

function isDateInRange(date: Date, range: { from: Date; to: Date }): boolean {
  return date >= range.from && date <= range.to
}

function isDateSelected(date: Date, selected: Date | Date[] | { from: Date; to: Date } | undefined): boolean {
  if (!selected) return false
  if (selected instanceof Date) return isSameDay(date, selected)
  if (Array.isArray(selected)) return selected.some(d => isSameDay(date, d))
  if ('from' in selected && 'to' in selected) return isDateInRange(date, selected)
  return false
}

function isDateInHoverRange(date: Date, hoverDate: Date | undefined, selected: Date | Date[] | { from: Date; to: Date } | undefined): boolean {
  if (!hoverDate || !selected || !('from' in selected)) return false
  if (!(selected.from instanceof Date)) return false
  return (date > selected.from && date < hoverDate) || (date < selected.from && date > hoverDate)
}

export function Calendar({
  mode = 'single',
  selected,
  onSelect,
  fromDate,
  toDate,
  disabled,
  className,
  showWeekNumbers = false,
  locale = 'en-US',
  weekStartsOn = 0,
  fixedWeeks = false,
  numberOfMonths = 1,
  onMonthChange,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  const [hoverDate, setHoverDate] = React.useState<Date | undefined>()

  React.useEffect(() => {
    if (onMonthChange) {
      onMonthChange(currentMonth)
    }
  }, [currentMonth, onMonthChange])

  const months = React.useMemo(() => {
    const result: Date[] = []
    for (let i = 0; i < numberOfMonths; i++) {
      const month = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + i, 1)
      result.push(month)
    }
    return result
  }, [currentMonth, numberOfMonths])

  const handleDayClick = (day: number, month: Date) => {
    const date = new Date(month.getFullYear(), month.getMonth(), day)

    if (disabled?.(date)) return
    if (fromDate && date < fromDate) return
    if (toDate && date > toDate) return

    if (mode === 'single') {
      onSelect?.(date)
    } else if (mode === 'multiple') {
      const selectedDates = (selected as Date[]) || []
      const isSelected = selectedDates.some(d => isSameDay(d, date))
      if (isSelected) {
        onSelect?.(selectedDates.filter(d => !isSameDay(d, date)))
      } else {
        onSelect?.([...selectedDates, date])
      }
    } else if (mode === 'range') {
      const range = selected as { from: Date; to: Date } | undefined
      if (!range?.from) {
        onSelect?.({ from: date, to: date })
      } else if (!range.to) {
        if (date < range.from) {
          onSelect?.({ from: date, to: range.from })
        } else {
          onSelect?.({ from: range.from, to: date })
        }
      } else {
        onSelect?.({ from: date, to: date })
      }
    }
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  return (
    <div className={cn('flex flex-col gap-2 p-3', className)}>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousMonth}
          className="h-8 w-8"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 text-center">
          {months.map((month, index) => (
            <div
              key={index}
              className={cn(
                'font-medium',
                numberOfMonths > 1 && 'px-2'
              )}
            >
              {formatMonthYear(month, locale)}
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={goToNextMonth}
          className="h-8 w-8"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className={cn('flex gap-4', numberOfMonths > 1 && 'overflow-x-auto')}>
        {months.map((month, monthIndex) => (
          <div key={monthIndex} className={cn('flex flex-col', numberOfMonths > 1 && 'min-w-[280px]')}>
            <table className="w-full border-collapse" role="grid" aria-label={formatMonthYear(month, locale)}>
              <thead>
                <tr className="text-muted-foreground text-xs font-medium">
                  {showWeekNumbers && <th className="w-8 h-8 text-center">Wk</th>}
                  {Array.from({ length: 7 }, (_, i) => (
                    <th
                      key={i}
                      className="h-8 w-8 text-center"
                      aria-label={formatWeekday((weekStartsOn + i) % 7, locale)}
                    >
                      {formatWeekday((weekStartsOn + i) % 7, locale)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const weeks: (Date | null)[][] = []
                  const firstDay = getFirstDayOfMonth(month, weekStartsOn)
                  const daysInMonth = getDaysInMonth(month)
                  const prevMonthDays = new Date(month.getFullYear(), month.getMonth(), 0).getDate()

                  let day = 1

                  for (let week = 0; week < 6; week++) {
                    const weekDays: (Date | null)[] = []

                    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                      if (week === 0 && dayOfWeek < firstDay) {
                        const prevMonthDay = prevMonthDays - (firstDay - dayOfWeek - 1)
                        weekDays.push(new Date(month.getFullYear(), month.getMonth() - 1, prevMonthDay))
                      } else if (day > daysInMonth) {
                        const nextMonthDay = day - daysInMonth
                        weekDays.push(new Date(month.getFullYear(), month.getMonth() + 1, nextMonthDay))
                        day++
                      } else {
                        weekDays.push(new Date(month.getFullYear(), month.getMonth(), day))
                        day++
                      }
                    }

                    if (!fixedWeeks && week > 0 && weekDays.every(d => d && d.getMonth() !== month.getMonth())) {
                      break
                    }

                    weeks.push(weekDays)
                  }

                  return weeks
                })().map((week, weekIndex) => (
                  <tr key={weekIndex}>
                    {showWeekNumbers && (
                      <td className="w-8 h-8 text-center text-xs text-muted-foreground">
                        {weekIndex + 1}
                      </td>
                    )}
                    {week.map((date, dayIndex) => {
                      const isCurrentMonth = date?.getMonth() === month.getMonth()
                      const isToday = date && isSameDay(date, new Date())
                      const isSelected = !!(date && isDateSelected(date, selected))
                      const isInRange = date && mode === 'range' && selected && 'from' in selected && isDateInRange(date, selected as { from: Date; to: Date })
                      const isHovered = date && isDateInHoverRange(date, hoverDate, selected)
                      const isDisabled = !!(date && (disabled?.(date) || (fromDate && date < fromDate) || (toDate && date > toDate)))

                      return (
                        <td key={dayIndex} className="relative">
                          {date && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'h-8 w-8 p-0 rounded-full text-sm transition-all',
                                !isCurrentMonth && 'text-muted-foreground/50',
                                isToday && !isSelected && 'bg-primary text-primary-foreground font-bold',
                                isSelected && 'bg-primary text-primary-foreground font-bold',
                                isInRange && !isSelected && 'bg-primary/20',
                                isHovered && 'bg-primary/10',
                                isDisabled && 'opacity-50 cursor-not-allowed',
                                mode === 'range' && isSelected && (
                                  (dayIndex === 0 || !week[dayIndex - 1] || !isDateSelected(week[dayIndex - 1]!, selected)) &&
                                  'rounded-l-full'
                                ),
                                mode === 'range' && isSelected && (
                                  (dayIndex === 6 || !week[dayIndex + 1] || !isDateSelected(week[dayIndex + 1]!, selected)) &&
                                  'rounded-r-full'
                                )
                              )}
                              onClick={() => date && handleDayClick(date.getDate(), month)}
                              onMouseEnter={() => date && setHoverDate(date)}
                              onMouseLeave={() => setHoverDate(undefined)}
                              disabled={isDisabled}
                              aria-selected={isSelected}
                              aria-label={date.toDateString()}
                            >
                              {date.getDate()}
                            </Button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}