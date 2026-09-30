/**
 * SPENDSTATE // CARD VISUAL
 *
 * A hardware-inspired credit card face — issuer, network mark, masked number,
 * utilisation fill. Pure CSS/SVG, no images. Reads like the real thing in the
 * brutalist visual language.
 */
import type { CreditCard } from '@/lib/types'
import { CARD_NETWORK_LABEL } from '@/lib/types'
import { formatMoney } from '@/lib/money'
import { cx } from '@/lib/cx'

export function CardVisual({
  card,
  balance,
  utilisation,
  size = 'md',
  className,
}: {
  card: CreditCard
  balance?: number
  utilisation?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dims = {
    sm: 'h-[92px] p-3',
    md: 'h-[128px] p-4',
    lg: 'h-[168px] p-5',
  }[size]

  const networkMark = card.network === 'amex' ? 'AMEX' : CARD_NETWORK_LABEL[card.network].toUpperCase()

  return (
    <div
      className={cx(
        'relative w-full overflow-hidden border border-linehard transition-opacity',
        card.status !== 'active' && 'opacity-60 saturate-50',
        dims,
        className,
      )}
      style={{ background: `linear-gradient(135deg, ${card.color}22 0%, var(--c-surface) 55%, var(--c-bg-2) 100%)` }}
    >
      {card.status !== 'active' && (
        <span aria-hidden="true" className="micro absolute right-2 top-2 z-10 border border-linehard bg-bg px-1.5 py-0.5 font-bold text-fg">
          {card.status.toUpperCase()}
        </span>
      )}
      {/* Utilisation fill — subtle right-to-left */}
      {utilisation !== undefined && utilisation > 0 && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-0 transition-all"
          style={{
            width: `${Math.min(100, utilisation * 100)}%`,
            background: utilisation >= 0.8 ? 'var(--c-red)' : utilisation >= 0.5 ? 'var(--c-orange)' : 'var(--c-blue)',
            opacity: 0.08,
          }}
        />
      )}

      {/* Top row: issuer + network */}
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <span className="micro block truncate text-faint">{card.issuer.toUpperCase()}</span>
          <span className="block truncate text-[13px] font-semibold text-fg md:text-[14px]">{card.name}</span>
        </div>
        <span className="micro shrink-0 font-mono font-bold tracking-widest text-fg/80">
          {networkMark}
        </span>
      </div>

      {/* Middle: chip + number */}
      <div className="relative mt-2 flex items-center gap-2 md:mt-3">
        <span aria-hidden="true" className="grid h-4 w-6 shrink-0 place-items-center rounded-[3px] border border-line2 bg-gradient-to-br from-[#E8C878] via-[#C8A44E] to-[#8A6D2E] md:h-5 md:w-7">
          <span className="block h-[1px] w-4 bg-black/30" />
        </span>
        <span className="font-mono text-[11px] tracking-[0.22em] text-dim md:text-[13px]">
          •••• ··•• ··•• {card.last4}
        </span>
      </div>

      {/* Bottom: balance + utilisation */}
      <div className="absolute inset-x-4 bottom-3 md:inset-x-5 md:bottom-4">
        {balance !== undefined ? (
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <span className="micro block text-faint">OUTSTANDING</span>
              <span className="numeral block truncate text-[15px] font-bold text-fg md:text-[17px]">
                {formatMoney(balance, card.currency)}
              </span>
            </div>
            {utilisation !== undefined && (
              <span
                className={cx(
                  'micro shrink-0 border px-1.5 py-0.5 font-semibold',
                  utilisation >= 0.8 ? 'border-red text-redink' : utilisation >= 0.5 ? 'border-orange text-orangeink' : 'border-line2 text-dim',
                )}
              >
                {(utilisation * 100).toFixed(0)}%
              </span>
            )}
          </div>
        ) : (
          <span className="micro text-faint">{card.notes}</span>
        )}
      </div>

      {/* Hologram shimmer */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full"
        style={{ background: `radial-gradient(circle, ${card.color}18 0%, transparent 70%)` }}
      />
    </div>
  )
}