/**
 * SUBTRACK // CATEGORY BLOCK
 *
 * The distribution primitive. No pie charts: a category is a labelled block with
 * a segmented bar, a count, its monthly cost and its share of burn. Stack a few
 * and the composition of spending is readable at a glance, and comparable across
 * categories without a legend.
 */
import type { CategorySlice } from '@/lib/analytics'
import { formatMoney } from '@/lib/money'
import { SIGNAL_HEX, SIGNAL_TEXT, Led } from '@/components/ui/Signal'
import { cx } from '@/lib/cx'

export function CategoryBar({
  slice,
  max,
  base,
  compact = false,
}: {
  slice: CategorySlice
  max: number
  base: string
  compact?: boolean
}) {
  const ratio = max > 0 ? slice.monthly / max : 0
  const segments = compact ? 16 : 28

  return (
    <div className="group relative flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface2 md:px-4">
      <span
        className={cx(
          'grid h-9 w-9 shrink-0 place-items-center border text-[10px] font-semibold',
          SIGNAL_TEXT[slice.signal],
        )}
        style={{ borderColor: SIGNAL_HEX[slice.signal] }}
      >
        {slice.code}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[12.5px] font-medium text-fg">{slice.label}</span>
          <span className="micro text-faint">
            {slice.count} SUB{slice.count === 1 ? '' : 'S'}
          </span>
        </span>
        <span className="mt-1.5 flex items-center gap-[2px]" aria-hidden="true">
          {Array.from({ length: segments }).map((_, index) => (
            <span
              key={index}
              className="h-[7px] flex-1 transition-opacity"
              style={{
                background:
                  index < Math.max(1, Math.round(ratio * segments)) ? SIGNAL_HEX[slice.signal] : 'var(--c-line)',
                opacity: index < Math.round(ratio * segments) ? 0.45 + (index / segments) * 0.55 : 1,
              }}
            />
          ))}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="meta block text-fg">{formatMoney(slice.monthly, base)}</span>
        <span className="micro block text-faint">
          {(slice.share * 100).toFixed(1)}% · {formatMoney(slice.annual, base)}/YR
        </span>
      </span>
    </div>
  )
}

export function CategoryDistribution({
  slices,
  base,
  className,
}: {
  slices: CategorySlice[]
  base: string
  className?: string
}) {
  const max = slices.reduce((value, slice) => Math.max(value, slice.monthly), 0)
  if (!slices.length) {
    return (
      <p className={cx('meta px-3 py-6 text-center text-faint', className)}>
        NO ACTIVE SUBSCRIPTIONS TO DISTRIBUTE
      </p>
    )
  }
  return (
    <ul className={cx('divide-y divide-line', className)}>
      {slices.map((slice) => (
        <li key={slice.category}>
          <CategoryBar slice={slice} max={max} base={base} />
        </li>
      ))}
    </ul>
  )
}

/** Full-width stacked composition strip: the whole burn in one line. */
export function CompositionStrip({
  slices,
  className,
  height = 44,
}: {
  slices: CategorySlice[]
  className?: string
  height?: number
}) {
  return (
    <div className={cx('flex w-full gap-[2px]', className)} style={{ height }}>
      {slices.map((slice) => (
        <div
          key={slice.category}
          className="group relative min-w-[3px] transition-[flex-grow]"
          style={{ flexGrow: Math.max(slice.share, 0.004), flexBasis: 0, background: SIGNAL_HEX[slice.signal] }}
          title={`${slice.label} · ${(slice.share * 100).toFixed(1)}%`}
        >
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-black/25" />
          <span className="micro absolute left-1.5 top-1.5 hidden text-black/70 lg:block">
            {slice.share > 0.08 ? slice.code : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Radial instrument: a square-capped arc with tick marks and a centre readout. */
export function RadialGauge({
  value,
  label,
  caption,
  signal = 'acid',
  size = 150,
}: {
  /** 0..1 */
  value: number
  label: string
  caption: string
  signal?: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
  size?: number
}) {
  const clamped = Math.max(0, Math.min(1, value))
  const radius = size / 2 - 12
  const cx0 = size / 2
  const cy0 = size / 2
  const start = -220
  const sweep = 260
  const polar = (angle: number) => {
    const rad = (angle * Math.PI) / 180
    return { x: cx0 + radius * Math.cos(rad), y: cy0 + radius * Math.sin(rad) }
  }
  const from = polar(start)
  const to = polar(start + sweep)
  const end = polar(start + sweep * clamped)

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.82} viewBox={`0 0 ${size} ${size * 0.82}`} aria-hidden="true">
        {/* tick ring */}
        {Array.from({ length: 27 }).map((_, index) => {
          const angle = start + (sweep / 26) * index
          const outer = polar(angle)
          const innerRadius = radius - (index % 5 === 0 ? 9 : 5)
          const rad = (angle * Math.PI) / 180
          const inner = {
            x: cx0 + innerRadius * Math.cos(rad),
            y: cy0 + innerRadius * Math.sin(rad),
          }
          return (
            <line
              key={index}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--c-line-strong)"
              strokeWidth={index % 5 === 0 ? 1.6 : 1}
            />
          )
        })}

        {/* track */}
        <path
          d={`M${from.x} ${from.y} A${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${to.x} ${to.y}`}
          fill="none"
          stroke="var(--c-line)"
          strokeWidth={7}
        />

        {/* value */}
        <path
          d={`M${from.x} ${from.y} A${radius} ${radius} 0 ${sweep * clamped > 180 ? 1 : 0} 1 ${end.x} ${end.y}`}
          fill="none"
          stroke={SIGNAL_HEX[signal]}
          strokeWidth={7}
          strokeLinecap="butt"
        />

        {/* value marker */}
        <circle cx={end.x} cy={end.y} r={4} fill={SIGNAL_HEX[signal]} />

        <text
          x={cx0}
          y={cy0 + 2}
          textAnchor="middle"
          fontSize={26}
          fontWeight={600}
          fill="var(--c-fg)"
          fontFamily="var(--font-display)"
          letterSpacing="-0.03em"
        >
          {(clamped * 100).toFixed(0)}%
        </text>
        <text
          x={cx0}
          y={cy0 + 20}
          textAnchor="middle"
          fontSize={8}
          letterSpacing="0.18em"
          fill="var(--c-fg-faint)"
          fontFamily="var(--font-mono)"
        >
          {label}
        </text>
      </svg>
      <span className="micro mt-1 flex items-center gap-1.5 text-faint">
        <Led signal={signal} size="sm" />
        {caption}
      </span>
    </div>
  )
}
