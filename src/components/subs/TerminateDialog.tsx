/**
 * SUBTRACK // TERMINATION CONSOLE
 *
 * The confirmation is designed, not a browser dialog, and it explains the
 * consequence in plain language before anything happens: what stops, what is
 * kept, and how to come back. Two deliberate steps, with the second one labelled
 * differently from the first so it can never be hit twice by reflex.
 */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Subscription } from '@/lib/types'
import { formatMoney } from '@/lib/money'
import { cycleNoun, monthlyCost } from '@/lib/cycle'
import { formatSignalDate } from '@/lib/date'
import { useFocusTrap, useScrollLock } from '@/hooks/usePlatform'
import { CutPanel } from '@/components/ui/CutPanel'
import { CyberButton, IconButton } from '@/components/ui/CyberButton'
import { ServiceBadge } from '@/components/brand/ServiceBadge'
import { Led } from '@/components/ui/Signal'
import { IconClose } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

export type TerminationMode = 'terminate' | 'purge'

export function TerminateDialog({
  open,
  sub,
  mode,
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean
  sub: Subscription | undefined
  mode: TerminationMode
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const [armed, setArmed] = useState(false)
  const trapRef = useFocusTrap<HTMLDivElement>(open)
  useScrollLock(open)

  useEffect(() => {
    if (open) setArmed(false)
  }, [open])

  const isPurge = mode === 'purge'

  return (
    <AnimatePresence>
      {open && sub && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 md:p-6">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onCancel}
            aria-hidden="true"
          />
          <motion.div
            ref={trapRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="terminate-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            className="relative w-full max-w-[520px]"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                onCancel()
              }
            }}
          >
            <CutPanel cut="tl-br" cutSize={18} shadow="hard" innerClassName="p-0">
              {/* hazard header */}
              <div
                className={cx(
                  'hazard flex items-center justify-between gap-3 border-b-2 px-3 py-2',
                  isPurge ? 'border-red text-redink' : 'border-orange text-orangeink',
                )}
              >
                <span className="micro flex items-center gap-2 bg-bg/70 px-1.5 py-0.5">
                  <Led signal={isPurge ? 'red' : 'orange'} size="sm" pulse />
                  {isPurge ? 'PURGE // IRREVERSIBLE' : 'TERMINATE // REVERSIBLE'}
                </span>
                <IconButton label="Cancel" size="sm" onClick={onCancel} className="bg-bg/70">
                  <IconClose size={14} />
                </IconButton>
              </div>

              <div className="p-4 md:p-5">
                <div className="flex items-center gap-3">
                  <ServiceBadge icon={sub.icon} color={sub.color} size="lg" />
                  <div className="min-w-0">
                    <h2 id="terminate-title" className="truncate text-[15px] font-semibold text-fg">
                      {isPurge ? `Purge ${sub.name}?` : `Terminate ${sub.name}?`}
                    </h2>
                    <p className="micro mt-1 text-faint">
                      {formatMoney(sub.price, sub.currency)} {cycleNoun(sub.billingCycle, sub.customIntervalDays).toLowerCase()} · next {formatSignalDate(sub.nextBillingDate)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border border-line bg-bg2 p-3">
                  <span className="tech-label">WHAT HAPPENS</span>
                  <ul className="mt-2 space-y-2">
                    {(isPurge
                      ? [
                          'The process record is deleted permanently from this device.',
                          'Its entire payment history is erased from the ledger.',
                          'Monthly burn and every chart update immediately.',
                          'This cannot be undone, and there is no cloud copy.',
                        ]
                      : [
                          'All future charges are cancelled. The process shows as TERMINATED.',
                          `${formatMoney(
                            monthlyCost(sub.price, sub.billingCycle, sub.customIntervalDays),
                            sub.currency,
                          )}/month leaves your burn immediately.`,
                          'Payment history is kept, and the process stays in the archive.',
                          'You can resume it at any time — the cycle anchor is preserved.',
                        ]
                    ).map((line) => (
                      <li key={line} className="flex gap-2 text-[12.5px] leading-relaxed text-dim">
                        <span
                          className={cx('mt-[7px] block h-[6px] w-[6px] shrink-0', isPurge ? 'bg-red' : 'bg-orange')}
                          aria-hidden="true"
                        />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  <CyberButton variant="ghost" onClick={onCancel} disabled={busy}>
                    KEEP RUNNING
                  </CyberButton>
                  {armed ? (
                    <CyberButton
                      variant="danger"
                      busy={busy}
                      busyLabel="FLUSHING"
                      onClick={onConfirm}
                    >
                      {isPurge ? 'CONFIRM PERMANENT PURGE' : 'CONFIRM TERMINATION'}
                    </CyberButton>
                  ) : (
                    <CyberButton variant="danger" onClick={() => setArmed(true)} disabled={busy}>
                      {isPurge ? 'PURGE RECORD' : 'TERMINATE SUBSCRIPTION'}
                    </CyberButton>
                  )}
                </div>

                <p className="micro mt-3 text-faint">
                  {armed
                    ? 'STEP 2 OF 2 — THIS IS THE ACTION YOU JUST CONFIRMED.'
                    : 'STEP 1 OF 2 — NOTHING HAS CHANGED YET.'}
                </p>
              </div>
            </CutPanel>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
