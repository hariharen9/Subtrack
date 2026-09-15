/**
 * SUBTRACK // DATA STRIP
 *
 * The horizontal information rail. Instead of scattering statistics into cards,
 * the system prints them as a strip of labelled readouts separated by hard
 * rules — dense, scannable, and it scrolls sideways on a phone instead of
 * wrapping into mush.
 */
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { SIGNAL_TEXT, type Signal } from './Signal'

export interface StripItem {
  label: string
  value: ReactNode
  signal?: Signal
  hint?: string
}

export function DataStrip({
  items,
  className,
  size = 'md',
  divided = true,
  scroll = true,
}: {
  items: StripItem[]
  className?: string
  size?: 'sm' | 'md'
  divided?: boolean
  scroll?: boolean
}) {
  return (
    <div
      className={cx(
        'flex w-full items-stretch',
        scroll ? 'no-scrollbar overflow-x-auto' : 'flex-wrap',
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className={cx(
            'flex min-w-0 flex-col justify-center gap-0.5',
            size === 'sm' ? 'px-2.5 py-1.5' : 'px-3 py-2',
            divided && index > 0 && 'border-l border-line',
            scroll ? 'shrink-0' : '',
          )}
        >
          <span className="tech-label whitespace-nowrap">{item.label}</span>
          <span
            className={cx(
              'tnum whitespace-nowrap font-medium',
              size === 'sm' ? 'text-[11px]' : 'text-[13px]',
              item.signal ? SIGNAL_TEXT[item.signal] : 'text-fg',
            )}
            title={item.hint}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * The page-top rail: a full-width strip that reads like instrumentation above
 * the content well. Always present, always secondary.
 */
export function SystemRail({
  left,
  right,
  className,
}: {
  left: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        'flex items-center justify-between gap-3 border-b border-line bg-bg2/60 px-3 py-1.5 backdrop-blur-[1px] md:px-5',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">{left}</div>
      {right && <div className="flex shrink-0 items-center gap-3">{right}</div>}
    </div>
  )
}
