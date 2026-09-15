/**
 * SUBTRACK // PROCESS DIAGNOSTIC
 *
 * Opening a process should feel like entering a diagnostic panel, not loading a
 * record page: identity, economics, schedule, ledger, per-process signal and the
 * control actions, all on one board. The mark is shared with the grid card, so
 * the transition reads as the module expanding rather than a page change.
 */
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  useSubscription,
  useSubscriptionPayments,
  useSystem,
} from '@/hooks/useSystem'
import { useUI, TOAST_VERBS } from '@/store/ui'
import { executeCycle, setProcessStatus, markUsed } from '@/lib/db'
import { viewOf, paymentSeriesFor } from '@/lib/analytics'
import { cycleNoun, cycleSuffix, occurrenceAt } from '@/lib/cycle'
import { formatMoney, splitMoney } from '@/lib/money'
import { diffDays, formatSignalDate, todayISO } from '@/lib/date'
import { CATEGORY_CODE, CATEGORY_LABEL, CATEGORY_SIGNAL } from '@/lib/types'
import { pidOf, traceOf, txnRef } from '@/lib/id'
import { CutPanel } from '@/components/ui/CutPanel'
import { CyberButton } from '@/components/ui/CyberButton'
import { DataStrip } from '@/components/ui/DataStrip'
import { SectionHeader, HashRule } from '@/components/ui/Micro'
import { EmptyState } from '@/components/ui/Skeleton'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Led, SIGNAL_TEXT, StatusChip, STATUS_META } from '@/components/ui/Signal'
import { ServiceBadge } from '@/components/brand/ServiceBadge'
import { SpendingSignal } from '@/components/charts/SpendingSignal'
import { IconArrowRight, IconCheck, IconChevronLeft, IconEdit, IconPause, IconPlay, IconTerminate } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

/** '8 MONTHS AGO' / '12 DAYS AGO' — plain language for record ages. */
function agoLabel(iso: string, today: string): string {
  const days = diffDays(today, iso)
  if (days <= 0) return 'TODAY'
  if (days < 60) return `${days} DAY${days === 1 ? '' : 'S'} AGO`
  const months = Math.round(days / 30.4375)
  if (months < 24) return `${months} MONTH${months === 1 ? '' : 'S'} AGO`
  return `${(months / 12).toFixed(1)} YEARS AGO`
}

