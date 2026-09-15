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
import { formatClock, formatSignalDate, todayISO, relativeDay } from '@/lib/date'
import { useClock } from '@/hooks/usePlatform'
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
  const series = useSignalSeries(mode, 7, 3)
  const clock = useClock(1000)
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

  if (summary.active.length === 0 && summary.terminated.length === 0) {
    return (
      <div className="px-3 py-6 md:px-5">
        <EmptyState
          code="NO ACTIVE SUBSCRIPTIONS"
          title="SYSTEM IS CURRENTLY CLEAN."
          description="Nothing is draining this month. Initialize your first subscription to start monitoring where the money goes."
          action={{ label: '+ INITIALIZE FIRST SUBSCRIPTION', onClick: () => openComposer() }}
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
      {/* ---------------- instrument rail ---------------- */}
      <motion.div variants={RISE}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line pb-2">
          <span className="micro text-faint">
            SYSTEM // FINANCIAL OVERVIEW
            <span className="text-linehard"> · </span>
            SNAPSHOT {formatClock(clock)}
          </span>
          <span className="micro flex items-center gap-2 text-faint">
            <Led signal="acid" size="sm" pulse />
            MONITORING {summary.activeCount} SUBSCRIPTIONS ACROSS {summary.categories.length} CATEGORIES
          </span>
        </div>
      </motion.div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* ---------------- hero ---------------- */}
        <motion.div variants={RISE} className="lg:col-span-8">
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

        {/* ---------------- right column ---------------- */}
        <motion.div variants={RISE} className="flex flex-col gap-3 lg:col-span-4">
          <CutPanel cut="br" cutSize={14} innerClassName="p-0">
            <SectionHeader
              code="SYS"
              title="System notes"
              signal={summary.notes.some((note) => note.signal === 'red') ? 'red' : 'acid'}
              right={<span className="micro text-faint">{summary.notes.length} SIGNALS</span>}
            />
            <SystemNotes notes={summary.notes} compact />
          </CutPanel>

          <CutPanel cut="tr" cutSize={14} innerClassName="p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="micro text-faint">LOAD CLUSTER // NEXT 7 DAYS</span>
              <span className="micro text-orangeink">
                {formatMoney(
                  summary.incoming7.reduce((sum, event) => sum + event.baseAmount, 0),
                  base,
                )}
              </span>
            </div>
            <div className="mt-2.5 flex items-end gap-[3px]">
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const amount = summary.incoming7
                  .filter((event) => event.days === dayIndex)
                  .reduce((sum, event) => sum + event.baseAmount, 0)
                const ratio = Math.min(1, amount / Math.max(summary.dailyBurn * 3, 1))
                return (
                  <span key={dayIndex} className="flex flex-1 flex-col items-center gap-1.5">
                    <span
                      className={cx('block w-full', amount > 0 ? 'bg-orange' : 'bg-line')}
                      style={{ height: 8 + ratio * 54 }}
                    />
                    <span className="micro text-faint">{['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayIndex]}</span>
                  </span>
                )
              })}
            </div>
            <p className="meta mt-3 text-dim">
              {summary.incoming7.length === 0
                ? 'No charges scheduled in the next seven days.'
                : `${summary.incoming7.length} charges land in the next 7 days — ${
                    summary.incoming7.length > 2 ? 'clustered load detected' : 'spread load'
                  }.`}
            </p>
          </CutPanel>

          {topCategory && (
            <CutPanel cut="tl" cutSize={14} innerClassName="p-3.5">
              <span className="micro text-faint">DOMINANT CATEGORY</span>
              <div className="mt-2 flex items-end justify-between gap-3">
                <span className={cx('numeral text-[28px]', SIGNAL_TEXT[topCategory.signal])}>
                  {CATEGORY_CODE[topCategory.category]}
                </span>
                <span className="text-right">
                  <span className="meta block text-fg">{CATEGORY_LABEL[topCategory.category]}</span>
                  <span className="micro block text-faint">
                    {formatMoney(topCategory.monthly, base)}/MO · {topCategory.count} SUBSCRIPTIONS
                  </span>
                </span>
              </div>
              <div className="mt-2.5 flex gap-[2px]">
                {Array.from({ length: 20 }).map((_, index) => (
                  <span
                    key={index}
                    className={cx('h-2 flex-1', index < Math.round(topCategory.share * 20) ? 'bg-acid' : 'bg-line')}
                  />
                ))}
              </div>
            </CutPanel>
          )}
        </motion.div>

        {/* ---------------- signal monitor ---------------- */}
        <motion.div variants={RISE} className="lg:col-span-8">
          <CutPanel cut="none" cutSize={0} innerClassName="p-4 md:p-5">
            <SectionHeader
              code="SIG"
              title="Spending signal"
              signal={mode === 'runrate' ? 'acid' : 'blue'}
              className="border-b-0 px-0 pt-0"
              right={
                <span className="micro text-faint">
                  {summary.thisMonthKey} · {formatMoney(summary.thisMonthCash, base)} RECORDED
                </span>
              }
            />
            <div className="mt-3">
              <SpendingSignal
                points={series}
                mode={mode}
                onModeChange={setMode}
                base={base}
                height={230}
              />
            </div>
            <HashRule label="RECORDED → FORECAST" className="mt-3" />
          </CutPanel>
        </motion.div>

        {/* ---------------- incoming stream ---------------- */}
        <motion.div variants={RISE} className="lg:col-span-4">
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

        {/* ---------------- active subscriptions ---------------- */}
        <motion.div variants={RISE} className="lg:col-span-12">
          <div className="flex items-end justify-between gap-3 border-b-2 border-linehard pb-1.5">
            <div className="flex items-end gap-2.5">
              <span className="micro border border-line2 px-1.5 py-0.5 text-dim">SUB</span>
              <h2 className="text-[13px] font-semibold md:text-[15px]">ACTIVE SUBSCRIPTIONS</h2>
              <span className="micro hidden text-faint md:inline">
                SORTED BY NORMALISED MONTHLY COST
              </span>
            </div>
            <Link
              to="/flow"
              className="micro flex items-center gap-1.5 text-dim transition-colors hover:text-acidink"
            >
              OPEN ALL {String(summary.views.length).padStart(2, '0')}
              <IconArrowRight size={12} />
            </Link>
          </div>

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
                action={{ label: '+ INITIALIZE SUBSCRIPTION', onClick: () => openComposer() }}
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
          INITIALIZE SUBSCRIPTION
        </CyberButton>
      </div>
    </motion.div>
  )
}
