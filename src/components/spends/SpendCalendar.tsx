/**
 * SUBTRACK // SPEND CALENDAR
 *
 * A month grid showing daily spend intensity — the spend equivalent of the
 * subscription PaymentMatrix. Each cell carries the day's spend total as a
 * signal bar, with the day number and transaction count. Today is acid-marked;
 * selected days open a detail panel.
 */
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Spend } from '@/lib/types'
import { SPEND_CATEGORY_META } from '@/lib/types'
import { formatMoney } from '@/lib/money'
import {
  WEEKDAYS_MON,
  formatSignalDate,
  monthKey,
  monthKeyLabel,
  monthMatrix,
  parseISO,
  shiftMonthKey,
  todayISO,
} from '@/lib/date'
import { convert } from '@/lib/money'
import { SpendBadge } from '@/components/spends/SpendBadge'
import { Led, SIGNAL_TEXT } from '@/components/ui/Signal'
import { IconChevronLeft, IconChevronRight } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

export function SpendCalendar({
  spends,
  base,
  onSelectDate,
}: {
  spends: Spend[]
  base: string
  onSelectDate?: (iso: string) => void
}) {
  const today = todayISO()
  const [month, setMonth] = useState(() => monthKey(today))
  const [selected, setSelected] = useState<string | null>(null)

  const { y, m } = parseISO(`${month}-01`)
  const cells = useMemo(() => monthMatrix(y, m, today), [y, m, today])

  const dayTotals = useMemo(() => {
    const map = new Map<string, { total: number; count: number; spends: Spend[] }>()
    for (const s of spends) {
      const bucket = map.get(s.date) ?? { total: 0, count: 0, spends: [] }
      bucket.total += convert(s.amount, s.currency, base)
      bucket.count += 1
      bucket.spends.push(s)
      map.set(s.date, bucket)
    }
    return map
  }, [spends, base])

  const maxDayTotal = useMemo(() => {
    let max = 0
    for (const [, v] of dayTotals) {
      if (v.total > max) max = v.total
    }
    return Math.max(max, 1)
  }, [dayTotals])

  const monthStats = useMemo(() => {
    let total = 0
    let count = 0
    let activeDays = 0
    let peakDay = { iso: '', total: 0 }
    for (const [iso, v] of dayTotals) {
      if (!iso.startsWith(month)) continue
      total += v.total
      count += v.count
      activeDays++
      if (v.total > peakDay.total) peakDay = { iso, total: v.total }
    }
    return { total, count, activeDays, peakDay }
  }, [dayTotals, month])

  const selectedDay = selected ? dayTotals.get(selected) : null

  const prev = () => { setMonth(shiftMonthKey(month, -1)); setSelected(null) }
  const next = () => { setMonth(shiftMonthKey(month, 1)); setSelected(null) }

  return (
    <div>
      {/* Month header — prominent */}
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <button
          type="button"
          onClick={prev}
          className="flex h-7 w-7 items-center justify-center border border-line2 text-faint transition-colors hover:border-linehard hover:text-fg"
          aria-label="Previous month"
        >
          <IconChevronLeft size={14} />
        </button>
        <div className="text-center">
          <span className="block text-[14px] font-semibold tracking-wide text-fg">
            {monthKeyLabel(month)}
          </span>
          <span className="micro text-faint">
            {monthStats.activeDays} ACTIVE · {monthStats.count} TXN
          </span>
        </div>
        <button
          type="button"
          onClick={next}
          className="flex h-7 w-7 items-center justify-center border border-line2 text-faint transition-colors hover:border-linehard hover:text-fg"
          aria-label="Next month"
        >
          <IconChevronRight size={14} />
        </button>
      </div>

      {/* Month total strip */}
      <div className="flex items-center justify-between bg-bg2 px-3 py-1.5">
        <span className="micro text-faint">MONTH TOTAL</span>
        <span className="numeral text-[14px] font-bold text-fg">{formatMoney(monthStats.total, base)}</span>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAYS_MON.map((day) => (
          <div key={day} className="py-1 text-center">
            <span className="micro text-[10px] font-semibold text-faint">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid — taller cells */}
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const dayData = dayTotals.get(cell.iso)
          const hasSpend = dayData && dayData.total > 0
          const ratio = hasSpend ? dayData.total / maxDayTotal : 0
          const isSelected = selected === cell.iso
          const isPeak = monthStats.peakDay.iso === cell.iso && monthStats.peakDay.total > 0

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => {
                setSelected(isSelected ? null : cell.iso)
                onSelectDate?.(cell.iso)
              }}
              className={cx(
                'relative flex min-h-[56px] flex-col items-center justify-between border-b border-r border-line/40 px-0.5 py-1.5 transition-colors focus-visible:outline-none',
                !cell.inMonth && 'opacity-25',
                cell.isToday && 'bg-acidsoft',
                isSelected && !cell.isToday && 'bg-surface2',
                !isSelected && !cell.isToday && 'hover:bg-surface2/50',
              )}
            >
              {/* Intensity fill */}
              {hasSpend && (
                <span
                  aria-hidden="true"
                  className={cx(
                    'absolute inset-x-0 bottom-0 transition-all',
                    isPeak ? 'bg-orange/25' : 'bg-blue/20',
                  )}
                  style={{ height: `${Math.max(18, ratio * 100)}%` }}
                />
              )}

              {/* Day number */}
              <span
                className={cx(
                  'relative text-[12px] font-mono font-semibold leading-none',
                  cell.isToday ? 'text-acidink' : cell.isWeekend ? 'text-faint/60' : 'text-dim',
                )}
              >
                {cell.day}
              </span>

              {/* Spend indicator */}
              <span className="relative flex flex-col items-center gap-0.5">
                {hasSpend ? (
                  <>
                    {dayData!.count > 1 && (
                      <span className={cx('text-[8px] font-mono font-bold leading-none', isPeak ? 'text-orangeink' : 'text-fg/70')}>
                        {dayData!.count}×
                      </span>
                    )}
                    <Led signal={isPeak ? 'orange' : cell.isToday ? 'acid' : 'blue'} size="sm" />
                  </>
                ) : cell.inMonth ? (
                  <span className="block h-[3px] w-[3px] rounded-full bg-line" />
                ) : null}
              </span>
            </button>
          )
        })}
      </div>

      {/* Selected day detail */}
      <AnimatePresence>
        {selected && selectedDay && selectedDay.spends.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-line"
          >
            <div className="flex items-center justify-between bg-bg2 px-3 py-1.5">
              <span className="micro font-semibold text-fg">{formatSignalDate(selected)}</span>
              <span className="numeral text-[13px] font-bold text-fg">
                {formatMoney(selectedDay.total, base)}
              </span>
            </div>
            <div className="divide-y divide-line">
              {selectedDay.spends.map((s) => {
                const meta = SPEND_CATEGORY_META[s.category]
                return (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-1.5">
                    <SpendBadge category={s.category} title={s.title} size="xs" />
                    <span className="min-w-0 flex-1 truncate text-[11px] text-fg">{s.title}</span>
                    <span className={cx('micro', SIGNAL_TEXT[meta?.signal ?? 'blue'])}>
                      {meta?.code}
                    </span>
                    <span className="numeral shrink-0 text-[11px] font-semibold text-fg">
                      {formatMoney(s.amount, s.currency)}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Peak day callout */}
      {monthStats.peakDay.total > 0 && (
        <div className="flex items-center justify-between border-t border-line bg-bg2 px-3 py-1.5">
          <span className="micro flex items-center gap-1.5 text-faint">
            <Led signal="orange" size="sm" /> PEAK DAY
          </span>
          <span className="micro font-medium text-fg">
            {formatSignalDate(monthStats.peakDay.iso)} · {formatMoney(monthStats.peakDay.total, base)}
          </span>
        </div>
      )}
    </div>
  )
}