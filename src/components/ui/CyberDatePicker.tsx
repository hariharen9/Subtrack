/**
 * SUBTRACK // CYCLE DATE PICKER
 *
 * A custom calendar, because a native date input cannot speak this system's
 * language. It prints the date the way SUBTRACK prints dates (19 SEP 2026),
 * marks the scheduled day, and offers relative jumps for the common cases:
 * today, +7 days, +1 month (the usual monthly anchor), +1 year.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MONTHS_LONG,
  WEEKDAYS_MON,
  addDaysISO,
  addMonthsClamped,
  formatSignalDate,
  monthKey,
  monthMatrix,
  parseISO,
  relativeDay,
  todayISO,
} from '@/lib/date'
import { cx } from '@/lib/cx'
import { IconCalendar, IconChevronLeft, IconChevronRight } from './Icons'

const QUICK = [
  { label: 'TODAY', iso: () => todayISO() },
  { label: '+7 DAYS', iso: () => addDaysISO(todayISO(), 7) },
  { label: '+1 MONTH', iso: () => addMonthsClamped(todayISO(), 1) },
  { label: '+1 YEAR', iso: () => addMonthsClamped(todayISO(), 12) },
]

export function CyberDatePicker({
  value,
  onChange,
  ariaLabel = 'Next billing date',
  className,
}: {
  value: string
  onChange: (iso: string) => void
  ariaLabel?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => monthKey(value))
  const [focusDate, setFocusDate] = useState(value)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const dayRefs = useRef(new Map<string, HTMLButtonElement>())
  const today = todayISO()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  useEffect(() => {
    if (open) dayRefs.current.get(focusDate)?.focus()
  }, [open, focusDate, viewMonth])

  const { y, m } = parseISO(`${viewMonth}-01`)
  const cells = useMemo(() => monthMatrix(y, m, today), [y, m, today])
  const relative = relativeDay(value)

  const move = (days: number) => {
    const next = addDaysISO(focusDate, days)
    setFocusDate(next)
    setViewMonth(monthKey(next))
  }

  const shiftMonth = (delta: number) => {
    const next = addMonthsClamped(`${viewMonth}-01`, delta)
    setViewMonth(monthKey(next))
    setFocusDate(next)
  }

  const commit = (iso: string) => {
    onChange(iso)
    setFocusDate(iso)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={cx('relative', className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          setViewMonth(monthKey(value))
          setFocusDate(value)
          setOpen((previous) => !previous)
        }}
        className={cx('field flex items-center justify-between gap-2 text-left', open && 'border-acid')}
      >
        <span className="flex min-w-0 items-center gap-2">
          <IconCalendar size={14} className="shrink-0 text-faint" />
          <span className="truncate">{formatSignalDate(value)}</span>
        </span>
        <span className="micro shrink-0 text-faint">{relative.label}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose the next billing date"
          className="absolute left-0 top-[calc(100%+3px)] z-50 w-[288px] border border-line2 bg-surface p-2.5 shadow-[3px_3px_0_0_var(--c-shadow-hard)]"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              setOpen(false)
            } else if (event.key === 'ArrowLeft') {
              event.preventDefault()
              move(-1)
            } else if (event.key === 'ArrowRight') {
              event.preventDefault()
              move(1)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              move(-7)
            } else if (event.key === 'ArrowDown') {
              event.preventDefault()
              move(7)
            } else if (event.key === 'PageUp') {
              event.preventDefault()
              shiftMonth(-1)
            } else if (event.key === 'PageDown') {
              event.preventDefault()
              shiftMonth(1)
            } else if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              commit(focusDate)
            }
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="grid h-7 w-7 place-items-center border border-line2 text-dim transition-colors hover:border-linehard hover:text-fg"
              aria-label="Previous month"
            >
              <IconChevronLeft size={13} />
            </button>
            <span className="micro flex-1 text-center text-fg">
              {MONTHS_LONG[m - 1]} {y}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="grid h-7 w-7 place-items-center border border-line2 text-dim transition-colors hover:border-linehard hover:text-fg"
              aria-label="Next month"
            >
              <IconChevronRight size={13} />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-[2px]">
            {WEEKDAYS_MON.map((day) => (
              <span key={day} className="tech-label text-center">
                {day.charAt(0)}
              </span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-[2px]">
            {cells.map((cell) => {
              const selected = cell.iso === value
              const focused = cell.iso === focusDate
              return (
                <button
                  key={cell.iso}
                  ref={(node) => {
                    if (node) dayRefs.current.set(cell.iso, node)
                    else dayRefs.current.delete(cell.iso)
                  }}
                  type="button"
                  tabIndex={focused ? 0 : -1}
                  onClick={() => commit(cell.iso)}
                  onFocus={() => setFocusDate(cell.iso)}
                  aria-current={cell.isToday ? 'date' : undefined}
                  aria-label={formatSignalDate(cell.iso)}
                  className={cx(
                    'grid h-8 place-items-center border font-mono text-[11px] tnum transition-colors',
                    selected
                      ? 'border-acid bg-acid text-black'
                      : cell.isToday
                        ? 'border-acid text-acidink'
                        : cell.inMonth
                          ? 'border-transparent text-fg hover:border-line2 hover:bg-surface2'
                          : 'border-transparent text-faint/60 hover:bg-surface2',
                    cell.isWeekend && !selected && cell.inMonth ? 'text-dim' : '',
                  )}
                >
                  {String(cell.day).padStart(2, '0')}
                </button>
              )
            })}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-[3px] border-t border-line pt-2">
            {QUICK.map((quick) => (
              <button
                key={quick.label}
                type="button"
                onClick={() => commit(quick.iso())}
                className="micro min-h-9 border border-line2 text-dim transition-colors hover:border-linehard hover:text-fg"
              >
                {quick.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
