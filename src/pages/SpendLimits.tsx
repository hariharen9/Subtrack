/**
 * SUBTRACK // SPENDS LIMITS (LMT)
 *
 * The weekly discretionary limiter — the one control that lets variable spend
 * stay inside an envelope. Set an amount in the base currency and the Spends
 * cockpit (and the weekly gauge) arms itself against it.
 */
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useWeeklyLimit } from '@/hooks/useSpends'
import { setWeeklyLimit } from '@/lib/db'
import { useUI, TOAST_VERBS } from '@/store/ui'
import { formatMoney, symbolOf } from '@/lib/money'
import { cx } from '@/lib/cx'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { FieldShell } from '@/components/ui/Controls'
import { CyberButton } from '@/components/ui/CyberButton'
import { Led } from '@/components/ui/Signal'
import { SPEND_CATEGORIES } from '@/lib/types'

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.03 } },
}
const RISE = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } },
}

const QUICK = [2000, 3000, 5000, 8000, 10000]

export default function SpendLimits() {
  const limit = useWeeklyLimit()
  const base = useUI((s) => s.baseCurrency)
  const pushToast = useUI((s) => s.pushToast)

  const [amount, setAmount] = useState<string>('')
  const [busy, setBusy] = useState(false)

  // Seed the input when the persisted value arrives.
  const initialised = amount !== '' || limit === null || limit.amount === 0
  useEffect(() => {
    if (limit?.amount && amount === '') setAmount(String(limit.amount))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit])

  const parsed = Number.parseFloat(amount.replace(/,/g, '')) || 0
  const invalid = parsed <= 0

  const save = async () => {
    if (invalid) {
      pushToast(TOAST_VERBS.error('LIMIT INVALID', 'Enter an amount above zero.'))
      return
    }
    setBusy(true)
    try {
      await setWeeklyLimit({ amount: parsed, currency: base })
      pushToast(TOAST_VERBS.info('BUDGET ARMED', `${formatMoney(parsed, base)} per week (Mon–Sun) for wants & lifestyle.`))
    } catch (error) {
      pushToast(
        TOAST_VERBS.error(
          'WRITE FAILED',
          error instanceof Error ? error.message : 'Local store rejected the record',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await setWeeklyLimit({ amount: 0, currency: base })
      setAmount('')
      pushToast(TOAST_VERBS.info('BUDGET DISARMED', 'Weekly budget cap switched off.'))
    } catch (error) {
      pushToast(
        TOAST_VERBS.error(
          'WRITE FAILED',
          error instanceof Error ? error.message : 'Local store rejected the record',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      variants={STAGGER}
      initial="hidden"
      animate="show"
      className="px-3 py-4 md:px-5 md:py-5"
    >
      <motion.div variants={RISE}>
        <CutPanel cut="tl-br" cutSize={18} innerClassName="relative overflow-hidden p-4 md:p-6" shadow="hard">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 dot-field opacity-[0.18]" />
          <div className="relative">
            <span className="micro flex items-center gap-2 text-acidink">
              <Led signal="acid" size="sm" pulse />
              LMT // WEEKLY BUDGET CAP
            </span>
            <h1 className="mt-1 text-[clamp(1.4rem,4vw,2.1rem)] font-semibold tracking-[-0.02em] text-fg">
              Keep lifestyle spending inside its envelope.
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-dim">
              The budget watches lifestyle & wants categories — the ones flagged{' '}
              {SPEND_CATEGORIES.filter((c) => c.discretionary).map((c) => c.code).join(', ')} — over
              each Mon–Sun week. Spend more than the cap and the cockpit raises a red signal. Essential
              necessities (groceries, utilities, transport, health) never count against it.
            </p>
          </div>
        </CutPanel>
      </motion.div>

      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="br" cutSize={14} innerClassName="p-4">
          <SectionHeader
            code="CAP"
            title="Weekly budget cap"
            signal={limit?.amount ? 'acid' : 'blue'}
            className="border-b-0 px-0 pt-0"
            right={
              <span className="micro text-faint">
                {limit?.amount ? 'ARMED' : 'DISARMED'}
              </span>
            }
          />

          <div className="mt-3 grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <div>
              <FieldShell
                label="WEEKLY BUDGET FOR WANTS"
                code="IN BASE CURRENCY"
                hint="Applies Mon–Sun. Only lifestyle & wants categories count against it."
              >
                <div className="flex items-center border border-line2 bg-bg2 transition-colors focus-within:border-acid">
                  <span className="pl-3 font-mono text-[18px] text-faint">{symbolOf(base)}</span>
                  <input
                    className="w-full bg-transparent px-2 py-2.5 font-mono text-[22px] font-semibold tnum outline-none placeholder:text-faint"
                    value={amount}
                    inputMode="decimal"
                    placeholder="0"
                    aria-label="Weekly budget for wants"
                    onChange={(event) =>
                      setAmount(event.target.value.replace(/[^\d.]/g, '').slice(0, 9))
                    }
                  />
                  <span className="micro pr-3 text-faint">{base}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {QUICK.map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setAmount(String(quick))}
                      className={cx(
                        'micro border px-1.5 py-1 transition-colors',
                        Number(amount) === quick
                          ? 'border-acid text-acidink'
                          : 'border-line2 text-faint hover:border-linehard hover:text-dim',
                      )}
                    >
                      {symbolOf(base)}
                      {quick}
                    </button>
                  ))}
                </div>
              </FieldShell>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <CyberButton
                  variant="solid"
                  busy={busy}
                  busyLabel="SAVING"
                  disabled={invalid && amount !== ''}
                  onClick={() => void save()}
                >
                  {limit?.amount ? 'UPDATE BUDGET' : 'SET BUDGET'}
                </CyberButton>
                {limit?.amount ? (
                  <CyberButton variant="ghost" onClick={() => void clear()} disabled={busy}>
                    REMOVE CAP
                  </CyberButton>
                ) : null}
              </div>
            </div>

            <div className="border border-line bg-bg2 p-3">
              <span className="micro text-faint">CURRENT ENVELOPE</span>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="meta text-dim">Weekly Cap</span>
                  <span className="numeral text-[15px] text-fg">
                    {limit?.amount ? formatMoney(limit.amount, base) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="meta text-dim">Currency</span>
                  <span className="micro text-fg">{limit?.currency ?? base}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="meta text-dim">Status</span>
                  <span className={cx('micro flex items-center gap-1', limit?.amount ? 'text-acidink' : 'text-faint')}>
                    <Led signal={limit?.amount ? 'acid' : 'blue'} size="sm" />
                    {limit?.amount ? 'ACTIVE' : 'UNSET'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CutPanel>
      </motion.div>

      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tl" cutSize={14} innerClassName="p-3">
          <SectionHeader
            code="SECT"
            title="Classification (Wants vs Needs)"
            signal="magenta"
            className="border-b-0 px-0 pt-0"
            right={<span className="micro text-faint">{SPEND_CATEGORIES.length} SECTORS</span>}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SPEND_CATEGORIES.map((category) => (
              <span
                key={category.id}
                className={cx(
                  'micro inline-flex items-center gap-1.5 border px-2 py-1',
                  category.discretionary
                    ? 'border-orange/60 text-orangeink'
                    : 'border-line2 text-dim',
                )}
              >
                {category.code}
                {category.discretionary ? ' · WANT (COUNTED)' : ' · NEED (EXEMPT)'}
              </span>
            ))}
          </div>
        </CutPanel>
      </motion.div>

      {!initialised && (
        <p className="meta mt-2 px-1 text-faint">LOADING PERSISTED LIMIT...</p>
      )}
    </motion.div>
  )
}
