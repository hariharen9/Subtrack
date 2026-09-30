/**
 * SPENDSTATE // SPENDS DATA (INSIGHTS & TELEMETRY)
 *
 * Deep financial telemetry for daily spends — the full instrumentation board.
 * Headline stat blocks, month-end projection, needs-vs-wants ratio, category
 * composition strip with distribution bars, payment channel matrix, weekday
 * cyclical heatmap, spend signal wire trace, top merchants, largest outliers,
 * and a comprehensive statistics table.
 */
import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useSpendInsights, useSpends } from '@/hooks/useSpends'
import { useUI } from '@/store/ui'
import { formatMoney, formatPercent, splitMoney, formatCompact } from '@/lib/money'
import { formatSignalDate, monthKey, shiftMonthKey, todayISO, diffDays } from '@/lib/date'
import { SPEND_CATEGORY_META } from '@/lib/types'
import { convert } from '@/lib/money'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { Led, SIGNAL_TEXT, SIGNAL_HEX } from '@/components/ui/Signal'
import { EmptyState } from '@/components/ui/Skeleton'
import { DataStrip } from '@/components/ui/DataStrip'
import { RadialGauge } from '@/components/charts/CategoryBlock'
import { SpendBadge } from '@/components/spends/SpendBadge'
import { SpendSignal } from '@/components/spends/SpendSignal'
import { spendSeries } from '@/lib/spends'
import { cx } from '@/lib/cx'

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}
const RISE = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } },
}

function StatBlock({
  code,
  label,
  value,
  meta,
  signal = 'acid',
  emphasis = false,
}: {
  code: string
  label: string
  value: string
  meta?: string
  signal?: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
  emphasis?: boolean
}) {
  return (
    <CutPanel
      cut={emphasis ? 'tl-br' : 'br'}
      cutSize={emphasis ? 16 : 10}
      innerClassName="relative overflow-hidden p-3.5"
      className="h-full"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `var(--c-${signal})` }}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="micro text-faint">{label}</span>
        <span className="micro text-linehard">{code}</span>
      </div>
      <div
        className={cx(
          'numeral mt-2.5 text-fg',
          emphasis ? 'text-[clamp(1.9rem,5vw,2.8rem)]' : 'text-[clamp(1.4rem,3.4vw,2rem)]',
        )}
      >
        {value}
      </div>
      {meta && (
        <div className={cx('micro mt-2 flex items-center gap-1.5', SIGNAL_TEXT[signal])}>
          <Led signal={signal} size="sm" />
          {meta}
        </div>
      )}
    </CutPanel>
  )
}

