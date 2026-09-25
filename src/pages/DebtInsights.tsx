/**
 * SUBTRACK // DEBT INSIGHTS
 *
 * Deep debt analytics — type distribution, interest analysis, amortization
 * projections, and a comprehensive statistics table.
 */
import { motion } from 'motion/react'
import { useDebtSystem } from '@/hooks/useDebt'
import { useUI } from '@/store/ui'
import { formatMoney, formatCompact } from '@/lib/money'
import { formatSignalDate } from '@/lib/date'
import { LOAN_TYPE_META } from '@/lib/types'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { EmptyState } from '@/components/ui/Skeleton'
import { DataStrip } from '@/components/ui/DataStrip'
import { SIGNAL_TEXT, SIGNAL_HEX } from '@/components/ui/Signal'
import { AmortizationCurve, DebtCompositionRail } from '@/components/charts/DebtCurve'
import { cx } from '@/lib/cx'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }
const RISE = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } } }

export default function DebtInsights() {
  const { summary, ready } = useDebtSystem()
  const base = useUI((s) => s.baseCurrency)

  if (!ready) {
    return (
      <div className="px-3 py-6 md:px-5">
        <EmptyState code="NO DEBT DATA" title="NO LOANS TO ANALYSE." description="Add loans to see debt composition, interest analysis, and amortization projections." />
      </div>
    )
  }

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="px-3 py-4 md:px-5 md:py-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-linehard pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="micro border border-line2 px-1.5 py-0.5 text-dim">DATA</span>
          <h1 className="text-[15px] font-semibold">DEBT ANALYTICS</h1>
        </div>
        <span className="micro text-faint">
          {summary.activeCount} ACTIVE · {summary.totalCount} TOTAL · {(summary.overallProgress * 100).toFixed(0)}% REPAID
        </span>
      </div>

      {/* Telemetry banner */}
      <motion.div variants={RISE} className="mt-3">
        <DataStrip
          size="sm"
          scroll={false}
          items={[
            { label: 'OUTSTANDING', value: formatCompact(summary.totalOutstanding, base), signal: 'red' },
            { label: 'MONTHLY EMI', value: formatMoney(summary.monthlyBurden, base), signal: 'orange' },
            { label: 'AVG RATE', value: `${summary.avgInterestRate.toFixed(1)}%`, signal: summary.avgInterestRate >= 10 ? 'orange' : 'blue' },
            { label: 'INTEREST PAID', value: formatCompact(summary.totalInterestPaid, base), signal: 'magenta' },
            { label: 'REMAINING COST', value: formatCompact(summary.totalInterestCost, base), signal: 'red' },
          ]}
        />
      </motion.div>

      {/* Composition rail */}
      {summary.activeViews.length > 1 && (
        <motion.div variants={RISE} className="mt-3">
          <CutPanel cut="none" cutSize={0} innerClassName="p-4">
            <SectionHeader code="COMP" title="Debt composition" signal="magenta" className="border-b-0 px-0 pt-0" right={<span className="micro text-faint">{summary.activeCount} ACTIVE LOANS</span>} />
            <div className="mt-2">
              <DebtCompositionRail views={summary.activeViews} base={base} height={36} />
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              {summary.activeViews.map((v) => {
                const meta = LOAN_TYPE_META[v.loan.loanType]
                return (
                  <span key={v.loan.id} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5" style={{ background: SIGNAL_HEX[meta.signal] }} />
                    <span className="micro text-dim">{v.loan.name}</span>
                    <span className="micro text-faint">{(v.share * 100).toFixed(0)}%</span>
                  </span>
                )
              })}
            </div>
          </CutPanel>
        </motion.div>
      )}

      {/* Amortization curve for largest loan */}
      {summary.activeViews.length > 0 && (
        <motion.div variants={RISE} className="mt-3">
          <CutPanel cut="none" cutSize={0} innerClassName="p-4 md:p-5">
            <SectionHeader code="AMORT" title={`Amortization — ${summary.activeViews[0].loan.name}`} signal="acid" className="border-b-0 px-0 pt-0" />
            <div className="mt-2">
              <AmortizationCurve loan={summary.activeViews[0].loan} payments={[]} base={base} height={180} />
            </div>
          </CutPanel>
        </motion.div>
      )}

      {/* Row 1: Progress + Type distribution */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <motion.div variants={RISE} className="lg:col-span-5">
          <CutPanel cut="tl" cutSize={16} innerClassName="p-4">
            <SectionHeader code="PROG" title="Overall repayment" signal="acid" right={<span className="micro text-faint">{(summary.overallProgress * 100).toFixed(1)}%</span>} />
            <div className="mt-3 flex items-center justify-center">
              <div className="relative">
                <svg width="160" height="160" viewBox="0 0 100 100" className="-rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--c-line)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--c-acid)" strokeWidth="8" strokeLinecap="butt" strokeDasharray={`${summary.overallProgress * 2 * Math.PI * 42} ${2 * Math.PI * 42}`} className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="numeral text-[28px] font-bold text-acidink">{(summary.overallProgress * 100).toFixed(0)}%</span>
                  <span className="micro text-faint">REPAID</span>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="border border-line bg-bg2 p-2">
                <span className="micro text-faint">PRINCIPAL PAID</span>
                <span className="numeral block text-[14px] text-fg">{formatCompact(summary.views.reduce((s, v) => s + v.principalPaid, 0), base)}</span>
              </div>
              <div className="border border-line bg-bg2 p-2">
                <span className="micro text-faint">INTEREST PAID</span>
                <span className="numeral block text-[14px] text-orangeink">{formatCompact(summary.totalInterestPaid, base)}</span>
              </div>
            </div>
          </CutPanel>
        </motion.div>

        <motion.div variants={RISE} className="lg:col-span-7">
          <CutPanel cut="tr" cutSize={16} innerClassName="p-0">
            <SectionHeader code="TYPE" title="Debt by type" signal="magenta" right={<span className="micro text-faint">{summary.types.length} TYPES</span>} />
            <div className="p-3 pb-0">
              <div className="flex h-4 w-full overflow-hidden border border-line">
                {summary.types.map((t) => (
                  <div key={t.loanType} className="h-full" style={{ width: `${Math.max(1, t.share * 100)}%`, background: SIGNAL_HEX[t.signal] }} title={`${t.label}: ${formatMoney(t.outstanding, base)}`} />
                ))}
              </div>
            </div>
            <div className="mt-3 divide-y divide-line">
              {summary.types.map((t) => (
                <div key={t.loanType} className="flex items-center gap-3 px-3 py-2 md:px-4">
                  <span className="micro w-10 font-semibold" style={{ color: SIGNAL_HEX[t.signal] }}>{t.code}</span>
                  <span className="micro min-w-[80px] text-faint">{t.label}</span>
                  <div className="flex-1">
                    <div className="h-2 w-full bg-surface2 border border-line">
                      <div className="h-full" style={{ width: `${Math.max(1, (t.outstanding / (summary.types[0]?.outstanding || 1)) * 100)}%`, background: SIGNAL_HEX[t.signal] }} />
                    </div>
                  </div>
                  <span className="numeral w-16 text-right text-[12px] text-fg">{formatCompact(t.outstanding, base)}</span>
                  <span className="micro w-10 text-right text-faint">{(t.share * 100).toFixed(0)}%</span>
                  <span className="micro w-8 text-right text-dim">{t.count}×</span>
                </div>
              ))}
            </div>
          </CutPanel>
        </motion.div>
      </div>

      {/* Row 2: Per-loan breakdown + Timeline */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <motion.div variants={RISE} className="lg:col-span-7">
          <CutPanel cut="br" cutSize={14} innerClassName="p-0">
            <SectionHeader code="PER" title="Per-loan amortization" signal="blue" right={<span className="micro text-faint">{summary.activeCount} ACTIVE</span>} />
            <div className="divide-y divide-line">
              {summary.activeViews.map((view) => {
                const meta = LOAN_TYPE_META[view.loan.loanType]
                return (
                  <div key={view.loan.id} className="px-3 py-2.5 md:px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cx('micro font-semibold', SIGNAL_TEXT[meta.signal])}>{meta.code}</span>
                        <span className="text-[12px] font-medium text-fg">{view.loan.name}</span>
                      </div>
                      <span className="numeral text-[13px] text-fg">{formatCompact(view.outstanding, view.loan.currency)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="h-2 w-full bg-surface2 border border-line">
                          <div className="h-full bg-acid" style={{ width: `${Math.max(2, view.progress * 100)}%` }} />
                        </div>
                      </div>
                      <span className="micro w-12 text-right text-faint">{(view.progress * 100).toFixed(0)}%</span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-[10px] text-faint">
                      <span>EMI: {formatMoney(view.loan.emi, view.loan.currency)}</span>
                      <span>RATE: {view.loan.interestRate}%</span>
                      <span>PAID: {view.emisPaid}/{view.loan.tenureMonths}</span>
                      <span>FREE: {formatSignalDate(view.debtFreeDate)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CutPanel>
        </motion.div>

        <motion.div variants={RISE} className="lg:col-span-5">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
            <SectionHeader code="TIMELINE" title="Debt-free timeline" signal="acid" />
            <div className="divide-y divide-line">
              {summary.activeViews
                .slice()
                .sort((a, b) => a.daysRemaining - b.daysRemaining)
                .map((view) => {
                  const meta = LOAN_TYPE_META[view.loan.loanType]
                  const ratio = view.daysRemaining / Math.max(1, summary.activeViews.reduce((max, v) => Math.max(max, v.daysRemaining), 0))
                  return (
                    <div key={view.loan.id} className="px-3 py-2 md:px-4">
                      <div className="flex items-center justify-between">
                        <span className={cx('micro font-semibold', SIGNAL_TEXT[meta.signal])}>{view.loan.name}</span>
                        <span className="micro text-fg">{view.daysRemaining}D</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface2 border border-line">
                          <div className="h-full bg-blue" style={{ width: `${Math.max(2, (1 - ratio) * 100)}%` }} />
                        </div>
                        <span className="micro w-20 text-right text-faint">{formatSignalDate(view.debtFreeDate)}</span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CutPanel>
        </motion.div>
      </div>

      {/* Row 3: Statistics table */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tl-br" cutSize={14} innerClassName="p-0">
          <SectionHeader code="STAT" title="Detailed statistics" signal="blue" />
          <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-y-0 md:divide-x">
            <div className="divide-y divide-line">
              {[
                ['TOTAL OUTSTANDING', formatMoney(summary.totalOutstanding, base)],
                ['MONTHLY EMI BURDEN', formatMoney(summary.monthlyBurden, base)],
                ['ANNUAL EMI BURDEN', formatMoney(summary.monthlyBurden * 12, base)],
                ['AVG INTEREST RATE', `${summary.avgInterestRate.toFixed(2)}%`],
                ['TOTAL INTEREST PAID', formatMoney(summary.totalInterestPaid, base)],
                ['REMAINING INTEREST COST', formatMoney(summary.totalInterestCost, base)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-3 py-2 md:px-4">
                  <span className="tech-label">{label}</span>
                  <span className="numeral text-[12px] text-fg">{value}</span>
                </div>
              ))}
            </div>
            <div className="divide-y divide-line">
              {[
                ['ACTIVE LOANS', String(summary.activeCount)],
                ['PAID OFF', String(summary.paidOffViews.length)],
                ['OVERALL PROGRESS', `${(summary.overallProgress * 100).toFixed(1)}%`],
                ['NEAREST DEBT-FREE', summary.nearestDebtFree ? `${summary.nearestDebtFree.loan.name} · ${summary.nearestDebtFree.days}D` : '—'],
                ['FURTHEST DEBT-FREE', summary.furthestDebtFree ? `${summary.furthestDebtFree.loan.name} · ${summary.furthestDebtFree.days}D` : '—'],
                ['LOAN TYPES', String(summary.types.length)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-3 py-2 md:px-4">
                  <span className="tech-label">{label}</span>
                  <span className="numeral text-[12px] text-fg">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </CutPanel>
      </motion.div>
    </motion.div>
  )
}