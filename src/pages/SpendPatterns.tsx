/**
 * SPENDSTATE // SPEND PATTERNS (FORENSIC ENGINE)
 *
 * The forensic analysis module — not another chart page, but a pattern
 * recognition engine that finds the shapes hiding in your spending data:
 * 3-month heatmap, recurring merchant detection, anomaly flagging, monthly
 * phase analysis, category momentum, weekday profiles, and a composite
 * discipline score. Every insight is derived from raw rows — nothing stored,
 * nothing guessed.
 */
import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useSpends, useWeeklyLimit } from '@/hooks/useSpends'
import { useUI } from '@/store/ui'
import { formatMoney, formatCompact } from '@/lib/money'
import {
  formatSignalDate,
  monthKey,
  monthKeyLabel,
  shiftMonthKey,
  todayISO,
  parseISO,
  addDaysISO,
  diffDays,
  weekdayIndexMon,
} from '@/lib/date'
import { SPEND_CATEGORY_META, type SpendCategory } from '@/lib/types'
import { convert } from '@/lib/money'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { Led, SIGNAL_TEXT, SIGNAL_HEX } from '@/components/ui/Signal'
import { EmptyState } from '@/components/ui/Skeleton'
import { SpendBadge } from '@/components/spends/SpendBadge'
import { setWeeklyLimit } from '@/lib/repository'
import { TOAST_VERBS } from '@/store/ui'
import { cx } from '@/lib/cx'
import { useState, useEffect } from 'react'
import { CyberButton } from '@/components/ui/CyberButton'
import { FieldShell } from '@/components/ui/Controls'
import { symbolOf } from '@/lib/money'

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}
const RISE = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } },
}

const WEEKDAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const QUICK = [2000, 3000, 5000, 8000, 10000]

interface RecurringMerchant {
  title: string
  category: SpendCategory
  count: number
  avgAmount: number
  avgDaysBetween: number
  lastDate: string
  totalAmount: number
  regularity: 'weekly' | 'biweekly' | 'monthly' | 'irregular'
}

interface Anomaly {
  id: string
  title: string
  amount: number
  currency: string
  category: SpendCategory
  date: string
  zScore: number
  avgForCategory: number
}

