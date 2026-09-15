/**
 * SUBTRACK // PAYMENT MATRIX (TIME)
 *
 * A calendar that shows the future flow of money. Six weeks of hard cells, each
 * carrying the day's charges as coloured markers and a category composition
 * strip; a thirteen-month rail above it gives the whole horizon in one line,
 * and selecting a day opens its payment panel.
 *
 * On a phone the panel arrives as a sheet; on desktop it sits beside the matrix.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useSubscriptions } from '@/hooks/useSystem'
import { useUI } from '@/store/ui'
import { matrixFor, type ProcessEvent } from '@/lib/analytics'
import { formatMoney, formatCompact } from '@/lib/money'
import {
  MONTHS_LONG,
  WEEKDAYS_MON,
  addMonthsClamped,
  formatSignalDate,
  monthKey,
  monthKeyShort,
  monthMatrix,
  parseISO,
  relativeDay,
  shiftMonthKey,
  todayISO,
} from '@/lib/date'
import { CATEGORY_CODE, CATEGORY_SIGNAL } from '@/lib/types'
import { CutPanel } from '@/components/ui/CutPanel'
import { CyberButton } from '@/components/ui/CyberButton'
import { DataStrip } from '@/components/ui/DataStrip'
import { SectionHeader, HashRule } from '@/components/ui/Micro'
import { Led, SIGNAL_HEX, SIGNAL_TEXT, StatusChip } from '@/components/ui/Signal'
import { ServiceBadge } from '@/components/brand/ServiceBadge'
import { IconChevronLeft, IconChevronRight, IconClose } from '@/components/ui/Icons'
import { useIsDesktop, useScrollLock } from '@/hooks/usePlatform'
import { cx } from '@/lib/cx'

const HORIZON_PAST = 3
const HORIZON_FUTURE = 9

export default function PaymentMatrix() {
  const subscriptions = useSubscriptions()
  const base = useUI((s) => s.baseCurrency)
  const today = todayISO()
  const desktop = useIsDesktop()

  const [month, setMonth] = useState(() => monthKey(today))
  const [selected, setSelected] = useState<string>(today)
  const [sheetOpen, setSheetOpen] = useState(false)
  useScrollLock(sheetOpen && !desktop)

  // One pass over the whole horizon: months, days and totals all derive from it.
  const { byDay, byMonth } = useMemo(() => {
    const start = `${shiftMonthKey(monthKey(today), -HORIZON_PAST)}-01`
    const endMonth = shiftMonthKey(monthKey(today), HORIZON_FUTURE)
    const end = addMonthsClamped(`${endMonth}-01`, 1)
    const map = matrixFor(subscriptions, base, start, end)
    const months = new Map<string, { total: number; count: number }>()
    for (const [iso, events] of map) {
      const key = monthKey(iso)
      const bucket = months.get(key) ?? { total: 0, count: 0 }
      for (const event of events) {
        bucket.total += event.baseAmount
        bucket.count += 1
      }
      months.set(key, bucket)
    }
    return { byDay: map, byMonth: months }
  }, [subscriptions, base, today, month])

  const { y, m } = parseISO(`${month}-01`)
  const cells = useMemo(() => monthMatrix(y, m, today), [y, m, today])
  const monthStats = byMonth.get(month) ?? { total: 0, count: 0 }
  const monthEvents = [...byDay.entries()].filter(([iso]) => iso.startsWith(month))
  const peakDay = monthEvents.reduce<{ iso: string; total: number }>(
    (max, [iso, events]) => {
      const total = events.reduce((sum, event) => sum + event.baseAmount, 0)
      return total > max.total ? { iso, total } : max
    },
    { iso: '', total: 0 },
  )

  const dayEvents = byDay.get(selected) ?? []
  const dayTotal = dayEvents.reduce((sum, event) => sum + event.baseAmount, 0)
  const horizon = Array.from({ length: HORIZON_PAST + HORIZON_FUTURE + 1 }).map((_, index) =>
    shiftMonthKey(monthKey(today), index - HORIZON_PAST),
  )

  const selectDay = (iso: string) => {
    setSelected(iso)
    if (!desktop) setSheetOpen(true)
  }

  const monthShift = (delta: number) => {
    const next = shiftMonthKey(month, delta)
    setMonth(next)
    setSelected(`${next}-01`)
  }

  const todayMonth = monthKey(today)

  return (
    <div className="px-3 py-4 md:px-5 md:py-5">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-linehard pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="micro border border-line2 px-1.5 py-0.5 text-dim">TIME</span>
          <h1 className="text-[15px] font-semibold">PAYMENT MATRIX</h1>
          <span className="micro hidden text-faint md:inline">
            SCHEDULED EVENTS FROM CYCLE ANCHORS · {subscriptions.filter((s) => s.status === 'active').length} ACTIVE SOURCES
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMonth(todayMonth)
              setSelected(today)
            }}
            className="micro min-h-11 border border-line2 px-3 text-dim transition-colors hover:border-linehard hover:text-fg"
          >
            TODAY
          </button>
          <div className="flex">
            <button
              type="button"
              onClick={() => monthShift(-1)}
              aria-label="Previous month"
              className="grid h-11 w-11 place-items-center border border-line2 text-dim transition-colors hover:border-linehard hover:text-fg"
            >
              <IconChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => monthShift(1)}
              aria-label="Next month"
              className="grid h-11 w-11 place-items-center border border-l-0 border-line2 text-dim transition-colors hover:border-linehard hover:text-fg"
            >
              <IconChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* horizon rail */}
      <div className="no-scrollbar mt-3 flex gap-1 overflow-x-auto pb-1">
        {horizon.map((key) => {
          const stats = byMonth.get(key)
          const active = key === month
          const isCurrent = key === todayMonth
          return (
            <button
              key={key}
              type="button"
              onClick={() => setMonth(key)}
              aria-pressed={active}
              className={cx(
                'relative min-w-[76px] shrink-0 border px-2 py-1.5 text-left transition-colors',
                active
                  ? 'border-acid bg-acidsoft'
                  : 'border-line2 bg-surface2 hover:border-linehard',
              )}
            >
              {isCurrent && (
                <span className="absolute right-1.5 top-1.5">
                  <Led signal="acid" size="sm" pulse />
                </span>
              )}
              <span className={cx('micro block', active ? 'text-acidink' : 'text-faint')}>
                {monthKeyShort(key)}
              </span>
              <span className="font-mono text-[8px] tracking-[0.1em] text-faint">{key.slice(0, 4)}</span>
              <span className="meta mt-1 block text-fg">
                {stats ? formatCompact(stats.total, base) : '—'}
              </span>
              <span className="micro block text-faint">
                {stats ? `${stats.count} EV` : 'CLEAR'}
              </span>
            </button>
          )
        })}
      </div>

      {/* month readouts */}
      <div className="mt-3">
        <CutPanel cut="br" cutSize={10} innerClassName="p-0">
          <DataStrip
            size="sm"
            items={[
              { label: 'Cycle', value: `${MONTHS_LONG[m - 1]} ${y}`, signal: 'acid' },
              { label: 'Scheduled outflow', value: formatMoney(monthStats.total, base), signal: 'orange' },
              { label: 'Events', value: String(monthStats.count) },
              {
                label: 'Active days',
                value: String(monthEvents.length),
              },
              {
                label: 'Peak day',
                value: peakDay.iso ? `${formatSignalDate(peakDay.iso)} · ${formatMoney(peakDay.total, base)}` : '—',
              },
              {
                label: 'Average per event',
                value: monthStats.count ? formatMoney(monthStats.total / monthStats.count, base) : '—',
              },
            ]}
          />
        </CutPanel>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* matrix */}
        <div className={cx(desktop ? 'lg:col-span-8' : '')}>
          <CutPanel cut="tl-br" cutSize={14} innerClassName="p-0">
            <div className="flex items-center justify-between gap-3 border-b-2 border-linehard px-3 py-2">
              <span className="micro text-acidink">
                MATRIX // {MONTHS_LONG[m - 1]} {y}
              </span>
              <span className="micro hidden text-faint sm:inline">
                CELL TOTAL · CATEGORY COMPOSITION · SELECT FOR DETAIL
              </span>
            </div>

            <div className="grid grid-cols-7 border-b border-line">
              {WEEKDAYS_MON.map((day) => (
                <span
                  key={day}
                  className="tech-label border-r border-line px-2 py-1.5 last:border-r-0"
                >
                  {day}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-[1px] bg-line">
              {cells.map((cell) => {
                const events = byDay.get(cell.iso) ?? []
                const total = events.reduce((sum, event) => sum + event.baseAmount, 0)
                const isSelected = cell.iso === selected
                const isFuture = cell.iso > today
                const composition = events.reduce<Record<string, number>>((acc, event) => {
                  const signal = CATEGORY_SIGNAL[event.sub.category]
                  acc[signal] = (acc[signal] ?? 0) + event.baseAmount
                  return acc
                }, {})

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => selectDay(cell.iso)}
                    aria-label={`${formatSignalDate(cell.iso)}, ${events.length} charges`}
                    aria-pressed={isSelected}
                    className={cx(
                      'relative flex min-h-[68px] flex-col gap-1 p-1.5 text-left transition-colors md:min-h-[104px] md:p-2',
                      cell.inMonth ? 'bg-surface' : 'bg-bg2',
                      isSelected ? 'outline outline-2 -outline-offset-2 outline-acid' : 'hover:bg-surface2',
                      isFuture && cell.inMonth && !isSelected ? 'future-flow' : '',
                    )}
                  >
                    <span className="flex items-start justify-between gap-1">
                      <span
                        className={cx(
                          'font-mono text-[12px] tnum md:text-[13px]',
                          cell.isToday
                            ? 'flex h-5 min-w-5 items-center justify-center bg-acid px-1 text-black'
                            : cell.inMonth
                              ? 'text-fg'
                              : 'text-faint/70',
                        )}
                      >
                        {String(cell.day).padStart(2, '0')}
                      </span>
                      {events.length > 0 && (
                        <span className="hidden text-right md:block">
                          <span className="micro block text-dim">{formatCompact(total, base)}</span>
                        </span>
                      )}
                    </span>

                    {events.length > 0 ? (
                      <>
                        {/* mobile: markers only */}
                        <span className="flex flex-wrap gap-[3px] md:hidden" aria-hidden="true">
                          {events.slice(0, 6).map((event) => (
                            <span
                              key={event.id}
                              className="block h-[7px] w-[7px]"
                              style={{ background: SIGNAL_HEX[CATEGORY_SIGNAL[event.sub.category]] }}
                            />
                          ))}
                        </span>

                        {/* desktop: named charges */}
                        <span className="hidden flex-1 flex-col gap-[3px] md:flex">
                          {events.slice(0, 2).map((event) => (
                            <span key={event.id} className="flex items-center gap-1.5">
                              <span
                                className="block h-[6px] w-[6px] shrink-0"
                                style={{ background: SIGNAL_HEX[CATEGORY_SIGNAL[event.sub.category]] }}
                                aria-hidden="true"
                              />
                              <span className="micro truncate text-dim">
                                {event.sub.name.toUpperCase()}
                              </span>
                            </span>
                          ))}
                          {events.length > 2 && (
                            <span className="micro text-faint">+{events.length - 2} MORE</span>
                          )}
                        </span>

                        {/* composition strip */}
                        <span className="mt-auto flex h-[3px] w-full gap-[1px]" aria-hidden="true">
                          {Object.entries(composition).map(([signal, amount]) => (
                            <span
                              key={signal}
                              className="block h-full"
                              style={{
                                flexGrow: amount,
                                flexBasis: 0,
                                background: SIGNAL_HEX[signal as keyof typeof SIGNAL_HEX],
                              }}
                            />
                          ))}
                        </span>
                      </>
                    ) : (
                      <span className="micro mt-auto text-faint/60 md:mt-0">
                        {cell.inMonth ? (isFuture ? 'NO FLOW' : '—') : ''}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2">
              <span className="micro flex items-center gap-3 text-faint">
                <span className="flex items-center gap-1.5">
                  <Led signal="acid" size="sm" /> TODAY
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="future-flow block h-2.5 w-2.5 border border-line2" />
                  FUTURE FLOW
                </span>
              </span>
              <span className="micro text-faint">
                {byDay.size} SCHEDULED DAYS ON RECORD
              </span>
            </div>
          </CutPanel>
        </div>

        {/* day panel (desktop) */}
        {desktop && (
          <div className="lg:col-span-4">
            <CutPanel cut="br" cutSize={14} innerClassName="p-0" className="h-full">
              <SectionHeader
                code="DAY"
                title={formatSignalDate(selected)}
                signal={dayEvents.length ? 'orange' : 'blue'}
                right={
                  <span className="micro text-faint">
                    {relativeDay(selected, today).label}
                  </span>
                }
              />
              <DayPanel events={dayEvents} total={dayTotal} base={base} />
            </CutPanel>
          </div>
        )}
      </div>

      {/* day sheet (mobile) */}
      <AnimatePresence>
        {!desktop && sheetOpen && (
          <div className="fixed inset-0 z-[75] flex items-end">
            <motion.div
              className="absolute inset-0 bg-black/65"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSheetOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`Charges on ${formatSignalDate(selected)}`}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 440, damping: 40 }}
              className="relative max-h-[72dvh] w-full overflow-y-auto border-t-2 border-linehard bg-surface"
            >
              <div className="safe-b">
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-bg2 px-3 py-2">
                  <span className="micro flex items-center gap-2 text-acidink">
                    <Led signal="orange" size="sm" pulse />
                    DAY // {formatSignalDate(selected)} · {relativeDay(selected, today).label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="p-1.5 text-faint"
                    aria-label="Close day panel"
                  >
                    <IconClose size={14} />
                  </button>
                </div>
                <DayPanel events={dayEvents} total={dayTotal} base={base} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DayPanel({
  events,
  total,
  base,
}: {
  events: ProcessEvent[]
  total: number
  base: string
}) {
  if (!events.length) {
    return (
      <div className="px-3 py-8 text-center md:px-4">
        <span className="micro block text-dim">NO SCHEDULED CHARGES</span>
        <span className="meta mt-1.5 block text-faint">
          Nothing leaves the system on this day.
        </span>
      </div>
    )
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {events.map((event) => (
          <li key={event.id}>
            <Link
              to={`/flow/${event.sub.id}`}
              className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface2 focus-visible:outline-none md:px-4"
            >
              <ServiceBadge icon={event.sub.icon} color={event.sub.color} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[12.5px] font-medium text-fg">{event.sub.name}</span>
                  <StatusChip status={event.sub.status} showLed={false} />
                </span>
                <span className="micro block text-faint">
                  {CATEGORY_CODE[event.sub.category]}
                  <span className="text-linehard"> · </span>
                  {event.sub.billingCycle.toUpperCase()}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="meta block text-fg">
                  {formatMoney(event.amount, event.sub.currency)}
                </span>
                <span className="micro block text-faint">
                  {formatMoney(event.baseAmount, base)} BASE
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t-2 border-linehard px-3 py-2.5 md:px-4">
        <span className="micro text-faint">DAY TOTAL</span>
        <span className={cx('numeral text-[22px]', SIGNAL_TEXT.orange)}>
          {formatMoney(total, base)}
        </span>
      </div>
      <HashRule label={`${events.length} EVENTS`} className="px-4 py-2" />
      <div className="px-3 pb-3 md:px-4">
        <CyberButton variant="ghost" full to="/flow">
          OPEN ALL PROCESSES
        </CyberButton>
      </div>
    </div>
  )
}
