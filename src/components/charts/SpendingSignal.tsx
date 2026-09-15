/**
 * SUBTRACK // SPENDING SIGNAL
 *
 * The burn monitor. Not a charting-library line: a signal trace drawn as hard
 * segments over an instrument grid, with square data points, a hatched forecast
 * region and a crosshair readout that reports the month, the amount and the
 * move against the previous month.
 *
 * The trace draws itself on entry (one stroke-dashoffset animation) and is fully
 * keyboard operable — arrow keys walk the months. A visually hidden table carries
 * the same numbers for screen readers, because a picture of money is not data.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { SeriesPoint } from '@/lib/analytics'
import { formatMoney, formatPercent, formatCompact } from '@/lib/money'
import { useElementWidth } from '@/hooks/useElementWidth'
import { cx } from '@/lib/cx'
import { SegmentedControl } from '@/components/ui/Controls'

const PAD = { l: 6, r: 6, t: 18, b: 28 }

export type SignalMode = 'runrate' | 'cash'

export function SpendingSignal({
  points,
  mode,
  onModeChange,
  base,
  height = 240,
  className,
}: {
  points: SeriesPoint[]
  mode: SignalMode
  onModeChange?: (mode: SignalMode) => void
  base: string
  height?: number
  className?: string
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>(760)
  const reduced = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, points.findIndex((point) => point.kind === 'current')),
  )
  const dragging = useRef(false)

  const geometry = useMemo(() => {
    const w = Math.max(width, 280)
    const innerW = w - PAD.l - PAD.r
    const innerH = height - PAD.t - PAD.b
    const max = Math.max(...points.map((point) => point.amount), 1) * 1.18
    const step = points.length > 1 ? innerW / (points.length - 1) : 0
    const x = (index: number) => PAD.l + index * step
    const y = (value: number) => PAD.t + (1 - value / max) * innerH
    const coords = points.map((point, index) => ({ x: x(index), y: y(point.amount), point, index }))
    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(' ')
    const area = `${line} L${coords[coords.length - 1]?.x.toFixed(2) ?? 0} ${(PAD.t + innerH).toFixed(
      2,
    )} L${coords[0]?.x.toFixed(2) ?? 0} ${(PAD.t + innerH).toFixed(2)} Z`
    const currentIndex = Math.max(0, points.findIndex((point) => point.kind === 'current'))
    const solid = coords.slice(0, currentIndex + 1)
    const forecast = coords.slice(currentIndex)
    return {
      w,
      innerW,
      innerH,
      max,
      x,
      y,
      coords,
      line,
      area,
      currentIndex,
      solidLine: solid.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x} ${c.y}`).join(' '),
      forecastLine: forecast.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x} ${c.y}`).join(' '),
    }
  }, [points, width, height])

  const active = points[activeIndex] ?? points[0]
  const previous = points[activeIndex - 1]
  const delta = active && previous && previous.amount > 0 ? ((active.amount - previous.amount) / previous.amount) * 100 : 0

  const pointerToIndex = useCallback(
    (clientX: number) => {
      const node = ref.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      const ratio = (clientX - rect.left - PAD.l) / Math.max(geometry.innerW, 1)
      const index = Math.round(ratio * (points.length - 1))
      setActiveIndex(Math.min(points.length - 1, Math.max(0, index)))
    },
    [geometry.innerW, points.length, ref],
  )

  useEffect(() => {
    if (points.length) setActiveIndex(Math.max(0, points.findIndex((point) => point.kind === 'current')))
  }, [points.length, mode])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(points.length - 1, index + 1))
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(0, index - 1))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(points.length - 1)
    }
  }

  const activeCoord = geometry.coords[activeIndex]
  const drawTransition = reduced ? { duration: 0 } : { duration: 0.95, ease: [0.22, 1, 0.36, 1] as const }

  return (
    <div className={cx('w-full', className)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="micro flex items-center gap-2 text-faint">
          SIGNAL // {mode === 'runrate' ? 'NORMALISED RUN-RATE' : 'RECORDED CASH FLOW'}
          <span className="text-linehard">·</span>
          {points.length} CYCLES
        </span>
        {onModeChange && (
          <SegmentedControl
            ariaLabel="Signal source"
            size="sm"
            className="w-[220px]"
            value={mode}
            onChange={(value) => onModeChange(value as SignalMode)}
            options={[
              { value: 'runrate', label: 'RUN-RATE' },
              { value: 'cash', label: 'CASH' },
            ]}
          />
        )}
      </div>

      <div
        ref={ref}
        tabIndex={0}
        role="group"
        aria-label={`Spending signal, ${points.length} months. Use arrow keys to read each month.`}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          dragging.current = true
          pointerToIndex(event.clientX)
        }}
        onPointerMove={(event) => {
          if (event.pointerType === 'touch' && !dragging.current) return
          pointerToIndex(event.clientX)
        }}
        onPointerUp={() => {
          dragging.current = false
        }}
        onPointerLeave={() => {
          dragging.current = false
        }}
        className="relative touch-pan-y select-none focus-visible:outline-none"
      >
        <svg width={geometry.w} height={height} className="block" aria-hidden="true">
          {/* instrument grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = PAD.t + fraction * geometry.innerH
            return (
              <line
                key={fraction}
                x1={PAD.l}
                x2={geometry.w - PAD.r}
                y1={y}
                y2={y}
                stroke="var(--c-line)"
                strokeWidth={1}
                strokeDasharray={fraction === 1 ? undefined : '2 4'}
              />
            )
          })}

          {/* month ticks */}
          {geometry.coords.map((coord, index) => (
            <g key={coord.point.key}>
              <line
                x1={coord.x}
                x2={coord.x}
                y1={PAD.t + geometry.innerH}
                y2={PAD.t + geometry.innerH + 4}
                stroke="var(--c-line-strong)"
                strokeWidth={1}
              />
              {(index % (points.length > 9 ? 2 : 1) === 0) && (
                <text
                  x={coord.x}
                  y={height - 10}
                  textAnchor="middle"
                  className="font-mono"
                  fontSize={9}
                  letterSpacing="0.1em"
                  fill={coord.point.kind === 'current' ? 'var(--c-acid)' : 'var(--c-fg-faint)'}
                >
                  {coord.point.short}
                </text>
              )}
            </g>
          ))}

          {/* forecast region */}
          <rect
            x={geometry.x(geometry.currentIndex)}
            y={PAD.t}
            width={Math.max(geometry.w - PAD.r - geometry.x(geometry.currentIndex), 0)}
            height={geometry.innerH}
            fill="var(--c-acid)"
            opacity={0.045}
          />
          <line
            x1={geometry.x(geometry.currentIndex)}
            x2={geometry.x(geometry.currentIndex)}
            y1={PAD.t}
            y2={PAD.t + geometry.innerH}
            stroke="var(--c-acid)"
            strokeWidth={1}
            opacity={0.5}
          />

          {/* area wash under the recorded trace */}
          <path d={geometry.area} fill="var(--c-acid)" opacity={0.05} />

          {/* forecast trace */}
          <motion.path
            d={geometry.forecastLine}
            fill="none"
            stroke="var(--c-acid)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.75}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={drawTransition}
          />

          {/* recorded trace: glow then crisp line */}
          <motion.path
            d={geometry.solidLine}
            fill="none"
            stroke="var(--c-acid)"
            strokeWidth={7}
            opacity={0.14}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={drawTransition}
          />
          <motion.path
            d={geometry.solidLine}
            fill="none"
            stroke="var(--c-acid)"
            strokeWidth={2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={drawTransition}
          />

          {/* square data points */}
          {geometry.coords.map((coord) => {
            const isActive = coord.index === activeIndex
            const forecast = coord.point.kind === 'projected'
            const size = isActive ? 7 : 5
            return (
              <rect
                key={coord.point.key}
                x={coord.x - size / 2}
                y={coord.y - size / 2}
                width={size}
                height={size}
                fill={forecast ? 'var(--c-bg)' : isActive ? 'var(--c-acid)' : 'var(--c-surface)'}
                stroke="var(--c-acid)"
                strokeWidth={isActive ? 2 : 1.5}
              />
            )
          })}

          {/* crosshair */}
          {activeCoord && (
            <line
              x1={activeCoord.x}
              x2={activeCoord.x}
              y1={PAD.t}
              y2={PAD.t + geometry.innerH}
              stroke="var(--c-fg)"
              strokeWidth={1}
              opacity={0.35}
            />
          )}
        </svg>

        {/* readout */}
        {active && (
          <div
            className="pointer-events-none absolute top-0 z-10 border border-line2 bg-bg/95 px-2 py-1.5 backdrop-blur-[2px]"
            style={{
              left: Math.min(
                Math.max((activeCoord?.x ?? 0) - 56, 0),
                Math.max(geometry.w - 130, 0),
              ),
            }}
          >
            <div className="micro text-faint">{active.label}</div>
            <div className="flex items-baseline gap-2">
              <span className="numeral text-[20px] text-fg">{formatMoney(active.amount, base)}</span>
              <span
                className={cx(
                  'micro',
                  delta > 0 ? 'text-orangeink' : delta < 0 ? 'text-acidink' : 'text-faint',
                )}
              >
                {formatPercent(delta, 1)}
              </span>
            </div>
            <div className="micro text-faint">
              {active.kind === 'actual' ? 'RECORDED' : active.kind === 'current' ? 'IN PROGRESS' : 'FORECAST'}
            </div>
          </div>
        )}

        {/* axis extremes */}
        <span className="micro pointer-events-none absolute left-1 top-0 text-faint">
          MAX {formatCompact(geometry.max, base)}
        </span>
      </div>

      {/* accessible table: the same numbers, in text */}
      <table className="sr-only">
        <caption>Monthly spending signal</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Amount ({base})</th>
            <th scope="col">State</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.label}</th>
              <td>{point.amount.toFixed(2)}</td>
              <td>{point.kind}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
