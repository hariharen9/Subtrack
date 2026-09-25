/**
 * SUBTRACK // CARDS DATA (INSIGHTS)
 *
 * Deep card analytics: utilisation gauges, spend trends, category distribution,
 * rewards tracking, and the comprehensive statistics table.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useCardsSystem } from '@/hooks/useCards'
import { useUI } from '@/store/ui'
import { formatMoney, formatCompact, splitMoney } from '@/lib/money'
import { formatSignalDate } from '@/lib/date'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { EmptyState, BootScreen } from '@/components/ui/Skeleton'
import { DataStrip } from '@/components/ui/DataStrip'
import { Led, SIGNAL_TEXT, SIGNAL_HEX } from '@/components/ui/Signal'
import { cx } from '@/lib/cx'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }
const RISE = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } } }

export default function CardsInsights() {
  const { summary, ready } = useCardsSystem()
  const base = useUI((s) => s.baseCurrency)
  const booted = useUI((s) => s.booted)

  const hero = useMemo(() => splitMoney(summary.totalOutstanding, base), [summary.totalOutstanding, base])

  const dailyMax = useMemo(() => Math.max(1, ...summary.dailySeries.map((d) => d.amount)), [summary.dailySeries])

  if (!booted) return <div className="px-3 py-6 md:px-5"><BootScreen label="LOADING CARD TELEMETRY" /></div>

  if (!ready) {
    return (
      <div className="px-3 py-6 md:px-5">
        <EmptyState code="NO CARD DATA" title="NO CARDS TO ANALYSE." description="Add credit cards to unlock utilisation trends, category analysis and reward tracking." />
      </div>
    )
  }

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="px-3 py-4 md:px-5 md:py-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-linehard pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="micro border border-line2 px-1.5 py-0.5 text-dim">DATA</span>
          <h1 className="text-[15px] font-semibold">CARD ANALYTICS</h1>
        </div>
        <span className="micro text-faint">
          {summary.activeViews.length} CARDS · {summary.txnCount} TXNS · {(summary.totalUtilisation * 100).toFixed(0)}% UTIL
        </span>
      </div>

      {/* Telemetry */}
      <motion.div variants={RISE} className="mt-3">
        <DataStrip
          size="sm"
          scroll={false}
          items={[
            { label: 'OUTSTANDING', value: formatMoney(summary.totalOutstanding, base), signal: 'red' },
            { label: 'LIMIT', value: formatCompact(summary.totalLimit, base), signal: 'blue' },
            { label: 'AVAILABLE', value: formatCompact(summary.totalAvailable, base), signal: 'acid' },
            { label: 'CYCLE SPEND', value: formatMoney(summary.cycleSpendTotal, base), signal: 'orange' },
            { label: 'REWARDS', value: String(Math.round(summary.totalRewards)), signal: 'magenta' },
          ]}
        />
      </motion.div>

      {/* Row 1: gauges */}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Total outstanding */}
        <motion.div variants={RISE}>
          <CutPanel cut="tl-br" cutSize={16} innerClassName="relative overflow-hidden p-4" shadow="hard">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-red" />
            <div className="flex items-center justify-between">
              <span className="micro text-faint">TOTAL OUTSTANDING</span>
              <span className="micro text-linehard">BAL</span>
            </div>
            <h1 className="mt-2 flex items-start gap-1">
              <span className="numeral mt-1 text-[clamp(1.2rem,3vw,1.6rem)] text-dim">{hero.symbol}</span>
              <span className="numeral text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-fg">
                <AnimatedNumber value={summary.totalOutstanding} format={(v) => splitMoney(v, base).value} stiffness={120} damping={26} />
              </span>
            </h1>
            <div className="micro mt-2 flex items-center gap-1.5 text-redink">
              <Led signal="red" size="sm" />
              {formatMoney(summary.totalAvailable, base)} AVAILABLE OF {formatMoney(summary.totalLimit, base)}
            </div>
          </CutPanel>
        </motion.div>

        {/* Utilisation gauge */}
        <motion.div variants={RISE}>
          <CutPanel cut="br" cutSize={16} innerClassName="p-4" className="h-full">
            <SectionHeader code="UTIL" title="Overall utilisation" signal={summary.totalUtilisation >= 0.5 ? 'orange' : 'acid'} className="border-b-0 px-0 pt-0" />
            <div className="mt-2 flex items-center justify-center">
              <div className="relative">
                <svg width="120" height="120" viewBox="0 0 100 100" className="-rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--c-line)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={summary.totalUtilisation >= 0.8 ? 'var(--c-red)' : summary.totalUtilisation >= 0.5 ? 'var(--c-orange)' : 'var(--c-acid)'} strokeWidth="8" strokeLinecap="butt" strokeDasharray={`${Math.min(1, summary.totalUtilisation) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`} className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="numeral text-[22px] font-bold text-fg">{(summary.totalUtilisation * 100).toFixed(0)}%</span>
                  <span className="micro text-faint">USED</span>
                </div>
              </div>
            </div>
          </CutPanel>
        </motion.div>

        {/* Next due */}
        <motion.div variants={RISE}>
          <CutPanel cut="tr" cutSize={16} innerClassName="p-4" className="h-full">
            <SectionHeader code="DUE" title="Next payment" signal={summary.nextDue && summary.nextDue.days <= 3 ? 'red' : 'orange'} className="border-b-0 px-0 pt-0" />
            {summary.nextDue ? (
              <div className="mt-2">
                <span className="numeral block text-[28px] font-bold text-fg">{summary.nextDue.days}<span className="text-[14px] text-dim"> DAYS</span></span>
                <span className="micro text-fg font-medium">{summary.nextDue.card.name} ··{summary.nextDue.card.last4}</span>
                <span className="micro block text-faint">DUE {formatSignalDate(summary.nextDue.date)}</span>
                <span className="micro block text-faint">BALANCE {formatMoney(summary.nextDue.balance, summary.nextDue.card.currency)}</span>
              </div>
            ) : (
              <p className="meta mt-2 text-faint">NO ACTIVE CARDS.</p>
            )}
          </CutPanel>
        </motion.div>
      </div>

      {/* Row 2: daily trend */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="none" cutSize={0} innerClassName="p-4 md:p-5">
          <SectionHeader code="TREND" title="28-day purchase trend" signal="blue" className="border-b-0 px-0 pt-0" right={<span className="micro text-faint">ALL CARDS</span>} />
          <div className="mt-3 flex items-end gap-[3px]" style={{ height: 120 }}>
            {summary.dailySeries.map((d) => {
              const ratio = d.amount / dailyMax
              return (
                <div key={d.iso} className="group/day relative flex min-w-0 flex-1 flex-col items-center justify-end" title={`${d.label}: ${formatMoney(d.amount, base)}`}>
                  <span
                    className={cx('block w-full rounded-[1px] transition-all', d.amount > 0 ? 'bg-blue group-hover/day:brightness-125' : 'bg-line')}
                    style={{ height: Math.max(2, ratio * 112) }}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-1.5 flex items-center justify-between border-t border-line pt-1.5">
            <span className="micro text-faint">{summary.dailySeries[0]?.label} — {summary.dailySeries[summary.dailySeries.length - 1]?.label}</span>
            <span className="micro text-faint">TOTAL {formatMoney(summary.dailySeries.reduce((s, d) => s + d.amount, 0), base)}</span>
          </div>
        </CutPanel>
      </motion.div>

      {/* Row 3: category distribution + per-card */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <motion.div variants={RISE} className="lg:col-span-7">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
            <SectionHeader code="CAT" title="Category distribution" signal="magenta" right={<span className="micro text-faint">ALL-TIME CARD SPEND</span>} />
            {summary.categories.length ? (
              <div className="divide-y divide-line">
                {summary.categories.map((c) => (
                  <div key={c.category} className="flex items-center gap-3 px-3 py-2 md:px-4">
                    <span className="micro w-9 font-semibold" style={{ color: SIGNAL_HEX[c.signal] }}>{c.code}</span>
                    <span className="micro min-w-[80px] text-faint">{c.label}</span>
                    <div className="flex-1">
                      <div className="h-2 w-full bg-surface2 border border-line">
                        <div className="h-full" style={{ width: `${Math.max(1, (c.amount / (summary.categories[0]?.amount || 1)) * 100)}%`, background: SIGNAL_HEX[c.signal] }} />
                      </div>
                    </div>
                    <span className="numeral w-16 text-right text-[12px] text-fg">{formatCompact(c.amount, base)}</span>
                    <span className="micro w-10 text-right text-faint">{(c.share * 100).toFixed(0)}%</span>
                    <span className="micro w-8 text-right text-dim">{c.count}×</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="meta px-3 py-5 text-faint">NO CARD SPEND YET.</p>
            )}
          </CutPanel>
        </motion.div>

        <motion.div variants={RISE} className="lg:col-span-5">
          <CutPanel cut="tr" cutSize={14} innerClassName="p-0">
            <SectionHeader code="PERC" title="Per-card summary" signal="blue" />
            <div className="divide-y divide-line">
              {summary.views.map((view) => (
                <Link key={view.card.id} to={`/cards/flow/${view.card.id}`} className="block px-3 py-2.5 transition-colors hover:bg-surface2 md:px-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-medium text-fg">{view.card.name} ··{view.card.last4}</span>
                    <span className={cx('numeral text-[13px] font-bold', SIGNAL_TEXT[view.signal])}>{(view.utilisation * 100).toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-surface2 border border-line">
                    <div className={cx('h-full', view.utilisation >= 0.8 ? 'bg-red' : view.utilisation >= 0.5 ? 'bg-orange' : 'bg-blue')} style={{ width: `${Math.max(2, view.utilisation * 100)}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-faint">
                    <span>BAL {formatCompact(view.balance, view.card.currency)}</span>
                    <span>CYCLE {formatCompact(view.cycleSpend, base)}</span>
                    <span>{view.txnCount} TXNS</span>
                    <span className="text-magentaink">{Math.round(view.totalRewards)} PTS</span>
                  </div>
                </Link>
              ))}
            </div>
          </CutPanel>
        </motion.div>
      </div>

      {/* Row 4: stats table */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tl-br" cutSize={14} innerClassName="p-0">
          <SectionHeader code="STAT" title="Detailed statistics" signal="blue" />
          <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-y-0 md:divide-x">
            <div className="divide-y divide-line">
              {[
                ['TOTAL OUTSTANDING', formatMoney(summary.totalOutstanding, base)],
                ['TOTAL CREDIT LIMIT', formatMoney(summary.totalLimit, base)],
                ['TOTAL AVAILABLE', formatMoney(summary.totalAvailable, base)],
                ['OVERALL UTILISATION', `${(summary.totalUtilisation * 100).toFixed(1)}%`],
                ['CYCLE SPEND (ALL CARDS)', formatMoney(summary.cycleSpendTotal, base)],
                ['CYCLE PAYMENTS', formatMoney(summary.cyclePaymentsTotal, base)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-3 py-2 md:px-4">
                  <span className="tech-label">{label}</span>
                  <span className="numeral text-[12px] text-fg">{value}</span>
                </div>
              ))}
            </div>
            <div className="divide-y divide-line">
              {[
                ['ACTIVE CARDS', String(summary.activeViews.length)],
                ['TOTAL TRANSACTIONS', String(summary.txnCount)],
                ['TOTAL REWARDS', String(Math.round(summary.totalRewards))],
                ['NEXT PAYMENT DUE', summary.nextDue ? `${summary.nextDue.card.name} · ${summary.nextDue.days}D` : '—'],
                ['TOP CATEGORY', summary.categories[0] ? `${summary.categories[0].label} (${(summary.categories[0].share * 100).toFixed(0)}%)` : '—'],
                ['CARD COUNT', String(summary.views.length)],
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