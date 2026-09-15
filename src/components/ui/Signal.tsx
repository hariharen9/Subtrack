/**
 * SUBTRACK // SIGNAL LANGUAGE
 *
 * Five signals, each with one meaning across the whole system:
 *   acid    → healthy / running / primary action
 *   blue    → informational
 *   orange  → upcoming / suspended
 *   red     → terminated / attention
 *   magenta → special accent / emphasis
 *
 * Tailwind needs literal class names, so the maps below are the single source
 * of truth for signal colouring.
 */
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import type { ProcessStatus } from '@/lib/types'

export type Signal = 'acid' | 'blue' | 'magenta' | 'orange' | 'red'

/** Raw signal colour — for lights, bars and fills. */
export const SIGNAL_LIGHT: Record<Signal, string> = {
  acid: 'text-acid',
  blue: 'text-blue',
  magenta: 'text-magenta',
  orange: 'text-orange',
  red: 'text-red',
}

/** Text-safe signal colour — for labels and numbers on a surface. */
export const SIGNAL_TEXT: Record<Signal, string> = {
  acid: 'text-acidink',
  blue: 'text-blueink',
  magenta: 'text-magentaink',
  orange: 'text-orangeink',
  red: 'text-redink',
}

export const SIGNAL_BG: Record<Signal, string> = {
  acid: 'bg-acid',
  blue: 'bg-blue',
  magenta: 'bg-magenta',
  orange: 'bg-orange',
  red: 'bg-red',
}

export const SIGNAL_SOFT: Record<Signal, string> = {
  acid: 'bg-acidsoft',
  blue: 'bg-bluesoft',
  magenta: 'bg-magentasoft',
  orange: 'bg-orangesoft',
  red: 'bg-redsoft',
}

export const SIGNAL_BORDER: Record<Signal, string> = {
  acid: 'border-acid',
  blue: 'border-blue',
  magenta: 'border-magenta',
  orange: 'border-orange',
  red: 'border-red',
}

export const SIGNAL_HEX: Record<Signal, string> = {
  acid: 'var(--c-acid)',
  blue: 'var(--c-blue)',
  magenta: 'var(--c-magenta)',
  orange: 'var(--c-orange)',
  red: 'var(--c-red)',
}

/** A signal light. Pulses only when the thing it reports is live. */
export function Led({
  signal = 'acid',
  pulse = false,
  size = 'md',
  hollow = false,
  className,
}: {
  signal?: Signal
  pulse?: boolean
  size?: 'sm' | 'md' | 'lg'
  hollow?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'led',
        SIGNAL_LIGHT[signal],
        size === 'sm' && 'h-[5px] w-[5px]',
        size === 'lg' && 'led-lg',
        hollow && 'led-hollow',
        pulse && 'animate-pulse-led',
        className,
      )}
    />
  )
}

export interface StatusMeta {
  label: string
  signal: Signal
  code: string
  description: string
}

export const STATUS_META: Record<ProcessStatus, StatusMeta> = {
  active: {
    label: 'ACTIVE',
    signal: 'acid',
    code: 'RUN',
    description: 'Counting toward monthly burn. Charging on schedule.',
  },
  suspended: {
    label: 'SUSPENDED',
    signal: 'orange',
    code: 'SUS',
    description: 'Paused. Excluded from burn, history and upcoming flow are kept.',
  },
  terminated: {
    label: 'TERMINATED',
    signal: 'red',
    code: 'TRM',
    description: 'Stopped. No future charges. History retained until purged.',
  },
}

export function StatusChip({
  status,
  className,
  showLed = true,
}: {
  status: ProcessStatus
  className?: string
  showLed?: boolean
}) {
  const meta = STATUS_META[status]
  return (
    <span className={cx('chip', SIGNAL_TEXT[meta.signal], className)}>
      {showLed && <Led signal={meta.signal} size="sm" pulse={status === 'active'} />}
      {meta.label}
    </span>
  )
}

/** Small labelled signal tag used for categories, hints and metadata. */
export function Tag({
  children,
  signal,
  className,
}: {
  children: ReactNode
  signal?: Signal
  className?: string
}) {
  return (
    <span
      className={cx(
        'micro inline-flex items-center gap-1 border px-1.5 py-0.5',
        signal ? `${SIGNAL_TEXT[signal]} border-current/50` : 'text-dim border-line',
        className,
      )}
    >
      {children}
    </span>
  )
}
