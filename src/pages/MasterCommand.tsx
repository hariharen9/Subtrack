/**
 * SPENDSTATE // MASTER COMMAND COCKPIT
 *
 * The Financial OS Central Command. Rolls every live domain engine (Subscriptions,
 * Credit Cards, Loans & EMIs, Daily Spends) into an apex command dashboard:
 *
 * 1. APEX HERO & RUN-RATE TELEMETRY — Aggregate Net Burn, Fixed vs Variable split,
 *    daily drain velocity, and proportional domain allocation register.
 * 2. RAPID INGESTION DOCK — 1-click launchpads for capturing Subs, Spends, EMIs, Txns.
 * 3. 4-ENGINE COMMAND MATRIX — Interactive cockpit modules with visual gauges,
 *    repayment progress, credit utilization rings, and velocity meters.
 * 4. 14-DAY CROSS-DOMAIN RADAR — Unified chronological queue of upcoming Subscriptions,
 *    Credit Card statement dues, and Loan EMI schedules.
 * 5. MULTI-ENGINE RESOURCE ALLOCATION — Consolidated financial footprint composition
 *    and 50/30/20 budgetary health metrics.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useSystem } from '@/hooks/useSystem'
import { useSpendsSystem, useSpends } from '@/hooks/useSpends'
import { useDebtSystem } from '@/hooks/useDebt'
import { useCardsSystem } from '@/hooks/useCards'
import { useUI } from '@/store/ui'
import { formatMoney, formatPercent, splitMoney, formatCompact } from '@/lib/money'
import { formatSignalDate, todayISO, diffDays, addMonthsClamped } from '@/lib/date'
import { SPEND_CATEGORY_META } from '@/lib/types'
import { cx } from '@/lib/cx'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader, KeyCap } from '@/components/ui/Micro'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Led, SIGNAL_HEX, SIGNAL_TEXT, type Signal } from '@/components/ui/Signal'
import { CompositionStrip } from '@/components/charts/CategoryBlock'
import { ServiceBadge } from '@/components/brand/ServiceBadge'
import { SpendBadge } from '@/components/spends/SpendBadge'
import { CyberButton } from '@/components/ui/CyberButton'
import {
  IconArrowRight,
  IconPlus,
  IconFlow,
  IconCreditCard,
  IconDebt,
  IconSpends,
  IconSys,
  IconZap,
} from '@/components/ui/Icons'

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.03 } },
}
const RISE = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 440, damping: 32 } },
}

interface UnifiedOutflow {
  id: string
  engine: 'SUBS' | 'CRD' | 'DEBT'
  title: string
  subtitle: string
  date: string
  days: number
  amount: number
  minDue?: number
  icon?: string
  color?: string
  to: string
  signal: Signal
}

export default function MasterCommand() {
  const { summary } = useSystem()
  const spendsData = useSpendsSystem()
  const recentSpends = useSpends()
  const debtData = useDebtSystem()
  const cardsData = useCardsSystem()
  const base = useUI((s) => s.baseCurrency)
  const uiMode = useUI((s) => s.uiMode)
  const openComposer = useUI((s) => s.openComposer)
  const openSpendComposer = useUI((s) => s.openSpendComposer)
  const openLoanComposer = useUI((s) => s.openLoanComposer)
  const openCardComposer = useUI((s) => s.openCardComposer)
  const today = todayISO()

  // ── Engine Monthly Contributions ──
  const subsMonthly = summary.monthlyBurn
  const debtMonthly = debtData.ready ? debtData.summary.monthlyBurden : 0
  const spendsMonthly = spendsData.summary.monthTotal
  const cardsCarryMonthly = cardsData.ready ? cardsData.summary.carryInterestMonthly : 0

  // ── Total System Burn ──
  const systemBurn = subsMonthly + debtMonthly + spendsMonthly + cardsCarryMonthly
  const hero = useMemo(() => splitMoney(systemBurn, base), [systemBurn, base])

  // ── Fixed vs Variable Split ──
  const fixedBurn = subsMonthly + debtMonthly
  const variableBurn = spendsMonthly + (cardsData.ready ? cardsData.summary.totalOutstanding : 0)
  const dailyDrain = systemBurn / 30.4375
  const annualBurn = systemBurn * 12

  // ── Domain Allocation Shares ──
  const allocationSlices = useMemo(() => {
    if (systemBurn <= 0) return []
    return [
      { code: 'SUBS', label: 'Subscriptions', amount: subsMonthly, share: subsMonthly / systemBurn, signal: 'acid' as Signal },
      { code: 'DEBT', label: 'Loans & EMIs', amount: debtMonthly, share: debtMonthly / systemBurn, signal: 'blue' as Signal },
      { code: 'SPND', label: 'Daily Spends', amount: spendsMonthly, share: spendsMonthly / systemBurn, signal: 'orange' as Signal },
      { code: 'CRD', label: 'Card Interest', amount: cardsCarryMonthly, share: cardsCarryMonthly / systemBurn, signal: 'magenta' as Signal },
    ].filter((s) => s.amount > 0)
  }, [systemBurn, subsMonthly, debtMonthly, spendsMonthly, cardsCarryMonthly])

  // ── Unified 14-Day Cross-Domain Radar Queue ──
  const radarQueue = useMemo(() => {
    const items: UnifiedOutflow[] = []

    // 1. Subscriptions
    for (const u of summary.incomingWindow.slice(0, 8)) {
      items.push({
        id: `sub-${u.sub.id}-${u.date}`,
        engine: 'SUBS',
        title: u.sub.name,
        subtitle: `Subscription renewal · ${formatSignalDate(u.date)}`,
        date: u.date,
        days: u.days,
        amount: u.baseAmount,
        icon: u.sub.icon,
        color: u.sub.color,
        to: `/subs/flow/${u.sub.id}`,
        signal: u.days <= 1 ? 'orange' : 'acid',
      })
    }

    // 2. Credit Cards
    if (cardsData.ready) {
      for (const view of cardsData.summary.activeViews) {
        if (view.card.status === 'active' && view.balance > 0) {
          const dueAmt = view.statement.due > 0 ? view.statement.due : view.balance
          items.push({
            id: `crd-${view.card.id}`,
            engine: 'CRD',
            title: `${view.card.name} ··${view.card.last4}`,
            subtitle: `Card statement due · ${formatSignalDate(view.dueDate)}`,
            date: view.dueDate,
            days: view.daysToDue,
            amount: dueAmt,
            minDue: view.minDue,
            color: view.card.color,
            to: `/cards/flow/${view.card.id}`,
            signal: view.daysToDue <= 3 ? 'red' : view.daysToDue <= 7 ? 'orange' : 'blue',
          })
        }
      }
    }

    // 3. Loans & EMIs
    if (debtData.ready) {
      for (const view of debtData.summary.views) {
        if (view.loan.status === 'active' && view.emisRemaining > 0) {
          const nextEmiDate = addMonthsClamped(view.loan.startDate, view.emisPaid)
          const days = diffDays(nextEmiDate, today)
          items.push({
            id: `debt-${view.loan.id}`,
            engine: 'DEBT',
            title: view.loan.name,
            subtitle: `EMI #${view.emisPaid + 1} of ${view.loan.tenureMonths} · ${view.loan.lender}`,
            date: nextEmiDate,
            days: Math.max(0, days),
            amount: view.loan.emi,
            color: '#7A5CFF',
            to: `/loans/flow/${view.loan.id}`,
            signal: days <= 3 ? 'orange' : 'blue',
          })
        }
      }
    }

    return items.sort((a, b) => a.days - b.days)
  }, [summary.incomingWindow, cardsData.ready, cardsData.summary.activeViews, debtData.ready, debtData.summary.views, today])

  const nearestOutflow = radarQueue[0]

  if (uiMode === 'minimal') {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8 space-y-6">
        {/* Clean Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-fg">Dashboard</h1>
            <p className="text-sm text-dim mt-0.5">
              Unified overview of recurring subscriptions, cards, loans, and day-to-day spends.
            </p>
          </div>
          {/* Quick Action Dock */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => openSpendComposer()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-line text-sm font-medium text-fg hover:border-linehard hover:bg-surface-2 transition-all shadow-sm cursor-pointer"
            >
              <IconPlus size={14} className="text-acid-ink" />
              <span>Log Spend</span>
              <kbd className="ml-1 text-[10px] text-faint">X</kbd>
            </button>
            <button
              onClick={() => openComposer()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-line text-sm font-medium text-fg hover:border-linehard hover:bg-surface-2 transition-all shadow-sm cursor-pointer"
            >
              <IconPlus size={14} className="text-acid-ink" />
              <span>Subscription</span>
              <kbd className="ml-1 text-[10px] text-faint">N</kbd>
            </button>
          </div>
        </div>

        {/* Hero Spending Card */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm relative overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-dim">
                Total Monthly Outflow
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold tracking-tight text-fg">
                  {formatMoney(systemBurn, base)}
                </span>
                <span className="text-sm text-dim">/ month</span>
              </div>
              <p className="mt-2 text-xs text-faint">
                Annual run rate: {formatCompact(annualBurn, base)} · Daily burn: ~{formatMoney(dailyDrain, base)}/day
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5">
                <div className="text-[11px] font-medium text-dim">Fixed Commitments</div>
                <div className="text-base font-semibold text-fg mt-0.5">{formatMoney(fixedBurn, base)}</div>
                <div className="text-[10px] text-faint mt-0.5">Subscriptions + EMIs</div>
              </div>
              <div className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5">
                <div className="text-[11px] font-medium text-dim">Variable Spending</div>
                <div className="text-base font-semibold text-fg mt-0.5">{formatMoney(variableBurn, base)}</div>
                <div className="text-[10px] text-faint mt-0.5">Spends + Card balances</div>
              </div>
            </div>
          </div>

          {/* Clean Proportional Distribution Bar */}
          {allocationSlices.length > 0 && (
            <div className="mt-6 pt-5 border-t border-line/60">
              <div className="flex items-center justify-between text-xs text-dim mb-2">
                <span>Monthly Allocation</span>
                <span>{allocationSlices.length} active engines</span>
              </div>
              <div className="h-2.5 w-full flex rounded-full overflow-hidden bg-surface-2 gap-0.5">
                {allocationSlices.map((slice) => (
                  <div
                    key={slice.code}
                    style={{ width: `${Math.max(slice.share * 100, 2)}%` }}
                    className={cx(
                      'h-full transition-all rounded-full',
                      slice.code === 'SUBS' && 'bg-acid',
                      slice.code === 'DEBT' && 'bg-blue',
                      slice.code === 'SPND' && 'bg-orange',
                      slice.code === 'CRD' && 'bg-magenta',
                    )}
                    title={`${slice.label}: ${formatMoney(slice.amount, base)} (${Math.round(slice.share * 100)}%)`}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs">
                {allocationSlices.map((slice) => (
                  <div key={slice.code} className="flex items-center gap-1.5">
                    <span
                      className={cx(
                        'w-2 h-2 rounded-full',
                        slice.code === 'SUBS' && 'bg-acid',
                        slice.code === 'DEBT' && 'bg-blue',
                        slice.code === 'SPND' && 'bg-orange',
                        slice.code === 'CRD' && 'bg-magenta',
                      )}
                    />
                    <span className="text-dim">{slice.label}:</span>
                    <span className="font-medium text-fg">{formatMoney(slice.amount, base)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4 Clean Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Subscriptions */}
          <Link
            to="/subs"
            className="group rounded-2xl border border-line bg-surface p-4 shadow-sm hover:border-linehard transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-dim">Subscriptions</span>
                <span className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-dim group-hover:text-fg transition-colors">
                  <IconFlow size={14} />
                </span>
              </div>
              <div className="text-2xl font-bold text-fg mt-2">{formatMoney(subsMonthly, base)}</div>
              <p className="text-xs text-dim mt-0.5">{summary.activeCount} active services</p>
            </div>
            <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-acid-ink font-medium">
              <span>View subscriptions</span>
              <IconArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Daily Spends */}
          <Link
            to="/spends"
            className="group rounded-2xl border border-line bg-surface p-4 shadow-sm hover:border-linehard transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-dim">Daily Spends</span>
                <span className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-dim group-hover:text-fg transition-colors">
                  <IconSpends size={14} />
                </span>
              </div>
              <div className="text-2xl font-bold text-fg mt-2">{formatMoney(spendsMonthly, base)}</div>
              <p className="text-xs text-dim mt-0.5">{recentSpends.length} expenses logged</p>
            </div>
            <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-acid-ink font-medium">
              <span>View spend ledger</span>
              <IconArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Credit Cards */}
          <Link
            to="/cards"
            className="group rounded-2xl border border-line bg-surface p-4 shadow-sm hover:border-linehard transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-dim">Credit Cards</span>
                <span className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-dim group-hover:text-fg transition-colors">
                  <IconCreditCard size={14} />
                </span>
              </div>
              <div className="text-2xl font-bold text-fg mt-2">
                {cardsData.ready ? formatMoney(cardsData.summary.totalOutstanding, base) : '₹0'}
              </div>
              <p className="text-xs text-dim mt-0.5">
                {cardsData.ready ? `${cardsData.summary.views.length} cards · ${(cardsData.summary.totalUtilisation * 100).toFixed(0)}% util.` : '0 cards'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-acid-ink font-medium">
              <span>Open card vault</span>
              <IconArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Loans & EMIs */}
          <Link
            to="/loans"
            className="group rounded-2xl border border-line bg-surface p-4 shadow-sm hover:border-linehard transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-dim">Loans & EMIs</span>
                <span className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-dim group-hover:text-fg transition-colors">
                  <IconDebt size={14} />
                </span>
              </div>
              <div className="text-2xl font-bold text-fg mt-2">{formatMoney(debtMonthly, base)}</div>
              <p className="text-xs text-dim mt-0.5">
                {debtData.ready ? `${debtData.summary.activeCount} active liabilities` : '0 loans'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-acid-ink font-medium">
              <span>View debt payoff</span>
              <IconArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>

        {/* 2-Column Section: Upcoming Bills + Recent Spends */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upcoming Bills & Renewals (Next 14 Days) */}
          <div className="lg:col-span-7 rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-fg">Upcoming Renewals & Bills</h2>
                <p className="text-xs text-dim">Next 14 days schedule</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-2 border border-line text-dim">
                {radarQueue.length} upcoming
              </span>
            </div>

            {radarQueue.length === 0 ? (
              <div className="py-8 text-center text-sm text-dim">No upcoming bills due in the next 14 days.</div>
            ) : (
              <div className="divide-y divide-line/60">
                {radarQueue.slice(0, 6).map((item) => (
                  <Link
                    key={item.id}
                    to={item.to}
                    className="flex items-center justify-between py-3 hover:bg-surface-2/50 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-surface-2 border border-line flex items-center justify-center shrink-0">
                        {item.engine === 'SUBS' && <ServiceBadge icon={item.icon || 'globe'} color={item.color || '#e06c53'} size="sm" />}
                        {item.engine === 'CRD' && <IconCreditCard size={16} className="text-magenta" />}
                        {item.engine === 'DEBT' && <IconDebt size={16} className="text-blue" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-fg truncate">{item.title}</div>
                        <div className="text-xs text-dim truncate">{item.subtitle}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-3">
                      <div className="text-sm font-semibold text-fg">{formatMoney(item.amount, base)}</div>
                      <div className="text-xs text-dim">
                        {item.days === 0 ? 'Today' : item.days === 1 ? 'Tomorrow' : `In ${item.days} days`}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-5 rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-fg">Recent Spends</h2>
                <p className="text-xs text-dim">Latest discretionary expenses</p>
              </div>
              <Link to="/spends/flow" className="text-xs text-acid-ink font-medium hover:underline">
                View all →
              </Link>
            </div>

            {recentSpends.length === 0 ? (
              <div className="py-8 text-center text-sm text-dim">No spends logged yet.</div>
            ) : (
              <div className="divide-y divide-line/60">
                {recentSpends.slice(0, 6).map((spend) => (
                  <div key={spend.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <SpendBadge category={spend.category} title={spend.title} size="sm" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-fg truncate">{spend.title}</div>
                        <div className="text-xs text-dim capitalize">{spend.category} · {spend.date}</div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-fg shrink-0 pl-2">
                      {formatMoney(spend.amount, base)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="px-3 py-4 md:px-5 md:py-5">

      {/* ── 01. APEX TELEMETRY BAR & RAPID ACTION DOCK ── */}
      <motion.div variants={RISE}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-2 border-linehard pb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="micro flex items-center gap-1.5 border border-line2 bg-bg2 px-2 py-0.5 text-acidink">
              <Led signal="acid" size="sm" pulse />
              MASTER COMMAND
            </span>
            <span className="micro text-faint hidden sm:inline">OS CORE // 4 ENGINES LIVE</span>
            <span className="text-linehard hidden sm:inline">·</span>
            <span className="micro text-faint hidden md:inline">100% OFFLINE LOCAL VAULT</span>
          </div>

          {/* Quick Rapid Action Dock */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <CyberButton variant="ghost" size="sm" leading={<IconPlus size={12} />} onClick={() => openSpendComposer()}>
              SPEND <KeyCap className="ml-1 hidden lg:inline">X</KeyCap>
            </CyberButton>
            <CyberButton variant="ghost" size="sm" leading={<IconPlus size={12} />} onClick={() => openComposer()}>
              SUB <KeyCap className="ml-1 hidden lg:inline">N</KeyCap>
            </CyberButton>
            <CyberButton variant="ghost" size="sm" leading={<IconPlus size={12} />} onClick={() => openCardComposer({ mode: 'txn' })}>
              CARD <KeyCap className="ml-1 hidden lg:inline">C</KeyCap>
            </CyberButton>
            <CyberButton variant="ghost" size="sm" leading={<IconPlus size={12} />} onClick={() => openLoanComposer({ mode: 'loan' })}>
              LOAN <KeyCap className="ml-1 hidden lg:inline">L</KeyCap>
            </CyberButton>
          </div>
        </div>
      </motion.div>

      {/* ── 02. APEX HERO: TOTAL SYSTEM BURN & RESOURCE LOAD ── */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tl-br" cutSize={20} innerClassName="relative overflow-hidden p-4 md:p-6" shadow="hard">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-field opacity-[0.18]" />
          <div className="relative">
            {/* Top row: Label + Telemetry Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="micro flex items-center gap-2 text-acidink">
                <IconZap size={14} className="text-acid" />
                TOTAL SYSTEM BURN // NET MONTHLY RUN RATE
              </span>
              <div className="flex items-center gap-2">
                <span className="micro border border-line2 bg-bg2 px-2 py-0.5 text-faint">
                  ANNUALIZED: <span className="text-fg font-semibold">{formatCompact(annualBurn, base)}</span>
                </span>
                <span className="micro border border-line2 bg-bg2 px-2 py-0.5 text-acidink">
                  DRAIN: <span className="text-fg font-semibold">{formatMoney(dailyDrain, base)}/D</span>
                </span>
              </div>
            </div>

            {/* Main Odometer + Hero Numerals */}
            <div className="mt-2 grid grid-cols-1 items-end gap-4 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <h1 className="flex items-start gap-1.5">
                  <span className="numeral mt-1 text-[clamp(1.8rem,5vw,3rem)] text-dim">{hero.symbol}</span>
                  <span className="numeral text-hero text-fg tracking-tight">
                    <AnimatedNumber
                      value={systemBurn}
                      format={(value) => splitMoney(value, base).value}
                      stiffness={120}
                      damping={26}
                    />
                  </span>
                </h1>
                <p className="micro mt-1 text-faint">
                  NORMALIZED ACROSS ALL 4 DOMAINS · INCLUDES RECURRING PROCESSES, LOANS, DISCRETIONARY CASH & CARDS
                </p>
              </div>

              {/* Fixed vs Variable Split Telemetry */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:col-span-6">
                <div className="border border-line bg-bg2 p-2.5">
                  <span className="micro block text-faint">FIXED COMMITMENTS</span>
                  <span className="numeral mt-0.5 block text-[17px] font-bold text-fg">{formatCompact(fixedBurn, base)}</span>
                  <span className="micro text-acidink">
                    {systemBurn > 0 ? `${((fixedBurn / systemBurn) * 100).toFixed(0)}% OF TOTAL` : '0%'}
                  </span>
                </div>
                <div className="border border-line bg-bg2 p-2.5">
                  <span className="micro block text-faint">VARIABLE VELOCITY</span>
                  <span className="numeral mt-0.5 block text-[17px] font-bold text-orangeink">{formatCompact(variableBurn, base)}</span>
                  <span className="micro text-faint">SPENDS + DUES</span>
                </div>
                <div className="col-span-2 border border-line bg-bg2 p-2.5 sm:col-span-1">
                  <span className="micro block text-faint">NEXT OUTFLOW</span>
                  <span className="numeral mt-0.5 block text-[17px] font-bold text-acidink">
                    {nearestOutflow ? `${nearestOutflow.days}D` : '—'}
                  </span>
                  <span className="micro truncate text-dim">
                    {nearestOutflow ? nearestOutflow.title : 'NO CHARGE DUE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Proportional Domain Allocation Strip */}
            <div className="mt-4 border-t border-line pt-3">
              <div className="flex items-center justify-between">
                <span className="micro text-faint">DOMAIN ALLOCATION REGISTER</span>
                <span className="micro text-dim">100% VOLUME BREAKDOWN</span>
              </div>
              <div className="mt-1.5 flex h-3.5 w-full overflow-hidden border border-line bg-surface2">
                {allocationSlices.map((slice) => (
                  <div
                    key={slice.code}
                    className="h-full transition-all hover:brightness-125"
                    style={{ width: `${Math.max(2, slice.share * 100)}%`, background: SIGNAL_HEX[slice.signal] }}
                    title={`${slice.label} (${slice.code}): ${formatMoney(slice.amount, base)} (${(slice.share * 100).toFixed(1)}%)`}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {allocationSlices.map((slice) => (
                  <span key={slice.code} className={cx('micro inline-flex items-center gap-1.5 border px-1.5 py-0.5', SIGNAL_TEXT[slice.signal])}>
                    <span aria-hidden="true" className="h-1.5 w-1.5" style={{ background: SIGNAL_HEX[slice.signal] }} />
                    <span className="font-semibold">{slice.code}</span>
                    <span className="text-fg">{formatMoney(slice.amount, base)}</span>
                    <span className="opacity-70 font-normal">({(slice.share * 100).toFixed(0)}%)</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CutPanel>
      </motion.div>

      {/* ── 03. 4-SUBSYSTEM COMMAND COCKPIT MATRIX ── */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="br" cutSize={16} innerClassName="p-3">
          <SectionHeader
            code="MATRIX"
            title="Subsystem Cockpits"
            signal="acid"
            right={<span className="micro text-faint">4 LIVE DOMAINS ONLINE</span>}
          />

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">

            {/* SUBSCRIPTIONS */}
            <Link to="/subs" className="group block focus-visible:outline-none">
              <CutPanel cut="tl" cutSize={12} innerClassName="p-3.5 transition-colors group-hover:bg-surface2 group-hover:border-acid">
                <div className="flex items-center justify-between">
                  <span className="micro flex items-center gap-1.5">
                    <IconFlow size={14} className="text-acid" />
                    <span className="font-semibold text-fg">SUBSCRIPTIONS</span>
                  </span>
                  <span className="micro flex items-center gap-1 text-acidink">
                    <Led signal="acid" size="sm" pulse />
                    ACTIVE
                  </span>
                </div>
                <div className="mt-2">
                  <span className="numeral text-[22px] font-bold text-fg">{formatMoney(subsMonthly, base)}</span>
                  <span className="micro block text-faint">MONTHLY BURN</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-2">
                  <div>
                    <span className="micro block text-faint">PROCESSES</span>
                    <span className="numeral text-[13px] text-fg">{summary.activeCount} ACTIVE</span>
                  </div>
                  <div className="text-right">
                    <span className="micro block text-faint">DELTA</span>
                    <span className={cx('numeral text-[13px]', summary.runRateDelta > 0 ? 'text-orangeink' : summary.runRateDelta < 0 ? 'text-acidink' : 'text-dim')}>
                      {formatPercent(summary.runRateDelta, 1)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-1.5">
                  <span className="micro text-faint truncate">
                    {summary.nextPayment ? `NEXT: ${summary.nextPayment.sub.name} (${summary.nextPayment.days}D)` : 'NO CHARGE SCHEDULED'}
                  </span>
                  <span className="micro flex items-center gap-0.5 text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-acidink">
                    DECK <IconArrowRight size={11} />
                  </span>
                </div>
              </CutPanel>
            </Link>

            {/* CREDIT CARDS */}
            <Link to="/cards" className="group block focus-visible:outline-none">
              <CutPanel cut="none" cutSize={0} innerClassName="p-3.5 transition-colors group-hover:bg-surface2 group-hover:border-blue">
                <div className="flex items-center justify-between">
                  <span className="micro flex items-center gap-1.5">
                    <IconCreditCard size={14} className="text-blue" />
                    <span className="font-semibold text-fg">CREDIT CARDS</span>
                  </span>
                  <span className="micro flex items-center gap-1 text-blueink">
                    <Led signal="blue" size="sm" />
                    VAULT
                  </span>
                </div>
                <div className="mt-2">
                  <span className="numeral text-[22px] font-bold text-fg">
                    {formatMoney(cardsData.ready ? cardsData.summary.totalOutstanding : 0, base)}
                  </span>
                  <span className="micro block text-faint">TOTAL OUTSTANDING</span>
                </div>
                <div className="mt-3 border-t border-line pt-2">
                  <div className="flex items-center justify-between">
                    <span className="micro text-faint">UTILISATION</span>
                    <span className="micro font-bold text-fg">
                      {cardsData.ready ? `${(cardsData.summary.totalUtilisation * 100).toFixed(0)}%` : '0%'}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-surface border border-line">
                    <div
                      className={cx('h-full', cardsData.ready && cardsData.summary.totalUtilisation >= 0.8 ? 'bg-red' : cardsData.ready && cardsData.summary.totalUtilisation >= 0.5 ? 'bg-orange' : 'bg-blue')}
                      style={{ width: `${Math.max(2, (cardsData.ready ? cardsData.summary.totalUtilisation : 0) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-1.5">
                  <span className="micro text-faint truncate">
                    {cardsData.ready && cardsData.summary.nextDue ? `DUE: ${cardsData.summary.nextDue.card.name} (${cardsData.summary.nextDue.days}D)` : `${cardsData.ready ? cardsData.summary.activeViews.length : 0} CARDS ON RECORD`}
                  </span>
                  <span className="micro flex items-center gap-0.5 text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-blueink">
                    DECK <IconArrowRight size={11} />
                  </span>
                </div>
              </CutPanel>
            </Link>

            {/* LOANS & EMIS */}
            <Link to="/loans" className="group block focus-visible:outline-none">
              <CutPanel cut="none" cutSize={0} innerClassName="p-3.5 transition-colors group-hover:bg-surface2 group-hover:border-acid">
                <div className="flex items-center justify-between">
                  <span className="micro flex items-center gap-1.5">
                    <IconDebt size={14} className="text-acid" />
                    <span className="font-semibold text-fg">LOANS & DEBT</span>
                  </span>
                  <span className="micro flex items-center gap-1 text-acidink">
                    <Led signal="acid" size="sm" />
                    AMORTIZING
                  </span>
                </div>
                <div className="mt-2">
                  <span className="numeral text-[22px] font-bold text-fg">{formatMoney(debtMonthly, base)}</span>
                  <span className="micro block text-faint">MONTHLY EMI BURDEN</span>
                </div>
                <div className="mt-3 border-t border-line pt-2">
                  <div className="flex items-center justify-between">
                    <span className="micro text-faint">REPAYMENT PROGRESS</span>
                    <span className="micro font-bold text-acidink">
                      {debtData.ready ? `${(debtData.summary.overallProgress * 100).toFixed(0)}%` : '0%'}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-surface border border-line">
                    <div
                      className="h-full bg-acid"
                      style={{ width: `${Math.max(2, (debtData.ready ? debtData.summary.overallProgress : 0) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-1.5">
                  <span className="micro text-faint truncate">
                    {debtData.ready && debtData.summary.nearestDebtFree ? `DEBT FREE: ${debtData.summary.nearestDebtFree.date.slice(0, 4)}` : '0 LOANS TRACKED'}
                  </span>
                  <span className="micro flex items-center gap-0.5 text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-acidink">
                    DECK <IconArrowRight size={11} />
                  </span>
                </div>
              </CutPanel>
            </Link>

            {/* DAILY SPENDS */}
            <Link to="/spends" className="group block focus-visible:outline-none">
              <CutPanel cut="br" cutSize={12} innerClassName="p-3.5 transition-colors group-hover:bg-surface2 group-hover:border-orange">
                <div className="flex items-center justify-between">
                  <span className="micro flex items-center gap-1.5">
                    <IconSpends size={14} className="text-orange" />
                    <span className="font-semibold text-fg">DAILY SPENDS</span>
                  </span>
                  <span className="micro flex items-center gap-1 text-orangeink">
                    <Led signal="orange" size="sm" />
                    LEDGER
                  </span>
                </div>
                <div className="mt-2">
                  <span className="numeral text-[22px] font-bold text-fg">{formatMoney(spendsMonthly, base)}</span>
                  <span className="micro block text-faint">MONTH-TO-DATE SPEND</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-2">
                  <div>
                    <span className="micro block text-faint">TODAY</span>
                    <span className="numeral text-[13px] text-fg">
                      {spendsData.summary.totalToday > 0 ? formatMoney(spendsData.summary.totalToday, base) : '₹0'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="micro block text-faint">WEEK LIMIT</span>
                    <span className="numeral text-[13px] text-orangeink">
                      {spendsData.summary.weekLimit?.amount ? `${Math.round(spendsData.summary.weekUtilisation * 100)}%` : 'NO CAP'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-1.5">
                  <span className="micro text-faint truncate">
                    {spendsData.summary.countToday > 0 ? `${spendsData.summary.countToday} TXN TODAY` : 'READY FOR CAPTURE'}
                  </span>
                  <span className="micro flex items-center gap-0.5 text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-orangeink">
                    DECK <IconArrowRight size={11} />
                  </span>
                </div>
              </CutPanel>
            </Link>

          </div>
        </CutPanel>
      </motion.div>

      {/* ── 04. 14-DAY OUTFLOW RADAR + RESOURCE COMPOSITION ── */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">

        {/* 14-Day Cross-Domain Financial Radar */}
        <motion.div variants={RISE} className="lg:col-span-7">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
            <SectionHeader
              code="RADAR"
              title="14-Day Financial Outflow Radar"
              signal="orange"
              right={<span className="micro text-faint">{radarQueue.length} SCHEDULED CHARGES</span>}
            />
            {radarQueue.length ? (
              <div className="divide-y divide-line max-h-[440px] overflow-y-auto" data-lenis-prevent>
                {radarQueue.map((item) => (
                  <div key={item.id} className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface2 md:px-4">
                    {/* Engine badge */}
                    <span className={cx(
                      'micro shrink-0 border px-1.5 py-0.5 font-bold',
                      item.engine === 'SUBS' ? 'border-acid text-acidink' : item.engine === 'CRD' ? 'border-blue text-blueink' : 'border-orange text-orangeink',
                    )}>
                      {item.engine}
                    </span>

                    {/* Service glyph or icon */}
                    {item.icon ? (
                      <ServiceBadge icon={item.icon} color={item.color || '#F4F4F4'} size="sm" />
                    ) : (
                      <span className="grid h-7 w-7 shrink-0 place-items-center border border-line2 text-[10px] font-bold text-fg">
                        {item.title.slice(0, 2).toUpperCase()}
                      </span>
                    )}

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link to={item.to} className="truncate text-[13px] font-medium text-fg hover:text-acidink transition-colors">
                          {item.title}
                        </Link>
                      </div>
                      <span className="micro block truncate text-faint">
                        {item.subtitle}
                      </span>
                    </div>

                    {/* Amount & Countdown */}
                    <div className="shrink-0 text-right">
                      <span className="numeral block text-[13px] font-semibold text-fg">
                        {formatMoney(item.amount, base)}
                      </span>
                      <span className={cx(
                        'micro font-bold',
                        item.days === 0 ? 'text-redink' : item.days <= 2 ? 'text-orangeink' : 'text-dim',
                      )}>
                        {item.days === 0 ? 'DUE TODAY' : item.days === 1 ? 'TOMORROW' : `IN ${item.days} DAYS`}
                      </span>
                    </div>

                    {/* Action link */}
                    <Link
                      to={item.to}
                      className="micro shrink-0 border border-line2 px-2 py-1 text-dim opacity-70 transition-all hover:border-acid hover:text-acidink group-hover:opacity-100"
                    >
                      VIEW
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="meta px-3 py-6 text-faint">NO UPCOMING CHARGES IN THE NEXT 14 DAYS.</p>
            )}
          </CutPanel>
        </motion.div>

        {/* Resource Allocation & Budget Dial */}
        <motion.div variants={RISE} className="lg:col-span-5">
          <CutPanel cut="tr" cutSize={14} innerClassName="p-0">
            <SectionHeader
              code="ALLOC"
              title="Resource Load & Budget Split"
              signal="magenta"
              right={<span className="micro text-faint">50/30/20 PRINCIPLE</span>}
            />
            <div className="p-4 space-y-4">
              {/* Category Composition Strip */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="micro text-faint">SUBSCRIPTIONS LOAD STRIP</span>
                  <span className="micro text-fg font-semibold">
                    {summary.categories[0]?.label?.toUpperCase() || '—'} DOMINANT
                  </span>
                </div>
                <div className="mt-1.5">
                  <CompositionStrip slices={summary.categories} height={18} />
                </div>
              </div>

              {/* 50/30/20 Budget Health Matrix */}
              <div className="border border-line bg-bg2 p-3">
                <span className="micro text-dim block mb-2 font-semibold">FINANCIAL DISCIPLINE RATIO</span>
                <div className="space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="micro text-faint">FIXED ESSENTIALS (SUBS + EMIs)</span>
                      <span className="numeral font-bold text-fg">{formatMoney(fixedBurn, base)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full bg-surface border border-line">
                      <div className="h-full bg-acid" style={{ width: `${Math.min(100, systemBurn > 0 ? (fixedBurn / systemBurn) * 100 : 0)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="micro text-faint">LIFESTYLE & SPENDS (VARIABLE)</span>
                      <span className="numeral font-bold text-orangeink">{formatMoney(spendsMonthly, base)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full bg-surface border border-line">
                      <div className="h-full bg-orange" style={{ width: `${Math.min(100, systemBurn > 0 ? (spendsMonthly / systemBurn) * 100 : 0)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="micro text-faint">CREDIT CARRY / REWARDS IMPACT</span>
                      <span className="numeral font-bold text-magentaink">{formatMoney(cardsCarryMonthly, base)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full bg-surface border border-line">
                      <div className="h-full bg-magenta" style={{ width: `${Math.min(100, systemBurn > 0 ? (cardsCarryMonthly / systemBurn) * 100 : 0)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* System Host Status Quick Panel */}
              <div className="flex items-center justify-between border-t border-line pt-3 text-faint">
                <span className="micro flex items-center gap-1.5">
                  <IconSys size={13} className="text-acid" />
                  <span>LOCAL IDB SCHEMA V4 · ZERO TELEMETRY</span>
                </span>
                <Link to="/sys" className="micro text-acidink hover:underline">
                  SYSTEM HOST →
                </Link>
              </div>
            </div>
          </CutPanel>
        </motion.div>

      </div>

      {/* ── 05. RECENT CROSS-ENGINE ACTIVITY LEDGER ── */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tl-br" cutSize={14} innerClassName="p-0">
          <SectionHeader
            code="STREAM"
            title="Recent Cross-Engine Ledger Activity"
            signal="acid"
            right={
              <span className="micro text-faint">
                LIVE INGESTION STREAM
              </span>
            }
          />
          {recentSpends.length > 0 || cardsData.summary.txnCount > 0 ? (
            <div className="divide-y divide-line max-h-[300px] overflow-y-auto" data-lenis-prevent>
              {recentSpends.slice(0, 8).map((spend) => {
                const meta = SPEND_CATEGORY_META[spend.category]
                return (
                  <div key={spend.id} className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-surface2 md:px-4">
                    <span className="micro shrink-0 border border-orange bg-orangesoft px-1.5 py-0.5 text-orangeink font-bold">
                      SPND
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="truncate text-[12.5px] font-medium text-fg block">
                        {spend.title}
                      </span>
                      <span className="micro text-faint">
                        {formatSignalDate(spend.date)} · {meta.label} · {spend.method.toUpperCase()}
                      </span>
                    </span>
                    <span className="numeral text-[13px] font-semibold text-fg shrink-0">
                      -{formatMoney(spend.amount, spend.currency)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="meta px-3 py-5 text-faint">NO RECENT INGESTION RECORDS YET.</p>
          )}
        </CutPanel>
      </motion.div>

    </motion.div>
  )
}