/**
 * SUBTRACK // DEBT OVERVIEW
 *
 * The debt cockpit — total outstanding with donut, progress, readouts,
 * loan grid, debt-free timeline, and interest analysis. Clean and focused.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useDebtSystem } from '@/hooks/useDebt'
import { useUI } from '@/store/ui'
import { formatMoney, splitMoney, formatCompact } from '@/lib/money'
import { formatSignalDate } from '@/lib/date'
import { LOAN_TYPE_META } from '@/lib/types'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { DataStrip } from '@/components/ui/DataStrip'
import { EmptyState, BootScreen } from '@/components/ui/Skeleton'
import { Led, SIGNAL_TEXT } from '@/components/ui/Signal'
import { EMISplitDonut, DebtCompositionRail } from '@/components/charts/DebtCurve'
import { CyberButton } from '@/components/ui/CyberButton'
import { IconPlus } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }
const RISE = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } } }

export default function DebtOverview() {
  const { summary, ready } = useDebtSystem()
  const base = useUI((s) => s.baseCurrency)
  const booted = useUI((s) => s.booted)
  const openLoanComposer = useUI((s) => s.openLoanComposer)
  const hero = useMemo(() => splitMoney(summary.totalOutstanding, base), [summary.totalOutstanding, base])

  const emiSplit = useMemo(() => {
    let principal = 0
    let interest = 0
    for (const v of summary.activeViews) {
      const r = v.loan.interestRate / 12 / 100
      interest += v.outstanding * r
      principal += v.loan.emi - v.outstanding * r
    }
    return { principal, interest }
  }, [summary.activeViews])

  if (!booted) return <div className="px-3 py-6 md:px-5"><BootScreen label="LOADING DEBT VOLUME" /></div>
  if (!ready) return (
    <div className="px-3 py-6 md:px-5">
      <EmptyState
        code="NO LOANS TRACKED"
        title="NO DEBT ON THIS VOLUME."
        description="Track your loans, EMIs, and credit card balances. Add your first loan to see amortization schedules and debt-free projections."
        action={{ label: 'ADD LOAN', onClick: () => openLoanComposer() }}
      />
    </div>
  )

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="px-3 py-4 md:px-5 md:py-5">
      <motion.div variants={RISE}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line pb-2 text-faint">
          <span className="micro flex items-center gap-2">
            <span className="text-fg font-medium">DEBT TRACKER // {summary.activeCount} ACTIVE</span>
            <span className="text-linehard">·</span>
            <span>{summary.paidOffViews.length} PAID OFF</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="micro hidden sm:inline text-faint">{formatMoney(summary.monthlyBurden, base)}/MO EMI BURDEN</span>
            <CyberButton variant="solid" size="sm" leading={<IconPlus size={12} />} onClick={() => openLoanComposer()}>
              ADD LOAN
            </CyberButton>
          </span>
        </div>
      </motion.div>

      <div className="mt-4 grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        {/* LEFT 8 */}
        <div className="flex flex-col gap-3 lg:col-span-8">
          {/* Hero */}
          <motion.div variants={RISE}>
            <CutPanel cut="tl-br" cutSize={18} innerClassName="relative p-4 md:p-6" shadow="hard">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden dot-field opacity-[0.16]" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="micro text-redink">TOTAL OUTSTANDING</span>
                    <h1 className="mt-1 flex items-start gap-1">
                      <span className="numeral mt-1 text-[clamp(1.6rem,4.5vw,2.6rem)] text-dim">{hero.symbol}</span>
                      <span className="numeral text-hero text-fg">
                        <AnimatedNumber value={summary.totalOutstanding} format={(v) => splitMoney(v, base).value} stiffness={120} damping={26} />
                      </span>
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="micro text-orangeink">{formatMoney(summary.monthlyBurden, base)}/MO EMI</span>
                      <span className="micro text-faint">{summary.activeCount} ACTIVE</span>
                      {summary.nearestDebtFree && <span className="micro text-acidink">NEAREST: {summary.nearestDebtFree.loan.name} · {summary.nearestDebtFree.days}D</span>}
                    </div>
                  </div>
                  <div className="relative hidden shrink-0 sm:flex sm:items-center sm:justify-center">
                    <EMISplitDonut principal={emiSplit.principal} interest={emiSplit.interest} base={base} size={110} />
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-faint">
                    <span className="micro">OVERALL REPAYMENT</span>
                    <span className="micro font-mono">{(summary.overallProgress * 100).toFixed(1)}%</span>
                  </div>
                  <div className="mt-1.5 h-3 w-full bg-surface2 border border-line">
                    <motion.div className="h-full bg-acid" initial={{ width: 0 }} animate={{ width: `${summary.overallProgress * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
                  </div>
                </div>

                {/* Composition Rail */}
                {summary.activeViews.length > 1 && (
                  <div className="mt-3">
                    <span className="micro text-faint">DEBT COMPOSITION</span>
                    <div className="mt-1">
                      <DebtCompositionRail views={summary.activeViews} base={base} height={28} />
                    </div>
                  </div>
                )}

                {/* Readouts */}
                <div className="mt-4 border-y border-line">
                  <DataStrip
                    items={[
                      { label: 'Outstanding', value: formatCompact(summary.totalOutstanding, base), signal: 'red' },
                      { label: 'Monthly EMI', value: formatMoney(summary.monthlyBurden, base), signal: 'orange' },
                      { label: 'Interest paid', value: formatCompact(summary.totalInterestPaid, base), signal: 'magenta' },
                      { label: 'Avg rate', value: `${summary.avgInterestRate.toFixed(1)}%`, signal: summary.avgInterestRate >= 10 ? 'orange' : 'blue' },
                      { label: 'Progress', value: `${(summary.overallProgress * 100).toFixed(0)}%`, signal: 'acid' },
                      { label: 'Interest cost', value: formatCompact(summary.totalInterestCost, base), signal: 'red' },
                    ]}
                  />
                </div>
              </div>
            </CutPanel>
          </motion.div>

          {/* Loan grid — compact cards */}
          <motion.div variants={RISE}>
            <SectionHeader code="LOANS" title="Active loans" right={<span className="micro text-faint">{summary.activeCount} ACTIVE · {summary.paidOffViews.length} PAID OFF</span>} />
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {summary.views.map((view) => {
                const meta = LOAN_TYPE_META[view.loan.loanType]
                const isPaidOff = view.loan.status === 'paid_off'
                return (
                  <Link key={view.loan.id} to={`/loans/flow/${view.loan.id}`} className="group block focus-visible:outline-none">
                    <CutPanel cut="br" cutSize={12} innerClassName="p-3 group-hover:bg-surface2 transition-colors" className="h-full">
                      <div className="flex items-center justify-between">
                        <span className={cx('micro flex items-center gap-1.5', SIGNAL_TEXT[meta.signal])}>
                          <Led signal={isPaidOff ? 'acid' : meta.signal} size="sm" />
                          {meta.code}
                        </span>
                        <span className={cx('micro', isPaidOff ? 'text-acidink' : 'text-faint')}>
                          {isPaidOff ? 'PAID OFF' : `${view.emisRemaining} EMIs LEFT`}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-[14px] font-semibold text-fg">{view.loan.name}</h3>
                      <span className="micro text-faint">{view.loan.lender} · {view.loan.interestRate}% PA</span>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <div>
                          <span className="micro text-faint">OUTSTANDING</span>
                          <span className="numeral block text-[16px] font-bold text-fg">{formatCompact(view.outstanding, view.loan.currency)}</span>
                        </div>
                        <div className="text-right">
                          <span className="micro text-faint">EMI</span>
                          <span className="numeral block text-[14px] text-fg">{formatMoney(view.loan.emi, view.loan.currency)}</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="h-1.5 w-full bg-surface2 border border-line">
                          <div className={cx('h-full transition-all', isPaidOff ? 'bg-acid' : 'bg-blue')} style={{ width: `${Math.max(2, view.progress * 100)}%` }} />
                        </div>
                        <div className="mt-0.5 flex items-center justify-between">
                          <span className="micro text-faint">{(view.progress * 100).toFixed(0)}% PAID</span>
                          {!isPaidOff && <span className="micro text-faint">FREE {formatSignalDate(view.debtFreeDate)}</span>}
                        </div>
                      </div>
                    </CutPanel>
                  </Link>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* RIGHT 4 */}
        <div className="flex flex-col gap-3 lg:col-span-4">
          {/* Debt-free timeline */}
          <motion.div variants={RISE}>
            <CutPanel cut="br" cutSize={14} innerClassName="p-0">
              <SectionHeader code="TIMELINE" title="Debt-free projections" signal="acid" />
              <div className="divide-y divide-line">
                {summary.activeViews.slice().sort((a, b) => a.daysRemaining - b.daysRemaining).map((view) => {
                  const meta = LOAN_TYPE_META[view.loan.loanType]
                  return (
                    <Link key={view.loan.id} to={`/loans/flow/${view.loan.id}`} className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-surface2 md:px-4">
                      <span className={cx('micro w-8 font-semibold', SIGNAL_TEXT[meta.signal])}>{meta.code}</span>
                      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-fg">{view.loan.name}</span>
                      <span className="text-right shrink-0">
                        <span className="micro block text-fg font-medium">{formatSignalDate(view.debtFreeDate)}</span>
                        <span className="micro block text-faint">{view.daysRemaining}D</span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </CutPanel>
          </motion.div>

          {/* Interest analysis */}
          <motion.div variants={RISE}>
            <CutPanel cut="tl" cutSize={14} innerClassName="p-3">
              <SectionHeader code="INT" title="Interest analysis" signal="orange" className="border-b-0 px-0 pt-0" />
              <div className="mt-2 space-y-2">
                {[
                  ['INTEREST PAID', formatMoney(summary.totalInterestPaid, base)],
                  ['REMAINING COST', formatMoney(summary.totalInterestCost, base)],
                  ['AVG RATE', `${summary.avgInterestRate.toFixed(1)}%`],
                  ['MONTHLY INTEREST', formatMoney(summary.activeViews.reduce((s, v) => s + v.monthlyInterestCost, 0), base)],
                ].map(([label, value], i) => (
                  <div key={label} className={cx('flex items-center justify-between', i === 3 && 'border-t border-line pt-2')}>
                    <span className="micro text-faint">{label}</span>
                    <span className={cx('numeral text-[13px]', i === 1 ? 'text-orangeink' : i === 2 && summary.avgInterestRate >= 10 ? 'text-orangeink' : 'text-fg')}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <span className="micro text-faint">EMI SPLIT</span>
                <div className="mt-1 flex h-3 w-full overflow-hidden border border-line">
                  <div className="bg-blue" style={{ width: `${Math.max(2, (emiSplit.principal / (emiSplit.principal + emiSplit.interest)) * 100)}%` }} />
                  <div className="bg-orange opacity-60" style={{ width: `${Math.max(2, (emiSplit.interest / (emiSplit.principal + emiSplit.interest)) * 100)}%` }} />
                </div>
              </div>
            </CutPanel>
          </motion.div>

          {/* Per-loan progress */}
          <motion.div variants={RISE}>
            <CutPanel cut="tr" cutSize={14} innerClassName="p-0">
              <SectionHeader code="PER" title="Per-loan progress" signal="magenta" right={<span className="micro text-faint">{summary.activeCount}</span>} />
              <div className="divide-y divide-line">
                {summary.activeViews.map((view) => {
                  const meta = LOAN_TYPE_META[view.loan.loanType]
                  return (
                    <Link key={view.loan.id} to={`/loans/flow/${view.loan.id}`} className="block px-3 py-2 transition-colors hover:bg-surface2 md:px-4">
                      <div className="flex items-center justify-between">
                        <span className={cx('micro font-semibold', SIGNAL_TEXT[meta.signal])}>{meta.code}</span>
                        <span className="numeral text-[12px] text-fg">{formatMoney(view.loan.emi, view.loan.currency)}/MO</span>
                      </div>
                      <span className="micro block truncate text-faint">{view.loan.name}</span>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-surface2 border border-line"><div className="h-full bg-acid" style={{ width: `${Math.max(2, view.progress * 100)}%` }} /></div>
                        <span className="micro text-faint">{(view.progress * 100).toFixed(0)}%</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CutPanel>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}