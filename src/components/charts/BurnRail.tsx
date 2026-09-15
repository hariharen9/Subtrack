/**
 * SUBTRACK // BURN RAIL
 *
 * The signature instrument: total monthly burn rendered as one continuous load
 * register, segmented by process. Segment colour is the CATEGORY signal, not the
 * brand colour — so the rail doubles as a composition chart and the grid never
 * turns into a rainbow.
 *
 * Hover, tap or arrow-key a segment and the readout above reports that process.
 * Selecting is cheap and reversible, which is what makes it feel like hardware.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { SubscriptionView } from '@/lib/analytics'
import { CATEGORY_SIGNAL } from '@/lib/types'
import { formatMoney } from '@/lib/money'
import { SIGNAL_HEX, SIGNAL_TEXT, Led } from '@/components/ui/Signal'
import { ServiceBadge } from '@/components/brand/ServiceBadge'
import { cx } from '@/lib/cx'
import { pidOf } from '@/lib/id'

export interface BurnSegment {
  view: SubscriptionView
  share: number
}

export function BurnSegments({
  segments,
  activeId,
  onSelect,
  base,
  height = 'h-14',
  gap = 1,
  className,
}: {
  segments: BurnSegment[]
  activeId?: string
  onSelect?: (id: string) => void
  base: string
  height?: string
  gap?: number
  className?: string
}) {
  return (
    <div
      className={cx('flex w-full items-stretch', height, className)}
      style={{ gap }}
      role="list"
      aria-label="Monthly burn by process"
    >
      {segments.map(({ view, share }) => {
        const signal = CATEGORY_SIGNAL[view.sub.category]
        const isActive = activeId === view.sub.id
        return (
          <button
            key={view.sub.id}
            type="button"
            role="listitem"
            onClick={() => onSelect?.(view.sub.id)}
            onPointerEnter={() => onSelect?.(view.sub.id)}
            onFocus={() => onSelect?.(view.sub.id)}
            aria-label={`${view.sub.name}, ${formatMoney(view.monthly, base)} per month, ${(
              share * 100
            ).toFixed(1)} percent of burn`}
            aria-pressed={isActive}
            className="group relative min-w-[3px] origin-bottom transition-[translate,opacity] duration-150 ease-snap focus-visible:outline-none"
            style={{
              flexGrow: Math.max(share, 0.004),
              flexBasis: 0,
              background: SIGNAL_HEX[signal],
              translate: isActive ? '0 -3px' : undefined,
              opacity: activeId && !isActive ? 0.55 : 1,
            }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-1/3 bg-black/25"
            />
            {isActive && (
              <span aria-hidden="true" className="absolute inset-0 border-2 border-fg" />
            )}
          </button>
        )
      })}
    </div>
  )
}

export function BurnRail({
  views,
  total,
  base,
  className,
}: {
  views: SubscriptionView[]
  total: number
  base: string
  className?: string
}) {
  const segments = useMemo<BurnSegment[]>(
    () => views.map((view) => ({ view, share: view.share })),
    [views],
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = segments.find((s) => s.view.sub.id === activeId) ?? segments[0]

  return (
    <div className={cx('w-full', className)}>
      {/* readout */}
      <div className="flex items-center justify-between gap-3">
        <span className="micro flex items-center gap-2 text-faint">
          <Led signal="acid" size="sm" pulse />
          LOAD DISTRIBUTION // {segments.length} PROCESSES
        </span>
        {active && (
          <Link
            to={`/flow/${active.view.sub.id}`}
            className="group hidden items-center gap-2 focus-visible:outline-none sm:flex"
          >
            <ServiceBadge icon={active.view.sub.icon} color={active.view.sub.color} size="sm" />
            <span className="flex flex-col leading-tight">
              <span className="text-[12px] font-semibold text-fg">{active.view.sub.name}</span>
              <span className="pid">
                {pidOf(active.view.sub.id)} · {(active.share * 100).toFixed(1)}% OF BURN
              </span>
            </span>
            <span className="micro ml-1 hidden text-faint group-hover:text-acidink md:inline">
              OPEN ▸
            </span>
          </Link>
        )}
      </div>

      <div className="mt-3">
        <BurnSegments
          segments={segments}
          activeId={active?.view.sub.id}
          onSelect={setActiveId}
          base={base}
          height="h-16"
        />
      </div>

      {/* scale */}
      <div className="mt-2 flex items-center justify-between border-t border-line pt-1.5">
        <span className="ticks w-full max-w-[45%]" />
        <span className="micro text-faint">CUMULATIVE · 100% = {formatMoney(total, base)}/MO</span>
      </div>

      {/* mobile readout (the header row hides the link on small screens) */}
      {active && (
        <div className="mt-2 flex items-center gap-2 sm:hidden">
          <Led signal={CATEGORY_SIGNAL[active.view.sub.category]} size="sm" />
          <span className={cx('micro', SIGNAL_TEXT[CATEGORY_SIGNAL[active.view.sub.category]])}>
            {active.view.sub.name}
          </span>
          <span className="micro text-faint">
            {formatMoney(active.view.monthly, base)}/MO · {(active.share * 100).toFixed(1)}%
          </span>
        </div>
      )}

      {/* legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {uniqueCategories(segments).map(({ category, share, signal }) => (
          <span key={category} className="flex items-center gap-1.5">
            <span
              className="block h-2.5 w-2.5"
              style={{ background: SIGNAL_HEX[signal] }}
              aria-hidden="true"
            />
            <span className="micro text-dim">{category}</span>
            <span className="micro text-faint">{(share * 100).toFixed(0)}%</span>
          </span>
        ))}
        <span className="micro ml-auto hidden text-faint md:inline">
          SEGMENT COLOUR = CATEGORY SIGNAL
        </span>
      </div>
    </div>
  )
}

function uniqueCategories(segments: BurnSegment[]) {
  const map = new Map<string, { category: string; share: number; signal: keyof typeof SIGNAL_HEX }>()
  for (const { view, share } of segments) {
    const key = view.sub.category
    const signal = CATEGORY_SIGNAL[view.sub.category]
    const bucket = map.get(key)
    if (bucket) bucket.share += share
    else map.set(key, { category: key.toUpperCase(), share, signal })
  }
  return [...map.values()].sort((a, b) => b.share - a.share)
}

/** Mobile nav top edge: a 3px composition strip. Informative, not decorative. */
export function BurnEdge({ views }: { views: SubscriptionView[] }) {
  if (!views.length) {
    return <span className="block h-[3px] w-full bg-line" aria-hidden="true" />
  }
  return (
    <div className="flex h-[3px] w-full" aria-hidden="true">
      {views.map((view) => (
        <span
          key={view.sub.id}
          className="block h-full"
          style={{
            flexGrow: Math.max(view.share, 0.004),
            flexBasis: 0,
            background: SIGNAL_HEX[CATEGORY_SIGNAL[view.sub.category]],
          }}
        />
      ))}
    </div>
  )
}
