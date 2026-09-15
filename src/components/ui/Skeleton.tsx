/**
 * SUBTRACK // SKELELETONS & EMPTY STATES
 *
 * Loading never says "Loading...". It says INITIALIZING SYSTEM and shows the
 * shape of what is coming, drawn in the same grid the real content will use.
 */
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { CutPanel } from './CutPanel'
import { CyberButton } from './CyberButton'
import { Led } from './Signal'

export function Skeleton({ className }: { className?: string }) {
  return <span className={cx('skeleton block', className)} aria-hidden="true" />
}

export function SkeletonPanel({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <CutPanel className={className} innerClassName="p-4" cutSize={12}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-40" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-2.5 w-full" />
        ))}
      </div>
    </CutPanel>
  )
}

/**
 * The boot screen. Shown while IndexedDB opens and the first snapshot lands —
 * usually a few frames, but the identity should hold even then.
 */
export function BootScreen({ label = 'INITIALIZING SYSTEM' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6"
    >
      <div className="flex items-center gap-2">
        <Led signal="acid" pulse />
        <span className="micro text-dim">{label}</span>
      </div>
      <div className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, index) => (
          <i
            key={index}
            className="block h-1 w-6 bg-acid animate-blink"
            style={{ animationDelay: `${index * 90}ms` }}
          />
        ))}
      </div>
      <p className="tech-label">READING LOCAL VOLUME // INDEXEDDB</p>
    </div>
  )
}

export interface EmptyStateProps {
  code: string
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  secondary?: ReactNode
  className?: string
}

export function EmptyState({
  code,
  title,
  description,
  action,
  secondary,
  className,
}: EmptyStateProps) {
  return (
    <CutPanel
      className={cx('w-full', className)}
      cut="tl-br"
      cutSize={18}
      innerClassName="px-5 py-8 md:px-8 md:py-12"
      shadow="none"
    >
      <div className="pointer-events-none absolute inset-0 dot-field opacity-[0.25]" aria-hidden="true" />
      <div className="relative max-w-xl">
        <div className="flex items-center gap-2">
          <Led signal="acid" pulse />
          <span className="micro text-acidink">{code}</span>
        </div>
        <h3 className="numeral mt-4 text-[clamp(1.9rem,7vw,3rem)] text-fg">{title}</h3>
        <p className="mt-3 max-w-md text-[13px] leading-relaxed text-dim">{description}</p>
        {action && (
          <div className="mt-6">
            <CyberButton variant="solid" size="lg" onClick={action.onClick}>
              {action.label}
            </CyberButton>
          </div>
        )}
        {secondary && <div className="mt-5">{secondary}</div>}
      </div>
    </CutPanel>
  )
}
