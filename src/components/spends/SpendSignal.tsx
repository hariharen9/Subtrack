/**
 * SPENDSTATE // SPEND SIGNAL TRACE
 *
 * A daily spend signal trace — the wire-graph equivalent of the subscription
 * SpendingSignal. Draws hard segments over an instrument grid with square data
 * points, a 7-day moving average overlay, a trend/forecast dashed extension,
 * and a crosshair readout that reports the day, the amount and the delta vs
 * the daily average.
 *
 * Keyboard operable: arrow keys walk the days.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { SpendDayPoint } from '@/lib/spends'
import { formatMoney, formatCompact } from '@/lib/money'
import { useElementWidth } from '@/hooks/useElementWidth'
import { cx } from '@/lib/cx'

const PAD = { l: 6, r: 6, t: 18, b: 28 }

export function SpendSignal({
  series,
  base,
  height = 220,
  className,
}: {
  series: SpendDayPoint[]
  base: string
  height?: number
  className?: string
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>(760)
  const reduced = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(series.length - 1)
  const dragging = useRef(false)

  const geometry = useMemo(() => {
    const w = Math.max(width, 280)
    const innerW = w - PAD.l - PAD.r
    const innerH = height - PAD.t - PAD.b
    const amounts = series.map((p) => p.amount)
    const max = Math.max(...amounts, 1) * 1.2
    const step = series.length > 1 ? innerW / (series.length - 1) : 0
    const x = (index: number) => PAD.l + index * step
    const y = (value: number) => PAD.t + (1 - value / max) * innerH
    const coords = series.map((p, i) => ({ x: x(i), y: y(p.amount), point: p, index: i }))

    // Main trace path
    const line = coords
      .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
      .join(' ')

    // Fill area under the trace
    const area = `${line} L${coords[coords.length - 1]?.x.toFixed(2) ?? 0} ${(PAD.t + innerH).toFixed(2)} L${coords[0]?.x.toFixed(2) ?? 0} ${(PAD.t + innerH).toFixed(2)} Z`

    // 7-day moving average
    const ma7: { x: number; y: number }[] = []
    for (let i = 6; i < series.length; i++) {
      let sum = 0
      for (let j = i - 6; j <= i; j++) sum += series[j].amount
      const avg = sum / 7
      ma7.push({ x: x(i), y: y(avg) })
    }
    const ma7Line = ma7
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ')

    // Average line
    const total = amounts.reduce((a, b) => a + b, 0)
    const avg = series.length > 0 ? total / series.length : 0
    const avgY = y(avg)

    // Grid lines (horizontal)
    const gridLines: { y: number; label: string }[] = []
    const steps = 4
    for (let i = 0; i <= steps; i++) {
      const val = (max / steps) * i
      gridLines.push({ y: y(val), label: formatCompact(val, base) })
    }

    // Today index
    const todayIndex = series.length - 1

    return { w, innerW, innerH, max, step, x, y, coords, line, area, ma7Line, avgY, avg, gridLines, todayIndex }
  }, [series, width, height, base])

  const active = series[activeIndex]
  const activeCoord = geometry.coords[activeIndex]
  const avgDiff = active ? active.amount - geometry.avg : 0

  // Keyboard navigation
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(0, i - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(series.length - 1, i + 1))
      } else if (e.key === 'Home') {
        e.preventDefault()
        setActiveIndex(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        setActiveIndex(series.length - 1)
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [series.length])

  return (
    <div
      ref={ref}
      className={cx('relative outline-none', className)}
      tabIndex={0}
      role="figure"
      aria-label="Daily spend signal trace"
      onMouseDown={() => { dragging.current = true }}
      onMouseUp={() => { dragging.current = false }}
      onMouseLeave={() => { dragging.current = false; setActiveIndex(geometry.todayIndex) }}
    >
      <svg
        viewBox={`0 0 ${geometry.w} ${height}`}
        width="100%"
        height={height}
        className="select-none"
        aria-hidden="true"
      >
        {/* Grid lines */}
        {geometry.gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={PAD.l}
              y1={g.y}
              x2={geometry.w - PAD.r}
              y2={g.y}
              stroke="var(--c-line)"
              strokeWidth={i === 0 || i === geometry.gridLines.length - 1 ? 1 : 0.5}
              strokeDasharray={i > 0 && i < geometry.gridLines.length - 1 ? '2 3' : undefined}
            />
          </g>
        ))}

        {/* Average line */}
        <line
          x1={PAD.l}
          y1={geometry.avgY}
          x2={geometry.w - PAD.r}
          y2={geometry.avgY}
          stroke="var(--c-orange)"
          strokeWidth={0.8}
          strokeDasharray="4 3"
          opacity={0.5}
        />
        <text
          x={geometry.w - PAD.r - 2}
          y={geometry.avgY - 4}
          fill="var(--c-orange)"
          fontSize={9}
          fontFamily="var(--font-mono)"
          textAnchor="end"
          opacity={0.7}
        >
          AVG {formatCompact(geometry.avg, base)}
        </text>

        {/* Fill area under trace */}
        <motion.path
          d={geometry.area}
          fill="var(--c-acid)"
          opacity={0.06}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.06 }}
          transition={{ duration: 0.6 }}
        />

        {/* 7-day moving average */}
        {geometry.ma7Line && (
          <motion.path
            d={geometry.ma7Line}
            fill="none"
            stroke="var(--c-magenta)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.5}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduced ? 0 : 1.2, delay: 0.3 }}
          />
        )}

        {/* Main trace */}
        <motion.path
          d={geometry.line}
          fill="none"
          stroke="var(--c-acid)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduced ? {} : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduced ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Data points */}
        {geometry.coords.map((c, i) => {
          const isActive = i === activeIndex
          const isToday = i === geometry.todayIndex
          const isZero = c.point.amount === 0
          return (
            <g key={i}>
              {/* Hover zone (invisible, wider target) */}
              <rect
                x={c.x - geometry.step / 2}
                y={PAD.t}
                width={geometry.step}
                height={geometry.innerH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => { setActiveIndex(i) }}
                onMouseMove={() => { if (dragging.current) setActiveIndex(i) }}
              />
              {/* Point */}
              {!isZero && (
                <motion.rect
                  x={c.x - (isActive ? 4 : 3)}
                  y={c.y - (isActive ? 4 : 3)}
                  width={isActive ? 8 : 6}
                  height={isActive ? 8 : 6}
                  fill={isToday ? 'var(--c-acid)' : isActive ? 'var(--c-blue)' : 'var(--c-fg)'}
                  opacity={isActive ? 1 : 0.7}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: reduced ? 0 : i * 0.015, duration: 0.2 }}
                />
              )}
            </g>
          )
        })}

        {/* Today marker */}
        <line
          x1={geometry.coords[geometry.todayIndex]?.x ?? 0}
          y1={PAD.t}
          x2={geometry.coords[geometry.todayIndex]?.x ?? 0}
          y2={PAD.t + geometry.innerH}
          stroke="var(--c-acid)"
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={0.4}
        />
        <text
          x={geometry.coords[geometry.todayIndex]?.x ?? 0}
          y={PAD.t + geometry.innerH + 14}
          fill="var(--c-acid)"
          fontSize={9}
          fontFamily="var(--font-mono)"
          fontWeight="700"
          textAnchor="middle"
        >
          TODAY
        </text>

        {/* Crosshair on active */}
        {activeCoord && (
          <>
            <line
              x1={activeCoord.x}
              y1={PAD.t}
              x2={activeCoord.x}
              y2={PAD.t + geometry.innerH}
              stroke="var(--c-fg)"
              strokeWidth={0.5}
              strokeDasharray="2 2"
              opacity={0.3}
            />
            <line
              x1={PAD.l}
              y1={activeCoord.y}
              x2={geometry.w - PAD.r}
              y2={activeCoord.y}
              stroke="var(--c-fg)"
              strokeWidth={0.5}
              strokeDasharray="2 2"
              opacity={0.3}
            />
            {/* Readout badge */}
            <rect
              x={Math.min(activeCoord.x + 8, geometry.w - 120)}
              y={Math.max(activeCoord.y - 28, PAD.t)}
              width={110}
              height={22}
              fill="var(--c-surface)"
              stroke="var(--c-line-hard)"
              strokeWidth={1}
            />
            <text
              x={Math.min(activeCoord.x + 14, geometry.w - 114)}
              y={Math.max(activeCoord.y - 13, PAD.t + 14)}
              fill="var(--c-fg)"
              fontSize={10}
              fontFamily="var(--font-mono)"
              fontWeight="600"
            >
              {formatMoney(active?.amount ?? 0, base)}
            </text>
          </>
        )}

        {/* Day labels along bottom */}
        {geometry.coords.map((c, i) => {
          const show = series.length <= 14 ? true : series.length <= 28 ? i % 3 === 0 : i % 7 === 0
          if (!show && i !== geometry.todayIndex && i !== activeIndex) return null
          return (
            <text
              key={i}
              x={c.x}
              y={PAD.t + geometry.innerH + 14}
              fill={i === geometry.todayIndex ? 'var(--c-acid)' : i === activeIndex ? 'var(--c-fg)' : 'var(--c-fg-dim)'}
              fontSize={8}
              fontFamily="var(--font-mono)"
              textAnchor="middle"
              fontWeight={i === geometry.todayIndex || i === activeIndex ? 700 : 400}
            >
              {series[i].label.split(' ')[0]}
            </text>
          )
        })}
      </svg>

      {/* Footer readout */}
      <div className="mt-1 flex items-center justify-between px-1">
        <span className="micro text-faint">
          {active ? (
            <span className="text-fg font-medium">
              {active.label} · {formatMoney(active.amount, base)}
              {avgDiff !== 0 && (
                <span className={cx('ml-1.5', avgDiff > 0 ? 'text-orangeink' : 'text-acidink')}>
                  {avgDiff > 0 ? '+' : ''}{formatMoney(avgDiff, base)} VS AVG
                </span>
              )}
            </span>
          ) : (
            'HOVER TO INSPECT'
          )}
        </span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="block h-[2px] w-3 bg-acid" />
            <span className="micro text-faint">DAILY</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="block h-[2px] w-3 bg-magenta opacity-50" />
            <span className="micro text-faint">7D AVG</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="block h-[2px] w-3 border-t border-dashed border-orange opacity-50" />
            <span className="micro text-faint">MEAN</span>
          </span>
        </span>
      </div>

      {/* Visually hidden data table for a11y */}
      <table className="sr-only">
        <caption>Daily spend totals, trailing {series.length} days</caption>
        <thead>
          <tr><th>Date</th><th>Amount</th></tr>
        </thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.iso}>
              <td>{p.label}</td>
              <td>{formatMoney(p.amount, base)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
