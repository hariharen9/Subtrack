/**
 * SUBTRACK // OVERVIEW (CORE)
 *
 * The command centre. One enormous number, one load register, the incoming
 * stream and the running processes — arranged as an asymmetric instrumentation
 * board rather than a stack of dashboard cards.
 *
 * Layout is deliberate: the hero and its readouts occupy the left 8 columns, the
 * right 4 carry status and observations, and the wide lower row splits between
 * the incoming flow and the process grid.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useSignalSeries, useSystem } from '@/hooks/useSystem'
import { useUI } from '@/store/ui'
import { formatMoney, formatPercent, splitMoney, formatCompact } from '@/lib/money'
import { formatSignalDate, todayISO, relativeDay } from '@/lib/date'
import { CATEGORY_CODE, CATEGORY_LABEL } from '@/lib/types'
import { pidOf } from '@/lib/id'
import { viewOf } from '@/lib/analytics'
import { CutPanel } from '@/components/ui/CutPanel'
import { CyberButton } from '@/components/ui/CyberButton'
import { DataStrip } from '@/components/ui/DataStrip'
import { SectionHeader, HashRule } from '@/components/ui/Micro'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { EmptyState } from '@/components/ui/Skeleton'
import { Led, SIGNAL_TEXT } from '@/components/ui/Signal'
import { BurnRail } from '@/components/charts/BurnRail'
import { SpendingSignal, type SignalMode } from '@/components/charts/SpendingSignal'
import { CategoryBar, CompositionStrip, RadialGauge } from '@/components/charts/CategoryBlock'
import { IncomingStream, IncomingRail } from '@/components/subs/IncomingStream'
import { SystemNotes } from '@/components/subs/SystemNotes'
import { ProcessCard } from '@/components/subs/ProcessCard'
import { ServiceBadge } from '@/components/brand/ServiceBadge'
import { IconArrowRight, IconPlus } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}
const RISE = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } },
}

export default function Overview() {
  const { summary } = useSystem()
  const base = useUI((s) => s.baseCurrency)
  const horizonDays = useUI((s) => s.horizonDays)
  const openComposer = useUI((s) => s.openComposer)
  const [mode, setMode] = useState<SignalMode>('runrate')
  const [hoveredClusterDay, setHoveredClusterDay] = useState<number | null>(null)
  const series = useSignalSeries(mode, 7, 3)
  const today = todayISO()

  const hero = useMemo(() => splitMoney(summary.monthlyBurn, base), [summary.monthlyBurn, base])
  const next = summary.nextPayment
  const topCategory = summary.categories[0]
  /** Suspended and terminated processes as views, for the archive rail. */
  const archiveViews = useMemo(
    () =>
      [...summary.suspended, ...summary.terminated]
        .slice(0, 6)
        .map((sub) => viewOf(sub, base, today, summary.monthlyBurn)),
    [summary.suspended, summary.terminated, summary.monthlyBurn, base, today],
  )

  const signalStats = useMemo(() => {
    const valid = series.filter((p) => p.amount > 0)
    if (!valid.length) return { max: 0, maxLabel: '—', min: 0, minLabel: '—', avg: 0 }
    let max = valid[0]
    let min = valid[0]
    let sum = 0
    for (const p of valid) {
      sum += p.amount
      if (p.amount > max.amount) max = p
      if (p.amount < min.amount) min = p
    }
    return {
      max: max.amount,
      maxLabel: max.label,
      min: min.amount,
      minLabel: min.label,
      avg: sum / valid.length,
    }
  }, [series])

  if (summary.active.length === 0 && summary.terminated.length === 0) {
    return (
      <div className="px-3 py-6 md:px-5">
        <EmptyState
          code="NO ACTIVE SUBSCRIPTIONS"
          title="SYSTEM IS CURRENTLY CLEAN."
          description="Nothing is draining this month. Add your first subscription to start monitoring where the money goes."
          action={{ label: '+ ADD FIRST SUBSCRIPTION', onClick: () => openComposer() }}
        />
      </div>
    )
  }

  return (
    <motion.div
      variants={STAGGER}
      initial="hidden"
      animate="show"
      className="px-3 py-4 md:px-5 md:py-5"
    >
      {/* ---------------- header summary bar ---------------- */}
      <motion.div variants={RISE}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line pb-2 text-faint">
          <span className="micro flex items-center gap-2">
            <span className="text-fg font-medium">FINANCIAL SNAPSHOT</span>
            <span className="text-linehard">·</span>
            <span>{summary.activeCount} active subscriptions</span>
          </span>
          <span className="micro hidden sm:inline text-faint">
            {summary.categories.length} categories monitored
          </span>
        </div>
      </motion.div>

      <div className="mt-4 grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        {/* ==================== LEFT COLUMN (8 cols) ==================== */}
        <div className="flex flex-col gap-3 lg:col-span-8">
          {/* ---------------- hero ---------------- */}
          <motion.div variants={RISE}>
            <CutPanel cut="tl-br" cutSize={18} innerClassName="relative overflow-hidden p-4 md:p-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 dot-field opacity-[0.22]"
              />
              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="micro text-acidink">MONTHLY BURN</span>
                      <span className="micro text-faint">AVG / 30D</span>
                    </div>
                    <h1 className="mt-2 flex items-start gap-1">
                      <span className="numeral mt-1 text-[clamp(1.6rem,4.5vw,2.6rem)] text-dim">
                        {hero.symbol}
                      </span>
                      <span className="numeral text-hero text-fg">
                        <AnimatedNumber
                          value={summary.monthlyBurn}
                          format={(value) => splitMoney(value, base).value}
                          stiffness={120}
                          damping={26}
                        />
                      </span>
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span
                        className={cx(
                          'micro',
                          summary.runRateDelta > 0
                            ? 'text-orangeink'
                            : summary.runRateDelta < 0
                              ? 'text-acidink'
                              : 'text-faint',
                        )}
                      >
                        {formatPercent(summary.runRateDelta, 1)} VS PREVIOUS CYCLE
                      </span>
                      <span className="micro text-faint">
                        {formatMoney(summary.dailyBurn, base)} BURNED DAILY
                      </span>
                    </div>
                  </div>

                  {/* next charge block */}
                  {next && (
                    <Link
                      to={`/flow/${next.sub.id}`}
                      className="group min-w-[168px] border border-line2 bg-bg2 p-2.5 transition-colors hover:border-linehard focus-visible:outline-none"
                    >
                      <span className="micro flex items-center justify-between gap-2 text-faint">
                        NEXT TRANSACTION
                        <Led
                          signal={next.days <= 1 ? 'orange' : 'blue'}
                          size="sm"
                          pulse={next.days <= 1}
                        />
                      </span>
                      <span className="mt-2 flex items-center gap-2">
                        <ServiceBadge icon={next.sub.icon} color={next.sub.color} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-semibold text-fg">
                            {next.sub.name}
                          </span>
                          <span className="micro block text-faint">
                            {formatSignalDate(next.date)}
                          </span>
                        </span>
                      </span>
                      <span className="mt-2 flex items-end justify-between gap-2">
                        <span className="numeral text-[22px] text-fg">
                          {formatMoney(next.amount, next.sub.currency)}
                        </span>
                        <span
                          className={cx(
                            'micro',
                            next.days <= 1 ? 'text-orangeink' : 'text-dim',
                          )}
                        >
                          {relativeDay(next.date, today).label}
                        </span>
                      </span>
                    </Link>
                  )}
                </div>

                {/* readouts */}
                <div className="mt-4 border-y border-line">
                  <DataStrip
                    items={[
                      {
                        label: 'Projected annual load',
                        value: formatMoney(summary.annualLoad, base),
                        signal: 'blue',
                      },
                      {
                        label: 'Active subscriptions',
                        value: String(summary.activeCount).padStart(2, '0'),
                        signal: 'acid',
                      },
                      { label: 'Average subscription', value: formatMoney(summary.avgCost, base) },
                      {
                        label: 'Highest cost',
                        value: summary.highest
                          ? `${summary.highest.sub.name} · ${formatMoney(summary.highest.monthly, base)}`
                          : '—',
                        hint: summary.highest ? 'Normalised per month' : undefined,
                      },
                      {
                        label: 'Top category',
                        value: topCategory
                          ? `${CATEGORY_LABEL[topCategory.category]} · ${(topCategory.share * 100).toFixed(0)}%`
                          : '—',
                      },
                      {
                        label: `Charges in ${horizonDays}D`,
                        value: `${summary.incoming30.length} · ${formatMoney(summary.incoming30Total, base)}`,
                        signal: 'orange',
                      },
                    ]}
                  />
                </div>

                {/* the signature instrument */}
                <div className="mt-5">
                  <BurnRail views={summary.views} total={summary.monthlyBurn} base={base} />
                </div>
              </div>
            </CutPanel>
          </motion.div>

          {/* ---------------- signal monitor ---------------- */}
          <motion.div variants={RISE}>
            <CutPanel cut="none" cutSize={0} innerClassName="p-4 md:p-5">
              <SectionHeader
                code="SIG"
                title="Spending signal & telemetry"
                signal={mode === 'runrate' ? 'acid' : 'blue'}
                className="border-b-0 px-0 pt-0"
                right={
                  <span className="micro text-faint">
                    {summary.thisMonthKey} · {formatMoney(summary.thisMonthCash, base)} RECORDED
                  </span>
                }
              />

              <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <SpendingSignal
                    points={series}
                    mode={mode}
                    onModeChange={setMode}
                    base={base}
                    height={220}
                  />
                </div>

                {/* Side telemetry deck */}
                <div className="flex flex-col justify-between gap-2.5 border-t border-line pt-3 xl:col-span-4 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-4">
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-1">
                    {/* Momentum tile */}
                    <div className="border border-line bg-bg2 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="micro text-faint">CYCLE MOMENTUM</span>
                        <Led
                          signal={
                            (mode === 'runrate' ? summary.runRateDelta : summary.cashDelta) > 0
                              ? 'orange'
                              : (mode === 'runrate' ? summary.runRateDelta : summary.cashDelta) < 0
                                ? 'acid'
                                : 'blue'
                          }
                          size="sm"
                        />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span
                          className={cx(
                            'numeral text-[17px]',
                            (mode === 'runrate' ? summary.runRateDelta : summary.cashDelta) > 0
                              ? 'text-orangeink'
                              : (mode === 'runrate' ? summary.runRateDelta : summary.cashDelta) < 0
                                ? 'text-acidink'
                                : 'text-dim',
                          )}
                        >
                          {formatPercent(mode === 'runrate' ? summary.runRateDelta : summary.cashDelta)}
                        </span>
                        <span className="micro text-faint">VS PREV</span>
                      </div>
                      <p className="micro mt-0.5 truncate text-faint">
                        {mode === 'runrate' ? 'Normalised velocity' : 'Recorded cash move'}
                      </p>
                    </div>

                    {/* Cash vs Run-Rate gap */}
                    <div className="border border-line bg-bg2 p-2.5">
                      <span className="micro text-faint">CASH VS RUN-RATE</span>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="numeral text-[16px] text-fg">
                          {formatMoney(Math.abs(summary.thisMonthCash - summary.monthlyBurn), base)}
                        </span>
                        <span className="micro text-dim">
                          {summary.thisMonthCash >= summary.monthlyBurn ? 'SURGE' : 'DEFICIT'}
                        </span>
                      </div>
                      <p className="micro mt-0.5 truncate text-faint">
                        {summary.thisMonthCash >= summary.monthlyBurn
                          ? 'Lump sums landing this cycle'
                          : 'Cash below average run-rate'}
                      </p>
                    </div>

                    {/* Range extremes */}
                    <div className="col-span-2 border border-line bg-bg2 p-2.5 sm:col-span-1 xl:col-span-1">
                      <div className="flex items-center justify-between text-faint">
                        <span className="micro">CYCLE EXTREMES</span>
                        <span className="micro text-faint">{series.length}M WINDOW</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <div>
                          <span className="micro block text-faint">MAX ({signalStats.maxLabel})</span>
                          <span className="meta text-fg">{formatMoney(signalStats.max, base)}</span>
                        </div>
                        <div className="text-right">
                          <span className="micro block text-faint">MIN ({signalStats.minLabel})</span>
                          <span className="meta text-dim">{formatMoney(signalStats.min, base)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mode descriptor badge */}
                  <div className="border border-line2 bg-surface px-2.5 py-1.5 text-dim">
                    <div className="flex items-center gap-1.5">
                      <span className="block h-1.5 w-1.5 bg-acid" />
                      <span className="micro font-mono text-[10px] text-faint">
                        {mode === 'runrate'
                          ? 'SPREADS ANNUAL & CUSTOM CYCLES SMOOTHLY'
                          : 'RECONSTRUCTED EXACT BILLING SETTLEMENTS'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <HashRule label="RECORDED LEDGER → 3-MONTH PREDICTIVE FORECAST" className="mt-3" />
            </CutPanel>
          </motion.div>

          {/* ---------------- distribution & exposure matrix (2 components) ---------------- */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Category distribution */}
            <motion.div variants={RISE}>
              <CutPanel cut="tl" cutSize={14} innerClassName="p-0" className="h-full flex flex-col justify-between">
                <div>
                  <SectionHeader
                    code="CAT"
                    title="Category breakdown"
                    signal="magenta"
                    right={
                      <Link to="/data" className="micro text-faint hover:text-fg">
                        VIEW ALL {summary.categories.length} →
                      </Link>
                    }
                  />
                  <div className="p-3 pb-0">
                    <CompositionStrip slices={summary.categories} height={16} />
                  </div>
                  <div className="divide-y divide-line">
                    {summary.categories.slice(0, 4).map((slice) => (
                      <CategoryBar
                        key={slice.category}
                        slice={slice}
                        max={summary.categories[0]?.monthly || 1}
                        base={base}
                        compact
                      />
                    ))}
                  </div>
                </div>
                <div className="border-t border-line bg-bg2 px-3 py-2 text-right">
                  <span className="micro text-faint">
                    {summary.categories.length} CATEGORIES · DOMINANT:{' '}
                    <span className="text-fg">{topCategory?.label.toUpperCase() || '—'}</span> (
                    {topCategory ? (topCategory.share * 100).toFixed(0) : 0}%)
                  </span>
                </div>
              </CutPanel>
            </motion.div>

            {/* Exposure & Concentration */}
            <motion.div variants={RISE}>
              <CutPanel cut="br" cutSize={14} innerClassName="p-0" className="h-full flex flex-col justify-between">
                <div>
                  <SectionHeader
                    code="EXP"
                    title="Exposure & cycle mix"
                    signal="orange"
                    right={
                      <span className="micro text-faint">
                        {summary.concentration.count} LEADERS
                      </span>
                    }
                  />
                  <div className="p-3.5">
                    <div className="flex items-center justify-around gap-2">
                      <RadialGauge
                        value={summary.concentration.share}
                        label="TOP 3"
                        caption="CONCENTRATION"
                        signal={summary.concentration.share > 0.6 ? 'magenta' : 'acid'}
                        size={115}
                      />
                      <div className="flex flex-col gap-2 min-w-0 flex-1">
                        <div className="border border-line bg-bg2 p-2">
                          <span className="micro block text-faint">TOP 3 SUBSCRIPTIONS</span>
                          <p className="meta truncate text-fg font-medium mt-0.5">
                            {summary.views.slice(0, 2).map((v) => v.sub.name).join(', ')}
                            {summary.views.length > 2 ? `, +1 more` : ''}
                          </p>
                          <span className="micro text-magenta font-mono">
                            {(summary.concentration.share * 100).toFixed(1)}% OF TOTAL BURN
                          </span>
                        </div>
                        <div className="border border-line bg-bg2 p-2">
                          <span className="micro block text-faint">CYCLE MIX</span>
                          <div className="mt-0.5 flex items-center justify-between text-[11px]">
                            <span className="text-dim">
                              {summary.views.filter((v) => v.sub.billingCycle === 'monthly').length}M ·{' '}
                              {summary.views.filter((v) => v.sub.billingCycle === 'yearly').length}Y ·{' '}
                              {summary.views.filter((v) => !['monthly', 'yearly'].includes(v.sub.billingCycle)).length} Other
                            </span>
                            <span className="micro text-acidink">
                              {formatMoney(
                                summary.views
                                  .filter((v) => v.sub.billingCycle === 'yearly')
                                  .reduce((s, v) => s + v.monthly, 0),
                                base,
                              )}
                              /MO YR
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-line bg-bg2 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="micro text-faint">DORMANCY SCAN</span>
                    <span className={cx('micro flex items-center gap-1.5', summary.dormant.length ? 'text-orangeink' : 'text-acidink')}>
                      <Led signal={summary.dormant.length ? 'orange' : 'acid'} size="sm" />
                      {summary.dormant.length
                        ? `${summary.dormant.length} IDLING (30D+ INACTIVE)`
                        : 'ALL SUBSCRIPTIONS ACTIVE'}
                    </span>
                  </div>
                </div>
              </CutPanel>
            </motion.div>
          </div>
        </div>

        {/* ==================== RIGHT COLUMN (4 cols) ==================== */}
        <div className="flex flex-col gap-3 lg:col-span-4">
          <motion.div variants={RISE}>
            <CutPanel cut="br" cutSize={14} innerClassName="p-0">
              <SectionHeader
                code="SYS"
                title="System notes"
                signal={summary.notes.some((note) => note.signal === 'red') ? 'red' : 'acid'}
                right={<span className="micro text-faint">{summary.notes.length} SIGNALS</span>}
              />
              <SystemNotes notes={summary.notes} compact />
            </CutPanel>
          </motion.div>

          <motion.div variants={RISE}>
            <CutPanel cut="tr" cutSize={14} innerClassName="p-3.5" hover>
              <div className="flex items-center justify-between gap-2">
                <span className="micro text-faint transition-colors">
                  {hoveredClusterDay !== null
                    ? `DAY +${hoveredClusterDay} // ${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][hoveredClusterDay]}`
                    : 'LOAD CLUSTER // NEXT 7 DAYS'}
                </span>
                <span className="micro font-mono text-orangeink transition-all">
                  {formatMoney(
                    hoveredClusterDay !== null
                      ? summary.incoming7
                          .filter((e) => e.days === hoveredClusterDay)
                          .reduce((sum, e) => sum + e.baseAmount, 0)
                      : summary.incoming7.reduce((sum, event) => sum + event.baseAmount, 0),
                    base,
                  )}
                </span>
              </div>

              <div
                className="mt-2.5 flex items-end gap-[4px] py-1"
                onMouseLeave={() => setHoveredClusterDay(null)}
              >
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const dayEvents = summary.incoming7.filter((event) => event.days === dayIndex)
                  const amount = dayEvents.reduce((sum, event) => sum + event.baseAmount, 0)
                  const ratio = Math.min(1, amount / Math.max(summary.dailyBurn * 3, 1))
                  const isHovered = hoveredClusterDay === dayIndex
                  const isOtherHovered = hoveredClusterDay !== null && !isHovered

                  return (
                    <button
                      key={dayIndex}
                      type="button"
                      onMouseEnter={() => setHoveredClusterDay(dayIndex)}
                      onFocus={() => setHoveredClusterDay(dayIndex)}
                      className="group/day flex flex-1 flex-col items-center gap-1.5 focus-visible:outline-none"
                    >
                      <span
                        className={cx(
                          'block w-full transition-all duration-200 rounded-[1px]',
                          amount > 0
                            ? isHovered
                              ? 'bg-orange brightness-125 shadow-[0_0_12px_rgba(249,115,22,0.8)] scale-y-110'
                              : isOtherHovered
                                ? 'bg-orange opacity-40'
                                : 'bg-orange group-hover/day:brightness-110 group-hover/day:scale-y-105'
                            : isHovered
                              ? 'bg-line2 scale-y-110'
                              : 'bg-line group-hover/day:bg-line2',
                        )}
                        style={{
                          height: 8 + ratio * 54,
                          transformOrigin: 'bottom',
                        }}
                      />
                      <span
                        className={cx(
                          'micro transition-colors duration-150',
                          isHovered
                            ? 'text-orangeink font-semibold'
                            : isOtherHovered
                              ? 'text-faint/50'
                              : 'text-faint group-hover/day:text-fg',
                        )}
                      >
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayIndex]}
                      </span>
                    </button>
                  )
                })}
              </div>

              <p className="meta mt-3 text-dim transition-all">
                {hoveredClusterDay !== null ? (
                  (() => {
                    const dayEvents = summary.incoming7.filter((e) => e.days === hoveredClusterDay)
                    if (!dayEvents.length) return 'No charges scheduled on this day.'
                    return `${dayEvents.length} charge${dayEvents.length > 1 ? 's' : ''}: ${dayEvents
                      .map((e) => e.sub.name)
                      .join(', ')}`
                  })()
                ) : summary.incoming7.length === 0 ? (
                  'No charges scheduled in the next seven days.'
                ) : (
                  `${summary.incoming7.length} charges land in the next 7 days — ${
                    summary.incoming7.length > 2 ? 'clustered load detected' : 'spread load'
                  }.`
                )}
              </p>
            </CutPanel>
          </motion.div>

          {topCategory && (
            <motion.div variants={RISE}>
              <Link to="/flow" className="block focus-visible:outline-none">
                <CutPanel cut="tl" cutSize={14} innerClassName="p-3.5 group cursor-pointer" hover>
                  <div className="flex items-center justify-between">
                    <span className="micro text-faint">DOMINANT CATEGORY</span>
                    <span className="micro flex items-center gap-1 text-dim opacity-0 transition-opacity duration-200 group-hover:opacity-100 text-acidink">
                      FILTER FLOW <IconArrowRight size={10} />
                    </span>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <span
                      className={cx(
                        'numeral text-[28px] transition-transform duration-200 group-hover:scale-105',
                        SIGNAL_TEXT[topCategory.signal],
                      )}
                    >
                      {CATEGORY_CODE[topCategory.category]}
                    </span>
                    <span className="text-right">
                      <span className="meta block text-fg transition-colors group-hover:text-acidink">
                        {CATEGORY_LABEL[topCategory.category]}
                      </span>
                      <span className="micro block text-faint">
                        {formatMoney(topCategory.monthly, base)}/MO · {topCategory.count} SUBSCRIPTIONS
                      </span>
                    </span>
                  </div>
                  <div className="mt-2.5 flex gap-[2px]">
                    {Array.from({ length: 20 }).map((_, index) => {
                      const isActive = index < Math.round(topCategory.share * 20)
                      return (
                        <span
                          key={index}
                          className={cx(
                            'h-2 flex-1 transition-all duration-200',
                            isActive
                              ? 'bg-acid group-hover:brightness-125 group-hover:shadow-[0_0_6px_rgba(202,255,0,0.5)]'
                              : 'bg-line group-hover:bg-line2',
                          )}
                          style={{
                            transitionDelay: isActive ? `${index * 12}ms` : undefined,
                          }}
                        />
                      )
                    })}
                  </div>
                </CutPanel>
              </Link>
            </motion.div>
          )}

          {/* ---------------- incoming stream ---------------- */}
          <motion.div variants={RISE}>
            <CutPanel cut="tl-br" cutSize={14} innerClassName="p-0" className="h-full">
              <SectionHeader
                code="IN"
                title="Incoming // next 30 days"
                signal="orange"
                right={<span className="micro text-faint">{summary.incoming30.length} EVENTS</span>}
              />
              {/* mobile gets a rail, desktop the full stream */}
              <div className="hidden md:block lg:max-h-[560px] lg:overflow-y-auto">
                <IncomingStream
                  events={summary.incoming30}
                  base={base}
                  today={today}
                  className="px-1"
                />
              </div>
              <div className="p-3 md:hidden">
                <IncomingRail events={summary.incoming30.slice(0, 10)} today={today} />
              </div>
            </CutPanel>
          </motion.div>
        </div>
      </div>

      {/* ---------------- lower section: active subscriptions ---------------- */}
      <div className="mt-4 flex flex-col gap-4">
        <motion.div variants={RISE}>
          <SectionHeader
            code="SUB"
            title="Active subscriptions"
            right={
              <Link
                to="/flow"
                className="micro flex items-center gap-1.5 text-dim transition-colors hover:text-acidink"
              >
                OPEN ALL {String(summary.views.length).padStart(2, '0')}
                <IconArrowRight size={12} />
              </Link>
            }
          />

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {summary.views.slice(0, 8).map((view, index) => (
              <ProcessCard key={view.sub.id} view={view} index={index} />
            ))}
          </div>

          {summary.views.length > 8 && (
            <div className="mt-3 flex justify-center">
              <CyberButton variant="ghost" to="/flow" trailing={<IconArrowRight size={14} />}>
                LOAD REMAINING {summary.views.length - 8} SUBSCRIPTIONS
              </CyberButton>
            </div>
          )}

          {summary.views.length === 0 && (
            <div className="mt-3">
              <EmptyState
                code="NO ACTIVE SUBSCRIPTIONS"
                title="SYSTEM IS CURRENTLY CLEAN."
                description="Every tracked subscription is suspended or terminated. Nothing is being charged."
                action={{ label: '+ ADD SUBSCRIPTION', onClick: () => openComposer() }}
              />
            </div>
          )}
        </motion.div>

        {/* ---------------- suspended / terminated ---------------- */}
        {(summary.suspended.length > 0 || summary.terminated.length > 0) && (
          <motion.div variants={RISE} className="lg:col-span-12">
            <CutPanel cut="br" cutSize={14} innerClassName="p-0">
              <SectionHeader
                code="ARC"
                title="Archive"
                signal="red"
                right={
                  <span className="micro text-faint">
                    {summary.suspended.length} SUSPENDED · {summary.terminated.length} TERMINATED
                  </span>
                }
              />
              <ul className="divide-y divide-line">
                {archiveViews.map((view) => (
                  <li key={view.sub.id}>
                    <Link
                      to={`/flow/${view.sub.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface2 focus-visible:outline-none md:px-4"
                    >
                      <ServiceBadge icon={view.sub.icon} color={view.sub.color} size="sm" dimmed />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] text-dim">{view.sub.name}</span>
                        <span className="pid block">
                          {pidOf(view.sub.id)} · STOPPED {view.sub.statusChangedAt ?? '—'}
                        </span>
                      </span>
                      <span className={cx('micro', view.sub.status === 'suspended' ? 'text-orangeink' : 'text-redink')}>
                        {view.sub.status.toUpperCase()}
                      </span>
                      <span className="meta hidden text-faint sm:block">
                        {formatCompact(view.monthly, base)}/MO AVOIDED
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CutPanel>
          </motion.div>
        )}
      </div>

      {/* floating quick action for narrow screens */}
      <div className="mt-4 flex justify-center md:hidden">
        <CyberButton
          variant="solid"
          size="lg"
          full
          leading={<IconPlus size={15} />}
          onClick={() => openComposer()}
        >
          NEW SUBSCRIPTION
        </CyberButton>
      </div>
    </motion.div>
  )
}
