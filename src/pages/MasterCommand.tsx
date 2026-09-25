/**
 * SUBTRACK // MASTER COMMAND
 *
 * The Financial OS cockpit — the top of the stack. Where the Overview is the
 * Subscriptions engine's instrument panel, Master Command is the whole machine:
 * it rolls every domain engine into one Net Burn, one Runway and one
 * Next-Critical-Transaction readout, and shows the live/standby health of each
 * subsystem. Today only the Subscriptions engine is live; the standby decks
 * (CRD, DEBT, SPND) appear here as dark modules awaiting their core, so when an
 * engine ships it flows into this roll-up automatically.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useSignalSeries, useSystem } from '@/hooks/useSystem'
import { useSpendsSystem, type SpendsData } from '@/hooks/useSpends'
import { useDebtSystem, type DebtData } from '@/hooks/useDebt'
import { useUI } from '@/store/ui'
import { formatMoney, formatPercent, splitMoney } from '@/lib/money'
import { formatSignalDate } from '@/lib/date'
import { DOMAINS } from '@/app/nav'
import { cx } from '@/lib/cx'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader, KeyCap } from '@/components/ui/Micro'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Led, SIGNAL_HEX, SIGNAL_TEXT, type Signal } from '@/components/ui/Signal'
import { CompositionStrip } from '@/components/charts/CategoryBlock'
import { DataStrip } from '@/components/ui/DataStrip'
import { ServiceBadge } from '@/components/brand/ServiceBadge'
import { IconArrowRight } from '@/components/ui/Icons'
import type { SystemSummary } from '@/lib/analytics'

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}
const RISE = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } },
}

/** Telemetry for a domain in the matrix. */
function domainTelemetry(
  domain: (typeof DOMAINS)[number],
  summary: SystemSummary,
  spendsData: SpendsData,
  debtData: DebtData,
): { signal: Signal; primary: string; secondary: string; to: string } {
  switch (domain.code) {
    case 'SUBS':
      return {
        signal: summary.activeCount ? (summary.overdue.length ? 'orange' : 'acid') : 'blue',
        primary: summary.activeCount ? formatMoney(summary.monthlyBurn, summary.base) : '—',
        secondary: `${summary.activeCount} ACTIVE · ${summary.overdue.length} OVERDUE`,
        to: '/subs',
      }
    case 'SYS':
      return { signal: 'acid' as Signal, primary: 'LOCAL', secondary: 'OFFLINE-READY · NO TELEMETRY', to: '/sys' }
    case 'SPND':
      return spendsTelemetry(spendsData)
    case 'DEBT':
      return debtTelemetry(debtData)
    default:
      return { signal: 'orange' as Signal, primary: 'STANDBY', secondary: `${domain.tag} · PENDING CORE`, to: domain.path }
  }
}

/** SPND telemetry for the subsystem matrix (kept outside the component
 *  so it can be referenced by the pure domainTelemetry switch). */
function spendsTelemetry(
  spends: SpendsData,
): { signal: Signal; primary: string; secondary: string; to: string } {
  const spend = spends.summary
  const over = spend.weekLimit?.amount && spend.weekUtilisation >= 1
  const active = spend.weekTotal > 0 || spend.totalToday > 0
  return {
    signal: active
      ? over
        ? 'red'
        : spend.weekUtilisation >= 0.72
          ? 'orange'
          : 'acid'
      : 'blue',
    primary: active ? formatMoney(spend.weekTotal, spend.base) : '—',
    secondary: spend.weekLimit?.amount
      ? `${Math.round(spend.weekUtilisation * 100)}% OF WEEKLY CAP`
      : spend.totalToday > 0
        ? `${spend.countToday} TXN TODAY`
        : 'NO SPEND TODAY',
    to: '/spends',
  }
}

/** DEBT telemetry for the subsystem matrix. */
function debtTelemetry(
  debt: DebtData,
): { signal: Signal; primary: string; secondary: string; to: string } {
  const s = debt.summary
  if (!debt.ready || s.activeCount === 0) {
    return { signal: 'blue' as Signal, primary: '—', secondary: 'NO LOANS TRACKED', to: '/loans' }
  }
  return {
    signal: s.avgInterestRate >= 12 ? 'orange' : 'acid',
    primary: formatMoney(s.monthlyBurden, s.base),
    secondary: `${s.activeCount} ACTIVE · ${(s.overallProgress * 100).toFixed(0)}% REPAID`,
    to: '/loans',
  }
}

