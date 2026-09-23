/**
 * SUBTRACK // SPENDS DATA (INSIGHTS & TELEMETRY)
 *
 * Deep financial telemetry for daily spends: Essential vs Discretionary
 * (Needs vs Wants) balance, Payment Method distribution matrix, 7-Day Weekday
 * Cyclical Heatmap, Month-End Run-rate Projection, and Merchant Leaderboard.
 */
import { motion } from 'motion/react'
import { useSpendInsights } from '@/hooks/useSpends'
import { useUI } from '@/store/ui'
import { formatMoney, formatPercent } from '@/lib/money'
import { formatSignalDate } from '@/lib/date'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { Led, SIGNAL_TEXT } from '@/components/ui/Signal'
import { SPEND_CATEGORY_META } from '@/lib/types'
import { EmptyState } from '@/components/ui/Skeleton'
import { DataStrip } from '@/components/ui/DataStrip'
import { SpendBadge } from '@/components/spends/SpendBadge'
import { cx } from '@/lib/cx'

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}
const RISE = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } },
}

export default function SpendInsights() {
  const insights = useSpendInsights()
  const base = useUI((s) => s.baseCurrency)
  const openSpendComposer = useUI((s) => s.openSpendComposer)

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

  const { forecast, split, methods, weekdays, topMerchants, largestTransactions } = insights
  const maxWeekdayAmount = Math.max(1, ...weekdays.map((w) => w.amount))

  return (
    <motion.div
      variants={STAGGER}
      initial="hidden"
      animate="show"
      className="px-3 py-4 md:px-5 md:py-5"
    >
      {/* Top telemetry banner */}
      <motion.div variants={RISE}>
        <DataStrip
          size="sm"
          scroll={false}
          items={[
            { label: 'INSIGHTS MODULE', value: `SPENDS TELEMETRY // ${insights.monthKey}` },
            {
              label: 'MONTH-TO-DATE',
              value: formatMoney(insights.monthTotal, base),
              signal: 'acid',
            },
            {
              label: 'PROJECTED MONTH-END',
              value: formatMoney(forecast.projectedTotal, base),
              signal: forecast.projectedDelta > 0 ? 'orange' : 'acid',
            },
            {
              label: 'WANTS SHARE',
              value: `${Math.round(split.discretionaryShare * 100)}%`,
              signal: split.discretionaryShare > 0.6 ? 'orange' : 'blue',
            },
            {
              label: 'DAILY AVG',
              value: formatMoney(forecast.dailyAvg, base),
            },
          ]}
        />
      </motion.div>

      {/* Row 1: Forecast & Needs vs Wants */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Run-rate forecast */}
        <motion.div variants={RISE} className="lg:col-span-6">
          <CutPanel cut="tl" cutSize={16} innerClassName="p-4">
            <SectionHeader
              code="FCST"
              title="Month-End Run-rate Projection"
              signal={forecast.projectedDelta > 0 ? 'orange' : 'acid'}
              right={<span className="micro text-faint">DAY {forecast.daysElapsed} OF {forecast.daysInMonth}</span>}
            />
            <div className="mt-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="numeral text-[clamp(1.6rem,4vw,2.2rem)] font-bold text-fg">
                  {formatMoney(forecast.projectedTotal, base)}
                </span>
                <span
                  className={cx(
                    'micro font-semibold',
                    forecast.projectedDelta > 0 ? 'text-orangeink' : 'text-acidink',
                  )}
                >
                  {formatPercent(forecast.projectedDelta, 1)} VS PREVIOUS MONTH
                </span>
              </div>
              <p className="meta mt-1 text-dim">
                At your current velocity of {formatMoney(forecast.dailyAvg, base)}/day, you are on track
                to finish {insights.monthKey} at {formatMoney(forecast.projectedTotal, base)}.
              </p>

              {/* Progress bar of month elapsed */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-faint">
                  <span className="micro">MONTH PROGRESS</span>
                  <span className="micro font-mono">
                    {Math.round((forecast.daysElapsed / forecast.daysInMonth) * 100)}% ELAPSED
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full bg-surface2 border border-line">
                  <div
                    className="h-full bg-acid"
                    style={{ width: `${(forecast.daysElapsed / forecast.daysInMonth) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CutPanel>
        </motion.div>

        {/* Essential vs Discretionary */}
        <motion.div variants={RISE} className="lg:col-span-6">
          <CutPanel cut="tr" cutSize={16} innerClassName="p-4">
            <SectionHeader
              code="RATIO"
              title="Needs vs Wants Ratio"
              signal={split.discretionaryShare > 0.6 ? 'orange' : 'acid'}
              right={<span className="micro text-faint">50/30 TARGET</span>}
            />
            <div className="mt-3">
              <div className="grid grid-cols-2 gap-3 border-b border-line pb-3">
                <div>
                  <span className="micro flex items-center gap-1.5 text-blueink font-semibold">
                    <Led signal="blue" size="sm" /> NEEDS (ESSENTIALS)
                  </span>
                  <span className="numeral mt-1 block text-[20px] font-bold text-fg">
                    {formatMoney(split.essentialAmount, base)}
                  </span>
                  <span className="micro text-faint">
                    {Math.round(split.essentialShare * 100)}% of total spends
                  </span>
                </div>
                <div>
                  <span className="micro flex items-center gap-1.5 text-orangeink font-semibold">
                    <Led signal="orange" size="sm" /> WANTS (LIFESTYLE)
                  </span>
                  <span className="numeral mt-1 block text-[20px] font-bold text-fg">
                    {formatMoney(split.discretionaryAmount, base)}
                  </span>
                  <span className="micro text-faint">
                    {Math.round(split.discretionaryShare * 100)}% of total spends
                  </span>
                </div>
              </div>

              {/* Dual bar */}
              <div className="mt-3 flex h-4 w-full overflow-hidden border border-line">
                <div
                  className="bg-blue transition-all"
                  style={{ width: `${Math.max(2, split.essentialShare * 100)}%` }}
                  title={`Needs: ${formatMoney(split.essentialAmount, base)}`}
                />
                <div
                  className="bg-orange transition-all"
                  style={{ width: `${Math.max(2, split.discretionaryShare * 100)}%` }}
                  title={`Wants: ${formatMoney(split.discretionaryAmount, base)}`}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="micro text-blueink font-semibold">■ GROCERIES / COMMUTE / HEALTH</span>
                <span className="micro text-orangeink font-semibold">FOOD / SHOPPING / ENTERTAINMENT ■</span>
              </div>
            </div>
          </CutPanel>
        </motion.div>
      </div>

      {/* Row 2: Payment Channels & Weekday Heatmap */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Payment Methods */}
        <motion.div variants={RISE} className="lg:col-span-5">
          <CutPanel cut="br" cutSize={14} innerClassName="p-4">
            <SectionHeader
              code="CHAN"
              title="Payment Channels"
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
                      <div
                        className="h-full bg-acid"
                        style={{ width: `${Math.max(3, method.share * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="numeral block text-[14px] font-semibold text-fg">
                      {formatMoney(method.amount, base)}
                    </span>
                    <span className="micro text-faint">{Math.round(method.share * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CutPanel>
        </motion.div>

        {/* Weekday Heatmap */}
        <motion.div variants={RISE} className="lg:col-span-7">
          <CutPanel cut="br" cutSize={14} innerClassName="p-4">
            <SectionHeader
              code="CYCL"
              title="7-Day Weekday Cyclical Heatmap"
              signal="blue"
              right={<span className="micro text-faint">TRAILING 60-DAY PATTERN</span>}
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
                        className={cx(
                          'w-full transition-all',
                          isHigh ? 'bg-orange' : day.amount > 0 ? 'bg-blue' : 'bg-line',
                        )}
                        style={{ height: `${Math.max(4, ratio * 100)}%` }}
                        title={`${day.dayName}: ${formatMoney(day.amount, base)} (${day.count} txn)`}
                      />
                    </div>
                    <span className={cx('micro font-bold', isHigh ? 'text-orangeink' : 'text-faint')}>
                      {day.shortName}
                    </span>
                    <span className="micro text-[10px] text-faint">{day.count}×</span>
                  </div>
                )
              })}
            </div>
          </CutPanel>
        </motion.div>
      </div>

      {/* Row 3: Top Merchants Leaderboard & Largest Transactions */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Top Merchants */}
        <motion.div variants={RISE} className="lg:col-span-6">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-4">
            <SectionHeader
              code="MRCH"
              title="Top Merchants & Destinations"
              signal="magenta"
              right={<span className="micro text-faint">BY VOLUME</span>}
            />
            <div className="mt-3 divide-y divide-line">
              {topMerchants.map((merchant, idx) => {
                const meta = SPEND_CATEGORY_META[merchant.category]
                return (
                  <div key={merchant.title} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="micro w-4 font-mono text-faint">#{idx + 1}</span>
                      <SpendBadge category={merchant.category} title={merchant.title} size="sm" />
                      <div className="min-w-0 flex-1 truncate">
                        <span className="block truncate text-[13px] font-medium text-fg">
                          {merchant.title}
                        </span>
                        <span className="micro text-faint">
                          {meta?.code} · {merchant.count} transaction{merchant.count > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="numeral block text-[14px] font-semibold text-fg">
                        {formatMoney(merchant.amount, base)}
                      </span>
                      <span className="micro text-faint">Last: {formatSignalDate(merchant.lastDate)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CutPanel>
        </motion.div>

        {/* Largest Outlier Transactions */}
        <motion.div variants={RISE} className="lg:col-span-6">
          <CutPanel cut="tr" cutSize={14} innerClassName="p-4">
            <SectionHeader
              code="OUTL"
              title="Largest Outlier Spends"
              signal="red"
              right={<span className="micro text-faint">THIS MONTH</span>}
            />
            <div className="mt-3 divide-y divide-line">
              {largestTransactions.map((tx) => {
                const meta = SPEND_CATEGORY_META[tx.category]
                return (
                  <div key={tx.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <SpendBadge category={tx.category} title={tx.title} size="sm" />
                      <div className="min-w-0 flex-1 truncate">
                        <div className="flex items-center gap-2">
                          <span className="block truncate text-[13px] font-semibold text-fg">
                            {tx.title}
                          </span>
                          <span className={cx('micro', SIGNAL_TEXT[meta?.signal ?? 'blue'])}>
                            {meta?.code}
                          </span>
                        </div>
                        <span className="micro text-faint">
                          {formatSignalDate(tx.date)} {tx.notes ? `· ${tx.notes}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="numeral block text-[15px] font-bold text-fg">
                        {formatMoney(tx.amount, tx.currency)}
                      </span>
                      <span className="micro text-faint">{tx.method.toUpperCase()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CutPanel>
        </motion.div>
      </div>
    </motion.div>
  )
}
