/**
 * SUBTRACK // INCOMING STREAM
 *
 * The next 30 days of money leaving the system, as a signal stream: a continuous
 * connector, one node per scheduled day, grouped charges and a running cumulative
 * total so the outflow is legible as a flow rather than a list.
 *
 * Urgency is encoded in the connector colour: overdue red, today acid, imminent
 * orange, scheduled neutral.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ProcessEvent } from '@/lib/analytics'
import { CATEGORY_CODE, CATEGORY_SIGNAL } from '@/lib/types'
import { formatDotDate, parseISO, relativeDay, MONTHS } from '@/lib/date'
import { formatMoney } from '@/lib/money'
import { SIGNAL_HEX, SIGNAL_TEXT, Led } from '@/components/ui/Signal'
import { ServiceBadge } from '@/components/brand/ServiceBadge'
import { cx } from '@/lib/cx'

interface DayGroup {
  date: string
  events: ProcessEvent[]
  total: number
  relative: ReturnType<typeof relativeDay>
  signal: 'red' | 'orange' | 'acid' | 'blue'
}

function signalFor(event: ProcessEvent, today: string): 'red' | 'orange' | 'acid' | 'blue' {
  const relative = relativeDay(event.date, today)
  if (relative.overdue) return 'red'
  if (relative.days === 0) return 'acid'
  if (relative.days <= 3) return 'orange'
  return 'blue'
}

export function IncomingStream({
  events,
  base,
  today,
  limit,
  className,
}: {
  events: ProcessEvent[]
  base: string
  today: string
  limit?: number
  className?: string
}) {
  const groups = useMemo<DayGroup[]>(() => {
    const byDate = new Map<string, ProcessEvent[]>()
    for (const event of events) {
      const bucket = byDate.get(event.date)
      if (bucket) bucket.push(event)
      else byDate.set(event.date, [event])
    }
    const list = [...byDate.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, dayEvents]) => ({
        date,
        events: dayEvents,
        total: dayEvents.reduce((sum, event) => sum + event.baseAmount, 0),
        relative: relativeDay(date, today),
        signal: signalFor(dayEvents[0], today),
      }))
    return limit ? list.slice(0, limit) : list
  }, [events, today, limit])

  if (!groups.length) {
    return (
      <div className={cx('px-3 py-8 text-center md:px-5', className)}>
        <span className="micro block text-dim">NO SCHEDULED CHARGES IN THIS WINDOW</span>
        <span className="meta mt-1.5 block text-faint">
          Nothing is leaving the system. Add a subscription or widen the horizon in Settings.
        </span>
      </div>
    )
  }

  const total = groups.reduce((sum, group) => sum + group.total, 0)
  const chargeCount = groups.reduce((sum, group) => sum + group.events.length, 0)
  const peak = groups.reduce((max, group) => (group.total > max.total ? group : max), groups[0])

  return (
    <div className={className}>
      <ol className="relative">
        {/* the connector */}
        <span
          aria-hidden="true"
          className="absolute bottom-2 top-2 left-[54px] w-[2px] bg-gradient-to-b from-line2 via-line to-transparent md:left-[62px]"
        />
        {groups.map((group) => {
          const { m, d } = parseISO(group.date)
          return (
            <li key={group.date} className="relative">
              <div className="flex items-stretch gap-2 md:gap-3">
                {/* date cell */}
                <div className="w-[46px] shrink-0 pt-2 text-right md:w-[54px]">
                  <div className="micro text-fg">{formatDotDate(group.date)}</div>
                  <div className="font-mono text-[8px] tracking-[0.12em] text-faint">
                    {MONTHS[m - 1]} {d}
                  </div>
                </div>

                {/* node */}
                <div className="relative flex w-[14px] shrink-0 justify-center pt-3.5">
                  <span
                    className="relative z-10 block h-[9px] w-[9px] border-2"
                    style={{
                      borderColor: SIGNAL_HEX[group.signal],
                      background: group.signal === 'blue' ? 'var(--c-bg)' : SIGNAL_HEX[group.signal],
                    }}
                    aria-hidden="true"
                  />
                </div>

                {/* charges */}
                <div className="min-w-0 flex-1 border-b border-line py-1.5">
                  {group.events.map((event) => (
                    <Link
                      key={event.id}
                      to={`/flow/${event.sub.id}`}
                      className="group flex items-center gap-2.5 py-1 focus-visible:outline-none"
                    >
                      <ServiceBadge
                        icon={event.sub.icon}
                        color={event.sub.color}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-fg group-hover:text-acidink">
                          {event.sub.name}
                        </span>
                        <span className="micro block text-faint">
                          {CATEGORY_CODE[event.sub.category]}
                          <span className="text-linehard"> · </span>
                          {group.events.length > 1 ? 'BATCHED' : group.relative.label}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="meta block text-fg">
                          {formatMoney(event.amount, event.sub.currency)}
                        </span>
                        <span className="micro hidden text-faint sm:block">
                          CUM {formatMoney(event.cumulative, base)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t-2 border-linehard px-3 py-2 md:px-4">
        <span className="micro flex items-center gap-2 text-dim">
          <Led signal="orange" size="sm" pulse />
          {chargeCount} CHARGES · {formatMoney(total, base)} OUT
        </span>
        <span className="micro text-faint">
          PEAK {formatDotDate(peak.date)} · {formatMoney(peak.total, base)}
        </span>
      </div>
    </div>
  )
}

/** Compact horizontal rail variant: next seven days, for mobile and dashboards. */
export function IncomingRail({
  events,
  today,
}: {
  events: ProcessEvent[]
  today: string
}) {
  if (!events.length) return null
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {events.map((event) => {
        const signal = signalFor(event, today)
        return (
          <Link
            key={event.id}
            to={`/flow/${event.sub.id}`}
            className="relative w-[128px] shrink-0 border border-line2 bg-surface p-2.5 transition-transform active:translate-y-[1px] focus-visible:outline-none"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{ background: SIGNAL_HEX[signal] }}
            />
            <span className="micro block text-faint">{formatDotDate(event.date)}</span>
            <span className="mt-1.5 block">
              <ServiceBadge icon={event.sub.icon} color={event.sub.color} size="sm" />
            </span>
            <span className="mt-2 block truncate text-[11.5px] font-medium text-fg">
              {event.sub.name}
            </span>
            <span className={cx('meta block', SIGNAL_TEXT[CATEGORY_SIGNAL[event.sub.category]])}>
              {formatMoney(event.amount, event.sub.currency)}
            </span>
            <span className="micro mt-0.5 block text-faint">{event.days === 0 ? 'TODAY' : relativeDay(event.date, today).label}</span>
          </Link>
        )
      })}
    </div>
  )
}
