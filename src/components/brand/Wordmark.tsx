/**
 * SUBTRACK // WORDMARK
 * The mark is the same load register as the app icon: three ascending bars over
 * a deposit rail. Drawn in CSS boxes so it can be tinted and animated.
 */
import { cx } from '@/lib/cx'

export function Mark({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <span className={cx('flex items-end gap-[2px]', className)} aria-hidden="true">
      <span
        className="block w-[3px] bg-acid"
        style={{ height: 7, animationDelay: '0ms' }}
      />
      <span className="block w-[3px] bg-acid" style={{ height: 11 }} />
      <span
        className={cx('block w-[3px] bg-acid', animated && 'animate-pulse-led')}
        style={{ height: 16 }}
      />
      <span className="ml-[3px] block h-[2px] w-4 bg-fg" />
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
          SUBTRACK
        </span>
        <span className="micro mt-[3px] text-faint">
          {compact ? 'FIN OS' : 'FINANCIAL OS // 1.0'}
        </span>
      </span>
    </span>
  )
}
