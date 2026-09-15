/**
 * SUBTRACK // PROCESS MODULE
 *
 * A subscription rendered as a running process: identity header with a status
 * light, the price as a large numeral, its share of total burn, the next
 * scheduled event and a 12-month charge register. Two densities:
 *   grid  → the command grid (default)
 *   row   → dense list for scanning many processes at once
 */
import { memo, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { CATEGORY_CODE, CATEGORY_LABEL, type Subscription } from '@/lib/types'
import { cycleSuffix } from '@/lib/cycle'
import { formatMoney } from '@/lib/money'
import { formatSignalDate, monthKey, shiftMonthKey, todayISO } from '@/lib/date'
import { pidOf, traceOf } from '@/lib/id'
import { occurrencesByMonth } from '@/lib/cycle'
import { useUI } from '@/store/ui'
import { cx } from '@/lib/cx'
import { CutPanel } from '@/components/ui/CutPanel'
import { ServiceBadge } from '@/components/brand/ServiceBadge'
import { Led, StatusChip } from '@/components/ui/Signal'
import type { SubscriptionView } from '@/lib/analytics'

const MotionLink = motion.create(Link)

const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

/** The 12-month charge register — the micro-detail that makes a card a module. */
function CycleRegister({ sub, className }: { sub: Subscription; className?: string }) {
  const current = monthKey(todayISO())
  const byMonth = useMemo(
    () => occurrencesByMonth(sub, current, shiftMonthKey(current, 11)),
    [sub, current],
  )

  return (
    <div className={cx('flex items-end gap-[3px]', className)} aria-hidden="true">
      {Array.from({ length: 12 }).map((_, index) => {
        const key = shiftMonthKey(current, index)
        const hits = byMonth.get(key)?.length ?? 0
        const isNow = index === 0
        return (
          <span key={key} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={cx(
                'block w-full',
                hits > 0
                  ? 'bg-[var(--accent)]'
                  : isNow
                    ? 'bg-line2'
                    : 'bg-line',
              )}
              style={{ height: hits > 0 ? 10 + Math.min(hits, 3) * 3 : 4 }}
            />
            <span
              className={cx(
                'font-mono text-[7px] leading-none tracking-[0.08em]',
                hits > 0 ? 'text-fg' : 'text-faint',
              )}
            >
              {MONTH_INITIALS[Number(key.slice(5, 7)) - 1]}
            </span>
          </span>
        )
      })}
    </div>
  )
}

/** Share of monthly burn, drawn as a segmented strip rather than a progress bar. */
function ShareStrip({ share, segments = 24 }: { share: number; segments?: number }) {
  const filled = Math.max(share > 0 ? 1 : 0, Math.round(share * segments))
  return (
    <div className="flex gap-[2px]" aria-hidden="true">
      {Array.from({ length: segments }).map((_, index) => (
        <span
          key={index}
          className={cx('h-[6px] flex-1', index < filled ? 'bg-[var(--accent)]' : 'bg-line')}
          style={{ opacity: index < filled ? 0.35 + (index / segments) * 0.65 : 1 }}
        />
      ))}
    </div>
  )
}

export interface ProcessCardProps {
  view: SubscriptionView
  /** Pre-computed so the grid does not recompute for every card. */
  index?: number
}

export const ProcessCard = memo(function ProcessCard({ view, index = 0 }: ProcessCardProps) {
  const base = useUI((s) => s.baseCurrency)
  const { sub, monthly, annual, next, share } = view
  const inactive = sub.status !== 'active'

  return (
    <MotionLink
      to={`/flow/${sub.id}`}
      className="group block h-full focus-visible:outline-none"
      style={{ ['--accent' as string]: sub.color }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 520, damping: 34 }}
      aria-label={`${sub.name}, ${formatMoney(sub.price, sub.currency)} ${cycleSuffix(
        sub.billingCycle,
        sub.customIntervalDays,
      ).toLowerCase()}, ${sub.status}`}
    >
      <CutPanel
        cut={index % 2 === 0 ? 'tl-br' : 'br'}
        cutSize={10}
        hover
        className="h-full"
        innerClassName="flex h-full flex-col"
      >
        {/* identity */}
        <div className="flex items-start gap-2.5 border-b border-line px-3 py-2.5">
          <motion.span layoutId={`glyph-${sub.id}`} className="grid">
            <ServiceBadge
              icon={sub.icon}
              color={sub.color}
              size="md"
              dimmed={inactive}
              title={sub.name}
            />
          </motion.span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[13.5px] font-semibold leading-tight text-fg">
              {sub.name}
            </h3>
            <div className="micro mt-1 flex items-center gap-1.5 text-faint">
              <span>{CATEGORY_CODE[sub.category]}</span>
              <span className="text-linehard">/</span>
              <span className="truncate">{CATEGORY_LABEL[sub.category]}</span>
            </div>
          </div>
          {sub.status === 'active' ? (
            <span className="micro flex shrink-0 items-center gap-1 text-acidink">
              <Led signal="acid" size="sm" pulse />
              ON
            </span>
          ) : (
            <StatusChip status={sub.status} className="shrink-0" />
          )}
        </div>

        {/* economics */}
        <div className="px-3 pt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="numeral text-[30px] text-fg">{formatMoney(sub.price, sub.currency)}</span>
            <span className="micro pb-0.5 text-faint">
              {cycleSuffix(sub.billingCycle, sub.customIntervalDays)}
            </span>
          </div>
          <div className="meta mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-dim">
            <span>{formatMoney(monthly, base)}/MO</span>
            <span className="text-linehard">·</span>
            <span>{formatMoney(annual, base)}/YR</span>
            <span className="text-linehard">·</span>
            <span className="text-faint">{(share * 100).toFixed(1)}% OF BURN</span>
          </div>
          <div className="mt-2.5">
            <ShareStrip share={share} />
          </div>
        </div>

        {/* next event */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line px-3 py-2">
          <span className="micro text-faint">NEXT CYCLE</span>
          <span className="flex items-center gap-1.5">
            <span className={cx('meta', next.overdue ? 'text-redink' : 'text-fg')}>
              {formatSignalDate(sub.nextBillingDate)}
            </span>
            <span
              className={cx(
                'micro',
                next.overdue ? 'text-redink' : next.days <= 3 ? 'text-orangeink' : 'text-faint',
              )}
            >
              {next.label}
            </span>
          </span>
        </div>

        {/* register + stamp */}
        <div className="mt-auto">
          <div className="px-3 pb-2.5">
            <CycleRegister sub={sub} />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-1.5">
            <span className="pid">PROCESS ID // {pidOf(sub.id)}</span>
            <span className="micro flex items-center gap-1.5 text-faint transition-colors group-hover:text-acidink">
              <span className="hidden opacity-0 transition-opacity group-hover:opacity-100 sm:inline">
                {traceOf(sub.id)}
              </span>
              OPEN
              <span aria-hidden="true">▸</span>
            </span>
          </div>
        </div>
      </CutPanel>
    </MotionLink>
  )
})

/** Dense row: the scanline view. Used when a list gets long. */
export const ProcessRow = memo(function ProcessRow({ view }: ProcessCardProps) {
  const base = useUI((s) => s.baseCurrency)
  const { sub, monthly, next, share } = view
  const inactive = sub.status !== 'active'

  return (
    <MotionLink
      to={`/flow/${sub.id}`}
      style={{ ['--accent' as string]: sub.color }}
      className="group flex items-center gap-3 border-b border-line px-3 py-2.5 transition-colors hover:bg-surface2 focus-visible:outline-none md:px-4"
      whileTap={{ scale: 0.995 }}
      transition={{ type: 'spring', stiffness: 560, damping: 36 }}
    >
      <ServiceBadge icon={sub.icon} color={sub.color} size="sm" dimmed={inactive} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-fg">{sub.name}</span>
          {sub.status !== 'active' && <StatusChip status={sub.status} showLed={false} />}
        </span>
        <span className="micro mt-0.5 flex items-center gap-1.5 text-faint">
          <span>{CATEGORY_CODE[sub.category]}</span>
          <span className="text-linehard">/</span>
          <span>{formatSignalDate(sub.nextBillingDate)}</span>
        </span>
      </span>
      <span className="hidden w-28 shrink-0 md:block">
        <ShareStrip share={share} segments={16} />
      </span>
      <span className="shrink-0 text-right">
        <span className="meta block text-fg">{formatMoney(sub.price, sub.currency)}</span>
        <span className="micro block text-faint">
          {formatMoney(monthly, base)}/MO · {next.label}
        </span>
      </span>
    </MotionLink>
  )
})
