/**
 * SUBTRACK // LOAN DIAGNOSTIC
 *
 * Per-loan diagnostic board — identity, economics, amortization schedule,
 * payment history, and interest breakdown.
 */
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useLoan, useLoanPayments, useDebtSystem } from '@/hooks/useDebt'
import { useUI } from '@/store/ui'
import { formatMoney, formatCompact } from '@/lib/money'
import { formatSignalDate, todayISO } from '@/lib/date'
import { LOAN_TYPE_META } from '@/lib/types'
import { viewOf, amortize } from '@/lib/debt'
import { CutPanel } from '@/components/ui/CutPanel'
import { DataStrip } from '@/components/ui/DataStrip'
import { SectionHeader } from '@/components/ui/Micro'
import { EmptyState } from '@/components/ui/Skeleton'
import { Led, SIGNAL_TEXT } from '@/components/ui/Signal'
import { AmortizationCurve, EMISplitDonut } from '@/components/charts/DebtCurve'
import { IconChevronLeft } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }
const RISE = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } } }

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>()
  const loan = useLoan(id)
  const payments = useLoanPayments(id)
  const { summary } = useDebtSystem()
  const base = useUI((s) => s.baseCurrency)
  const today = todayISO()

  const view = useMemo(
    () => loan ? viewOf(loan, payments, base, today, summary.totalOutstanding) : undefined,
    [loan, payments, base, today, summary.totalOutstanding],
  )

  const schedule = useMemo(() => loan ? amortize(loan) : [], [loan])

  if (!loan || !view) {
    return (
      <div className="px-3 py-6 md:px-5">
        <EmptyState code="LOAN NOT FOUND" title="NO RECORD ON THIS VOLUME." description="This loan does not exist in the local store." action={{ label: 'BACK TO REGISTRY', onClick: () => history.back() }} />
      </div>
    )
  }

  const meta = LOAN_TYPE_META[loan.loanType]
  const isPaidOff = loan.status === 'paid_off'

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="px-3 py-4 md:px-5 md:py-5">
      {/* Back */}
      <motion.div variants={RISE}>
        <Link to="/loans/flow" className="micro inline-flex items-center gap-1 text-dim transition-colors hover:text-acidink">
          <IconChevronLeft size={12} /> BACK TO REGISTRY
        </Link>
      </motion.div>

      {/* Identity header */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tl-br" cutSize={18} innerClassName="relative p-4 md:p-6" shadow="hard">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 dot-field opacity-[0.12]" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className={cx('micro flex items-center gap-1.5', SIGNAL_TEXT[meta.signal])}>
                <Led signal={isPaidOff ? 'acid' : meta.signal} size="sm" />
                {meta.code} · {meta.label}
              </span>
              <span className={cx('micro', isPaidOff ? 'text-acidink' : 'text-faint')}>
                {isPaidOff ? 'PAID OFF' : 'ACTIVE'}
              </span>
            </div>
            <h1 className="mt-1 text-[clamp(1.4rem,4vw,2.2rem)] font-semibold tracking-[-0.02em] text-fg">
              {loan.name}
            </h1>
            <span className="micro mt-1 block text-faint">
              {loan.lender} · {loan.interestRate}% PA · {loan.tenureMonths} MONTHS · STARTED {formatSignalDate(loan.startDate)}
            </span>

            {/* Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-faint">
                <span className="micro">REPAYMENT PROGRESS</span>
                <span className="micro font-mono">{(view.progress * 100).toFixed(1)}%</span>
              </div>
              <div className="mt-1.5 h-3 w-full bg-surface2 border border-line">
                <motion.div className={cx('h-full', isPaidOff ? 'bg-acid' : 'bg-blue')} initial={{ width: 0 }} animate={{ width: `${view.progress * 100}%` }} transition={{ duration: 0.8 }} />
              </div>
            </div>

            {/* Readouts */}
            <div className="mt-4 border-y border-line">
              <DataStrip
                items={[
                  { label: 'Principal', value: formatMoney(loan.principal, loan.currency), signal: 'blue' },
                  { label: 'Outstanding', value: formatCompact(view.outstanding, loan.currency), signal: isPaidOff ? 'acid' : 'red' },
                  { label: 'EMI', value: formatMoney(loan.emi, loan.currency), signal: 'orange' },
                  { label: 'Interest paid', value: formatCompact(view.interestPaid, loan.currency), signal: 'magenta' },
                  { label: 'EMIs paid', value: `${view.emisPaid}/${loan.tenureMonths}`, signal: 'acid' },
                  { label: 'Debt-free', value: isPaidOff ? 'DONE' : formatSignalDate(view.debtFreeDate), signal: isPaidOff ? 'acid' : 'blue' },
                ]}
              />
            </div>
          </div>
        </CutPanel>
      </motion.div>

      {/* Amortization Curve */}
      {!isPaidOff && (
        <motion.div variants={RISE} className="mt-3">
          <CutPanel cut="none" cutSize={0} innerClassName="p-4 md:p-5">
            <SectionHeader code="AMORT" title="Amortization curve" signal="acid" className="border-b-0 px-0 pt-0" right={<span className="micro text-faint">{loan.tenureMonths} MONTHS</span>} />
            <div className="mt-2">
              <AmortizationCurve loan={loan} payments={payments} base={base} height={200} />
            </div>
          </CutPanel>
        </motion.div>
      )}

      {/* Economics + Interest breakdown */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <motion.div variants={RISE} className="lg:col-span-6">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
            <SectionHeader code="ECON" title="Loan economics" signal="orange" />
            {/* EMI Split Donut */}
            <div className="flex justify-center py-4 border-b border-line">
              <div className="relative">
                <EMISplitDonut
                  principal={view.principalPaid}
                  interest={view.interestPaid}
                  base={base}
                  size={130}
                />
              </div>
            </div>
            <div className="divide-y divide-line">
              {[
                ['PRINCIPAL', formatMoney(loan.principal, loan.currency)],
                ['INTEREST RATE', `${loan.interestRate}% PER ANNUM`],
                ['TENURE', `${loan.tenureMonths} MONTHS`],
                ['EMI', formatMoney(loan.emi, loan.currency)],
                ['TOTAL INTEREST', formatMoney(view.totalInterestCost, loan.currency)],
                ['TOTAL COST', formatMoney(loan.emi * loan.tenureMonths, loan.currency)],
                ['START DATE', formatSignalDate(loan.startDate)],
                ['DEBT-FREE DATE', isPaidOff ? formatSignalDate(loan.closedAt ?? '') : formatSignalDate(view.debtFreeDate)],
                ['OUTSTANDING', formatMoney(view.outstanding, loan.currency)],
                ['PRINCIPAL PAID', formatMoney(view.principalPaid, loan.currency)],
                ['INTEREST PAID', formatMoney(view.interestPaid, loan.currency)],
                ['EMIs REMAINING', String(view.emisRemaining)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-3 py-2 md:px-4">
                  <span className="tech-label">{label}</span>
                  <span className="numeral text-[12px] text-fg">{value}</span>
                </div>
              ))}
            </div>
          </CutPanel>
        </motion.div>

        <motion.div variants={RISE} className="lg:col-span-6">
          <CutPanel cut="tr" cutSize={14} innerClassName="p-0">
            <SectionHeader code="HIST" title="Payment history" signal="acid" right={<span className="micro text-faint">{payments.length} PAID</span>} />
            {payments.length ? (
              <div className="max-h-[500px] overflow-y-auto" data-lenis-prevent>
                <div className="divide-y divide-line">
                  {[...payments].sort((a, b) => b.emiNumber - a.emiNumber).map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2 md:px-4">
                      <span className="micro w-6 font-mono text-faint">#{p.emiNumber}</span>
                      <span className="min-w-0 flex-1">
                        <span className="micro block text-fg">{formatSignalDate(p.date)}</span>
                        <span className="micro block text-faint">
                          P: {formatMoney(p.principalComponent, loan.currency)} · I: {formatMoney(p.interestComponent, loan.currency)}
                        </span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="numeral block text-[12px] text-fg">{formatMoney(p.amount, loan.currency)}</span>
                        <span className="micro block text-faint">BAL: {formatCompact(p.balanceAfter, loan.currency)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="meta px-4 py-6 text-faint">NO PAYMENTS RECORDED YET.</p>
            )}
          </CutPanel>
        </motion.div>
      </div>

      {/* Amortization schedule preview */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="br" cutSize={14} innerClassName="p-0">
          <SectionHeader code="SCHED" title="Amortization schedule" signal="blue" right={<span className="micro text-faint">{schedule.length} MONTHS</span>} />
          <div className="max-h-[400px] overflow-y-auto" data-lenis-prevent>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-line">
                  <th className="tech-label px-3 py-1.5 text-left font-normal">#</th>
                  <th className="tech-label px-2 py-1.5 text-left font-normal">DATE</th>
                  <th className="tech-label px-2 py-1.5 text-right font-normal">EMI</th>
                  <th className="tech-label px-2 py-1.5 text-right font-normal">PRINCIPAL</th>
                  <th className="tech-label px-2 py-1.5 text-right font-normal">INTEREST</th>
                  <th className="tech-label px-3 py-1.5 text-right font-normal">BALANCE</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => {
                  const isPaid = row.emiNumber <= view.emisPaid
                  return (
                    <tr key={row.emiNumber} className={cx('border-b border-line last:border-b-0', isPaid && 'bg-acidsoft/30')}>
                      <td className="px-3 py-1.5"><span className="micro font-mono text-faint">{row.emiNumber}</span></td>
                      <td className="px-2 py-1.5"><span className="micro text-dim">{formatSignalDate(row.date)}</span></td>
                      <td className="px-2 py-1.5 text-right"><span className="numeral text-[11px] text-fg">{formatMoney(row.emi, loan.currency)}</span></td>
                      <td className="px-2 py-1.5 text-right"><span className="numeral text-[11px] text-fg">{formatMoney(row.principal, loan.currency)}</span></td>
                      <td className="px-2 py-1.5 text-right"><span className="numeral text-[11px] text-orangeink">{formatMoney(row.interest, loan.currency)}</span></td>
                      <td className="px-3 py-1.5 text-right"><span className="numeral text-[11px] text-dim">{formatCompact(row.balance, loan.currency)}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CutPanel>
      </motion.div>
    </motion.div>
  )
}