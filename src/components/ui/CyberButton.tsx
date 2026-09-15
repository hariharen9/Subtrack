/**
 * SUBTRACK // CONTROL SURFACE
 *
 * Buttons are hardware: 2px ink border, square body, printed label, and a press
 * that physically displaces the element. Variants map to meaning, not mood.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/cx'

export type ButtonVariant = 'solid' | 'ink' | 'ghost' | 'danger' | 'bare'
export type ButtonSize = 'sm' | 'md' | 'lg'

const SIZE: Record<ButtonSize, string> = {
  sm: 'text-[10px] px-2.5 py-1.5 min-h-9 tracking-[0.16em]',
  md: 'text-[11px] px-4 py-2.5 min-h-11 tracking-[0.14em]',
  lg: 'text-[12px] px-5 py-3 min-h-13 tracking-[0.16em]',
}

const VARIANT: Record<ButtonVariant, string> = {
  solid: 'btn-solid',
  ink: 'btn-ink',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  bare: 'border-transparent bg-transparent hover:bg-surface2',
}

export interface CyberButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  /** Renders as a router link when provided. */
  to?: string
  /** Keyboard hint printed on the right edge. */
  kbd?: string
  /** Shows the system's busy verb and blocks input. */
  busy?: boolean
  busyLabel?: string
  leading?: ReactNode
  trailing?: ReactNode
  className?: string
  full?: boolean
}

export function CyberButton({
  children,
  variant = 'ghost',
  size = 'md',
  to,
  kbd,
  busy = false,
  busyLabel = 'WORKING',
  leading,
  trailing,
  className,
  full,
  disabled,
  ...rest
}: CyberButtonProps) {
  const classes = cx(
    'btn-core',
    VARIANT[variant],
    SIZE[size],
    full && 'w-full',
    className,
  )

  const content = (
    <>
      {busy ? (
        <span className="flex items-center gap-2">
          <span className="flex gap-[2px]" aria-hidden="true">
            <i className="block h-3 w-[2px] bg-current animate-blink" />
            <i className="block h-3 w-[2px] bg-current animate-blink [animation-delay:120ms]" />
            <i className="block h-3 w-[2px] bg-current animate-blink [animation-delay:240ms]" />
          </span>
          {busyLabel}
        </span>
      ) : (
        <>
          {leading}
          <span className="truncate">{children}</span>
          {trailing}
          {kbd && (
            <kbd className="ml-1 hidden border border-current/40 px-1 py-px text-[9px] tracking-[0.1em] opacity-70 md:inline-block">
              {kbd}
            </kbd>
          )}
        </>
      )}
    </>
  )

  if (to && !disabled && !busy) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" className={classes} disabled={disabled || busy} {...rest}>
      {content}
    </button>
  )
}

/** Square icon button — used in headers, rails and sheet close controls. */
export function IconButton({
  children,
  label,
  className,
  size = 'md',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: ButtonSize }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'btn-core btn-ghost btn-icon',
        size === 'sm' && 'min-h-9 w-9',
        size === 'lg' && 'min-h-13 w-13',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