export default function SpendPatterns() {
  const spends = useSpends()
  const limit = useWeeklyLimit()
  const base = useUI((s) => s.baseCurrency)
  const spendCategories = useUI((s) => s.spendCategories)
  const pushToast = useUI((s) => s.pushToast)
  const openSpendComposer = useUI((s) => s.openSpendComposer)
  const today = todayISO()

  // The cap may be stored in a currency the user has since switched away from,
  // so normalise it to base for display and comparisons.
  const limitBase = limit ? convert(limit.amount, limit.currency, base) : 0

  // Limiter state (inline)
  const [limitAmount, setLimitAmount] = useState<string>('')
  const [limitBusy, setLimitBusy] = useState(false)
  useEffect(() => {
    if (limit?.amount && limitAmount === '') setLimitAmount(String(Math.round(limitBase)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit])
  const limitParsed = Number.parseFloat(limitAmount.replace(/,/g, '')) || 0

  // ── 3-Month Heatmap Data ──
  const heatmap = useMemo(() => {
    const months: { key: string; label: string; days: Map<string, number>; total: number }[] = []
    for (let i = 2; i >= 0; i--) {
      const key = shiftMonthKey(monthKey(today), -i)
      const daysMap = new Map<string, number>()
      let total = 0
      for (const s of spends) {
        if (monthKey(s.date) === key) {
          const val = convert(s.amount, s.currency, base)
          daysMap.set(s.date, (daysMap.get(s.date) ?? 0) + val)
          total += val
        }
      }
      months.push({ key, label: monthKeyLabel(key), days: daysMap, total })
    }
    const max = Math.max(1, ...months.flatMap((mo) => [...mo.days.values()]))
    return { months, max }
  }, [spends, base, today])

  // ── Recurring Merchant Detection ──
  const recurring = useMemo((): RecurringMerchant[] => {
    const merchantDates = new Map<string, { dates: string[]; amounts: number[]; category: SpendCategory; total: number }>()
    for (const s of spends) {
      const norm = s.title.trim().toLowerCase()
      const bucket = merchantDates.get(norm) ?? { dates: [], amounts: [], category: s.category, total: 0 }
      bucket.dates.push(s.date)
      bucket.amounts.push(convert(s.amount, s.currency, base))
      bucket.total += convert(s.amount, s.currency, base)
      merchantDates.set(norm, bucket)
    }
    const results: RecurringMerchant[] = []
    for (const [raw, data] of merchantDates) {
      if (data.dates.length < 3) continue
      const sorted = [...data.dates].sort()
      const gaps: number[] = []
      for (let i = 1; i < sorted.length; i++) gaps.push(diffDays(sorted[i], sorted[i - 1]))
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
      const variance = gaps.reduce((sum, g) => sum + (g - avgGap) ** 2, 0) / gaps.length
      const cv = avgGap > 0 ? Math.sqrt(variance) / avgGap : 999
      if (cv > 0.6) continue // too irregular
      const rep = spends.find((s) => s.title.trim().toLowerCase() === raw)?.title || raw
      let regularity: RecurringMerchant['regularity'] = 'irregular'
      if (avgGap <= 9) regularity = 'weekly'
      else if (avgGap <= 16) regularity = 'biweekly'
      else if (avgGap <= 35) regularity = 'monthly'
      results.push({
        title: rep,
        category: data.category,
        count: data.dates.length,
        avgAmount: data.total / data.dates.length,
        avgDaysBetween: avgGap,
        lastDate: sorted[sorted.length - 1],
        totalAmount: data.total,
        regularity,
      })
    }
    return results.sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 10)
  }, [spends, base])

  // ── Anomaly Detection ──
  const anomalies = useMemo((): Anomaly[] => {
    const catStats = new Map<SpendCategory, { mean: number; std: number }>()
    for (const cat of new Set(spends.map((s) => s.category))) {
      const amounts = spends.filter((s) => s.category === cat).map((s) => convert(s.amount, s.currency, base))
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
      const std = Math.sqrt(amounts.reduce((sum, a) => sum + (a - mean) ** 2, 0) / amounts.length)
      catStats.set(cat, { mean, std })
    }
    const results: Anomaly[] = []
    for (const s of spends) {
      const stats = catStats.get(s.category)
      if (!stats || stats.std === 0) continue
      const z = (convert(s.amount, s.currency, base) - stats.mean) / stats.std
      if (z >= 2.5) {
        results.push({
          id: s.id,
          title: s.title,
          amount: s.amount,
          currency: s.currency,
          category: s.category,
          date: s.date,
          zScore: z,
          avgForCategory: stats.mean,
        })
      }
    }
    return results.sort((a, b) => b.zScore - a.zScore).slice(0, 8)
  }, [spends, base])

  // ── Monthly Phase Analysis ──
  const phases = useMemo(() => {
    const buckets = { early: 0, mid: 0, late: 0 }
    const counts = { early: 0, mid: 0, late: 0 }
    for (const s of spends) {
      const day = parseISO(s.date).d
      const val = convert(s.amount, s.currency, base)
      if (day <= 10) { buckets.early += val; counts.early++ }
      else if (day <= 20) { buckets.mid += val; counts.mid++ }
      else { buckets.late += val; counts.late++ }
    }
    const total = buckets.early + buckets.mid + buckets.late
    return [
      { label: 'EARLY (1–10)', amount: buckets.early, count: counts.early, share: total > 0 ? buckets.early / total : 0, signal: 'blue' as const },
      { label: 'MID (11–20)', amount: buckets.mid, count: counts.mid, share: total > 0 ? buckets.mid / total : 0, signal: 'acid' as const },
      { label: 'LATE (21–31)', amount: buckets.late, count: counts.late, share: total > 0 ? buckets.late / total : 0, signal: 'orange' as const },
    ]
  }, [spends, base])

  // ── Category Momentum ──
  const momentum = useMemo(() => {
    const thisMonth = monthKey(today)
    const prevMonth = shiftMonthKey(thisMonth, -1)
    const cats = new Set(spends.map((s) => s.category))
    const results: { category: SpendCategory; thisMonth: number; prevMonth: number; delta: number; signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red' }[] = []
    for (const cat of cats) {
      const thisTotal = spends.filter((s) => monthKey(s.date) === thisMonth && s.category === cat).reduce((sum, s) => sum + convert(s.amount, s.currency, base), 0)
      const prevTotal = spends.filter((s) => monthKey(s.date) === prevMonth && s.category === cat).reduce((sum, s) => sum + convert(s.amount, s.currency, base), 0)
      const delta = prevTotal > 0 ? ((thisTotal - prevTotal) / prevTotal) * 100 : thisTotal > 0 ? 100 : 0
      results.push({ category: cat, thisMonth: thisTotal, prevMonth: prevTotal, delta, signal: SPEND_CATEGORY_META[cat]?.signal ?? 'blue' })
    }
    return results.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  }, [spends, base, today])

  // ── Weekday Profile ──
  const weekdayProfile = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0]
    const counts = [0, 0, 0, 0, 0, 0, 0]
    const sixtyDaysAgo = addDaysISO(today, -60)
    for (const s of spends) {
      if (s.date >= sixtyDaysAgo) {
        const idx = weekdayIndexMon(s.date)
        totals[idx] += convert(s.amount, s.currency, base)
        counts[idx]++
      }
    }
    const max = Math.max(1, ...totals)
    return totals.map((amount, i) => ({
      day: WEEKDAY_NAMES[i],
      amount,
      count: counts[i],
      avg: counts[i] > 0 ? amount / counts[i] : 0,
      ratio: amount / max,
    }))
  }, [spends, base, today])

  // ── Discipline Score ──
  const discipline = useMemo(() => {
    let score = 50 // base
    // Needs/wants ratio (closer to 50/50 = better)
    const thisMonth = monthKey(today)
    const monthSpends = spends.filter((s) => monthKey(s.date) === thisMonth)
    const wants = monthSpends.filter((s) => SPEND_CATEGORY_META[s.category]?.discretionary).reduce((sum, s) => sum + convert(s.amount, s.currency, base), 0)
    const needs = monthSpends.reduce((sum, s) => sum + convert(s.amount, s.currency, base), 0) - wants
    const total = wants + needs
    if (total > 0) {
      const wantsRatio = wants / total
      score += wantsRatio < 0.5 ? 15 : wantsRatio < 0.6 ? 5 : -10
    }
    // Anomaly penalty
    score -= Math.min(anomalies.length * 3, 15)
    // Recurring merchant bonus (shows awareness)
    score += Math.min(recurring.length * 2, 10)
    // Budget cap compliance
    if (limit?.amount && limit.amount > 0) {
      const weekSpends = spends.filter((s) => s.date >= addDaysISO(today, -weekdayIndexMon(today)))
      const weekWants = weekSpends.filter((s) => SPEND_CATEGORY_META[s.category]?.discretionary).reduce((sum, s) => sum + convert(s.amount, s.currency, base), 0)
      score += weekWants <= limitBase ? 10 : -10
    }
    return Math.max(0, Math.min(100, score))
  }, [spends, base, today, anomalies, recurring, limit, limitBase])

  const disciplineSignal = discipline >= 75 ? 'acid' : discipline >= 50 ? 'blue' : discipline >= 30 ? 'orange' : 'red'

  if (spends.length === 0) {
    return (
      <div className="px-3 py-6 md:px-5">
        <EmptyState
          code="NO PATTERN DATA"
          title="NOTHING TO ANALYSE YET."
          description="Patterns emerge from transaction history. Log spends and the forensics engine will surface recurring merchants, anomalies, discipline scores, and behavioral shapes."
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-linehard pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="micro border border-line2 px-1.5 py-0.5 text-dim">PAT</span>
          <h1 className="text-[15px] font-semibold">SPEND PATTERNS</h1>
        </div>
        <span className="micro text-faint">
          {spends.length} TRANSACTIONS · {recurring.length} RECURRING · {anomalies.length} ANOMALIES
        </span>
      </div>

      {/* ── Headline: Discipline Score + Telemetry ── */}
      <motion.div variants={RISE} className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Discipline Score — the hero */}
        <div className="lg:col-span-4">
          <CutPanel cut="tl-br" cutSize={18} innerClassName="relative overflow-hidden p-4 md:p-5" shadow="hard">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 dot-field opacity-[0.12]" />
            <div className="relative flex flex-col items-center text-center">
              <span className="micro text-faint">DISCIPLINE SCORE</span>
              <div className="relative mt-2">
                <svg width="140" height="140" viewBox="0 0 100 100" className="-rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--c-line)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke={`var(--c-${disciplineSignal})`}
                    strokeWidth="8"
                    strokeLinecap="butt"
                    strokeDasharray={`${(discipline / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cx('numeral text-[36px] font-bold leading-none', SIGNAL_TEXT[disciplineSignal])}>
                    {discipline}
                  </span>
                  <span className="micro text-faint">/ 100</span>
                </div>
              </div>
              <span className={cx('micro mt-2 flex items-center gap-1.5', SIGNAL_TEXT[disciplineSignal])}>
                <Led signal={disciplineSignal} size="sm" pulse={disciplineSignal === 'red'} />
                {discipline >= 75 ? 'EXCELLENT' : discipline >= 50 ? 'MODERATE' : discipline >= 30 ? 'NEEDS WORK' : 'POOR'}
              </span>
              <p className="meta mt-2 max-w-[200px] text-faint">
                Composite of needs/wants ratio, anomaly frequency, recurring awareness, and budget compliance.
              </p>
            </div>
          </CutPanel>
        </div>

        {/* 3-Month Heatmap */}
        <div className="lg:col-span-8">
          <CutPanel cut="br" cutSize={14} innerClassName="p-4">
            <SectionHeader code="CAL" title="3-Month spend heatmap" signal="orange" right={<span className="micro text-faint">TRAILING 90 DAYS</span>} />
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              {heatmap.months.map((mo) => {
                const { y, m } = parseISO(`${mo.key}-01`)
                const daysInMonth = new Date(y, m, 0).getDate()
                const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
                const offset = firstWeekday === 0 ? 6 : firstWeekday - 1 // Mon=0
                return (
                  <div key={mo.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="micro font-semibold text-fg">{mo.label}</span>
                      <span className="numeral text-[11px] text-dim">{formatCompact(mo.total, base)}</span>
                    </div>
                    <div className="grid grid-cols-7 gap-[2px]">
                      {WEEKDAY_NAMES.map((d) => (
                        <span key={d} className="text-center text-[7px] text-faint font-mono leading-none">{d[0]}</span>
                      ))}
                      {Array.from({ length: offset }).map((_, i) => <span key={`e${i}`} />)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1
                        const iso = `${mo.key}-${String(day).padStart(2, '0')}`
                        const amount = mo.days.get(iso) ?? 0
                        const ratio = amount / heatmap.max
                        const isToday = iso === today
                        return (
                          <span
                            key={day}
                            className={cx(
                              'aspect-square flex items-center justify-center text-[7px] font-mono transition-colors',
                              isToday ? 'ring-1 ring-acid text-acidink font-bold' : '',
                              amount > 0
                                ? ratio > 0.7 ? 'bg-orange text-black' : ratio > 0.3 ? 'bg-blue/60 text-fg' : 'bg-blue/25 text-faint'
                                : 'bg-line/30 text-faint/40',
                            )}
                            title={amount > 0 ? `${formatSignalDate(iso)}: ${formatMoney(amount, base)}` : formatSignalDate(iso)}
                          >
                            {day}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </CutPanel>
        </div>
      </motion.div>

      {/* ── Row 2: Recurring Merchants + Anomalies ── */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Recurring Merchants */}
        <motion.div variants={RISE} className="lg:col-span-7">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
            <SectionHeader
              code="REC"
              title="Recurring merchants"
              signal="acid"
              right={<span className="micro text-faint">{recurring.length} DETECTED</span>}
            />
            {recurring.length ? (
              <div className="divide-y divide-line">
                {recurring.map((m) => {
                  const meta = SPEND_CATEGORY_META[m.category]
                  return (
                    <div key={m.title} className="flex items-center gap-3 px-3 py-2.5 md:px-4">
                      <SpendBadge category={m.category} title={m.title} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-fg">{m.title}</span>
                        <span className="micro text-faint">
                          {meta?.code} · {m.count}× · EVERY ~{Math.round(m.avgDaysBetween)}D · LAST {formatSignalDate(m.lastDate)}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-0.5">
                        <span className="numeral text-[13px] font-semibold text-fg">{formatMoney(m.avgAmount, base)}</span>
                        <span className={cx(
                          'micro border px-1 py-0 text-[8px]',
                          m.regularity === 'weekly' ? 'border-acid text-acidink' :
                          m.regularity === 'biweekly' ? 'border-blue text-blueink' :
                          m.regularity === 'monthly' ? 'border-magenta text-magentaink' :
                          'border-line2 text-faint',
                        )}>
                          {m.regularity.toUpperCase()}
                        </span>
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="meta px-4 py-6 text-faint">NO RECURRING PATTERNS DETECTED YET. NEED 3+ TRANSACTIONS AT THE SAME MERCHANT.</p>
            )}
          </CutPanel>
        </motion.div>

        {/* Anomalies */}
        <motion.div variants={RISE} className="lg:col-span-5">
          <CutPanel cut="tr" cutSize={14} innerClassName="p-0">
            <SectionHeader
              code="ANOM"
              title="Anomalies"
              signal="red"
              right={<span className="micro text-faint">{anomalies.length} FLAGGED</span>}
            />
            {anomalies.length ? (
              <div className="divide-y divide-line">
                {anomalies.map((a) => {
                  const meta = SPEND_CATEGORY_META[a.category]
                  return (
                    <div key={a.id} className="flex items-center gap-2.5 px-3 py-2 md:px-4">
                      <SpendBadge category={a.category} title={a.title} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium text-fg">{a.title}</span>
                        <span className="micro text-faint">
                          {formatSignalDate(a.date)} · AVG {formatMoney(a.avgForCategory, base)} FOR {meta?.code}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-0.5">
                        <span className="numeral text-[13px] font-bold text-redink">{formatMoney(a.amount, a.currency)}</span>
                        <span className="micro text-[9px] text-redink font-mono">Z:{a.zScore.toFixed(1)}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="meta px-4 py-6 text-faint">NO STATISTICAL ANOMALIES DETECTED. YOUR SPENDING IS CONSISTENT.</p>
            )}
          </CutPanel>
        </motion.div>
      </div>

      {/* ── Row 3: Monthly Phase + Weekday Profile ── */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Monthly Phase */}
        <motion.div variants={RISE} className="lg:col-span-5">
          <CutPanel cut="br" cutSize={14} innerClassName="p-4">
            <SectionHeader code="PHASE" title="Monthly phase analysis" signal="magenta" right={<span className="micro text-faint">WHERE IN THE MONTH</span>} />
            <div className="mt-3 space-y-3">
              {phases.map((phase) => (
                <div key={phase.label}>
                  <div className="flex items-center justify-between">
                    <span className="micro font-semibold text-fg">{phase.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="numeral text-[12px] text-fg">{formatMoney(phase.amount, base)}</span>
                      <span className="micro text-faint">{(phase.share * 100).toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-3 w-full bg-surface2 border border-line">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${Math.max(2, phase.share * 100)}%`, background: SIGNAL_HEX[phase.signal] }}
                    />
                  </div>
                  <span className="micro text-[9px] text-faint">{phase.count} TRANSACTIONS</span>
                </div>
              ))}
            </div>
            <p className="meta mt-3 text-dim">
              {phases[2].share > 0.4
                ? 'Late-month spike detected — salary-day effect or bill clustering.'
                : phases[0].share > 0.4
                  ? 'Front-loaded spending — most outflow happens in the first 10 days.'
                  : 'Spending is relatively evenly distributed across the month.'}
            </p>
          </CutPanel>
        </motion.div>

        {/* Weekday Profile */}
        <motion.div variants={RISE} className="lg:col-span-7">
          <CutPanel cut="br" cutSize={14} innerClassName="p-4">
            <SectionHeader code="WEEK" title="Weekday spend profile" signal="blue" right={<span className="micro text-faint">60-DAY TRAILING</span>} />
            <div className="mt-3 flex items-end gap-2">
              {weekdayProfile.map((day) => (
                <div key={day.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span className="numeral text-[10px] text-faint">{day.avg > 0 ? formatCompact(day.avg, base) : '—'}</span>
                  <div className="w-full flex items-end justify-center h-24 bg-surface2 border border-line p-0.5">
                    <div
                      className={cx('w-full transition-all', day.ratio >= 0.8 ? 'bg-orange' : day.amount > 0 ? 'bg-blue' : 'bg-line')}
                      style={{ height: `${Math.max(3, day.ratio * 100)}%` }}
                    />
                  </div>
                  <span className={cx('micro font-bold text-[10px]', day.ratio >= 0.8 ? 'text-orangeink' : 'text-faint')}>{day.day}</span>
                  <span className="micro text-[8px] text-faint">{day.count}×</span>
                </div>
              ))}
            </div>
            <p className="meta mt-3 text-dim">
              {(() => {
                const peak = weekdayProfile.reduce((max, d) => d.amount > max.amount ? d : max, weekdayProfile[0])
                const quiet = weekdayProfile.reduce((min, d) => d.amount < min.amount && d.amount > 0 ? d : min, weekdayProfile.find(d => d.amount > 0) ?? weekdayProfile[0])
                return peak.day === quiet.day
                  ? 'Not enough variation to detect a pattern yet.'
                  : `${peak.day}s are your peak spend day (${formatCompact(peak.amount, base)}). ${quiet?.day ?? '—'}s are the quietest.`
              })()}
            </p>
          </CutPanel>
        </motion.div>
      </div>

      {/* ── Row 4: Category Momentum ── */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tl-br" cutSize={14} innerClassName="p-0">
          <SectionHeader code="MOM" title="Category momentum" signal="orange" right={<span className="micro text-faint">THIS MONTH VS PREVIOUS</span>} />
          <div className="divide-y divide-line">
            {momentum.filter((m) => m.thisMonth > 0 || m.prevMonth > 0).map((m) => {
              const meta = SPEND_CATEGORY_META[m.category]
              const isUp = m.delta > 10
              const isDown = m.delta < -10
              return (
                <div key={m.category} className="flex items-center gap-3 px-3 py-2 md:px-4">
                  <span className="micro w-10 font-semibold" style={{ color: SIGNAL_HEX[meta?.signal ?? 'blue'] }}>{meta?.code}</span>
                  <span className="micro min-w-[80px] text-faint">{meta?.label}</span>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="flex-1">
                      <div className="h-1.5 w-full bg-surface2 border border-line">
                        <div className="h-full bg-acid" style={{ width: `${Math.min(100, (m.thisMonth / Math.max(m.thisMonth, m.prevMonth, 1)) * 100)}%` }} />
                      </div>
                    </div>
                    <span className="numeral w-16 text-right text-[11px] text-fg">{formatCompact(m.thisMonth, base)}</span>
                    <span className="numeral w-16 text-right text-[11px] text-dim">{formatCompact(m.prevMonth, base)}</span>
                  </div>
                  <span className={cx(
                    'micro w-14 text-right font-semibold',
                    isUp ? 'text-orangeink' : isDown ? 'text-acidink' : 'text-faint',
                  )}>
                    {m.delta > 0 ? '+' : ''}{m.delta.toFixed(0)}%
                  </span>
                  <Led signal={isUp ? 'orange' : isDown ? 'acid' : 'blue'} size="sm" />
                </div>
              )
            })}
          </div>
        </CutPanel>
      </motion.div>

      {/* ── Row 5: Budget Cap Config (inline) ── */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="br" cutSize={14} innerClassName="p-4">
          <SectionHeader
            code="CAP"
            title="Weekly budget cap"
            signal={limit?.amount ? 'acid' : 'blue'}
            right={<span className="micro text-faint">{limit?.amount ? 'ARMED' : 'DISARMED'}</span>}
          />
          <div className="mt-3 grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <div>
              <FieldShell label="WEEKLY BUDGET FOR WANTS" code="IN BASE CURRENCY" hint="Mon–Sun. Only lifestyle & wants categories count.">
                <div className="flex items-center border border-line2 bg-bg2 transition-colors focus-within:border-acid">
                  <span className="pl-3 font-mono text-[18px] text-faint">{symbolOf(base)}</span>
                  <input
                    className="w-full bg-transparent px-2 py-2.5 font-mono text-[22px] font-semibold tnum outline-none placeholder:text-faint"
                    value={limitAmount}
                    inputMode="decimal"
                    placeholder="0"
                    onChange={(e) => setLimitAmount(e.target.value.replace(/[^\d.]/g, '').slice(0, 9))}
                  />
                  <span className="micro pr-3 text-faint">{base}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {QUICK.map((q) => (
                    <button key={q} type="button" onClick={() => setLimitAmount(String(q))} className={cx('micro border px-1.5 py-1 transition-colors', Number(limitAmount) === q ? 'border-acid text-acidink' : 'border-line2 text-faint hover:border-linehard')}>
                      {symbolOf(base)}{q}
                    </button>
                  ))}
                </div>
              </FieldShell>
              <div className="mt-3 flex flex-wrap gap-2">
                <CyberButton variant="solid" busy={limitBusy} disabled={limitParsed <= 0 && limitAmount !== ''} onClick={async () => {
                  if (limitParsed <= 0) { pushToast(TOAST_VERBS.error('LIMIT INVALID', 'Enter an amount above zero.')); return }
                  setLimitBusy(true)
                  try { await setWeeklyLimit({ amount: limitParsed, currency: base }); pushToast(TOAST_VERBS.info('BUDGET ARMED', `${formatMoney(limitParsed, base)}/week`)) } catch (e) { pushToast(TOAST_VERBS.error('WRITE FAILED', e instanceof Error ? e.message : 'Unknown')) } finally { setLimitBusy(false) }
                }}>
                  {limit?.amount ? 'UPDATE' : 'SET BUDGET'}
                </CyberButton>
                {limit?.amount ? (
                  <CyberButton variant="ghost" disabled={limitBusy} onClick={async () => {
                    setLimitBusy(true)
                    try { await setWeeklyLimit({ amount: 0, currency: base }); setLimitAmount(''); pushToast(TOAST_VERBS.info('BUDGET DISARMED', 'Cap removed.')) } catch (e) { pushToast(TOAST_VERBS.error('WRITE FAILED', '')) } finally { setLimitBusy(false) }
                  }}>REMOVE</CyberButton>
                ) : null}
              </div>
            </div>
            <div className="border border-line bg-bg2 p-3">
              <span className="micro text-faint">CURRENT ENVELOPE</span>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between"><span className="meta text-dim">Weekly Cap</span><span className="numeral text-[15px] text-fg">{limit?.amount ? formatMoney(limitBase, base) : '—'}</span></div>
                <div className="flex items-center justify-between"><span className="meta text-dim">Status</span><span className={cx('micro flex items-center gap-1', limit?.amount ? 'text-acidink' : 'text-faint')}><Led signal={limit?.amount ? 'acid' : 'blue'} size="sm" />{limit?.amount ? 'ACTIVE' : 'UNSET'}</span></div>
              </div>
              <div className="mt-3 pt-2 border-t border-line">
                <span className="micro text-faint">WANTS VS NEEDS</span>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {spendCategories.map((c) => (
                    <span key={c.id} className={cx('micro border px-1.5 py-0.5 text-[9px]', c.discretionary ? 'border-orange/50 text-orangeink' : 'border-line2 text-faint')}>
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CutPanel>
      </motion.div>
    </motion.div>
  )
}