export default function ProcessDetail() {
  const { id } = useParams<{ id: string }>()
  const { summary } = useSystem()
  const sub = useSubscription(id)
  const payments = useSubscriptionPayments(id)
  const base = useUI((s) => s.baseCurrency)
  const openComposer = useUI((s) => s.openComposer)
  const pushToast = useUI((s) => s.pushToast)
  const openTermination = useUI((s) => s.openTermination)
  const [busy, setBusy] = useState(false)
  const today = todayISO()

  const view = useMemo(
    () => (sub ? viewOf(sub, base, today, summary.monthlyBurn) : undefined),
    [sub, base, today, summary.monthlyBurn],
  )

  const series = useMemo(
    () => (payments.length ? paymentSeriesFor(payments, base, 7, today) : []),
    [payments, base, today],
  )

  if (!sub || !view) {
    return (
      <div className="px-3 py-6 md:px-5">
        <EmptyState
          code="PROCESS NOT FOUND"
          title="NO RECORD ON THIS VOLUME."
          description="This process does not exist in the local store. It may have been purged, or the identifier is from another device."
          action={{ label: 'BACK TO FLOW', onClick: () => history.back() }}
        />
      </div>
    )
  }

  const hero = splitMoney(view.monthly, base)
  const statusMeta = STATUS_META[sub.status]
  const signal = CATEGORY_SIGNAL[sub.category]
  const ledger = payments.slice().sort((a, b) => (a.date < b.date ? 1 : -1))
  const lifetime = ledger.reduce((sum, payment) => sum + payment.amount, 0)

  const runCycle = async () => {
    setBusy(true)
    const payment = await executeCycle(sub.id)
    await markUsed(sub.id)
    setBusy(false)
    if (payment) {
      pushToast(
        TOAST_VERBS.cycle(
          sub.name,
          `${formatMoney(payment.amount, sub.currency)} on ${formatSignalDate(payment.date)}`,
        ),
      )
    }
  }

  const toggleSuspend = async () => {
    setBusy(true)
    if (sub.status === 'suspended') {
      await setProcessStatus(sub.id, 'active')
      pushToast(TOAST_VERBS.resumed(sub.name))
    } else {
      await setProcessStatus(sub.id, 'suspended')
      pushToast(TOAST_VERBS.suspended(sub.name))
    }
    setBusy(false)
  }

  return (
    <div className="px-3 py-4 md:px-5 md:py-5">
      {/* breadcrumb rail */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
        <Link
          to="/flow"
          className="micro flex items-center gap-1.5 text-dim transition-colors hover:text-acidink"
        >
          <IconChevronLeft size={12} />
          FLOW // ALL PROCESSES
        </Link>
        <span className="micro text-faint">
          PROCESS ID // <span className="text-dim">{pidOf(sub.id)}</span>
          <span className="text-linehard"> · </span>
          TRACE {traceOf(sub.id)}
          <span className="text-linehard"> · </span>
          {sub.currency}
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12"
      >
        {/* identity + economics */}
        <div className="lg:col-span-8">
          <CutPanel cut="tl-br" cutSize={18} innerClassName="relative overflow-hidden p-4 md:p-6">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 dot-field opacity-[0.2]" />
            <div className="relative">
              <div className="flex flex-wrap items-start gap-4">
                <motion.span layoutId={`glyph-${sub.id}`} className="grid">
                  <ServiceBadge icon={sub.icon} color={sub.color} size="xl" tone="brand" />
                </motion.span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="micro text-acidink">PROCESS //</span>
                    <h1 className="text-[clamp(1.5rem,4vw,2.1rem)] font-semibold tracking-[-0.03em] text-fg">
                      {sub.name}
                    </h1>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <StatusChip status={sub.status} />
                    <span className={cx('chip', SIGNAL_TEXT[signal])}>
                      {CATEGORY_CODE[sub.category]} · {CATEGORY_LABEL[sub.category].toUpperCase()}
                    </span>
                    <span className="chip border-line text-dim">
                      {cycleNoun(sub.billingCycle, sub.customIntervalDays)}
                    </span>
                  </div>
                  <p className="meta mt-2.5 max-w-lg text-dim">{statusMeta.description}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="micro text-faint">CHARGE AMOUNT</span>
                  <div className="flex items-start gap-1">
                    <span className="numeral mt-1 text-[1.3rem] text-dim">{hero.symbol}</span>
                    <span className="numeral text-[clamp(2.4rem,8vw,3.6rem)] text-fg">
                      <AnimatedNumber
                        value={sub.price}
                        format={(value) => splitMoney(value, sub.currency).value}
                      />
                    </span>
                    <span className="micro mb-2 self-end text-faint">
                      {cycleSuffix(sub.billingCycle, sub.customIntervalDays)}
                    </span>
                  </div>
                  <span className="meta text-dim">
                    NORMALISED {formatMoney(view.monthly, base)}/MO ·{' '}
                    {formatMoney(view.annual, base)}/YR
                  </span>
                </div>

                <div className="border border-line2 bg-bg2 px-3 py-2.5">
                  <span className="micro flex items-center justify-between gap-4 text-faint">
                    NEXT CYCLE
                    <Led
                      signal={view.next.overdue ? 'red' : view.next.days <= 3 ? 'orange' : 'acid'}
                      size="sm"
                      pulse={view.next.days <= 3}
                    />
                  </span>
                  <span className="numeral mt-1.5 block text-[22px] text-fg">
                    {formatSignalDate(sub.nextBillingDate)}
                  </span>
                  <span
                    className={cx('micro', view.next.overdue ? 'text-redink' : 'text-dim')}
                  >
                    {view.next.label}
                    {sub.status === 'active' && !view.next.overdue && (
                      <span className="text-linehard"> · </span>
                    )}
                    {sub.status === 'active' && !view.next.overdue ? 'SCHEDULED' : ''}
                  </span>
                </div>
              </div>

              {/* actions */}
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <CyberButton
                  variant="ghost"
                  leading={<IconEdit size={14} />}
                  onClick={() => openComposer({ editId: sub.id })}
                >
                  EDIT
                </CyberButton>
                {sub.status === 'active' && (
                  <CyberButton
                    variant="solid"
                    busy={busy}
                    busyLabel="EXECUTING"
                    leading={<IconCheck size={14} />}
                    onClick={() => void runCycle()}
                  >
                    CONFIRM CYCLE
                  </CyberButton>
                )}
                {sub.status !== 'terminated' && (
                  <CyberButton
                    variant="ghost"
                    disabled={busy}
                    leading={sub.status === 'suspended' ? <IconPlay size={14} /> : <IconPause size={14} />}
                    onClick={() => void toggleSuspend()}
                  >
                    {sub.status === 'suspended' ? 'RESUME' : 'SUSPEND'}
                  </CyberButton>
                )}
                {sub.status === 'terminated' ? (
                  <CyberButton
                    variant="danger"
                    leading={<IconTerminate size={14} />}
                    onClick={() => openTermination(sub.id, 'purge')}
                  >
                    PURGE RECORD
                  </CyberButton>
                ) : (
                  <CyberButton
                    variant="danger"
                    leading={<IconTerminate size={14} />}
                    onClick={() => openTermination(sub.id, 'terminate')}
                  >
                    TERMINATE SUBSCRIPTION
                  </CyberButton>
                )}
                {sub.status === 'terminated' && (
                  <CyberButton variant="ghost" onClick={() => void setProcessStatus(sub.id, 'active')}>
                    RESTORE TO ACTIVE
                  </CyberButton>
                )}
              </div>
            </div>
          </CutPanel>
        </div>

        {/* metadata */}
        <div className="lg:col-span-4">
          <CutPanel cut="br" cutSize={14} innerClassName="p-0" className="h-full">
            <SectionHeader code="META" title="Process metadata" signal={signal} />
            <dl className="divide-y divide-line">
              {[
                { label: 'Cycles executed', value: String(sub.cyclesExecuted).padStart(3, '0') },
                { label: 'Initialized', value: formatSignalDate(sub.createdAt) },
                { label: 'Age', value: agoLabel(sub.createdAt, today) },
                {
                  label: 'Last marked used',
                  value: sub.lastUsedAt ? agoLabel(sub.lastUsedAt, today) : 'NEVER',
                },
                {
                  label: 'Anchor day',
                  value: `DAY ${String(Number(sub.nextBillingDate.slice(8, 10))).padStart(2, '0')} OF MONTH`,
                },
                {
                  label: 'Interval',
                  value:
                    sub.billingCycle === 'custom'
                      ? `EVERY ${sub.customIntervalDays ?? 30} DAYS`
                      : cycleNoun(sub.billingCycle),
                },
                {
                  label: 'Status changed',
                  value: sub.statusChangedAt ? formatSignalDate(sub.statusChangedAt) : '—',
                },
                { label: 'Last write', value: sub.updatedAt.replace('T', ' // ') },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2 md:px-4">
                  <dt className="tech-label">{row.label}</dt>
                  <dd className="meta text-right text-fg">{row.value}</dd>
                </div>
              ))}
            </dl>
            <HashRule label="NOTES" className="px-4 py-2" />
            <div className="px-3 pb-4 md:px-4">
              <p className="text-[12.5px] leading-relaxed text-dim">
                {sub.notes || 'No annotation recorded for this process.'}
              </p>
              <button
                type="button"
                className="micro mt-3 text-faint transition-colors hover:text-acidink"
                onClick={() => openComposer({ editId: sub.id })}
              >
                EDIT ANNOTATION ▸
              </button>
            </div>
          </CutPanel>
        </div>

        {/* lifetime readouts */}
        <div className="lg:col-span-12">
          <CutPanel cut="none" cutSize={0} innerClassName="p-0">
            <DataStrip
              items={[
                { label: 'Share of burn', value: `${(view.share * 100).toFixed(2)}%`, signal: 'acid' },
                { label: 'Lifetime charged', value: formatMoney(lifetime, sub.currency) },
                { label: 'Recorded charges', value: String(ledger.length) },
                {
                  label: 'Average gap',
                  value:
                    ledger.length > 1
                      ? `${Math.round(
                          (Number(ledger[0].date.slice(8, 10)) +
                            ledger.length * 30 -
                            Number(ledger[ledger.length - 1].date.slice(8, 10))) /
                            Math.max(ledger.length - 1, 1),
                        )} DAYS`
                      : '—',
                },
                {
                  label: 'Next occurrence +1',
                  value: formatSignalDate(occurrenceAt(sub, 1)),
                },
                {
                  label: 'Projected 12-month',
                  value: formatMoney(view.annual, base),
                  signal: 'blue',
                },
                {
                  label: 'Days since anchor',
                  value: `${Math.abs(view.next.days)}D ${view.next.days >= 0 ? 'AHEAD' : 'LATE'}`,
                  signal: view.next.overdue ? 'red' : undefined,
                },
              ]}
            />
          </CutPanel>
        </div>

        {/* payment history */}
        <div className="lg:col-span-7">
          <CutPanel cut="tl-br" cutSize={14} innerClassName="p-0">
            <SectionHeader
              code="LEDG"
              title="Payment history"
              signal="blue"
              right={<span className="micro text-faint">{ledger.length} RECORDS</span>}
            />
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-b border-line">
                    <th className="tech-label px-3 py-2 font-normal md:px-4">Date</th>
                    <th className="tech-label px-2 py-2 font-normal">Reference</th>
                    <th className="tech-label px-2 py-2 font-normal">Origin</th>
                    <th className="tech-label px-3 py-2 text-right font-normal md:px-4">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((payment) => (
                    <tr key={payment.id} className="border-b border-line last:border-b-0 hover:bg-surface2">
                      <td className="px-3 py-2 md:px-4">
                        <span className="meta block text-fg">{formatSignalDate(payment.date)}</span>
                        <span className="micro block text-faint">
                          {payment.date.slice(0, 7)}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <span className="pid">{txnRef(payment.date, payment.id)}</span>
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={cx(
                            'micro',
                            payment.origin === 'confirmed' ? 'text-acidink' : 'text-faint',
                          )}
                        >
                          {payment.origin === 'confirmed' ? 'CONFIRMED' : 'SCHEDULED'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right md:px-4">
                        <span className="meta text-fg">
                          {formatMoney(payment.amount, payment.currency)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center md:px-4">
                        <span className="micro text-faint">
                          NO CHARGES RECORDED YET — HISTORY STARTS AT THE FIRST CYCLE
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CutPanel>
        </div>

        {/* per-process signal */}
        <div className="lg:col-span-5">
          <CutPanel cut="br" cutSize={14} innerClassName="p-0" className="h-full">
            <SectionHeader
              code="SIG"
              title="Spending signal"
              signal={signal}
              right={
                <span className="micro text-faint">
                  {formatMoney(lifetime, sub.currency)} LIFETIME
                </span>
              }
            />
            <div className="p-3 md:p-4">
              {series.length > 1 ? (
                <SpendingSignal points={series} mode="cash" base={base} height={190} />
              ) : (
                <p className="meta py-6 text-center text-faint">
                  NOT ENOUGH RECORDED CYCLES TO PLOT A SIGNAL
                </p>
              )}
              <HashRule label="MONTHLY RECORDED CASH" className="mt-3" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="border border-line bg-bg2 p-2.5">
                  <span className="micro block text-faint">DAILY EQUIVALENT</span>
                  <span className="numeral mt-1 block text-[20px] text-fg">
                    {formatMoney(view.monthly / 30.4375, base)}
                  </span>
                  <span className="micro block text-faint">PER DAY ON AVERAGE</span>
                </div>
                <div className="border border-line bg-bg2 p-2.5">
                  <span className="micro block text-faint">STARTED</span>
                  <span className="meta mt-1.5 block text-fg">{sub.createdAt.slice(0, 7)}</span>
                  <span className="micro block text-faint">
                    {sub.cyclesExecuted} CYCLES RUN
                  </span>
                </div>
              </div>
            </div>
          </CutPanel>
        </div>
      </motion.div>

      {/* footer action rail */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-linehard pt-3">
        <span className="micro text-faint">
          ALL WRITES GO TO THE LOCAL VOLUME — NOTHING LEAVES THIS DEVICE
        </span>
        <Link
          to="/flow"
          className="micro flex items-center gap-1.5 text-dim transition-colors hover:text-acidink"
        >
          RETURN TO FLOW
          <IconArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}
