/**
 * SUBTRACK // CONTROL PARTS
 *
 * Custom controls only — no native select, no native date input. They all share
 * the same skeleton: hard border, mono label, square active plate, full keyboard
 * support and ARIA roles that match what they actually are.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { IconChevronDown, IconCheck } from './Icons'

/** Closes a popover on outside pointer-down or Escape. */
function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  return ref
}

export interface SelectOption<T extends string> {
  value: T
  label: string
  hint?: string
}

export function CyberSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  size = 'md',
}: {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
  size?: 'md' | 'lg'
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, options.findIndex((option) => option.value === value)),
  )
  const selected = options.find((option) => option.value === value)
  const ref = useDismiss(open, () => setOpen(false))
  const listId = useId()
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  const commit = (next: T) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <div ref={ref} className={cx('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => {
          setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)))
          setOpen((previous) => !previous)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={cx(
          'field flex items-center justify-between gap-2 text-left',
          size === 'lg' && 'py-3 text-[15px]',
          open && 'border-acid',
        )}
      >
        <span className="truncate">
          {selected?.label ?? '—'}
          {selected?.hint && <span className="ml-2 text-faint">{selected.hint}</span>}
        </span>
        <IconChevronDown
          size={14}
          className={cx('shrink-0 text-faint transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-[calc(100%+3px)] z-50 max-h-64 overflow-y-auto border border-line2 bg-surface shadow-[3px_3px_0_0_var(--c-shadow-hard)]"
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActiveIndex((index) => (index + 1) % options.length)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((index) => (index - 1 + options.length) % options.length)
            } else if (event.key === 'Tab') {
              setOpen(false)
            }
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  ref={(node) => {
                    optionRefs.current[index] = node
                  }}
                  type="button"
                  onClick={() => commit(option.value)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cx(
                    'flex w-full items-center justify-between gap-3 px-2.5 py-2 text-left transition-colors',
                    index === activeIndex ? 'bg-surface2' : '',
                    isSelected ? 'text-acidink' : 'text-fg',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px]">{option.label}</span>
                    {option.hint && <span className="micro block text-faint">{option.hint}</span>}
                  </span>
                  {isSelected && <IconCheck size={13} className="shrink-0" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  columns,
  className,
  size = 'md',
}: {
  value: T
  options: { value: T; label: string; hint?: string }[]
  onChange: (value: T) => void
  ariaLabel: string
  /** Let the browser wrap into equal columns; omit for a flowing row. */
  columns?: number
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cx('flex flex-wrap', columns ? 'grid gap-[3px]' : 'gap-[3px]', className)}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint}
            onClick={() => onChange(option.value)}
            className={cx(
              'flex flex-1 items-center justify-center border px-2 text-center transition-colors',
              size === 'sm' ? 'min-h-9 py-1.5' : 'min-h-11 py-2',
              active
                ? 'border-acid bg-acid text-black'
                : 'border-line2 bg-surface2 text-dim hover:border-linehard hover:text-fg',
            )}
          >
            <span className="micro">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Hardware switch: square track, square plate, no pill shapes anywhere. */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  code,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  code?: string
  description?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-3 md:px-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-medium text-fg">{label}</span>
          {code && <span className="micro text-linehard">{code}</span>}
        </div>
        {description && <p className="meta mt-1 text-faint">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-7 w-14 shrink-0 border-2 transition-colors',
          checked ? 'border-acid bg-acidsoft' : 'border-line2 bg-surface2',
        )}
      >
        <span
          className={cx(
            'absolute top-[2px] block h-[20px] w-[20px] transition-[left,background-color] duration-150 ease-snap',
            checked ? 'left-[30px] bg-acid' : 'left-[2px] bg-line2',
          )}
        />
        <span className="micro absolute right-1.5 top-1/2 -translate-y-1/2 text-[7px] text-faint">
          {checked ? '' : ''}
        </span>
      </button>
    </div>
  )
}

/** Two-step destructive control: arm, then confirm. Disarms itself on a timer. */
export function ArmedButton({
  label,
  armedLabel,
  onConfirm,
  disabled = false,
  tone = 'danger',
}: {
  label: string
  armedLabel: string
  onConfirm: () => void
  disabled?: boolean
  tone?: 'danger' | 'warn'
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setArmed(false), 5000)
    return () => window.clearTimeout(timer)
  }, [armed])

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!armed) {
          setArmed(true)
          return
        }
        setArmed(false)
        onConfirm()
      }}
      className={cx(
        'btn-core',
        armed
          ? tone === 'danger'
            ? 'btn-danger'
            : 'border-orange text-orangeink hover:bg-orange hover:text-black'
          : 'btn-ghost',
        'min-h-11',
      )}
    >
      {armed ? armedLabel : label}
    </button>
  )
}

export function FieldShell({  label,
  code,
  children,
  hint,
  error,
  className,
  htmlFor,
  trailing,
}: {
  label: string
  code?: string
  children: ReactNode
  hint?: ReactNode
  error?: string
  className?: string
  htmlFor?: string
  trailing?: ReactNode
}) {
  return (
    <div className={cx('min-w-0', className)}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="tech-label">
          {label}
          {code && <span className="ml-2 text-linehard">{code}</span>}
        </label>
        {trailing}
      </div>
      {children}
      {error ? (
        <p className="micro mt-1 text-redink" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="micro mt-1 text-faint">{hint}</p>
      )}
    </div>
  )
}