export default function MasterCommand() {
  const { summary } = useSystem()
  const spendsData = useSpendsSystem()
  const debtData = useDebtSystem()
  const base = useUI((s) => s.baseCurrency)
  const series = useSignalSeries('cash', 3, 1)
  const now = summary.today

  const hero = useMemo(() => splitMoney(summary.monthlyBurn, base), [summary.monthlyBurn, base])
  const next = summary.nextPayment
  const spendMonthTotal = spendsData.summary.monthTotal

  // Projected engines contribute 0 until they ship, so the roll-up is honest.
  const standbyEngines = DOMAINS.filter((d) => d.status === 'standby')
  const engineCount = DOMAINS.filter((d) => d.status === 'live').length

  // Runway: how long the cash out is "covered" — real subs burn only for now.
  const dailyBurn = summary.dailyBurn
  const coveredBurn = summary.thisMonthCash > 0 ? summary.thisMonthCash : summary.monthlyBurn

  /** Composition across live engines (subs only today). */
  const composition = summary.categories

  // Cash momentum over the last 3 actual months for the drift readout.
  const actual = series.filter((p) => p.kind !== 'projected')
  const lastActual = actual[actual.length - 1]
  const drift = lastActual && actual.length > 1 ? lastActual.amount - actual[actual.length - 2].amount : 0

  const monthLabel = lastActual ? lastActual.label : now.slice(0, 7)

  return (
    <motion.div
      variants={STAGGER}
      initial="hidden"
      animate="show"
      className="px-3 py-4 md:px-5 md:py-5"
    >
      {/* ---------- top telemetry strip ---------- */}
      <motion.div variants={RISE}>
        <DataStrip
          size="sm"
          scroll={false}
          items={[
            { label: 'OS MODULE', value: 'MASTER COMMAND' },
            { label: 'ENGINES ONLINE', value: `${engineCount}/${DOMAINS.length}`, signal: 'acid' },
            { label: 'MONTHLY RUNWAY', value: formatMoney(summary.monthlyBurn, base), signal: 'acid' },
            {
              label: 'ANNUAL COMMITMENT',
              value: formatMoney(summary.annualLoad, base),
            },
            { label: 'NEXT CHARGE', value: next ? formatMoney(next.baseAmount, base) : '—' },
          ]}
        />
      </motion.div>

      {/* ---------- hero: net burn roll-up ---------- */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tl-br" cutSize={20} innerClassName="relative overflow-hidden px-4 py-5 md:px-6 md:py-7" shadow="hard">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-field opacity-[0.16]" />
          <div className="relative flex flex-col gap-1">
            <span className="micro flex items-center gap-2 text-acidink">
              <Led signal="acid" size="sm" pulse />
              TOTAL SYSTEM BURN // {monthLabel}
            </span>
            <h1 className="mt-1 flex items-start gap-1.5">
              <span className="numeral mt-1 text-[clamp(1.7rem,5vw,3rem)] text-dim">{hero.symbol}</span>
              <span className="numeral text-hero text-fg">
                <AnimatedNumber
                  value={summary.monthlyBurn}
                  format={(value) => splitMoney(value, base).value}
                  stiffness={120}
                  damping={26}
                />
              </span>
            </h1>

            {/* run-rate roll-up by engine */}
            <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1">
              {DOMAINS.map((domain) => {
                const isSubs = domain.code === 'SUBS'
                const isSpnd = domain.code === 'SPND'
                const spndValue = isSpnd ? spendsData.summary.monthTotal : 0
                return (
                  <span
                    key={domain.code}
                    className={cx(
                      'micro inline-flex items-center gap-1.5 border px-1.5 py-1',
                      isSubs ? 'border-acid bg-acidsoft' : isSpnd ? 'border-orange bg-orangesoft' : 'border-line bg-surface2',
                    )}
                  >
                    <Led
                      signal={isSubs ? 'acid' : 'orange'}
                      size="sm"
                      pulse={(isSubs && summary.activeCount > 0) || (isSpnd && spndValue > 0)}
                    />
                    <span className={cx('font-semibold', isSubs || isSpnd ? 'text-fg' : 'text-faint')}>{domain.code}</span>
                    <span className={cx(isSubs ? 'text-acidink' : isSpnd ? 'text-orangeink' : 'text-faint')}>
                      {isSubs ? formatMoney(summary.monthlyBurn, base) : isSpnd ? formatMoney(spndValue, base) : '0.00'}
                    </span>
                  </span>
                )
              })}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className={cx(
                  'micro',
                  summary.runRateDelta > 0 ? 'text-orangeink' : summary.runRateDelta < 0 ? 'text-acidink' : 'text-faint',
                )}
              >
                {formatPercent(summary.runRateDelta, 1)} VS PREVIOUS CYCLE
              </span>
              <span className="micro text-faint">
                {formatMoney(dailyBurn, base)} DRAIN DAILY
              </span>
              {spendMonthTotal > 0 && (
                <span className="micro text-orangeink">
                  {formatMoney(spendMonthTotal, base)} VARIABLE BURN
                </span>
              )}
              <span className="micro text-faint">
                {formatMoney(coveredBurn, base)} CASH THIS MONTH
              </span>
              {drift !== 0 && (
                <span className={cx('micro', drift > 0 ? 'text-orangeink' : 'text-acidink')}>
                  {formatMoney(drift, base)} MOMENTUM {monthLabel}
                </span>
              )}
            </div>
          </div>
        </CutPanel>
      </motion.div>

      {/* ---------- subsystem status matrix ---------- */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="br" cutSize={14} innerClassName="p-2">
          <SectionHeader
            code="MATRIX"
            title="Subsystem Status"
            signal="acid"
            right={
              <span className="micro text-faint">
                {engineCount} LIVE · {DOMAINS.length - engineCount} STANDBY
              </span>
            }
          />
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {DOMAINS.map((domain) => {
              const tel = domainTelemetry(domain, summary, spendsData, debtData)
              const Icon = domain.icon
              const live = domain.status === 'live'
              return (
                <Link
                  key={domain.code}
                  to={tel.to}
                  className={cx(
                    'group relative flex flex-col justify-between gap-3 border border-line2 p-3 transition-colors hover:border-linehard hover:bg-surface2',
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span className={cx('micro flex items-center gap-2')}>
                      <Icon size={16} className={live ? 'text-fg' : 'text-faint'} />
                      <span className={cx('font-semibold tracking-wide', live ? 'text-fg' : 'text-dim')}>
                        {domain.code}
                      </span>
                    </span>
                    <span className={cx('micro flex items-center gap-1', SIGNAL_TEXT[tel.signal])}>
                      <Led signal={tel.signal} size="sm" pulse={tel.signal === 'acid'} />
                      {live ? 'LIVE' : 'STANDBY'}
                    </span>
                  </span>
                  <span className={cx('meta truncate', live ? 'text-fg' : 'text-faint')}>
                    {domain.label}
                  </span>
                  <span className="flex items-end justify-between gap-2">
                    <span className={cx('block text-[18px] font-semibold tnum', tel.signal === 'acid' && 'text-acidink')}>
                      {tel.primary}
                    </span>
                    <span className="micro flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 text-faint">
                      ENTER <IconArrowRight size={12} />
                    </span>
                  </span>
                  <span className="micro block truncate text-faint">{tel.secondary}</span>
                </Link>
              )
            })}
          </div>
        </CutPanel>
      </motion.div>

      {/* ---------- next critical + composition ---------- */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* next critical across engines */}
        <motion.div variants={RISE} className="lg:col-span-4">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-3" className="h-full">
            <SectionHeader code="CRIT" title="Next Critical Outflow" signal={next ? (next.days <= 1 ? 'orange' : 'blue') : 'blue'} />
            {next ? (
              <div className="px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <ServiceBadge icon={next.sub.icon} color={next.sub.color} size="sm" />
                  <span className="min-w-0 flex-1">
                    <Link to={`/subs/flow/${next.sub.id}`} className="truncate text-[13px] font-semibold text-fg hover:underline">
                      {next.sub.name}
                    </Link>
                    <span className="meta block text-faint">{formatSignalDate(next.date)}</span>
                  </span>
                  <span className="meta shrink-0 text-fg">{formatMoney(next.baseAmount, base)}</span>
                </div>
                <div className="mt-3 pt-2">
                  <span className={cx('micro flex items-center gap-1.5', next.days <= 1 ? 'text-orangeink' : 'text-blueink')}>
                    <Led signal={next.days <= 1 ? 'orange' : 'blue'} size="sm" pulse={next.days <= 1} />
                    {next.days === 0 ? 'DUE TODAY' : next.days === 1 ? 'DUE TOMORROW' : `${next.days} DAYS OUT`}
                  </span>
                </div>
              </div>
            ) : (
              <p className="meta px-3 py-5 text-faint">NO SCHEDULED OUTFLOW</p>
            )}
          </CutPanel>
        </motion.div>

        {/* composition across live engines */}
        <motion.div variants={RISE} className="lg:col-span-8">
          <CutPanel cut="br" cutSize={14} innerClassName="p-3" className="h-full">
            <SectionHeader
              code="LOAD"
              title="Burn Composition — Live Engines"
              signal="magenta"
              right={
                <span className="micro text-faint">
                  DOMINANT · {summary.categories[0]?.label?.toUpperCase() || '—'}
                </span>
              }
            />
            {composition.length ? (
              <div className="px-3 pb-2">
                <CompositionStrip slices={composition} height={18} />
                <div className="mt-2 flex items-center gap-2">
                  {composition.slice(0, 5).map((slice) => (
                    <span key={slice.category} className={cx('micro inline-flex items-center gap-1.5 border px-1.5 py-0.5', SIGNAL_TEXT[slice.signal])}>
                      <span aria-hidden="true" className="h-2 w-2" style={{ background: SIGNAL_HEX[slice.signal] }} />
                      <span className="font-semibold">{slice.code}</span>
                      <span className="opacity-70 font-normal">
                        {(slice.share * 100).toFixed(0)}% · {formatMoney(slice.monthly, base)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="meta px-3 py-5 text-faint">NO LIVE ENGINE DATA YET</p>
            )}
          </CutPanel>
        </motion.div>
      </div>

      {/* ---------- standby roadmap ---------- */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tr" cutSize={14} innerClassName="p-2">
          <SectionHeader
            code="ROAD"
            title="Pending Engines"
            signal="orange"
            right={<span className="micro text-faint">{standbyEngines.length} IN STANDBY</span>}
          />
          <div className="divide-y divide-line">
            {standbyEngines.map((domain) => {
              const Icon = domain.icon
              return (
                <div key={domain.code} className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface2 md:px-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center border border-orange text-orangeink">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[12.5px] font-medium text-dim">{domain.label}</span>
                      <span className="micro border border-line2 px-1.5 py-0.5 text-orangeink">{domain.tag}</span>
                    </span>
                    <span className="meta block truncate text-faint">{domain.manifest}</span>
                  </span>
                  <Link
                    to={domain.path}
                    className="micro shrink-0 border border-line2 px-2 py-1 text-dim transition-colors hover:border-linehard hover:text-fg"
                  >
                    VIEW DECK
                  </Link>
                </div>
              )
            })}
          </div>
        </CutPanel>
      </motion.div>

      {/* ---------- quick launch ---------- */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tl" cutSize={14} innerClassName="px-3 py-2 md:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="micro text-faint">LAUNCH:</span>
            {DOMAINS.map((domain) => (
              <Link
                key={domain.code}
                to={domain.path}
                className="micro inline-flex items-center gap-1.5 border border-line2 px-2 py-1 text-dim transition-colors hover:border-acid hover:text-acidink"
              >
                <KeyCap>{domain.key}</KeyCap>
                <span>{domain.label}</span>
              </Link>
            ))}
            <span className="micro hidden text-faint md:inline">· PRESS 1–6 TO JUMP</span>
          </div>
        </CutPanel>
      </motion.div>
    </motion.div>
  )
}