/**
 * SUBTRACK // SPENDS (CORE)
 *
 * The Daily Spends flight deck — the full instrumentation board for the
 * variable half of the ledger. Mirrors the Subscriptions Overview richness:
 * hero with animated odometer, data strip, velocity trace, category composition,
 * weekday heatmap, top merchants, weekly limiter, system notes, and the recent
 * ledger stream.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useSpendsSystem, useSpends } from '@/hooks/useSpends'
import { useUI } from '@/store/ui'
import { formatMoney, formatPercent, splitMoney } from '@/lib/money'
import { formatSignalDate, todayISO, weekdayIndexMon, addDaysISO } from '@/lib/date'
import { type SpendCategory } from '@/lib/types'
import { convert } from '@/lib/money'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { DataStrip } from '@/components/ui/DataStrip'
import { EmptyState, BootScreen } from '@/components/ui/Skeleton'
import { CyberButton } from '@/components/ui/CyberButton'
import { Led, SIGNAL_TEXT } from '@/components/ui/Signal'
import {
  SpendCategoryComposition,
  SpendVelocity,
} from '@/components/spends/SpendInstruments'
import { SpendLedger } from '@/components/spends/SpendLedger'
import { SpendBadge } from '@/components/spends/SpendBadge'
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

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKDAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export default function Spends() {
  const spends = useSpends()
  const { summary, ledger, ready } = useSpendsSystem()
  const base = useUI((s) => s.baseCurrency)
  const openSpendComposer = useUI((s) => s.openSpendComposer)
  const booted = useUI((s) => s.booted)
  const today = todayISO()
  const [hoveredWeekday, setHoveredWeekday] = useState<number | null>(null)

  const hero = useMemo(() => splitMoney(summary.totalToday, base), [summary.totalToday, base])
  const recent = ready ? ledger.slice(0, 5) : []

  // Weekday breakdown for current week (Mon–Sun)
  const weekdaySpend = useMemo(() => {
    const weekStart = summary.weekStart
    const days = [0, 0, 0, 0, 0, 0, 0]
    const counts = [0, 0, 0, 0, 0, 0, 0]
    for (const s of spends) {
      if (s.date >= weekStart) {
        const idx = weekdayIndexMon(s.date)
        const adjusted = idx === 6 ? 0 : idx + 1 // Mon=0→1, Sun=6→0
        days[adjusted] += convert(s.amount, s.currency, base)
        counts[adjusted] += 1
      }
    }
    return { days, counts }
  }, [spends, summary.weekStart, base])

  const weekdayMax = Math.max(1, ...weekdaySpend.days)
  const todayWeekday = new Date(Date.UTC(...today.split('-').map(Number) as [number, number, number])).getUTCDay()

  // Top merchants this month
  const topMerchants = useMemo(() => {
    const map = new Map<string, { amount: number; count: number; category: SpendCategory; lastDate: string }>()
    for (const s of spends) {
      if (s.date < summary.monthKey) continue
      const norm = s.title.trim().toLowerCase()
      const bucket = map.get(norm) ?? { amount: 0, count: 0, category: s.category, lastDate: s.date }
      bucket.amount += convert(s.amount, s.currency, base)
      bucket.count += 1
      if (s.date > bucket.lastDate) bucket.lastDate = s.date
      map.set(norm, bucket)
    }
    return [...map.entries()]
      .map(([raw, b]) => {
        const rep = spends.find((s) => s.title.trim().toLowerCase() === raw)?.title || raw
        return { title: rep, ...b }
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [spends, summary.monthKey, base])

  // Biggest spend this week
  const weekBiggest = useMemo(() => {
    let biggest: typeof spends[0] | null = null
    for (const s of spends) {
      if (s.date >= summary.weekStart && (!biggest || convert(s.amount, s.currency, base) > convert(biggest.amount, biggest.currency, base))) {
        biggest = s
      }
    }
    return biggest
  }, [spends, summary.weekStart, base])

  // Transaction velocity: count this week vs days elapsed
  const txnVelocity = useMemo(() => {
    const weekTxns = spends.filter((s) => s.date >= summary.weekStart).length
    const daysIn = weekdayIndexMon(today) + 1
    return { count: weekTxns, perDay: daysIn > 0 ? weekTxns / daysIn : 0 }
  }, [spends, summary.weekStart, today])

  // Spending streak: consecutive days with at least 1 transaction ending today
  const streak = useMemo(() => {
    let count = 0
    let d = today
    for (let i = 0; i < 60; i++) {
      const has = spends.some((s) => s.date === d)
      if (!has) break
      count++
      d = addDaysISO(d, -1)
    }
    return count
  }, [spends, today])

  if (!booted) {
    return (
      <div className="px-3 py-6 md:px-5">
        <BootScreen label="LOADING SPEND VOLUME" />
      </div>
    )
  }

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
        {/* ==================== LEFT COLUMN (8 cols) ==================== */}
        <div className="flex flex-col gap-3 lg:col-span-8">
          {/* hero */}
          <motion.div variants={RISE}>
            <CutPanel cut="tl-br" cutSize={18} innerClassName="relative p-4 md:p-6">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden dot-field opacity-[0.2]" />
              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                    {/* Today */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="micro text-acidink">SPENT TODAY</span>
                        <span className="micro text-faint">{summary.countToday} TXN</span>
                      </div>
                      <h1 className="mt-1 flex items-start gap-1">
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
                    </div>
                    {/* Divider — desktop only */}
                    <div className="hidden h-[60px] w-px bg-line lg:block" aria-hidden="true" />
                    {/* This Month */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="micro text-magentaink">THIS MONTH</span>
                        <span className="micro text-faint">{summary.monthKey}</span>
                      </div>
                      <h2 className="mt-1 flex items-start gap-1">
                        <span className="numeral mt-1 text-[clamp(1.4rem,3.5vw,2rem)] text-dim">
                          {splitMoney(summary.monthTotal, base).symbol}
                        </span>
                        <span className="numeral text-[clamp(1.8rem,5vw,2.8rem)] font-bold text-fg">
                          <AnimatedNumber
                            value={summary.monthTotal}
                            format={(value) => splitMoney(value, base).value}
                            stiffness={120}
                            damping={26}
                          />
                        </span>
                      </h2>
                    </div>
                  </div>

                  {/* quick add — full width on mobile */}
                  <div className="w-full sm:w-auto sm:min-w-[168px]">
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

                {/* subtitle metrics */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={summary.monthDelta > 0 ? 'micro text-orangeink' : 'micro text-acidink'}>
                    {formatPercent(summary.monthDelta, 1)} VS PREVIOUS MONTH
                  </span>
                  <span className="micro text-faint">{formatMoney(summary.avgDayMonth, base)} AVG / DAY</span>
                  <span className="micro text-faint">{formatMoney(summary.weekTotal, base)} THIS WEEK</span>
                  {streak > 1 && (
                    <span className="micro text-acidink flex items-center gap-1">
                      <Led signal="acid" size="sm" /> {streak}-DAY STREAK
                    </span>
                  )}
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
                      {
                        label: 'TXN velocity',
                        value: `${txnVelocity.count} · ${txnVelocity.perDay.toFixed(1)}/D`,
                        signal: txnVelocity.perDay >= 3 ? 'orange' : 'blue',
                      },
                    ]}
                  />
                </div>

                {/* velocity */}
                <div className="mt-4">
                  <SectionHeader
                    code="VEL"
                    title="Spend Velocity"
                    signal="blue"
                    className="border-b-0 px-0 pt-0"
                    right={<span className="micro text-faint">MULTI-TIMEFRAME</span>}
                  />
                  <SpendVelocity spends={spends} base={base} height={140} />
                </div>
              </div>
            </CutPanel>
          </motion.div>

          {/* ---- category + ledger row ---- */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            {/* Category composition */}
            <motion.div variants={RISE} className="lg:col-span-5">
              <CutPanel cut="tl" cutSize={14} innerClassName="p-0" className="h-full flex flex-col">
                <SectionHeader
                  code="CAT"
                  title="Category mix"
                  signal="magenta"
                  right={
                    <Link to="/spends/data" className="micro text-faint hover:text-fg">
                      INSIGHTS <IconArrowRight size={10} />
                    </Link>
                  }
                />
                <SpendCategoryComposition
                  slices={summary.categories}
                  base={base}
                  onPick={(category) => openSpendComposer({ presetCategory: category })}
                />
              </CutPanel>
            </motion.div>

            {/* Recent ledger */}
            <motion.div variants={RISE} className="lg:col-span-7">
              <CutPanel cut="br" cutSize={14} innerClassName="p-0">
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
                  <div className="max-h-[420px] overflow-y-auto" data-lenis-prevent>
                    <SpendLedger groups={recent} base={base} />
                  </div>
                ) : (
                  <p className="meta px-4 py-6 text-faint">NOTHING RECORDED YET.</p>
                )}
              </CutPanel>
            </motion.div>
          </div>
        </div>

        {/* ==================== RIGHT COLUMN (4 cols) ==================== */}
        <div className="flex flex-col gap-3 lg:col-span-4">
          {/* Telemetry tiles — compact 2×2 */}
          <motion.div variants={RISE}>
            <div className="grid grid-cols-2 gap-px bg-line">
              <div className="border border-line2 bg-surface p-2.5">
                <span className="micro text-faint">MONTH DELTA</span>
                <span className={cx('numeral mt-0.5 block text-[16px]', summary.monthDelta > 0 ? 'text-orangeink' : summary.monthDelta < 0 ? 'text-acidink' : 'text-dim')}>
                  {formatPercent(summary.monthDelta, 1)}
                </span>
              </div>
              <div className="border border-line2 bg-surface p-2.5">
                <span className="micro text-faint">TXN / WEEK</span>
                <span className="numeral mt-0.5 block text-[16px] text-fg">{txnVelocity.count}</span>
              </div>
              <div className="border border-line2 bg-surface p-2.5">
                <span className="micro text-faint">STREAK</span>
                <span className="numeral mt-0.5 block text-[16px] text-fg">{streak}D</span>
              </div>
              <div className="border border-line2 bg-surface p-2.5">
                <span className="micro text-faint">CAP LEFT</span>
                <span className="numeral mt-0.5 block text-[16px] text-fg">
                  {summary.weekLimit?.amount ? formatMoney(summary.weekRemaining, base) : '—'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Weekday heatmap — this week */}
          <motion.div variants={RISE}>
            <CutPanel cut="br" cutSize={14} innerClassName="p-3" hover>
              <div className="flex items-center justify-between gap-2">
                <span className="micro text-faint">
                  {hoveredWeekday !== null
                    ? `${WEEKDAY_NAMES[hoveredWeekday]} // THIS WEEK`
                    : 'WEEKDAY PATTERN'}
                </span>
                <span className="micro font-mono text-orangeink transition-all">
                  {formatMoney(
                    hoveredWeekday !== null
                      ? weekdaySpend.days[hoveredWeekday]
                      : weekdaySpend.days.reduce((a, b) => a + b, 0),
                    base,
                  )}
                </span>
              </div>
              <div
                className="mt-2 flex items-end gap-[3px] py-1"
                onMouseLeave={() => setHoveredWeekday(null)}
              >
                {weekdaySpend.days.map((amount, dayIndex) => {
                  const ratio = amount / weekdayMax
                  const isHovered = hoveredWeekday === dayIndex
                  const isOtherHovered = hoveredWeekday !== null && !isHovered
                  const isToday = dayIndex === todayWeekday
                  return (
                    <button
                      key={dayIndex}
                      type="button"
                      onMouseEnter={() => setHoveredWeekday(dayIndex)}
                      onFocus={() => setHoveredWeekday(dayIndex)}
                      className="group/day flex flex-1 flex-col items-center gap-1 focus-visible:outline-none"
                    >
                      <span
                        className={cx(
                          'block w-full transition-all duration-200 rounded-[1px]',
                          amount > 0
                            ? isToday
                              ? 'bg-acid group-hover/day:brightness-110'
                              : isHovered
                                ? 'bg-blue brightness-125 scale-y-110'
                                : isOtherHovered ? 'bg-blue opacity-40' : 'bg-blue'
                            : isHovered ? 'bg-line2' : 'bg-line',
                        )}
                        style={{ height: 6 + (amount > 0 ? ratio * 42 : 0), transformOrigin: 'bottom' }}
                      />
                      <span className={cx('micro text-[10px]', isToday ? 'text-acidink font-bold' : isHovered ? 'text-fg' : 'text-faint')}>
                        {WEEKDAY_LABELS[dayIndex]}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="meta mt-2 text-dim">
                {weekdaySpend.days.reduce((a, b) => a + b, 0) > 0
                  ? `${weekdaySpend.counts.reduce((a, b) => a + b, 0)} TXN across ${weekdaySpend.days.filter((d) => d > 0).length} active days`
                  : 'No spending this week yet.'}
              </p>
            </CutPanel>
          </motion.div>

          {/* Top merchants */}
          <motion.div variants={RISE}>
            <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
              <SectionHeader
                code="MRCH"
                title="Top destinations"
                signal="magenta"
                right={<span className="micro text-faint">{topMerchants.length}</span>}
              />
              {topMerchants.length ? (
                <div className="divide-y divide-line">
                  {topMerchants.map((merchant, idx) => {
                    return (
                      <div key={merchant.title} className="flex items-center gap-2 px-3 py-1.5 md:px-4">
                        <span className="micro w-4 font-mono text-faint">#{idx + 1}</span>
                        <SpendBadge category={merchant.category} title={merchant.title} size="xs" />
                        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-fg">{merchant.title}</span>
                        <span className="numeral shrink-0 text-[12px] font-semibold text-fg">{formatMoney(merchant.amount, base)}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="meta px-3 py-4 text-faint">NO MERCHANTS THIS MONTH.</p>
              )}
            </CutPanel>
          </motion.div>

          {/* Dominant category */}
          {summary.topCategory && (
            <motion.div variants={RISE}>
              <Link to="/spends/data" className="block focus-visible:outline-none">
                <CutPanel cut="tl" cutSize={14} innerClassName="p-3 group cursor-pointer" hover>
                  <div className="flex items-center justify-between">
                    <span className="micro text-faint">DOMINANT SECTOR</span>
                    <span className="micro flex items-center gap-1 text-dim opacity-0 transition-opacity group-hover:opacity-100 text-acidink">
                      INSIGHTS <IconArrowRight size={10} />
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-end justify-between gap-3">
                    <span className={cx('numeral text-[24px] transition-transform group-hover:scale-105', SIGNAL_TEXT[summary.topCategory.signal])}>
                      {summary.topCategory.code}
                    </span>
                    <span className="text-right">
                      <span className="meta block text-fg">{summary.topCategory.label}</span>
                      <span className="micro block text-faint">{formatMoney(summary.topCategory.amount, base)} · {summary.topCategory.count} TXN</span>
                    </span>
                  </div>
                  <div className="mt-2 flex gap-[2px]">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <span
                        key={i}
                        className={cx('h-1.5 flex-1 transition-all', i < Math.round(summary.topCategory!.share * 20) ? 'bg-acid' : 'bg-line')}
                        style={{ transitionDelay: `${i * 10}ms` }}
                      />
                    ))}
                  </div>
                </CutPanel>
              </Link>
            </motion.div>
          )}

          {/* Today */}
          <motion.div variants={RISE}>
            <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
              <SectionHeader code="DAY" title="Today" signal={summary.totalToday > 0 ? 'orange' : 'blue'} right={<span className="micro text-faint">{formatSignalDate(summary.today)}</span>} />
              <div className="p-3">
                {summary.countToday ? (
                  <div className="space-y-1.5">
                    <p className="meta text-dim">
                      {summary.countToday} TXN · {formatMoney(summary.totalToday, base)}
                    </p>
                    {weekBiggest && (
                      <div className="border-t border-line pt-1.5">
                        <span className="micro text-faint">BIGGEST THIS WEEK</span>
                        <div className="mt-1 flex items-center gap-2">
                          <SpendBadge category={weekBiggest.category} title={weekBiggest.title} size="xs" />
                          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-fg">{weekBiggest.title}</span>
                          <span className="numeral shrink-0 text-[12px] font-semibold text-fg">{formatMoney(weekBiggest.amount, weekBiggest.currency)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="meta text-faint">NO SPEND YET TODAY.</p>
                )}
              </div>
            </CutPanel>
          </motion.div>

          {/* Notes */}
          <motion.div variants={RISE}>
            <CutPanel cut="tr" cutSize={14} innerClassName="p-0">
              <SectionHeader
                code="OBS"
                title="Spend signals"
                signal={summary.notes.some((n) => n.signal === 'red') ? 'red' : 'acid'}
                right={<span className="micro text-faint">{summary.notes.length}</span>}
              />
              {summary.notes.length ? (
                <div className="divide-y divide-line">
                  {summary.notes.map((note) => (
                    <div key={note.id} className="px-3 py-2 md:px-4">
                      <span className="micro flex items-center gap-1.5 text-dim">
                        <Led signal={note.signal} size="sm" pulse={note.signal === 'red' || note.signal === 'orange'} />
                        {note.label}
                      </span>
                      <p className="meta mt-0.5 text-faint">{note.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="meta px-3 py-4 text-faint">NO SIGNALS — SPEND WITHIN ENVELOPE.</p>
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
