/**
 * SPENDSTATE // CARDS DATA (INSIGHTS)
 *
 * Card analytics as one instrument cluster: a unified hero (outstanding
 * odometer + utilisation scale + cycle readouts), a combined activity chart
 * (28 days / 12 months), a payment rail with one-click PAY, per-card health,
 * rewards & cost telemetry, category distribution and the statistics table.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useCardsSystem } from '@/hooks/useCards'
import { useUI } from '@/store/ui'
import { formatMoney, formatCompact, splitMoney } from '@/lib/money'
import { formatSignalDate } from '@/lib/date'
import { SPEND_CATEGORY_LABEL } from '@/lib/types'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { EmptyState, BootScreen } from '@/components/ui/Skeleton'
import { DataStrip } from '@/components/ui/DataStrip'
import { SIGNAL_TEXT, SIGNAL_HEX } from '@/components/ui/Signal'
import { SegmentedControl } from '@/components/ui/Controls'
import { CyberButton } from '@/components/ui/CyberButton'
import { cx } from '@/lib/cx'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }
const RISE = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } } }

type ActivityMode = '28d' | '12m'

function utilBand(util: number): { label: string; signal: 'acid' | 'blue' | 'orange' | 'red' } {
  if (util >= 0.8) return { label: 'CRITICAL', signal: 'red' }
  if (util >= 0.5) return { label: 'HIGH', signal: 'orange' }
  if (util >= 0.3) return { label: 'ELEVATED', signal: 'blue' }
  return { label: 'SAFE', signal: 'acid' }
}

export default function CardsInsights() {
  const { summary, ready } = useCardsSystem()
  const base = useUI((s) => s.baseCurrency)
  const booted = useUI((s) => s.booted)
  const openCardComposer = useUI((s) => s.openCardComposer)

  const [activity, setActivity] = useState<ActivityMode>('28d')

  const hero = useMemo(() => splitMoney(summary.totalOutstanding, base), [summary.totalOutstanding, base])
  const d28Total = useMemo(() => summary.dailySeries.reduce((s, d) => s + d.amount, 0), [summary.dailySeries])
  const m12 = useMemo(
    () => ({
      spend: summary.monthlySeries.reduce((s, m) => s + m.spend, 0),
      payments: summary.monthlySeries.reduce((s, m) => s + m.payments, 0),
      max: Math.max(1, ...summary.monthlySeries.map((m) => Math.max(m.spend, m.payments))),
    }),
    [summary.monthlySeries],
  )
  const d28Max = useMemo(() => Math.max(1, ...summary.dailySeries.map((d) => d.amount)), [summary.dailySeries])
  const totalMinDue = useMemo(() => summary.activeViews.reduce((s, v) => s + v.minDue, 0), [summary.activeViews])
  const util = summary.totalUtilisation
  const band = utilBand(util)
  const utilSignal = band.signal

  if (!booted) return <div className="px-3 py-6 md:px-5"><BootScreen label="LOADING CARD TELEMETRY" /></div>

  if (!ready) {
    return (
      <div className="px-3 py-6 md:px-5">
        <EmptyState code="NO CARD DATA" title="NO CARDS TO ANALYSE." description="Add credit cards to unlock utilisation trends, category analysis and reward tracking." />
      </div>
    )
  }

  const nextView = summary.nextDue
    ? summary.activeViews.find((v) => v.card.id === summary.nextDue?.card.id)
    : undefined

  const payNow = () => {
    if (!summary.nextDue || !nextView) return
    openCardComposer({
      mode: 'txn',
      presetCardId: summary.nextDue.card.id,
      presetType: 'payment',
      presetAmount: nextView.statement.due > 0 ? nextView.statement.due : nextView.balance,
    })
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
          {summary.activeViews.length} CARDS · {summary.txnCount} TXNS · {(util * 100).toFixed(0)}% UTIL · {band.label}
        </span>
      </div>

      {/* Telemetry strip */}
      <motion.div variants={RISE} className="mt-3">
        <DataStrip
          size="sm"
          scroll={false}
          items={[
            { label: 'OUTSTANDING', value: formatMoney(summary.totalOutstanding, base), signal: 'red' },
            { label: 'LIMIT', value: formatCompact(summary.totalLimit, base), signal: 'blue' },
            { label: 'AVAILABLE', value: formatCompact(summary.totalAvailable, base), signal: 'acid' },
            { label: 'CYCLE SPEND', value: formatMoney(summary.cycleSpendTotal, base), signal: 'orange' },
            { label: 'CYCLE PAYMENTS', value: formatMoney(summary.cyclePaymentsTotal, base), signal: 'acid' },
            { label: 'MIN DUE', value: formatMoney(totalMinDue, base), signal: 'orange' },
            { label: 'REWARDS', value: String(Math.round(summary.totalRewards)), signal: 'magenta' },
            { label: 'UTIL', value: `${(util * 100).toFixed(0)}%`, signal: utilSignal },
          ]}
        />
      </motion.div>

      <div className="mt-3 grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        {/* ── LEFT 8 ── */}
        <div className="flex flex-col gap-3 lg:col-span-8">
          {/* Hero: outstanding + utilisation scale + cycle readouts */}
          <motion.div variants={RISE}>
            <CutPanel cut="tl-br" cutSize={16} innerClassName="p-4 md:p-5">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden dot-field opacity-[0.14]" />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="micro text-redink">TOTAL OUTSTANDING</span>
                  <h1 className="mt-1 flex items-start gap-1">
                    <span className="numeral mt-1 text-[clamp(1.4rem,3.5vw,2rem)] text-dim">{hero.symbol}</span>
                    <span className="numeral text-hero text-fg">
                      <AnimatedNumber value={summary.totalOutstanding} format={(v) => splitMoney(v, base).value} stiffness={120} damping={26} />
                    </span>
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="micro text-faint">{formatMoney(summary.totalLimit, base)} LIMIT</span>
                    <span className="micro text-acidink">{formatMoney(summary.totalAvailable, base)} AVAILABLE</span>
                  </div>
                </div>

                {/* Band chip */}
                <div className="shrink-0 text-right">
                  <span className={cx('micro border px-2 py-1 font-bold', utilSignal === 'acid' ? 'border-acid text-acidink' : utilSignal === 'blue' ? 'border-blue text-blueink' : utilSignal === 'orange' ? 'border-orange text-orangeink' : 'border-red text-redink')}>
                    {band.label}
                  </span>
                  <span className="numeral mt-1 block text-[22px] font-bold text-fg">{(util * 100).toFixed(0)}%</span>
                  <span className="micro text-faint">UTILISATION</span>
                </div>
              </div>

              {/* Utilisation scale with 30/50/80 zone marks */}
              <div className="relative mt-4">
                <div className="relative h-4 w-full border border-line bg-surface2">
                  <motion.div
                    className={cx('h-full', utilSignal === 'red' ? 'bg-red' : utilSignal === 'orange' ? 'bg-orange' : utilSignal === 'blue' ? 'bg-blue' : 'bg-acid')}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, util * 100)}%` }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  />
                  {[30, 50, 80].map((p) => (
                    <span key={p} aria-hidden="true" className="absolute inset-y-0 w-px bg-linehard" style={{ left: `${p}%` }} />
                  ))}
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="micro text-[8px] text-faint">0</span>
                  <span className="micro text-[8px] text-faint">30 SAFE</span>
                  <span className="micro text-[8px] text-faint">50</span>
                  <span className="micro text-[8px] text-faint">80 CRIT</span>
                  <span className="micro text-[8px] text-faint">100</span>
                </div>
              </div>

              {/* Cycle readouts */}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-4">
                {[
                  { label: 'CYCLE SPEND', value: formatCompact(summary.cycleSpendTotal, base), cls: 'text-fg' },
                  { label: 'CYCLE PAYMENTS', value: formatCompact(summary.cyclePaymentsTotal, base), cls: 'text-acidink' },
                  { label: 'MIN DUE', value: formatCompact(totalMinDue, base), cls: 'text-orangeink' },
                  { label: 'CARRY COST / MO', value: formatCompact(summary.carryInterestMonthly, base), cls: 'text-redink' },
                ].map((item) => (
                  <div key={item.label}>
                    <span className="micro block text-faint">{item.label}</span>
                    <span className={cx('numeral mt-0.5 block text-[15px] font-bold', item.cls)}>{item.value}</span>
                  </div>
                ))}
              </div>
            </CutPanel>
          </motion.div>

          {/* Activity: 28 days / 12 months */}
          <motion.div variants={RISE}>
            <CutPanel cut="none" cutSize={0} innerClassName="p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SectionHeader
                  code={activity === '28d' ? 'TRND' : 'REG'}
                  title={activity === '28d' ? '28-day purchase trend' : '12-month register'}
                  signal="blue"
                  className="border-b-0 px-0 pt-0"
                />
                <SegmentedControl
                  ariaLabel="Activity window"
                  size="sm"
                  value={activity}
                  onChange={(v) => setActivity(v)}
                  options={[
                    { value: '28d', label: '28 DAYS' },
                    { value: '12m', label: '12 MONTHS' },
                  ]}
                />
              </div>

              {activity === '28d' ? (
                d28Total > 0 ? (
                  <>
                    <div className="mt-3 flex items-end gap-[3px]" style={{ height: 120 }}>
                      {summary.dailySeries.map((d) => (
                        <div key={d.iso} className="group/day relative flex min-w-0 flex-1 flex-col items-center justify-end" title={`${d.label}: ${formatMoney(d.amount, base)}`}>
                          <span
                            className={cx('block w-full rounded-[1px] transition-all', d.amount > 0 ? 'bg-blue group-hover/day:brightness-125' : 'bg-line')}
                            style={{ height: Math.max(2, (d.amount / d28Max) * 112) }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between border-t border-line pt-1.5">
                      <span className="micro text-faint">{summary.dailySeries[0]?.label} — {summary.dailySeries[summary.dailySeries.length - 1]?.label}</span>
                      <span className="micro text-faint">TOTAL {formatMoney(d28Total, base)}</span>
                    </div>
                  </>
                ) : (
                  <div className="mt-3 flex h-[150px] flex-col items-center justify-center border border-line bg-bg2">
                    <span className="micro text-dim">NO CARD ACTIVITY IN THE LAST 28 DAYS</span>
                    <span className="micro mt-1 text-faint">SWITCH TO 12 MONTHS FOR THE FULL REGISTER</span>
                  </div>
                )
              ) : (
                <>
                  <div className="mt-3 flex items-end gap-1.5" style={{ height: 116 }}>
                    {summary.monthlySeries.map((m) => (
                      <div key={m.key} className="group/m relative flex min-w-0 flex-1 flex-col items-center justify-end gap-[2px]" title={`${m.label} — spend ${formatMoney(m.spend, base)} · payments ${formatMoney(m.payments, base)}`}>
                        <span className="block w-full bg-line2 transition-colors group-hover/m:bg-fg" style={{ height: Math.max(2, (m.spend / m12.max) * 84) }} />
                        <span className="block w-full bg-acid" style={{ height: Math.max(2, (m.payments / m12.max) * 84), opacity: m.payments > 0 ? 0.9 : 0.2 }} />
                        <span className="micro text-[8px] text-faint">{m.label.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-1.5">
                    <span className="micro flex items-center gap-3 text-faint">
                      <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-line2" /> SPEND {formatCompact(m12.spend, base)}</span>
                      <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-acid" /> PAYMENTS {formatCompact(m12.payments, base)}</span>
                    </span>
                    <span className="micro text-faint">LAST 12 MONTHS</span>
                  </div>
                </>
              )}
            </CutPanel>
          </motion.div>

          {/* Category distribution */}
          <motion.div variants={RISE}>
            <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
              <SectionHeader code="CAT" title="Category distribution" signal="magenta" right={<span className="micro text-faint">ALL-TIME CARD SPEND</span>} />
              {summary.categories.length ? (
                <div className="divide-y divide-line">
                  {summary.categories.map((c) => (
                    <div key={c.category} className="flex items-center gap-3 px-3 py-2 md:px-4">
                      <span className="micro w-9 font-semibold" style={{ color: SIGNAL_HEX[c.signal] }}>{c.code}</span>
                      <span className="micro hidden min-w-[80px] text-faint sm:block">{c.label}</span>
                      <div className="min-w-0 flex-1">
                        <div className="h-2 w-full bg-surface2 border border-line">
                          <div className="h-full" style={{ width: `${Math.max(1, (c.amount / (summary.categories[0]?.amount || 1)) * 100)}%`, background: SIGNAL_HEX[c.signal] }} />
                        </div>
                      </div>
                      <span className="numeral w-16 shrink-0 text-right text-[12px] text-fg">{formatCompact(c.amount, base)}</span>
                      <span className="micro w-10 shrink-0 text-right text-faint">{(c.share * 100).toFixed(0)}%</span>
                      <span className="micro w-8 shrink-0 text-right text-dim">{c.count}×</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="meta px-3 py-5 text-faint">NO CARD SPEND YET.</p>
              )}
            </CutPanel>
          </motion.div>
        </div>

        {/* ── RIGHT 4 ── */}
        <div className="flex flex-col gap-3 lg:col-span-4">
          {/* Next payment */}
          <motion.div variants={RISE}>
            <CutPanel cut="br" cutSize={16} innerClassName="p-4">
              <SectionHeader code="DUE" title="Next payment" signal={summary.nextDue && summary.nextDue.days <= 3 ? 'red' : 'orange'} className="border-b-0 px-0 pt-0" />
              {summary.nextDue && nextView ? (
                <>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="numeral text-[38px] font-bold leading-none text-fg">{summary.nextDue.days}</span>
                    <span className="numeral pb-1 text-[13px] text-dim">DAYS</span>
                  </div>
                  <span className="micro mt-2 block text-fg font-medium">{summary.nextDue.card.name} ··{summary.nextDue.card.last4}</span>
                  <span className="micro block text-faint">DUE {formatSignalDate(summary.nextDue.date)}</span>
                  <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-2">
                    <div>
                      <span className="micro block text-faint">BALANCE</span>
                      <span className="numeral text-[13px] font-bold text-fg">{formatMoney(nextView.balance, nextView.card.currency)}</span>
                    </div>
                    <div>
                      <span className="micro block text-faint">MIN DUE</span>
                      <span className="numeral text-[13px] font-bold text-orangeink">{formatMoney(nextView.minDue, nextView.card.currency)}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className={cx(
                      'micro border px-1.5 py-0.5 font-semibold',
                      nextView.statement.status === 'paid' ? 'border-acid text-acidink' : nextView.statement.status === 'unpaid' || nextView.statement.status === 'partial' ? 'border-red text-redink' : 'border-line2 text-faint',
                    )}>
                      {nextView.statement.status === 'paid' ? 'STATEMENT PAID' : nextView.statement.status === 'unpaid' ? 'STATEMENT UNPAID' : nextView.statement.status === 'partial' ? 'PARTIALLY PAID' : nextView.statement.status === 'current' ? 'STATEMENT OPEN' : 'NO ACTIVITY'}
                    </span>
                    <CyberButton variant="solid" size="sm" onClick={payNow}>PAY NOW</CyberButton>
                  </div>
                </>
              ) : (
                <p className="meta mt-2 text-faint">NO ACTIVE CARDS.</p>
              )}
            </CutPanel>
          </motion.div>

          {/* Per-card health */}
          <motion.div variants={RISE}>
            <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
              <SectionHeader code="PERC" title="Per-card health" signal="blue" />
              <div className="divide-y divide-line">
                {summary.views.map((view) => (
                  <Link key={view.card.id} to={`/cards/flow/${view.card.id}`} className="block px-3 py-2.5 transition-colors hover:bg-surface2 md:px-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12.5px] font-medium text-fg">{view.card.name} ··{view.card.last4}</span>
                      <span className={cx('numeral shrink-0 text-[13px] font-bold', SIGNAL_TEXT[view.signal])}>{(view.utilisation * 100).toFixed(0)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full bg-surface2 border border-line">
                      <div className={cx('h-full', view.utilisation >= 0.8 ? 'bg-red' : view.utilisation >= 0.5 ? 'bg-orange' : view.utilisation >= 0.2 ? 'bg-blue' : 'bg-acid')} style={{ width: `${Math.max(2, view.utilisation * 100)}%` }} />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-faint">
                      <span>BAL {formatCompact(view.balance, view.card.currency)}</span>
                      <span>CYCLE {formatCompact(view.cycleSpend, base)}</span>
                      <span className="text-magentaink">{Math.round(view.totalRewards)} PTS</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CutPanel>
          </motion.div>

          {/* Rewards & cost */}
          <motion.div variants={RISE}>
            <CutPanel cut="tr" cutSize={14} innerClassName="p-4">
              <SectionHeader code="RWD" title="Rewards & cost" signal="magenta" className="border-b-0 px-0 pt-0" />
              <div className="mt-2 grid grid-cols-3 divide-x divide-line">
                <div className="pr-2">
                  <span className="micro block text-faint">EARNED</span>
                  <span className="numeral mt-0.5 block text-[17px] font-bold text-magentaink">{Math.round(summary.rewards.total)}</span>
                  <span className="micro text-faint">POINTS</span>
                </div>
                <div className="px-2">
                  <span className="micro block text-faint">VELOCITY</span>
                  <span className="numeral mt-0.5 block text-[17px] font-bold text-fg">{summary.rewards.rate.toFixed(1)}</span>
                  <span className="micro text-faint">PTS / {formatMoney(100, base)}</span>
                </div>
                <div className="pl-2">
                  <span className="micro block text-faint">FEES</span>
                  <span className="numeral mt-0.5 block text-[17px] font-bold text-redink">{formatCompact(summary.totalFees, base)}</span>
                  <span className="micro text-faint">ALL-TIME</span>
                </div>
              </div>
              {summary.rewards.topCategory && (
                <p className="micro mt-2 border-t border-line pt-2 text-faint">
                  TOP EARN · <span className="text-fg">{SPEND_CATEGORY_LABEL[summary.rewards.topCategory.category].toUpperCase()}</span> {Math.round(summary.rewards.topCategory.points)} PTS
                </p>
              )}
              <div className="mt-2 border-t border-line pt-2">
                <span className="micro text-faint">POINTS / MONTH</span>
                <div className="mt-1.5 flex items-end gap-1" style={{ height: 40 }}>
                  {summary.rewards.byMonth.map((m) => {
                    const max = Math.max(1, ...summary.rewards.byMonth.map((x) => x.points))
                    return (
                      <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${m.label}: ${Math.round(m.points)} pts`}>
                        <span className="block w-full bg-magenta" style={{ height: Math.max(2, (m.points / max) * 28), opacity: m.points > 0 ? 1 : 0.25 }} />
                        <span className="micro text-[8px] text-faint">{m.label.slice(0, 3)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CutPanel>
          </motion.div>

          {/* Statement compliance */}
          <motion.div variants={RISE}>
            <CutPanel cut="none" cutSize={0} innerClassName="p-4">
              <div className="flex items-center justify-between">
                <span className="micro text-faint">STATEMENTS PAID IN FULL</span>
                <span className={cx('numeral text-[15px] font-bold', summary.statementCompliance !== null && summary.statementCompliance < 0.5 ? 'text-redink' : summary.statementCompliance !== null && summary.statementCompliance < 1 ? 'text-orangeink' : 'text-acidink')}>
                  {summary.statementCompliance !== null ? `${(summary.statementCompliance * 100).toFixed(0)}%` : '—'}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full bg-surface2 border border-line">
                <div
                  className={cx('h-full', summary.statementCompliance !== null && summary.statementCompliance < 0.5 ? 'bg-red' : summary.statementCompliance !== null && summary.statementCompliance < 1 ? 'bg-orange' : 'bg-acid')}
                  style={{ width: `${Math.max(2, (summary.statementCompliance ?? 0) * 100)}%` }}
                />
              </div>
              <p className="micro mt-1 text-faint">LAST 6 CLOSED STATEMENTS PER CARD · SETTLEABLE ONLY</p>
            </CutPanel>
          </motion.div>
        </div>
      </div>

      {/* Statistics table */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tl-br" cutSize={14} innerClassName="p-0">
          <SectionHeader code="STAT" title="Detailed statistics" signal="blue" />
          <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-y-0 md:divide-x">
            <div className="divide-y divide-line">
              {[
                ['TOTAL OUTSTANDING', formatMoney(summary.totalOutstanding, base)],
                ['TOTAL CREDIT LIMIT', formatMoney(summary.totalLimit, base)],
                ['TOTAL AVAILABLE', formatMoney(summary.totalAvailable, base)],
                ['OVERALL UTILISATION', `${(util * 100).toFixed(1)}%`],
                ['CYCLE SPEND (ALL CARDS)', formatMoney(summary.cycleSpendTotal, base)],
                ['CYCLE PAYMENTS', formatMoney(summary.cyclePaymentsTotal, base)],
                ['EST. MIN DUE (ALL CARDS)', formatMoney(totalMinDue, base)],
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
                ['REWARDS VELOCITY', summary.rewards.rate > 0 ? `${summary.rewards.rate.toFixed(2)} PTS / ${formatMoney(100, base)}` : '—'],
                ['FEES + INTEREST ALL-TIME', formatMoney(summary.totalFees, base)],
                ['CARRY COST / MONTH', formatMoney(summary.carryInterestMonthly, base)],
                ['STATEMENTS PAID IN FULL', summary.statementCompliance !== null ? `${(summary.statementCompliance * 100).toFixed(0)}%` : '—'],
                ['NEXT PAYMENT DUE', summary.nextDue ? `${summary.nextDue.card.name} · ${summary.nextDue.days}D · MIN ${formatMoney(summary.nextDue.minDue, base)}` : '—'],
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
