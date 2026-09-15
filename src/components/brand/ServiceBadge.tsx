/**
 * SUBTRACK // SERVICE BADGE
 *
 * The container that gives every process a visual identity without turning the
 * grid into a rainbow: a hairline box, a monochrome mark, a brand signal strip
 * on the base edge and a brand wash that only appears on hover or at hero size.
 */
import type { CSSProperties } from 'react'
import { cx } from '@/lib/cx'
import { ServiceGlyph } from './ServiceGlyph'

export type BadgeSize = 'sm' | 'md' | 'lg' | 'xl'

const BOX: Record<BadgeSize, string> = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
  xl: 'h-[68px] w-[68px] md:h-20 md:w-20',
}

const GLYPH: Record<BadgeSize, number> = { sm: 15, md: 19, lg: 23, xl: 42 }

export interface ServiceBadgeProps {
  icon: string
  color: string
  size?: BadgeSize
  /** 'ink' keeps the mark monochrome (default). 'brand' paints it in the accent. */
  tone?: 'ink' | 'brand'
  className?: string
  /** Fills the box with the brand wash — used for suspended/terminated states. */
  dimmed?: boolean
  style?: CSSProperties
  title?: string
}

export function ServiceBadge({
  icon,
  color,
  size = 'md',
  tone = 'ink',
  className,
  dimmed = false,
  style,
  title,
}: ServiceBadgeProps) {
  return (
    <span
      title={title}
      className={cx(
        'relative grid shrink-0 place-items-center overflow-hidden border bg-surface2',
        BOX[size],
        dimmed ? 'opacity-55' : '',
        className,
      )}
      style={{
        borderColor: `color-mix(in oklab, ${color} 42%, var(--c-line))`,
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: `color-mix(in oklab, ${color} 10%, transparent)` }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[3px]"
        style={{ background: color, opacity: dimmed ? 0.4 : 0.95 }}
      />
      <ServiceGlyph
        size={GLYPH[size]}
        fallback={icon}
        className={cx('relative', tone === 'brand' ? '' : 'text-fg')}
        strokeWidth={size === 'xl' ? 1.2 : 1.5}
        style={tone === 'brand' ? { color } : undefined}
      />
    </span>
  )
}
