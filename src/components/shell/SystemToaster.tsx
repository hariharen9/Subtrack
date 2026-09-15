/**
 * SUBTRACK // SYSTEM LOG (TOASTS)
 *
 * Feedback is written like a console log, not a notification: PROCESS UPDATED,
 * TERMINATING PROCESS..., PROCESS TERMINATED. Errors stay until dismissed;
 * confirmations clear themselves. Positioned clear of the mobile console.
 */
import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useUI, type SystemToast, type ToastKind } from '@/store/ui'
import { cx } from '@/lib/cx'
import { Led, type Signal } from '@/components/ui/Signal'
import { IconClose } from '@/components/ui/Icons'

const KIND: Record<ToastKind, { signal: Signal; rail: string }> = {
  ok: { signal: 'acid', rail: 'bg-acid' },
  info: { signal: 'blue', rail: 'bg-blue' },
  warn: { signal: 'orange', rail: 'bg-orange' },
  alert: { signal: 'red', rail: 'bg-red' },
  busy: { signal: 'blue', rail: 'bg-blue' },
}

function ToastRow({ toast }: { toast: SystemToast }) {
  const dismiss = useUI((s) => s.dismissToast)
  const kind = KIND[toast.kind]

  useEffect(() => {
    if (toast.kind === 'busy') {
      const timer = window.setTimeout(() => dismiss(toast.id), 900)
      return () => window.clearTimeout(timer)
    }
    if (toast.sticky) return
    const timer = window.setTimeout(() => dismiss(toast.id), toast.kind === 'ok' ? 3200 : 4600)
    return () => window.clearTimeout(timer)
  }, [toast.id, toast.kind, toast.sticky, dismiss])

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -14, scaleY: 0.9 }}
      animate={{ opacity: 1, x: 0, scaleY: 1 }}
      exit={{ opacity: 0, x: -10, height: 0, marginTop: 0, transition: { duration: 0.14 } }}
      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
      className="relative flex items-stretch border border-line2 bg-surface/95 backdrop-blur-[2px]"
    >
      <span className={cx('w-[3px] shrink-0', kind.rail)} aria-hidden="true" />
      <div
        className="flex min-w-0 flex-1 items-start gap-2.5 px-3 py-2"
        role={toast.kind === 'alert' ? 'alert' : 'status'}
      >
        <span className="mt-[5px] shrink-0">
          <Led signal={kind.signal} size="sm" pulse={toast.kind === 'busy' || toast.kind === 'alert'} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="micro block text-fg">{toast.label}</span>
          {toast.text && <span className="meta mt-0.5 block truncate text-dim">{toast.text}</span>}
        </span>
        <button
          type="button"
          onClick={() => dismiss(toast.id)}
          className="-mr-1 -mt-1 shrink-0 p-1.5 text-faint transition-colors hover:text-fg"
          aria-label={`Dismiss ${toast.label}`}
        >
          <IconClose size={13} />
        </button>
      </div>
    </motion.li>
  )
}

export function SystemToaster() {
  const toasts = useUI((s) => s.toasts)
  const reduced = useReducedMotion()

  return (
    <ul
      aria-live="polite"
      aria-label="System log"
      className="fixed bottom-[86px] left-3 z-[60] flex w-[min(360px,calc(100vw-24px))] flex-col gap-2 lg:bottom-5 lg:left-[100px]"
    >
      <AnimatePresence initial={false} mode={reduced ? 'sync' : 'popLayout'}>
        {toasts.map((toast) => (
          <ToastRow key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </ul>
  )
}
