/**
 * SUBTRACK // SPEND BADGE & GLYPH RESOLVER
 *
 * Visual identity for day-to-day spends: resolves merchant names to official
 * brand glyphs (Zomato, Swiggy, Uber, Amazon, etc.) or renders semantic
 * hardware-precision category icons (Utensils, Car, Groceries, Shopping,
 * Health, Utilities, Travel, Education, Personal, Other) inside a chamfered
 * signal-accented container.
 */
import { useMemo, type CSSProperties } from 'react'
import type { SpendCategory } from '@/lib/types'
import { SPEND_CATEGORY_META } from '@/lib/types'
import { SIGNAL_HEX } from '@/components/ui/Signal'
import { ServiceGlyph } from '@/components/brand/ServiceGlyph'
import { cx } from '@/lib/cx'
import {
  LuUtensils,
  LuCar,
  LuShoppingBag,
  LuStore,
  LuPopcorn,
  LuPill,
  LuZap,
  LuPlane,
  LuGraduationCap,
  LuSparkles,
  LuReceipt,
  LuCoffee,
  LuFuel,
} from 'react-icons/lu'
import type { IconType } from 'react-icons'

export type SpendBadgeSize = 'xs' | 'sm' | 'md' | 'lg'

const BOX: Record<SpendBadgeSize, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
}

const ICON_SIZE: Record<SpendBadgeSize, number> = {
  xs: 12,
  sm: 15,
  md: 18,
  lg: 22,
}

const CATEGORY_FALLBACK_ICONS: Record<SpendCategory, IconType> = {
  food: LuUtensils,
  transport: LuCar,
  groceries: LuStore,
  shopping: LuShoppingBag,
  entertainment: LuPopcorn,
  health: LuPill,
  utilities: LuZap,
  travel: LuPlane,
  education: LuGraduationCap,
  personal: LuSparkles,
  other: LuReceipt,
}

/** Brands that resolve cleanly in ServiceGlyph */
const KNOWN_BRANDS = [
  'zomato',
  'swiggy',
  'uber',
  'amazon',
  'prime',
  'apple',
  'google',
  'netflix',
  'spotify',
  'starbucks',
  'mcdonalds',
  'airbnb',
  'steam',
  'playstation',
  'xbox',
  'cult',
  'curefit',
  'strava',
  'duolingo',
  'discord',
  'slack',
  'notion',
  'figma',
  'adobe',
  'canva',
]

export interface SpendBadgeProps {
  category: SpendCategory
  title?: string
  size?: SpendBadgeSize
  className?: string
  style?: CSSProperties
}

export function SpendBadge({
  category,
  title = '',
  size = 'sm',
  className,
  style,
}: SpendBadgeProps) {
  const meta = SPEND_CATEGORY_META[category] ?? SPEND_CATEGORY_META.other
  const signalColor = SIGNAL_HEX[meta.signal]

  const clean = title.trim().toLowerCase()

  // 1. Check if title matches a known brand or keyword
  const isBrand = useMemo(() => {
    return KNOWN_BRANDS.some((b) => clean.includes(b))
  }, [clean])

  // 2. Specific keyword contextual overrides
  const SpecificIcon = useMemo<IconType | null>(() => {
    if (clean.includes('coffee') || clean.includes('tea') || clean.includes('chai') || clean.includes('cafe')) {
      return LuCoffee
    }
    if (clean.includes('fuel') || clean.includes('petrol') || clean.includes('diesel') || clean.includes('gas')) {
      return LuFuel
    }
    return null
  }, [clean])

  const FallbackIcon = SpecificIcon || CATEGORY_FALLBACK_ICONS[category] || LuReceipt

  return (
    <span
      title={`${meta.label} · ${meta.code}`}
      className={cx(
        'relative grid shrink-0 place-items-center overflow-hidden border bg-surface2 transition-transform duration-150',
        BOX[size],
        className,
      )}
      style={{
        borderColor: `color-mix(in oklab, ${signalColor} 42%, var(--c-line))`,
        ...style,
      }}
    >
      {/* Background tint */}
      <span
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: `color-mix(in oklab, ${signalColor} 10%, transparent)` }}
      />

      {/* Bottom signal strip */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[2.5px]"
        style={{ background: signalColor, opacity: 0.95 }}
      />

      {/* Icon rendering */}
      {isBrand ? (
        <ServiceGlyph
          fallback={title}
          size={ICON_SIZE[size]}
          className="relative text-fg"
        />
      ) : (
        <FallbackIcon
          size={ICON_SIZE[size]}
          className="relative text-fg/90"
          strokeWidth={1.8}
          aria-hidden="true"
        />
      )}
    </span>
  )
}
