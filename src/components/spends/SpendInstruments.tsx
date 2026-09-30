/**
 * SPENDSTATE // SPEND INSTRUMENTS
 *
 * Visual instruments for the Spends subsystem:
 * 1. SpendCategoryComposition — sector strip + interactive breakdown
 * 2. SpendVelocity — multi-timeframe velocity bar chart (Daily 7d/14d/28d/90d,
 *    Weekly, Monthly, Yearly) with deliberate 350ms dwell delay hover popovers portaled as true overlays
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import type {
  SpendCategorySlice,
  SpendDayPoint,
  VelocityGranularity,
  VelocityPoint,
} from '@/lib/spends'
import { computeVelocitySeries } from '@/lib/spends'
import type { Spend } from '@/lib/types'
import { SPEND_CATEGORY_META } from '@/lib/types'
import { formatMoney } from '@/lib/money'
import { cx } from '@/lib/cx'
import { SIGNAL_HEX, SIGNAL_TEXT, Led } from '@/components/ui/Signal'
import { SpendBadge } from './SpendBadge'

export function SpendCategoryComposition({
  slices,
  base,
  onPick,
}: {
  slices: SpendCategorySlice[]
  base: string
  onPick?: (category: string) => void
}) {
  if (slices.length === 0) {
    return <p className="meta px-4 py-6 text-faint">NO SPENDS THIS MONTH — LOG A TRANSACTION TO SEED THE BREAKDOWN.</p>
  }
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0)
  return (
    <div className="p-3">
      {/* strip */}
      <div className="flex h-4 w-full overflow-hidden border border-line2" role="img" aria-label="Category composition">
        {slices.map((slice) => (
          <span
            key={slice.category}
            title={`${slice.label} · ${(slice.share * 100).toFixed(0)}%`}
            className="transition-opacity hover:opacity-80"
            style={{ width: `${Math.max(0.5, slice.share * 100)}%`, background: SIGNAL_HEX[slice.signal] }}
          />
        ))}
      </div>
      <div className="mt-3 divide-y divide-line">
        {slices.map((slice) => (
          <button
            key={slice.category}
            type="button"
            onClick={() => onPick?.(slice.category)}
            className="flex w-full items-center gap-2.5 py-1.5 text-left transition-colors hover:bg-surface2"
          >
            <span className="block h-2 w-2 shrink-0" style={{ background: SIGNAL_HEX[slice.signal] }} />
            <span className={cx('micro w-9 shrink-0', SIGNAL_TEXT[slice.signal])}>{slice.code}</span>
            <span className="micro min-w-0 flex-1 truncate text-faint">{slice.label}</span>
            <span className="micro text-dim">{slice.count}×</span>
            <span className="numeral text-[13px] font-semibold text-fg">{formatMoney(slice.amount, base)}</span>
            <span className="micro w-10 text-right text-faint">{(slice.share * 100).toFixed(0)}%</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
        <span className="micro text-faint">TOTAL MONTH SPEND</span>
        <span className="numeral font-bold text-fg">{formatMoney(total, base)}</span>
      </div>
    </div>
  )
}

const GRANULARITIES: { id: VelocityGranularity; label: string }[] = [
  { id: 'daily', label: 'DAILY' },
  { id: 'weekly', label: 'WEEKLY' },
  { id: 'monthly', label: 'MONTHLY' },
  { id: 'yearly', label: 'YEARLY' },
]

const DAILY_WINDOWS = [7, 14, 28, 90]

export function SpendVelocity({
  spends = [],
  series: externalSeries,
  base,
  height = 185,
}: {
  spends?: Spend[]
  series?: SpendDayPoint[]
  base: string
  height?: number
}) {
  const [granularity, setGranularity] = useState<VelocityGranularity>('daily')
  const [dailyDays, setDailyDays] = useState<number>(28)
  const [hovered, setHovered] = useState<number | null>(null)
  const [tooltipState, setTooltipState] = useState<{
    point: VelocityPoint
    rect: DOMRect
  } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const series: VelocityPoint[] = useMemo(() => {
    if (spends.length > 0) {
      return computeVelocitySeries(spends, base, granularity, dailyDays)
    }
    if (externalSeries && externalSeries.length > 0) {
      return externalSeries.map((p, idx) => ({
        key: p.iso,
        label: p.label,
        shortLabel: p.label.slice(0, 3),
        subLabel: `DAY ${idx + 1}`,
        amount: p.amount,
        count: p.amount > 0 ? 1 : 0,
        isCurrent: idx === externalSeries.length - 1,
        wantsAmount: p.amount,
        needsAmount: 0,
        topSpends: [],
        topCategories: [],
      }))
    }
    return []
  }, [spends, externalSeries, base, granularity, dailyDays])

  const max = Math.max(1, ...series.map((point) => point.amount))
  const totalAmount = series.reduce((sum, p) => sum + p.amount, 0)
  const avgAmount = series.length > 0 ? totalAmount / series.length : 0
  const activeHover = hovered !== null && hovered < series.length ? series[hovered] : null
  const activeTooltip = tooltipState?.point ?? null
  const tooltipAvgDiff = activeTooltip ? activeTooltip.amount - avgAmount : 0

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleBarEnter = useCallback(
    (index: number, element: HTMLElement) => {
      setHovered(index)
      clearTimer()
      const point = series[index]
      if (!point) return

      const rect = element.getBoundingClientRect()

      // If tooltip is already active, switch immediately for smooth scrubbing
      if (tooltipState !== null) {
        setTooltipState({ point, rect })
        return
      }

      // 350ms sweet spot: responsive yet avoids flashing on accidental passes
      timerRef.current = setTimeout(() => {
        setTooltipState({ point, rect })
      }, 350)
    },
    [series, tooltipState, clearTimer],
  )

  const handleBarLeave = useCallback(() => {
    setHovered(null)
    clearTimer()
    setTooltipState(null)
  }, [clearTimer])

  // Clear timer and close tooltip on unmount
  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  // Dismiss portal tooltip on global scroll or window resize
  useEffect(() => {
    const onScrollOrResize = () => {
      clearTimer()
      setHovered(null)
      setTooltipState(null)
    }
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [clearTimer])

  // Viewport-anchored floating position for the portal tooltip
  const portalStyle = useMemo<React.CSSProperties>(() => {
    if (!tooltipState) return {}
    const rect = tooltipState.rect
    const cardWidth = 320
    const halfWidth = cardWidth / 2
    const padding = 12

    // Center horizontally over the hovered bar, clamped safely inside viewport edges
    const left = Math.max(
      halfWidth + padding,
      Math.min(window.innerWidth - halfWidth - padding, rect.left + rect.width / 2),
    )

    // Check if there is enough vertical runway above the bar (approx 220px)
    const spaceAbove = rect.top
    const showAbove = spaceAbove >= 220

    return {
      position: 'fixed',
      left: `${left}px`,
      top: showAbove ? `${rect.top - 10}px` : `${rect.bottom + 10}px`,
      transform: showAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      width: `${cardWidth}px`,
      maxWidth: 'calc(100vw - 24px)',
      zIndex: 9999,
      pointerEvents: 'none',
    }
  }, [tooltipState])

  return (
    <div className="relative">
      {/* Timeframe selector toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-bg2 px-3 py-1.5">
        <div className="flex items-center gap-1">
          {GRANULARITIES.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setGranularity(g.id)
                handleBarLeave()
              }}
              className={cx(
                'micro border px-2 py-0.5 transition-colors',
                granularity === g.id
                  ? 'border-acid bg-acid text-black font-semibold'
                  : 'border-line2 text-faint hover:border-linehard hover:text-fg',
              )}
            >
              {g.label}
            </button>
          ))}
        </div>

        {granularity === 'daily' && (
          <div className="flex items-center gap-1">
            <span className="micro text-faint mr-1">WINDOW:</span>
            {DAILY_WINDOWS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => {
                  setDailyDays(w)
                  handleBarLeave()
                }}
                className={cx(
                  'micro border px-1.5 py-0.5 transition-colors',
                  dailyDays === w
                    ? 'border-linehard text-acidink font-semibold'
                    : 'border-line text-faint hover:text-dim',
                )}
              >
                {w}D
              </button>
            ))}
          </div>
        )}
      </div>

      {/* True Screen-Level Overlay Portal Tooltip (Appears after 350ms dwell) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {activeTooltip && tooltipState && (
              <motion.div
                key={activeTooltip.key}
                initial={{ opacity: 0, scale: 0.95, y: tooltipState.rect.top >= 220 ? 8 : -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={portalStyle}
                className="pointer-events-none"
              >
                <div className="relative border-2 border-linehard bg-surface/98 backdrop-blur-md p-3 shadow-[0_12px_40px_rgba(0,0,0,0.85)] clip-cut-br">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-line pb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="micro font-bold text-acidink truncate">
                        {activeTooltip.subLabel}
                      </span>
                      <span className="micro text-faint">·</span>
                      <span className="micro font-medium text-fg truncate">
                        {activeTooltip.label}
                      </span>
                    </div>
                    {activeTooltip.isCurrent ? (
                      <span className="micro flex items-center gap-1 font-semibold text-acidink">
                        <Led signal="acid" size="sm" pulse /> TODAY
                      </span>
                    ) : activeTooltip.amount === max && activeTooltip.amount > 0 ? (
                      <span className="micro flex items-center gap-1 font-semibold text-orangeink">
                        <Led signal="orange" size="sm" /> PEAK
                      </span>
                    ) : (
                      <span className="micro text-faint">
                        {activeTooltip.count} {activeTooltip.count === 1 ? 'TXN' : 'TXNS'}
                      </span>
                    )}
                  </div>

                  {/* Amount & vs Average */}
                  <div className="mt-2 flex items-baseline justify-between">
                    <div>
                      <span className="numeral text-[20px] font-bold text-fg leading-none">
                        {formatMoney(activeTooltip.amount, base)}
                      </span>
                    </div>
                    <div className="text-right">
                      {tooltipAvgDiff !== 0 && activeTooltip.amount > 0 ? (
                        <span
                          className={cx(
                            'micro font-semibold',
                            tooltipAvgDiff > 0 ? 'text-orangeink' : 'text-acidink',
                          )}
                        >
                          {tooltipAvgDiff > 0 ? `+${formatMoney(tooltipAvgDiff, base)}` : formatMoney(tooltipAvgDiff, base)}{' '}
                          ({tooltipAvgDiff > 0 ? '+' : ''}
                          {Math.round((tooltipAvgDiff / (avgAmount || 1)) * 100)}% VS AVG)
                        </span>
                      ) : (
                        <span className="micro text-faint">
                          {activeTooltip.amount === 0 ? 'ZERO OUTFLOW' : 'AVG PACE'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Needs vs Wants Bar (if amount > 0) */}
                  {activeTooltip.amount > 0 && (
                    <div className="mt-2">
                      <div className="flex h-1.5 w-full overflow-hidden border border-line">
                        <div
                          className="bg-blue"
                          style={{
                            width: `${Math.max(
                              2,
                              (activeTooltip.needsAmount / activeTooltip.amount) * 100,
                            )}%`,
                          }}
                        />
                        <div
                          className="bg-orange"
                          style={{
                            width: `${Math.max(
                              2,
                              (activeTooltip.wantsAmount / activeTooltip.amount) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="font-mono text-blueink font-medium">
                          NEEDS: {formatMoney(activeTooltip.needsAmount, base)}
                        </span>
                        <span className="font-mono text-orangeink font-medium">
                          WANTS: {formatMoney(activeTooltip.wantsAmount, base)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Full Transaction list without inner scrolling */}
                  {activeTooltip.topSpends && activeTooltip.topSpends.length > 0 ? (
                    <div className="mt-2.5 border-t border-line pt-2">
                      <span className="micro block text-faint mb-1.5">
                        TRANSACTIONS ({activeTooltip.count})
                      </span>
                      <div className="space-y-1.5">
                        {activeTooltip.topSpends.map((spend) => {
                          const meta = SPEND_CATEGORY_META[spend.category]
                          return (
                            <div
                              key={spend.id}
                              className="flex items-center justify-between gap-2 text-[11px]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <SpendBadge
                                  title={spend.title}
                                  category={spend.category}
                                  size="xs"
                                />
                                <div className="min-w-0">
                                  <span className="block truncate font-medium text-fg text-[12px]">
                                    {spend.title}
                                  </span>
                                  <span className="micro block text-faint">
                                    {meta?.code} · {spend.method.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <span className="numeral font-bold text-fg shrink-0 text-[12px]">
                                {formatMoney(spend.amount, spend.currency)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      {activeTooltip.count > activeTooltip.topSpends.length && (
                        <span className="micro mt-1.5 block text-center text-faint">
                          + {activeTooltip.count - activeTooltip.topSpends.length} MORE TRANSACTION
                          {activeTooltip.count - activeTooltip.topSpends.length > 1 ? 'S' : ''}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 border-t border-line pt-1.5 text-center">
                      <span className="micro text-faint">
                        ✓ NO TRANSACTIONS LOGGED ON THIS DAY
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Bar Chart Canvas */}
      <div
        className="relative flex items-end gap-[3px] px-3 pt-6"
        style={{ height }}
        onMouseLeave={handleBarLeave}
      >
        {series.map((point, index) => {
          const ratio = point.amount / max
          const isToday = point.isCurrent
          const barHeight = Math.max(point.amount > 0 ? 6 : 2, ratio * (height - 42))
          const isHovered = hovered === index
          const isOtherHovered = hovered !== null && !isHovered

          // Show label cadence depending on array density
          const showLabel =
            series.length <= 14
              ? true
              : series.length <= 30
                ? index % 2 === 0 || isToday
                : index % 5 === 0 || isToday

          return (
            <button
              key={point.key}
              type="button"
              className="group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1 focus-visible:outline-none cursor-pointer"
              onMouseEnter={(e) => handleBarEnter(index, e.currentTarget)}
              onMouseMove={(e) => {
                if (hovered !== index) {
                  handleBarEnter(index, e.currentTarget)
                }
              }}
              onFocus={(e) => handleBarEnter(index, e.currentTarget)}
              aria-label={`${point.label} · ${formatMoney(point.amount, base)}`}
            >
              {/* Vertical Crosshair Guide Ray on hover */}
              {isHovered && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 top-0 w-[1px] bg-acid/40 border-r border-dashed border-acid/60 z-0"
                />
              )}

              <span
                className={cx(
                  'relative w-full rounded-[1px] transition-all duration-150',
                  isToday ? 'bg-acid' : 'bg-blue',
                  point.amount === 0 && 'bg-line',
                  isHovered && 'brightness-125 scale-y-110 shadow-[0_0_12px_rgba(163,230,53,0.45)]',
                  isOtherHovered && 'opacity-30',
                )}
                style={{ height: barHeight }}
              >
                {isHovered && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 left-0 right-0 h-[2px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                  />
                )}
              </span>

              <span
                className={cx(
                  'micro truncate text-[10px]',
                  isToday ? 'text-acidink font-bold' : 'text-faint',
                  isHovered && 'text-fg font-bold scale-105',
                )}
              >
                {showLabel ? point.shortLabel : ''}
              </span>
            </button>
          )
        })}
      </div>

      {/* Dynamic inspection footer */}
      <div className="mx-3 flex flex-wrap items-center justify-between gap-2 border-t border-line py-2">
        <span className="micro text-faint">
          {activeHover ? (
            <span className="text-fg font-medium">
              {activeHover.label} ({activeHover.subLabel}) · {formatMoney(activeHover.amount, base)}
              {activeHover.count > 0 ? ` (${activeHover.count} txn)` : ' (0 txn)'}
              {activeHover.amount > 0 && (
                <span className="text-dim">
                  {' '}· Needs: {formatMoney(activeHover.needsAmount, base)} · Wants: {formatMoney(activeHover.wantsAmount, base)}
                </span>
              )}
            </span>
          ) : (
            <span>
              TOTAL: <span className="text-fg font-semibold">{formatMoney(totalAmount, base)}</span> ACROSS {series.length}{' '}
              {granularity.toUpperCase()} PERIODS · AVG: <span className="text-fg font-semibold">{formatMoney(avgAmount, base)}</span>/{granularity.slice(0, 3)}
            </span>
          )}
        </span>
        <span className="flex items-center gap-3">
          <span className="micro flex items-center gap-1 text-acidink">
            <i className="block h-2 w-2 bg-acid" /> CURRENT
          </span>
          <span className="micro flex items-center gap-1 text-blueink">
            <i className="block h-2 w-2 bg-blue" /> PAST
          </span>
        </span>
      </div>
    </div>
  )
}


