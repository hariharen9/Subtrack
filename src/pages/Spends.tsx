/**
 * SUBTRACK // SPENDS (CORE)
 *
 * The Daily Spends flight deck. One cockpit for the variable half of the
 * ledger — today's burn, the running week against its discretionary limiter,
 * category distribution, a daily velocity trace and the recent ledger.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useSpendsSystem, useSpends } from '@/hooks/useSpends'
import { useUI } from '@/store/ui'
import { formatMoney, formatPercent, splitMoney } from '@/lib/money'
import { formatSignalDate } from '@/lib/date'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { DataStrip } from '@/components/ui/DataStrip'
import { EmptyState } from '@/components/ui/Skeleton'
import { CyberButton } from '@/components/ui/CyberButton'
import { Led } from '@/components/ui/Signal'
import {
  SpendCategoryComposition,
  SpendVelocity,
  LimiterGauge,
} from '@/components/spends/SpendInstruments'
import { SpendLedger } from '@/components/spends/SpendLedger'
import { IconArrowRight, IconPlus } from '@/components/ui/Icons'

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}
const RISE = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } },
}

export default function Spends() {
  const spends = useSpends()
  const { summary, ledger, ready } = useSpendsSystem()
  const base = useUI((s) => s.baseCurrency)
  const openSpendComposer = useUI((s) => s.openSpendComposer)

  const hero = useMemo(() => splitMoney(summary.totalToday, base), [summary.totalToday, base])
  const recent = ready ? ledger.slice(0, 7) : []

  if (!ready) {
    return (
      <div className="px-3 py-6 md:px-5">
        <EmptyState
          code="NO SPENDS RECORDED"
          title="NO DAY-TO-DAY SPEND YET."
          description="Daily spends are the variable half of your ledger — groceries, meals, fuel, the small things. Log your first expense and the deck comes alive."
          action={{ label: '+ LOG FIRST SPEND', onClick: () => openSpendComposer() }}
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
      {/* header summary bar */}
      <motion.div variants={RISE}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line pb-2 text-faint">
          <span className="micro flex items-center gap-2">
            <span className="text-fg font-medium">DAILY SPENDS // {summary.monthKey}</span>
            <span className="text-linehard">·</span>
            <span>{summary.categories.length} categories active</span>
          </span>
          <span className="micro hidden sm:inline text-faint">
            {formatMoney(summary.monthTotal, base)} THIS MONTH
          </span>
        </div>
      </motion.div>

      <div className="mt-4 grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        {/* LEFT 8 */}
        <div className="flex flex-col gap-3 lg:col-span-8">
          {/* hero */}
          <motion.div variants={RISE}>
            <CutPanel cut="tl-br" cutSize={18} innerClassName="relative p-4 md:p-6">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden dot-field opacity-[0.2]" />
              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="micro text-acidink">SPENT TODAY</span>
                      <span className="micro text-faint">{summary.countToday} TRANSACTIONS</span>
                    </div>
                    <h1 className="mt-2 flex items-start gap-1">
                      <span className="numeral mt-1 text-[clamp(1.6rem,4.5vw,2.6rem)] text-dim">
                        {hero.symbol}
                      </span>
                      <span className="numeral text-hero text-fg">
                        <AnimatedNumber
                          value={summary.totalToday}
                          format={(value) => splitMoney(value, base).value}
                          stiffness={120}
                          damping={26}
                        />
                      </span>
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span
                        className={
                          summary.monthDelta > 0 ? 'micro text-orangeink' : 'micro text-acidink'
                        }
                      >
                        {formatPercent(summary.monthDelta, 1)} VS PREVIOUS MONTH
                      </span>
                      <span className="micro text-faint">
                        {formatMoney(summary.avgDayMonth, base)} AVG / DAY
                      </span>
                      <span className="micro text-faint">
                        {formatMoney(summary.weekTotal, base)} THIS WEEK
                      </span>
                    </div>
                  </div>

                  {/* next action / quick add */}
                  <div className="min-w-[168px]">
                    <CyberButton
                      variant="solid"
                      full
                      leading={<IconPlus size={14} />}
                      onClick={() => openSpendComposer()}
                    >
                      LOG SPEND
                    </CyberButton>
                  </div>
                </div>

                {/* readouts */}
                <div className="mt-4 border-y border-line">
                  <DataStrip
                    items={[
                      {
                        label: 'Week total',
                        value: formatMoney(summary.weekTotal, base),
                        signal: 'blue',
                      },
                      {
                        label: 'Wants (week)',
                        value: formatMoney(summary.weekDiscretionary, base),
                        signal: 'orange',
                      },
                      {
                        label: 'Budget cap left',
                        value: summary.weekLimit?.amount
                          ? formatMoney(summary.weekRemaining, base)
                          : 'UNSET',
                        signal: summary.weekLimit?.amount ? 'acid' : 'blue',
                      },
                      {
                        label: 'This month',
                        value: formatMoney(summary.monthTotal, base),
                        signal: 'magenta',
                      },
                      {
                        label: 'Month high day',
                        value: summary.monthHighDay?.amount
                          ? formatMoney(summary.monthHighDay.amount, base)
                          : '—',
                      },
                    ]}
                  />
                </div>

                {/* velocity */}
                <div className="mt-5">
                  <SectionHeader
                    code="VEL"
                    title="Spend Velocity"
                    signal="blue"
                    className="border-b-0 px-0 pt-0"
                    right={<span className="micro text-faint">MULTI-TIMEFRAME TELEMETRY</span>}
                  />
                  <SpendVelocity spends={spends} base={base} height={185} />
                </div>
              </div>
            </CutPanel>
          </motion.div>

          {/* ledger + category */}
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <motion.div variants={RISE} className="xl:col-span-8">
              <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
                <SectionHeader
                  code="LDG"
                  title="Recent ledger"
                  signal="acid"
                  right={
                    <Link to="/spends/flow" className="micro flex items-center gap-1 text-dim transition-colors hover:text-acidink">
                      FULL LEDGER <IconArrowRight size={11} />
                    </Link>
                  }
                />
                {recent.length ? (
                  <div className="max-h-[520px] overflow-y-auto" data-lenis-prevent>
                    <SpendLedger groups={recent} base={base} />
                  </div>
                ) : (
                  <p className="meta px-4 py-6 text-faint">NOTHING RECORDED YET.</p>
                )}
              </CutPanel>
            </motion.div>

            <motion.div variants={RISE} className="xl:col-span-4">
              <CutPanel cut="br" cutSize={14} innerClassName="p-0" className="h-full flex flex-col">
                <SectionHeader
                  code="CAT"
                  title="Category mix"
                  signal="magenta"
                  right={<span className="micro text-faint">{summary.categories.length} SECTORS</span>}
                />
                <SpendCategoryComposition
                  slices={summary.categories}
                  base={base}
                  onPick={(category) => openSpendComposer({ presetCategory: category })}
                />
              </CutPanel>
            </motion.div>
          </div>
        </div>

        {/* RIGHT 4 */}
        <div className="flex flex-col gap-3 lg:col-span-4">
          {/* limiter */}
          <motion.div variants={RISE}>
            <CutPanel cut="br" cutSize={14} innerClassName="p-0">
              <SectionHeader
                code="LMT"
                title="Weekly limiter"
                signal={
                  summary.weekLimit?.amount
                    ? summary.weekUtilisation >= 1
                      ? 'red'
                      : summary.weekUtilisation >= 0.72
                        ? 'orange'
                        : 'acid'
                    : 'blue'
                }
                right={
                  <Link to="/spends/limits" className="micro text-dim transition-colors hover:text-acidink">
                    CONFIGURE
                  </Link>
                }
              />
              <LimiterGauge
                utilisation={summary.weekUtilisation}
                remaining={summary.weekRemaining}
                hasLimit={Boolean(summary.weekLimit?.amount)}
                signal={
                  summary.weekLimit?.amount
                    ? summary.weekUtilisation >= 1
                      ? 'red'
                      : summary.weekUtilisation >= 0.72
                        ? 'orange'
                        : 'acid'
                    : 'blue'
                }
                base={base}
              />
            </CutPanel>
          </motion.div>

          {/* today's detail */}
          <motion.div variants={RISE}>
            <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
              <SectionHeader
                code="DAY"
                title="Today"
                signal={summary.totalToday > 0 ? 'orange' : 'blue'}
                right={<span className="micro text-faint">{formatSignalDate(summary.today)}</span>}
              />
              <div className="p-3">
                {summary.countToday ? (
                  <div className="space-y-1.5">
                    <p className="meta text-dim">
                      {summary.countToday} transaction{summary.countToday > 1 ? 's' : ''} recorded today,{' '}
                      {formatMoney(summary.totalToday, base)} out of your account.
                    </p>
                  </div>
                ) : (
                  <p className="meta text-faint">NO SPEND YET TODAY. TRACKING IDLE.</p>
                )}
              </div>
            </CutPanel>
          </motion.div>

          {/* notes */}
          <motion.div variants={RISE}>
            <CutPanel cut="tr" cutSize={14} innerClassName="p-0">
              <SectionHeader
                code="SIG"
                title="Spend signals"
                signal={summary.notes.some((n) => n.signal === 'red') ? 'red' : 'acid'}
                right={<span className="micro text-faint">{summary.notes.length} OBS</span>}
              />
              {summary.notes.length ? (
                <div className="divide-y divide-line">
                  {summary.notes.map((note) => (
                    <div key={note.id} className="px-3 py-2.5 md:px-4">
                      <span className="micro flex items-center gap-1.5 text-dim">
                        <Led signal={note.signal} size="sm" pulse={note.signal === 'red' || note.signal === 'orange'} />
                        {note.label}
                      </span>
                      <p className="meta mt-1 text-faint">{note.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="meta px-4 py-6 text-faint">NO SIGNALS — SPEND WITHIN ENVELOPE.</p>
              )}
            </CutPanel>
          </motion.div>
        </div>
      </div>

      <div className="mt-4 flex justify-center md:hidden">
        <CyberButton
          variant="solid"
          size="lg"
          full
          leading={<IconPlus size={15} />}
          onClick={() => openSpendComposer()}
        >
          LOG SPEND
        </CyberButton>
      </div>
    </motion.div>
  )
}
