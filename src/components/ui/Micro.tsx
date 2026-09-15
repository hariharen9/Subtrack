/**
 * SUBTRACK // MICRO TYPOGRAPHY PARTS
 * Small printed parts: labels, key caps, section headers, hard rules.
 */
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Led, type Signal } from './Signal'

export function MicroLabel({
  children,
  className,
  as: Tag = 'span',
}: {
  children: ReactNode
  className?: string
  as?: 'span' | 'div' | 'dt' | 'th'
}) {
  return <Tag className={cx('tech-label', className)}>{children}</Tag>
}

export function KeyCap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cx(
        'micro inline-flex h-5 min-w-5 items-center justify-center border border-line2 bg-surface2 px-1 text-dim',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

/**
 * Section header used across every page: a code, a title, an optional signal
 * light and right-aligned metadata. This is what keeps maximalist screens
 * readable — every region announces itself the same way.
 */
export function SectionHeader({
  code,
  title,
  signal,
  right,
  className,
  sticky = false,
}: {
  code: string
  title: string
  signal?: Signal
  right?: ReactNode
  className?: string
  sticky?: boolean
}) {
  return (
    <div
      className={cx(
        'flex items-end justify-between gap-3 border-b-2 border-linehard px-3 pt-4 pb-1.5 md:px-5',
        sticky && 'sticky top-0 z-30 bg-bg/95 backdrop-blur-[2px]',
        className,
      )}
    >
      <div className="flex min-w-0 items-end gap-2.5">
        <span className="micro flex items-center gap-1.5 border border-line2 px-1.5 py-0.5 text-dim">
          {signal && <Led signal={signal} size="sm" pulse />}
          {code}
        </span>
        <h2 className="truncate text-[13px] font-semibold tracking-[0.02em] text-fg md:text-[15px]">
          {title}
        </h2>
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  )
}

/** Hard hairline rule with an optional printed caption. */
export function HashRule({ label, className }: { label?: string; className?: string }) {
  if (!label) return <div className={cx('rule', className)} aria-hidden="true" />
  return (
    <div className={cx('flex items-center gap-3', className)} aria-hidden="true">
      <span className="rule-dotted flex-1" />
      <span className="micro text-faint">{label}</span>
      <span className="rule-dotted flex-1" />
    </div>
  )
}