/** Small radial gauge — SVG arc with percentage in the center. */
export default function SpendInsights() {
  const insights = useSpendInsights()
  const spends = useSpends()
  const base = useUI((s) => s.baseCurrency)
  const openSpendComposer = useUI((s) => s.openSpendComposer)
  const today = todayISO()

  const series = useMemo(() => spendSeries(spends, base, today, 28), [spends, base, today])

  // Derived stats
  const derived = useMemo(() => {
    const thisMonth = monthKey(today)
    const prevMonth = shiftMonthKey(thisMonth, -1)
    const prevMonthSpends = spends.filter((s) => monthKey(s.date) === prevMonth)
    const prevMonthTotal = prevMonthSpends.reduce((sum, s) => sum + convert(s.amount, s.currency, base), 0)
    const totalTxns = spends.filter((s) => monthKey(s.date) === thisMonth).length
    const uniqueMerchants = new Set(
      spends
        .filter((s) => monthKey(s.date) === thisMonth)
        .map((s) => s.title.trim().toLowerCase()),
    ).size
    const avgPerTxn = totalTxns > 0 ? insights.monthTotal / totalTxns : 0
    const trailing3 = [0, 1, 2].map((i) => {
      const key = shiftMonthKey(thisMonth, -i)
      return spends
        .filter((s) => monthKey(s.date) === key)
        .reduce((sum, s) => sum + convert(s.amount, s.currency, base), 0)
    })
    const trailing3Total = trailing3.reduce((a, b) => a + b, 0)
    const trailing3Avg = trailing3Total / 3
    const daysSinceFirst = spends.length
      ? diffDays(today, spends.reduce((min, s) => (s.date < min ? s.date : min), today))
      : 0
    return { prevMonthTotal, totalTxns, uniqueMerchants, avgPerTxn, trailing3Total, trailing3Avg, daysSinceFirst }
  }, [spends, insights.monthTotal, base, today])

  if (insights.monthTotal === 0 && insights.weekdays.every((w) => w.amount === 0)) {
    return (
      <div className="px-3 py-6 md:px-5">
        <EmptyState
          code="NO TELEMETRY"
          title="NO SPENDS RECORDED TO ANALYSE."
          description="Insights require transaction activity to generate needs-vs-wants ratios, payment method distributions, and cyclical weekday heatmaps."
          action={{ label: '+ LOG FIRST SPEND', onClick: () => openSpendComposer() }}
        />
      </div>
    )
  }

  const { forecast, split, methods, weekdays, topMerchants, largestTransactions, categorySlices } = insights
  const maxWeekdayAmount = Math.max(1, ...weekdays.map((w) => w.amount))
  const topCategory = categorySlices[0]
  const wantsRatio = split.discretionaryShare
  const needsRatio = split.essentialShare

  return (
    <motion.div
      variants={STAGGER}
      initial="hidden"
      animate="show"
      className="px-3 py-4 md:px-5 md:py-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-linehard pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="micro border border-line2 px-1.5 py-0.5 text-dim">DATA</span>
          <h1 className="text-[15px] font-semibold">SPEND ANALYTICS</h1>
        </div>
        <span className="micro text-faint">
          {derived.totalTxns} TRANSACTIONS THIS MONTH · {derived.daysSinceFirst} DAYS OF HISTORY
        </span>
      </div>

      {/* ── Headline Stat Blocks ── */}
      <motion.div variants={RISE} className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className="col-span-2">
          <StatBlock
            code="MTD"
            label="MONTH-TO-DATE"
            value={formatMoney(insights.monthTotal, base)}
            meta={`${formatPercent(insights.forecast.projectedDelta, 1)} VS PREV MONTH`}
            signal={insights.forecast.projectedDelta > 0 ? 'orange' : 'acid'}
            emphasis
          />
        </div>
        <StatBlock
          code="PRJ"
          label="PROJECTED"
          value={formatCompact(forecast.projectedTotal, base)}
          meta={`DAY ${forecast.daysElapsed} OF ${forecast.daysInMonth}`}
          signal="blue"
        />
        <StatBlock
          code="AVG"
          label="DAILY AVERAGE"
          value={formatMoney(forecast.dailyAvg, base)}
          meta={`${derived.totalTxns} TXNS · ${formatMoney(derived.avgPerTxn, base)}/TXN`}
          signal="magenta"
        />
        <StatBlock
          code="3M"
          label="TRAILING 3-MONTH"
          value={formatCompact(derived.trailing3Total, base)}
          meta={`AVG ${formatCompact(derived.trailing3Avg, base)}/MO`}
        />
        <StatBlock
          code="TOP"
          label="TOP CATEGORY"
          value={topCategory ? topCategory.code : '—'}
          meta={topCategory ? `${topCategory.label} · ${formatMoney(topCategory.amount, base)}` : undefined}
          signal={topCategory?.signal ?? 'acid'}
        />
      </motion.div>

      {/* ── Telemetry Banner ── */}
      <motion.div variants={RISE} className="mt-3">
        <DataStrip
          size="sm"
          scroll={false}
          items={[
            { label: 'MODULE', value: `SPENDS // ${insights.monthKey}` },
            { label: 'MERCHANTS', value: String(derived.uniqueMerchants), signal: 'magenta' },
            { label: 'CHANNELS', value: `${methods.length} ACTIVE`, signal: 'blue' },
            { label: 'WANTS SHARE', value: `${Math.round(wantsRatio * 100)}%`, signal: wantsRatio > 0.6 ? 'orange' : 'acid' },
            { label: 'PEAK WEEKDAY', value: weekdays.reduce((max, d) => d.amount > max.amount ? d : max, weekdays[0])?.shortName ?? '—', signal: 'orange' },
          ]}
        />
      </motion.div>

      {/* ── Row 1: Forecast + Needs vs Wants ── */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Forecast */}
        <motion.div variants={RISE} className="lg:col-span-6">
          <CutPanel cut="tl" cutSize={16} innerClassName="p-4">
            <SectionHeader
              code="FCST"
              title="Month-End Projection"
              signal={forecast.projectedDelta > 0 ? 'orange' : 'acid'}
              right={<span className="micro text-faint">DAY {forecast.daysElapsed} OF {forecast.daysInMonth}</span>}
            />
            <div className="mt-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="flex items-start gap-1">
                  <span className="numeral mt-1 text-[clamp(1.2rem,3vw,1.6rem)] text-dim">
                    {splitMoney(forecast.projectedTotal, base).symbol}
                  </span>
                  <span className="numeral text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-fg">
                    <AnimatedNumber
                      value={forecast.projectedTotal}
                      format={(v) => splitMoney(v, base).value}
                      stiffness={120}
                      damping={26}
                    />
                  </span>
                </h2>
                <span className={cx('micro font-semibold', forecast.projectedDelta > 0 ? 'text-orangeink' : 'text-acidink')}>
                  {formatPercent(forecast.projectedDelta, 1)} VS PREV
                </span>
              </div>
              <p className="meta mt-1 text-dim">
                At {formatMoney(forecast.dailyAvg, base)}/day across {derived.totalTxns} transactions,
                on track to finish {formatMoney(forecast.projectedTotal, base)}.
              </p>
              <div className="mt-4">
                <div className="flex items-center justify-between text-faint">
                  <span className="micro">MONTH PROGRESS</span>
                  <span className="micro font-mono">{Math.round((forecast.daysElapsed / forecast.daysInMonth) * 100)}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full bg-surface2 border border-line">
                  <div className="h-full bg-acid" style={{ width: `${(forecast.daysElapsed / forecast.daysInMonth) * 100}%` }} />
                </div>
              </div>
              {/* Comparison bar: this month vs prev */}
              {derived.prevMonthTotal > 0 && (
                <div className="mt-3">
                  <span className="micro text-faint">VS PREVIOUS MONTH</span>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="micro text-faint">THIS</span>
                        <span className="numeral text-[11px] text-fg">{formatCompact(insights.monthTotal, base)}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 w-full bg-surface2 border border-line">
                        <div className="h-full bg-acid" style={{ width: `${Math.min(100, (insights.monthTotal / Math.max(insights.monthTotal, derived.prevMonthTotal)) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="micro text-faint">PREV</span>
                        <span className="numeral text-[11px] text-dim">{formatCompact(derived.prevMonthTotal, base)}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 w-full bg-surface2 border border-line">
                        <div className="h-full bg-blue/60" style={{ width: `${Math.min(100, (derived.prevMonthTotal / Math.max(insights.monthTotal, derived.prevMonthTotal)) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CutPanel>
        </motion.div>

        {/* Needs vs Wants */}
        <motion.div variants={RISE} className="lg:col-span-6">
          <CutPanel cut="tr" cutSize={16} innerClassName="p-4">
            <SectionHeader
              code="RATIO"
              title="Needs vs Wants"
              signal={wantsRatio > 0.6 ? 'orange' : 'acid'}
              right={<span className="micro text-faint">50/30 TARGET</span>}
            />
            <div className="mt-3">
              <div className="grid grid-cols-2 gap-3 border-b border-line pb-3">
                <div>
                  <span className="micro flex items-center gap-1.5 text-blueink font-semibold">
                    <Led signal="blue" size="sm" /> NEEDS
                  </span>
                  <span className="numeral mt-1 block text-[20px] font-bold text-fg">
                    <AnimatedNumber value={split.essentialAmount} format={(v) => formatMoney(v, base)} stiffness={120} damping={26} />
                  </span>
                  <span className="micro text-faint">{Math.round(needsRatio * 100)}%</span>
                </div>
                <div>
                  <span className="micro flex items-center gap-1.5 text-orangeink font-semibold">
                    <Led signal="orange" size="sm" /> WANTS
                  </span>
                  <span className="numeral mt-1 block text-[20px] font-bold text-fg">
                    <AnimatedNumber value={split.discretionaryAmount} format={(v) => formatMoney(v, base)} stiffness={120} damping={26} />
                  </span>
                  <span className="micro text-faint">{Math.round(wantsRatio * 100)}%</span>
                </div>
              </div>
              <div className="mt-3 flex h-4 w-full overflow-hidden border border-line">
                <div className="bg-blue transition-all" style={{ width: `${Math.max(2, needsRatio * 100)}%` }} />
                <div className="bg-orange transition-all" style={{ width: `${Math.max(2, wantsRatio * 100)}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="micro text-blueink font-semibold">■ TRANSPORT / GROCERIES / HEALTH</span>
                <span className="micro text-orangeink font-semibold">FOOD / SHOPPING / FUN ■</span>
              </div>
              {/* Radial gauges */}
              <div className="mt-4 flex items-center justify-around gap-4">
                <div className="relative flex flex-col items-center">
                  <RadialGauge value={needsRatio} label="NEEDS" caption="ESSENTIAL" signal="blue" size={90} />
                </div>
                <div className="relative flex flex-col items-center">
                  <RadialGauge value={wantsRatio} label="WANTS" caption="LIFESTYLE" signal="orange" size={90} />
                </div>
                <div className="relative flex flex-col items-center">
                  <RadialGauge
                    value={topCategory ? topCategory.share : 0}
                    label={topCategory?.code ?? '—'}
                    caption="TOP SECTOR"
                    signal={topCategory?.signal ?? 'acid'}
                    size={90}
                  />
                </div>
              </div>
            </div>
          </CutPanel>
        </motion.div>
      </div>

      {/* ── Row 2: Category Composition Strip + Distribution ── */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tl-br" cutSize={14} innerClassName="p-0">
          <SectionHeader
            code="CAT"
            title="Category distribution"
            signal="magenta"
            right={<span className="micro text-faint">{categorySlices.length} SECTORS · THIS MONTH</span>}
          />
          <div className="p-3 pb-0 md:p-4 md:pb-0">
            {/* Composition strip */}
            <div className="flex h-4 w-full overflow-hidden border border-line">
              {categorySlices.map((slice) => (
                <div
                  key={slice.category}
                  className="h-full transition-all"
                  style={{
                    width: `${Math.max(0.5, slice.share * 100)}%`,
                    background: SIGNAL_HEX[slice.signal],
                  }}
                  title={`${slice.label}: ${formatMoney(slice.amount, base)} (${(slice.share * 100).toFixed(1)}%)`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {categorySlices.map((slice) => (
                <span key={slice.category} className="flex items-center gap-1.5">
                  <span className="block h-2.5 w-2.5" style={{ background: SIGNAL_HEX[slice.signal] }} aria-hidden="true" />
                  <span className="micro text-dim">{slice.code}</span>
                  <span className="micro text-faint">{(slice.share * 100).toFixed(1)}%</span>
                </span>
              ))}
            </div>
          </div>
          {/* Per-category distribution bars */}
          <div className="mt-3 divide-y divide-line border-t border-line">
            {categorySlices.map((slice) => (
              <div key={slice.category} className="flex items-center gap-3 px-3 py-2 md:px-4">
                <span className="micro w-10 font-semibold" style={{ color: SIGNAL_HEX[slice.signal] }}>
                  {slice.code}
                </span>
                <span className="micro min-w-[80px] text-faint">{slice.label}</span>
                <div className="flex-1">
                  <div className="h-2 w-full bg-surface2 border border-line">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.max(1, (slice.amount / (categorySlices[0]?.amount || 1)) * 100)}%`,
                        background: SIGNAL_HEX[slice.signal],
                      }}
                    />
                  </div>
                </div>
                <span className="numeral w-16 text-right text-[12px] text-fg">{formatCompact(slice.amount, base)}</span>
                <span className="micro w-10 text-right text-faint">{(slice.share * 100).toFixed(0)}%</span>
                <span className="micro w-8 text-right text-dim">{slice.count}×</span>
              </div>
            ))}
          </div>
        </CutPanel>
      </motion.div>

      {/* ── Row 3: Signal Trace ── */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="none" cutSize={0} innerClassName="p-4 md:p-5">
          <SectionHeader
            code="SIG"
            title="Spend signal — daily trace"
            signal="acid"
            className="border-b-0 px-0 pt-0"
            right={<span className="micro text-faint">28-DAY WINDOW · {formatMoney(series.reduce((s, p) => s + p.amount, 0), base)} TOTAL</span>}
          />
          <div className="mt-2">
            <SpendSignal series={series} base={base} height={200} />
          </div>
        </CutPanel>
      </motion.div>

      {/* ── Row 4: Payment Channels + Weekday Heatmap ── */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <motion.div variants={RISE} className="lg:col-span-5">
          <CutPanel cut="br" cutSize={14} innerClassName="p-4">
            <SectionHeader
              code="CHAN"
              title="Payment channels"
              signal="acid"
              right={<span className="micro text-faint">{methods.length} ACTIVE</span>}
            />
            <div className="mt-3 divide-y divide-line">
              {methods.map((method) => (
                <div key={method.method} className="flex items-center justify-between py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="micro font-bold text-fg">{method.label}</span>
                      <span className="micro text-faint">{method.count} TXN</span>
                    </div>
                    <div className="mt-1 h-1.5 w-36 bg-surface2 border border-line">
                      <div className="h-full bg-acid" style={{ width: `${Math.max(3, method.share * 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="numeral block text-[14px] font-semibold text-fg">{formatMoney(method.amount, base)}</span>
                    <span className="micro text-faint">{Math.round(method.share * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CutPanel>
        </motion.div>

        <motion.div variants={RISE} className="lg:col-span-7">
          <CutPanel cut="br" cutSize={14} innerClassName="p-4">
            <SectionHeader
              code="CYCL"
              title="Weekday cyclical heatmap"
              signal="blue"
              right={<span className="micro text-faint">60-DAY TRAILING</span>}
            />
            <div className="mt-4 flex items-end gap-2 pt-2">
              {weekdays.map((day) => {
                const ratio = day.amount / maxWeekdayAmount
                const isHigh = ratio >= 0.8
                return (
                  <div key={day.shortName} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <span className="numeral text-[11px] text-faint truncate">
                      {day.amount > 0 ? formatMoney(day.amount, base) : '0'}
                    </span>
                    <div className="w-full flex items-end justify-center h-28 bg-surface2 border border-line p-0.5">
                      <div
                        className={cx('w-full transition-all', isHigh ? 'bg-orange' : day.amount > 0 ? 'bg-blue' : 'bg-line')}
                        style={{ height: `${Math.max(4, ratio * 100)}%` }}
                        title={`${day.dayName}: ${formatMoney(day.amount, base)} (${day.count} txn)`}
                      />
                    </div>
                    <span className={cx('micro font-bold', isHigh ? 'text-orangeink' : 'text-faint')}>{day.shortName}</span>
                    <span className="micro text-[10px] text-faint">{day.count}×</span>
                  </div>
                )
              })}
            </div>
          </CutPanel>
        </motion.div>
      </div>

      {/* ── Row 5: Top Merchants + Largest Outliers ── */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <motion.div variants={RISE} className="lg:col-span-6">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-4">
            <SectionHeader code="MRCH" title="Top merchants" signal="magenta" right={<span className="micro text-faint">BY VOLUME</span>} />
            <div className="mt-3 divide-y divide-line">
              {topMerchants.map((merchant, idx) => {
                const meta = SPEND_CATEGORY_META[merchant.category]
                return (
                  <div key={merchant.title} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="micro w-4 font-mono text-faint">#{idx + 1}</span>
                      <SpendBadge category={merchant.category} title={merchant.title} size="sm" />
                      <div className="min-w-0 flex-1 truncate">
                        <span className="block truncate text-[13px] font-medium text-fg">{merchant.title}</span>
                        <span className="micro text-faint">{meta?.code} · {merchant.count} txn</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="numeral block text-[14px] font-semibold text-fg">{formatMoney(merchant.amount, base)}</span>
                      <span className="micro text-faint">Last: {formatSignalDate(merchant.lastDate)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CutPanel>
        </motion.div>

        <motion.div variants={RISE} className="lg:col-span-6">
          <CutPanel cut="tr" cutSize={14} innerClassName="p-4">
            <SectionHeader code="OUTL" title="Largest outlier spends" signal="red" right={<span className="micro text-faint">THIS MONTH</span>} />
            <div className="mt-3 divide-y divide-line">
              {largestTransactions.map((tx) => {
                const meta = SPEND_CATEGORY_META[tx.category]
                return (
                  <div key={tx.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <SpendBadge category={tx.category} title={tx.title} size="sm" />
                      <div className="min-w-0 flex-1 truncate">
                        <div className="flex items-center gap-2">
                          <span className="block truncate text-[13px] font-semibold text-fg">{tx.title}</span>
                          <span className={cx('micro', SIGNAL_TEXT[meta?.signal ?? 'blue'])}>{meta?.code}</span>
                        </div>
                        <span className="micro text-faint">{formatSignalDate(tx.date)} {tx.notes ? `· ${tx.notes}` : ''}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="numeral block text-[15px] font-bold text-fg">{formatMoney(tx.amount, tx.currency)}</span>
                      <span className="micro text-faint">{tx.method.toUpperCase()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CutPanel>
        </motion.div>
      </div>

      {/* ── Row 6: Statistics Table ── */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tl-br" cutSize={14} innerClassName="p-0">
          <SectionHeader code="STAT" title="Detailed statistics" signal="blue" right={<span className="micro text-faint">COMPLETE LEDGER</span>} />
          <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-y-0 md:divide-x">
            <div className="divide-y divide-line">
              {[
                ['MONTH-TO-DATE', formatMoney(insights.monthTotal, base)],
                ['PREVIOUS MONTH', formatMoney(derived.prevMonthTotal, base)],
                ['MONTH DELTA', formatPercent(insights.forecast.projectedDelta, 1)],
                ['PROJECTED MONTH-END', formatMoney(forecast.projectedTotal, base)],
                ['DAILY AVERAGE', formatMoney(forecast.dailyAvg, base)],
                ['AVERAGE PER TXN', formatMoney(derived.avgPerTxn, base)],
                ['MONTH TRANSACTIONS', String(derived.totalTxns)],
                ['UNIQUE MERCHANTS', String(derived.uniqueMerchants)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-3 py-2 md:px-4">
                  <span className="tech-label">{label}</span>
                  <span className="numeral text-[12px] text-fg">{value}</span>
                </div>
              ))}
            </div>
            <div className="divide-y divide-line">
              {[
                ['TRAILING 3-MONTH', formatMoney(derived.trailing3Total, base)],
                ['3-MONTH AVERAGE', formatMoney(derived.trailing3Avg, base)],
                ['NEEDS SHARE', `${Math.round(needsRatio * 100)}%`],
                ['WANTS SHARE', `${Math.round(wantsRatio * 100)}%`],
                ['PAYMENT CHANNELS', String(methods.length)],
                ['TOP CATEGORY', topCategory ? `${topCategory.label} (${(topCategory.share * 100).toFixed(0)}%)` : '—'],
                ['PEAK WEEKDAY', weekdays.reduce((max, d) => d.amount > max.amount ? d : max, weekdays[0])?.dayName ?? '—'],
                ['DAYS OF HISTORY', String(derived.daysSinceFirst)],
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
