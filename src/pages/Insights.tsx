/**
 * SUBTRACK // SYSTEM ANALYTICS (DATA)
 *
 * Where the burn comes from and how it is shaped: headline readouts, the
 * composition strip, category blocks, three radial instruments and a long-form
 * statistics table. Charts are brutalist on purpose — segmented bars, stacked
 * strips and square-capped arcs, never a pie.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { usePayments, useSignalSeries, useSubscriptions, useSystem } from '@/hooks/useSystem'
import { useUI } from '@/store/ui'
import { formatCompact, formatMoney, formatPercent } from '@/lib/money'
import { cycleNoun } from '@/lib/cycle'
import { CYCLE_LABEL, CATEGORY_SIGNAL, type BillingCycle } from '@/lib/types'
import { CURRENCIES, convert } from '@/lib/money'
import { todayISO, monthKey, shiftMonthKey, diffDays } from '@/lib/date'
import { CutPanel } from '@/components/ui/CutPanel'
import { DataStrip } from '@/components/ui/DataStrip'
import { SectionHeader, HashRule } from '@/components/ui/Micro'
import { Led, SIGNAL_TEXT, StatusChip } from '@/components/ui/Signal'
import { CategoryDistribution, CompositionStrip, RadialGauge } from '@/components/charts/CategoryBlock'
import { SpendingSignal, type SignalMode } from '@/components/charts/SpendingSignal'
import { SystemNotes } from '@/components/subs/SystemNotes'
import { cx } from '@/lib/cx'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } }
const RISE = {
  hidden: { opacity: 0, y: 12 },
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

export default function Insights() {
  const { summary } = useSystem()
  const subscriptions = useSubscriptions()
  const payments = usePayments()
  const base = useUI((s) => s.baseCurrency)
  const [mode, setMode] = useState<SignalMode>('cash')
  const series = useSignalSeries(mode, 11, 1)
  const today = todayISO()

  const derived = useMemo(() => {
    const dormantMonthly = summary.dormant.reduce((sum, entry) => sum + entry.view.monthly, 0)
    const dormantCount = summary.dormant.length
    const active = summary.activeCount
    const stopped = summary.suspended.length + summary.terminated.length
    const activity = active + stopped > 0 ? active / (active + stopped) : 0
    const top3 = summary.concentration.share

    const cycleMix = new Map<BillingCycle, { count: number; monthly: number }>()
    for (const view of summary.views) {
      const bucket = cycleMix.get(view.sub.billingCycle) ?? { count: 0, monthly: 0 }
      bucket.count += 1
      bucket.monthly += view.monthly
      cycleMix.set(view.sub.billingCycle, bucket)
    }

    const lifetime = payments.reduce(
      (sum, payment) => sum + convert(payment.amount, payment.currency, base),
      0,
    )

    const currencies = new Map<string, number>()
    for (const view of summary.views) {
      currencies.set(view.sub.currency, (currencies.get(view.sub.currency) ?? 0) + 1)
    }

    const thisKey = monthKey(today)
    const thisMonthCount = payments.filter((payment) => monthKey(payment.date) === thisKey).length
    const prevMonthCount = payments.filter(
      (payment) => monthKey(payment.date) === shiftMonthKey(thisKey, -1),
    ).length

    const newest =
      summary.views.length > 0
        ? [...summary.views].sort((a, b) => (a.sub.createdAt < b.sub.createdAt ? 1 : -1))[0]
        : null

    return {
      dormantMonthly,
      dormantCount,
      activity,
      top3,
      cycleMix: [...cycleMix.entries()].sort((a, b) => b[1].monthly - a[1].monthly),
      lifetime,
      currencies: [...currencies.entries()],
      thisMonthCount,
      prevMonthCount,
      newest,
      coverage: payments.length ? diffDays(today, payments.reduce((min, p) => (p.date < min ? p.date : min), today)) : 0,
    }
  }, [summary, payments, base, today])

  const highest = summary.highest
  const lowest = summary.lowest

  return (
    <motion.div
      variants={STAGGER}
      initial="hidden"
      animate="show"
      className="px-3 py-4 md:px-5 md:py-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-linehard pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="micro border border-line2 px-1.5 py-0.5 text-dim">DATA</span>
          <h1 className="text-[15px] font-semibold">SYSTEM ANALYTICS</h1>
        </div>
        <span className="micro text-faint">
          DERIVED FROM {payments.length} RECORDED CHARGES · {derived.coverage} DAYS OF HISTORY
        </span>
      </div>

      {/* headline readouts */}
      <motion.div variants={RISE} className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className="col-span-2">
          <StatBlock
            code="BURN"
            label="MONTHLY BURN"
            value={formatMoney(summary.monthlyBurn, base)}
            meta={`${formatPercent(summary.runRateDelta, 1)} VS PREV CYCLE`}
            signal={summary.runRateDelta > 0 ? 'orange' : 'acid'}
            emphasis
          />
        </div>
        <StatBlock
          code="LOAD"
          label="ANNUAL LOAD"
          value={formatMoney(summary.annualLoad, base)}
          meta={`${formatMoney(summary.dailyBurn, base)} / DAY`}
          signal="blue"
        />
        <StatBlock
          code="SUB"
          label="ACTIVE SUBSCRIPTIONS"
          value={String(summary.activeCount).padStart(2, '0')}
          meta={`${summary.suspended.length} SUSPENDED · ${summary.terminated.length} TERMINATED`}
        />
        <StatBlock
          code="AVG"
          label="AVERAGE SUBSCRIPTION"
          value={formatMoney(summary.avgCost, base)}
          meta="NORMALISED PER MONTH"
          signal="magenta"
        />
        <StatBlock
          code="MAX"
          label="HIGHEST COST"
          value={highest ? formatMoney(highest.monthly, base) : '—'}
          meta={highest ? `${highest.sub.name.toUpperCase()} · ${(highest.share * 100).toFixed(1)}%` : undefined}
          signal="red"
        />
      </motion.div>

      {/* composition + distribution */}
      <motion.div variants={RISE} className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <CutPanel cut="tl-br" cutSize={14} innerClassName="p-0">
            <SectionHeader
              code="CAT"
              title="Category distribution"
              signal="magenta"
              right={<span className="micro text-faint">BY NORMALISED MONTHLY COST</span>}
            />
            <div className="p-3 pb-0 md:p-4 md:pb-0">
              <CompositionStrip slices={summary.categories} />
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                {summary.categories.map((slice) => (
                  <span key={slice.category} className="flex items-center gap-1.5">
                    <span
                      className="block h-2.5 w-2.5"
                      style={{ background: `var(--c-${slice.signal})` }}
                      aria-hidden="true"
                    />
                    <span className="micro text-dim">{slice.code}</span>
                    <span className="micro text-faint">{(slice.share * 100).toFixed(1)}%</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3 border-t border-line">
              <CategoryDistribution slices={summary.categories} base={base} />
            </div>
          </CutPanel>
        </div>

        <div className="lg:col-span-5">
          <CutPanel cut="br" cutSize={14} innerClassName="p-0" className="h-full">
            <SectionHeader
              code="INS"
              title="Instruments"
              signal="acid"
              right={<span className="micro text-faint">RATIOS</span>}
            />
            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <RadialGauge
                value={derived.top3}
                label="TOP 3 SHARE"
                caption={`${summary.concentration.count} subscriptions`}
                signal="magenta"
                size={140}
              />
              <RadialGauge
                value={derived.activity}
                label="ACTIVITY RATIO"
                caption={`${summary.activeCount} running of ${subscriptions.length}`}
                signal="acid"
                size={140}
              />
              <RadialGauge
                value={summary.monthlyBurn > 0 ? derived.dormantMonthly / summary.monthlyBurn : 0}
                label="DORMANT LOAD"
                caption={`${derived.dormantCount} unused 30d+`}
                signal={derived.dormantCount > 0 ? 'red' : 'blue'}
                size={140}
              />
            </div>
            <div className="border-t border-line px-3 py-3 md:px-4">
              <div className="flex items-center justify-between gap-2">
                <span className="micro text-faint">DORMANT SPEND</span>
                <span className={cx('meta', derived.dormantCount ? 'text-redink' : 'text-dim')}>
                  {formatMoney(derived.dormantMonthly, base)}/MO
                </span>
              </div>
              <p className="meta mt-2 text-dim">
                {derived.dormantCount
                  ? `${derived.dormantCount} subscriptions have not been marked as used in 30+ days. That is ${formatMoney(
                      derived.dormantMonthly * 12,
                      base,
                    )} a year if nothing changes.`
                  : 'Every tracked subscription has been marked as used recently. Nothing is idling.'}
              </p>
            </div>
          </CutPanel>
        </div>
      </motion.div>

      {/* signal */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="none" cutSize={0} innerClassName="p-4 md:p-5">
          <SectionHeader
            code="SIG"
            title="Signal history"
            signal={mode === 'cash' ? 'blue' : 'acid'}
            className="border-b-0 px-0 pt-0"
            right={
              <span className="micro text-faint">
                {derived.thisMonthCount} CHARGES THIS CYCLE · {derived.prevMonthCount} LAST CYCLE
              </span>
            }
          />
          <div className="mt-3">
            <SpendingSignal
              points={series}
              mode={mode}
              onModeChange={setMode}
              base={base}
              height={260}
            />
          </div>
        </CutPanel>
      </motion.div>

      {/* statistics + cycle mix */}
      <motion.div variants={RISE} className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <CutPanel cut="tl-br" cutSize={14} innerClassName="p-0">
            <SectionHeader
              code="STAT"
              title="System statistics"
              signal="blue"
              right={<span className="micro text-faint">ALL VALUES IN {base}</span>}
            />
            <dl className="divide-y divide-line">
              {[
                { label: 'Monthly burn', value: formatMoney(summary.monthlyBurn, base) },
                { label: 'Projected annual load', value: formatMoney(summary.annualLoad, base) },
                { label: 'Daily burn rate', value: formatMoney(summary.dailyBurn, base) },
                { label: 'Average subscription cost', value: formatMoney(summary.avgCost, base) },
                {
                  label: 'Highest subscription',
                  value: highest
                    ? `${highest.sub.name} · ${formatMoney(highest.monthly, base)}`
                    : '—',
                },
                {
                  label: 'Lowest subscription',
                  value: lowest ? `${lowest.sub.name} · ${formatMoney(lowest.monthly, base)}` : '—',
                },
                {
                  label: 'Lifetime charged (recorded)',
                  value: formatMoney(derived.lifetime, base),
                },
                {
                  label: 'Largest single charge',
                  value: (() => {
                    const largest = [...summary.views].sort((a, b) => b.sub.price - a.sub.price)[0]
                    return largest ? formatMoney(largest.sub.price, largest.sub.currency) : '—'
                  })(),
                },
                {
                  label: 'Charges in the last 30 days',
                  value: String(
                    payments.filter((payment) => diffDays(today, payment.date) <= 30).length,
                  ),
                },
                {
                  label: 'Longest running subscription',
                  value: summary.longestRunning
                    ? `${summary.longestRunning.sub.name} · ${summary.longestRunning.sub.cyclesExecuted} cycles`
                    : '—',
                },
                {
                  label: 'Newest subscription',
                  value: derived.newest
                    ? `${derived.newest.sub.name} · ${formatMoney(derived.newest.monthly, base)}/MO`
                    : '—',
                },
                {
                  label: 'Currencies in use',
                  value:
                    derived.currencies.length > 1
                      ? derived.currencies.map(([code, count]) => `${code}×${count}`).join(' · ')
                      : `${base} ONLY`,
                },
                {
                  label: 'Static FX reference',
                  value: `${CURRENCIES.length} currencies · 1 ${base} = ${(
                    convert(1, base, 'USD')
                  ).toFixed(5)} USD`,
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 px-3 py-2 md:px-4">
                  <dt className="tech-label">{row.label}</dt>
                  <dd className="meta text-right text-fg">{row.value}</dd>
                </div>
              ))}
            </dl>
          </CutPanel>
        </div>

        <div className="lg:col-span-5">
          <div className="flex flex-col gap-3">
            <CutPanel cut="br" cutSize={14} innerClassName="p-0">
              <SectionHeader
                code="MIX"
                title="Billing cycle mix"
                signal="orange"
                right={<span className="micro text-faint">HOW YOU PAY</span>}
              />
              <ul className="divide-y divide-line">
                {derived.cycleMix.map(([cycle, bucket]) => (
                  <li key={cycle} className="flex items-center justify-between gap-3 px-3 py-2.5 md:px-4">
                    <span className="flex items-center gap-2.5">
                      <span className="micro border border-line2 px-1.5 py-0.5 text-dim">
                        {cycleNoun(cycle).slice(0, 5)}
                      </span>
                      <span className="text-[12.5px] text-fg">{CYCLE_LABEL[cycle]}</span>
                    </span>
                    <span className="text-right">
                      <span className="meta block text-fg">{formatMoney(bucket.monthly, base)}/MO</span>
                      <span className="micro block text-faint">
                        {bucket.count} SUB{bucket.count === 1 ? '' : 'S'} ·{' '}
                        {((bucket.monthly / (summary.monthlyBurn || 1)) * 100).toFixed(0)}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line px-3 py-2.5 md:px-4">
                <p className="meta text-dim">
                  {derived.cycleMix.some(([cycle]) => cycle === 'yearly')
                    ? 'Annual billing is pulling cost out of your monthly burn — check the renewal month before it lands.'
                    : 'Everything is billed monthly. No annual renewals are hiding in a single month.'}
                </p>
              </div>
            </CutPanel>

            <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
              <SectionHeader
                code="OBS"
                title="Observations"
                signal={summary.notes.some((note) => note.signal === 'red') ? 'red' : 'acid'}
                right={<span className="micro text-faint">{summary.notes.length}</span>}
              />
              <SystemNotes notes={summary.notes} />
            </CutPanel>

            <CutPanel cut="none" cutSize={0} innerClassName="p-0">
              <DataStrip
                size="sm"
                items={[
                  { label: 'Subs tracked', value: String(subscriptions.length) },
                  { label: 'Charges recorded', value: String(payments.length) },
                  {
                    label: 'Coverage',
                    value: `${derived.coverage} DAYS`,
                  },
                  {
                    label: 'Status',
                    value: `${summary.active.length}/${summary.suspended.length}/${summary.terminated.length}`,
                  },
                ]}
              />
            </CutPanel>

            <HashRule label="SUBSCRIPTION LEVEL DETAIL" />
            <div className="flex flex-wrap gap-2">
              {summary.views.slice(0, 8).map((view) => (
                <Link
                  key={view.sub.id}
                  to={`/flow/${view.sub.id}`}
                  className="flex items-center gap-2 border border-line2 bg-surface px-2 py-1.5 transition-colors hover:border-linehard focus-visible:outline-none"
                >
                  <span className={cx('micro', SIGNAL_TEXT[CATEGORY_SIGNAL[view.sub.category]])}>
                    {formatCompact(view.monthly, base)}
                  </span>
                  <span className="text-[11.5px] text-dim">{view.sub.name}</span>
                  <StatusChip status={view.sub.status} showLed={false} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
