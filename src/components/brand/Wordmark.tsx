/**
 * SPENDSTATE // WORDMARK
 * The mark is a chamfered "SS" plate, drawn in CSS so it can be tinted and
 * pulsed.
 */
import { cx } from '@/lib/cx'

export function Mark({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid h-[22px] w-[22px] shrink-0 place-items-center border border-acid bg-acidsoft font-mono text-[11px] font-bold leading-none tracking-[-0.08em] text-acidink',
        animated && 'animate-pulse-led',
        className,
      )}
    >
      SS
    </span>
  )
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Mark animated />
      <span className="flex flex-col leading-none">
        <span
          className={cx(
            'font-display font-semibold tracking-[-0.03em] text-fg',
            compact ? 'text-[15px]' : 'text-[17px]',
          )}
        >
          SPENDSTATE
        </span>
        <span className="micro mt-[3px] text-faint">
          {compact ? 'FIN OS' : 'FINANCIAL OS // 1.0'}
        </span>
      </span>
    </span>
  )
}
