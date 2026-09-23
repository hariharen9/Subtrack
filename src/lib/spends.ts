/**
 * SUBTRACK // SPENDS ANALYTICS
 *
 * Daily spends are the variable half of the ledger — money that leaves through
 * a merchant, not a schedule. Everything here is derived from real rows: today's
 * burn, the running week vs its discretionary limiter, category distribution,
 * payment method matrix, weekday cyclical heat, needs-vs-wants ratio, and
 * month-end projected burn. Same discipline as Subscriptions analytics: nothing
 * is a guess, every "system note" is arithmetic.
 */
import type { Spend, SpendCategory, SpendMethod, WeeklySpendLimit } from './types'
import { SPEND_CATEGORY_META, SPEND_METHOD_LABEL } from './types'
import {
  MONTHS,
  addDaysISO,
  daysInMonth,
  diffDays,
  monthKey,
  monthKeyLabel,
  monthKeyParts,
  parseISO,
  shiftMonthKey,
  startOfMonthISO,
  todayISO,
  weekdayIndexMon,
} from './date'
import { convert, percentChange } from './money'

export interface SpendCategorySlice {
  category: SpendCategory
  label: string
  code: string
  signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
  /** Amount this month in base currency. */
  amount: number
  count: number
  share: number
  discretionary: boolean
}

export interface SpendMethodSlice {
  method: SpendMethod
  label: string
  amount: number
  count: number
  share: number
}

export interface SpendWeekdayPoint {
  dayIndex: number
  dayName: string
  shortName: string
  amount: number
  count: number
  share: number
}

export interface EssentialVsDiscretionary {
  essentialAmount: number
  essentialShare: number
  discretionaryAmount: number
  discretionaryShare: number
  total: number
}

export interface MonthEndForecast {
  daysElapsed: number
  daysInMonth: number
  currentTotal: number
  dailyAvg: number
  projectedTotal: number
  prevMonthTotal: number
  projectedDelta: number
}

export interface TopMerchant {
  title: string
  amount: number
  count: number
  category: SpendCategory
  lastDate: string
}

export type VelocityGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface VelocityPoint {
  key: string
  label: string
  shortLabel: string
  subLabel: string
  amount: number
  count: number
  isCurrent: boolean
  wantsAmount: number
  needsAmount: number
  topSpends: Spend[]
  topCategories: {
    category: SpendCategory
    label: string
    code: string
    signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
    amount: number
  }[]
}

export interface SpendDayPoint {
  iso: string
  label: string
  amount: number
  /** Spend on the exact day index 0 = today, walking back. */
  daysAgo: number
}

export interface SpendSystemNote {
  id: string
  label: string
  text: string
  signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
}

export interface SpendSummary {
  base: string
  today: string
  weekStart: string
  totalToday: number
  countToday: number
  /** Mon–Sun week, base currency, all categories. */
  weekTotal: number
  /** Discretionary spend this week (counts against the limiter). */
  weekDiscretionary: number
  weekLimit: WeeklySpendLimit | null
  /** 0..1 of the weekly limiter consumed (0 when unset). */
  weekUtilisation: number
  weekRemaining: number
  monthKey: string
  monthTotal: number
  prevMonthTotal: number
  /** Signed, only when previous month had spend. */
  monthDelta: number
  avgDayMonth: number
  categories: SpendCategorySlice[]
  /** Dominant slice this month, or null. */
  topCategory: SpendCategorySlice | null
  /** Daily series, `days` entries ending today (ascending). */
  series: SpendDayPoint[]
  monthHighDay: SpendDayPoint | null
  notes: SpendSystemNote[]
}

export interface SpendInsights {
  base: string
  monthKey: string
  monthTotal: number
  forecast: MonthEndForecast
  split: EssentialVsDiscretionary
  methods: SpendMethodSlice[]
  weekdays: SpendWeekdayPoint[]
  topMerchants: TopMerchant[]
  largestTransactions: Spend[]
  categorySlices: SpendCategorySlice[]
}

const DISCRETIONARY_THRESHOLD = 0.72

function inMonth(spend: Spend, key: string): boolean {
  return monthKey(spend.date) === key
}

/** Sum of spends (converted to base) matching a predicate. */
export function sumBase(
  spends: Spend[],
  base: string,
  predicate: (spend: Spend) => boolean,
): number {
  let total = 0
  for (const spend of spends) {
    if (predicate(spend)) total += convert(spend.amount, spend.currency, base)
  }
  return total
}

/** Build a category slice table for one month, keyed by category. */
export function categorySlices(
  spends: Spend[],
  base: string,
  month: string,
): SpendCategorySlice[] {
  const map = new Map<SpendCategory, { amount: number; count: number }>()
  for (const spend of spends) {
    if (!inMonth(spend, month)) continue
    const bucket = map.get(spend.category) ?? { amount: 0, count: 0 }
    bucket.amount += convert(spend.amount, spend.currency, base)
    bucket.count += 1
    map.set(spend.category, bucket)
  }
  const total = [...map.values()].reduce((sum, b) => sum + b.amount, 0)
  return [...map.entries()]
    .map(([category, bucket]) => {
      const meta = SPEND_CATEGORY_META[category]
      return {
        category,
        label: meta.label,
        code: meta.code,
        signal: meta.signal,
        amount: bucket.amount,
        count: bucket.count,
        share: total > 0 ? bucket.amount / total : 0,
        discretionary: meta.discretionary,
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

/** Daily totals for the trailing `days` window, ascending, with TODAY last. */
export function spendSeries(
  spends: Spend[],
  base: string,
  today: string,
  days = 28,
): SpendDayPoint[] {
  const out: SpendDayPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const iso = addDaysISO(today, -i)
    const amount = sumBase(spends, base, (spend) => spend.date === iso)
    const { d, m } = parseDate(iso)
    out.push({
      iso,
      label: `${MONTHS[m - 1]} ${d}`,
      amount,
      daysAgo: i,
    })
  }
  return out
}

function buildPeriodMetrics(periodSpends: Spend[], base: string) {
  const amount = sumBase(periodSpends, base, () => true)
  const wantsSpends = periodSpends.filter((s) => SPEND_CATEGORY_META[s.category]?.discretionary)
  const needsSpends = periodSpends.filter((s) => !SPEND_CATEGORY_META[s.category]?.discretionary)
  const wantsAmount = sumBase(wantsSpends, base, () => true)
  const needsAmount = sumBase(needsSpends, base, () => true)

  const sortedSpends = [...periodSpends].sort(
    (a, b) => convert(b.amount, b.currency, base) - convert(a.amount, a.currency, base),
  )
  const topSpends = sortedSpends.slice(0, 3)

  const catMap = new Map<SpendCategory, number>()
  for (const s of periodSpends) {
    const val = convert(s.amount, s.currency, base)
    catMap.set(s.category, (catMap.get(s.category) || 0) + val)
  }
  const topCategories = Array.from(catMap.entries())
    .map(([category, catAmt]) => {
      const meta = SPEND_CATEGORY_META[category]
      return {
        category,
        label: meta.label,
        code: meta.code,
        signal: meta.signal,
        amount: catAmt,
      }
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)

  return {
    amount,
    wantsAmount,
    needsAmount,
    topSpends,
    topCategories,
    count: periodSpends.length,
  }
}

const WEEKDAY_NAMES_FULL = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

export function computeVelocitySeries(
  spends: Spend[],
  base: string,
  granularity: VelocityGranularity,
  dailyDays: number = 28,
  today: string = todayISO(),
): VelocityPoint[] {
  if (granularity === 'daily') {
    const out: VelocityPoint[] = []
    for (let i = dailyDays - 1; i >= 0; i--) {
      const iso = addDaysISO(today, -i)
      const daySpends = spends.filter((s) => s.date === iso)
      const metrics = buildPeriodMetrics(daySpends, base)
      const { d, m, y } = parseISO(iso)
      const dt = new Date(Date.UTC(y, m - 1, d))
      const weekday = WEEKDAY_NAMES_FULL[dt.getUTCDay()]
      out.push({
        key: iso,
        label: `${d} ${MONTHS[m - 1]} ${y}`,
        shortLabel: `${d}`,
        subLabel: weekday,
        amount: metrics.amount,
        count: metrics.count,
        isCurrent: i === 0,
        wantsAmount: metrics.wantsAmount,
        needsAmount: metrics.needsAmount,
        topSpends: metrics.topSpends,
        topCategories: metrics.topCategories,
      })
    }
    return out
  }

  if (granularity === 'weekly') {
    const out: VelocityPoint[] = []
    const currentWeekStart = startOfWeekISO(today)
    for (let i = 11; i >= 0; i--) {
      const weekStart = addDaysISO(currentWeekStart, -i * 7)
      const weekEnd = addDaysISO(weekStart, 6)
      const weekSpends = spends.filter((s) => s.date >= weekStart && s.date <= weekEnd)
      const metrics = buildPeriodMetrics(weekSpends, base)
      const { d: d1, m: m1, y: y1 } = parseISO(weekStart)
      const { d: d2, m: m2 } = parseISO(weekEnd)
      out.push({
        key: weekStart,
        label: `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]}`,
        shortLabel: `${d1} ${MONTHS[m1 - 1]}`,
        subLabel: `ISO WEEK · ${y1}`,
        amount: metrics.amount,
        count: metrics.count,
        isCurrent: i === 0,
        wantsAmount: metrics.wantsAmount,
        needsAmount: metrics.needsAmount,
        topSpends: metrics.topSpends,
        topCategories: metrics.topCategories,
      })
    }
    return out
  }

  if (granularity === 'monthly') {
    const out: VelocityPoint[] = []
    const currentMonth = monthKey(today)
    for (let i = 11; i >= 0; i--) {
      const mKey = shiftMonthKey(currentMonth, -i)
      const monthSpends = spends.filter((s) => inMonth(s, mKey))
      const metrics = buildPeriodMetrics(monthSpends, base)
      const { y, m } = monthKeyParts(mKey)
      out.push({
        key: mKey,
        label: `${MONTHS[m - 1]} ${y}`,
        shortLabel: MONTHS[m - 1],
        subLabel: `${y} CALENDAR MONTH`,
        amount: metrics.amount,
        count: metrics.count,
        isCurrent: i === 0,
        wantsAmount: metrics.wantsAmount,
        needsAmount: metrics.needsAmount,
        topSpends: metrics.topSpends,
        topCategories: metrics.topCategories,
      })
    }
    return out
  }

  if (granularity === 'yearly') {
    const out: VelocityPoint[] = []
    const { y: currentYear } = parseISO(today)
    for (let i = 3; i >= 0; i--) {
      const year = currentYear - i
      const yearPrefix = String(year)
      const yearSpends = spends.filter((s) => s.date.startsWith(yearPrefix))
      const metrics = buildPeriodMetrics(yearSpends, base)
      out.push({
        key: yearPrefix,
        label: `${year}`,
        shortLabel: `${year}`,
        subLabel: `FINANCIAL YEAR ${year}`,
        amount: metrics.amount,
        count: metrics.count,
        isCurrent: i === 0,
        wantsAmount: metrics.wantsAmount,
        needsAmount: metrics.needsAmount,
        topSpends: metrics.topSpends,
        topCategories: metrics.topCategories,
      })
    }
    return out
  }

  return []
}

function parseDate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

/**
 * Summarise the whole daily-spend volume for a cockpit: today, the running
 * week against its discretionary limiter, the calendar month vs last, category
 * distribution and a daily velocity series.
 */
export function summarizeSpends(
  spends: Spend[],
  base: string,
  today: string = todayISO(),
  limit: WeeklySpendLimit | null = null,
): SpendSummary {
  const weekStart = startOfWeekISO(today)

  const totalToday = sumBase(spends, base, (spend) => spend.date === today)
  const countToday = spends.filter((spend) => spend.date === today).length
  const weekTotal = sumBase(spends, base, (spend) => spend.date >= weekStart)
  const weekDiscretionary = sumBase(spends, base, (spend) => {
    if (spend.date < weekStart) return false
    return SPEND_CATEGORY_META[spend.category].discretionary
  })

  const thisMonth = monthKey(today)
  const prevMonth = shiftMonthKey(thisMonth, -1)
  const monthTotal = sumBase(spends, base, (spend) => inMonth(spend, thisMonth))
  const prevMonthTotal = sumBase(spends, base, (spend) => inMonth(spend, prevMonth))
  const monthDelta = percentChange(monthTotal, prevMonthTotal)

  const daysInThisMonth = diffDays(today, startOfMonthISO(today)) + 1
  const avgDayMonth = daysInThisMonth > 0 ? monthTotal / daysInThisMonth : 0

  const categories = categorySlices(spends, base, thisMonth)
  const topCategory = categories[0] ?? null

  const series = spendSeries(spends, base, today, 28)
  const monthHighDay = [...series].sort((a, b) => b.amount - a.amount)[0] ?? null

  // Effective limit converted to base currency.
  let weekUtilisation = 0
  let weekRemaining = 0
  const hasLimit =
    limit && limit.amount > 0 && limit.currency === base
  if (hasLimit && limit) {
    weekUtilisation = limit.amount > 0 ? Math.min(1, weekDiscretionary / limit.amount) : 0
    weekRemaining = Math.max(0, limit.amount - weekDiscretionary)
  }

  return {
    base,
    today,
    weekStart,
    totalToday,
    countToday,
    weekTotal,
    weekDiscretionary,
    weekLimit: limit,
    weekUtilisation,
    weekRemaining,
    monthKey: thisMonth,
    monthTotal,
    prevMonthTotal,
    monthDelta,
    avgDayMonth,
    categories,
    topCategory,
    series,
    monthHighDay,
    notes: buildSpendNotes(
      spends,
      today,
      weekStart,
      weekTotal,
      weekDiscretionary,
      limit,
      weekUtilisation,
      categories,
    ),
  }
}

const WEEKDAY_NAMES = [
  { short: 'MON', full: 'Monday' },
  { short: 'TUE', full: 'Tuesday' },
  { short: 'WED', full: 'Wednesday' },
  { short: 'THU', full: 'Thursday' },
  { short: 'FRI', full: 'Friday' },
  { short: 'SAT', full: 'Saturday' },
  { short: 'SUN', full: 'Sunday' },
]

/**
 * Deep telemetry insights for the Spend Subsystem.
 */
export function buildSpendInsights(
  spends: Spend[],
  base: string,
  today: string = todayISO(),
): SpendInsights {
  const thisMonth = monthKey(today)
  const prevMonth = shiftMonthKey(thisMonth, -1)
  const monthSpends = spends.filter((s) => inMonth(s, thisMonth))
  const monthTotal = sumBase(spends, base, (s) => inMonth(s, thisMonth))
  const prevMonthTotal = sumBase(spends, base, (s) => inMonth(s, prevMonth))

  const { y, m, d: todayDay } = parseISO(today)
  const totalMonthDays = daysInMonth(y, m)
  const daysElapsed = Math.min(totalMonthDays, Math.max(1, todayDay))
  const dailyAvg = daysElapsed > 0 ? monthTotal / daysElapsed : 0
  const projectedTotal = dailyAvg * totalMonthDays
  const projectedDelta = percentChange(projectedTotal, prevMonthTotal)

  const forecast: MonthEndForecast = {
    daysElapsed,
    daysInMonth: totalMonthDays,
    currentTotal: monthTotal,
    dailyAvg,
    projectedTotal,
    prevMonthTotal,
    projectedDelta,
  }

  // 1. Essential vs Discretionary
  let essentialAmount = 0
  let discretionaryAmount = 0
  for (const s of monthSpends) {
    const val = convert(s.amount, s.currency, base)
    if (SPEND_CATEGORY_META[s.category]?.discretionary) {
      discretionaryAmount += val
    } else {
      essentialAmount += val
    }
  }
  const split: EssentialVsDiscretionary = {
    essentialAmount,
    essentialShare: monthTotal > 0 ? essentialAmount / monthTotal : 0,
    discretionaryAmount,
    discretionaryShare: monthTotal > 0 ? discretionaryAmount / monthTotal : 0,
    total: monthTotal,
  }

  // 2. Payment Method Distribution
  const methodMap = new Map<SpendMethod, { amount: number; count: number }>()
  for (const s of monthSpends) {
    const bucket = methodMap.get(s.method) ?? { amount: 0, count: 0 }
    bucket.amount += convert(s.amount, s.currency, base)
    bucket.count += 1
    methodMap.set(s.method, bucket)
  }
  const methods: SpendMethodSlice[] = [...methodMap.entries()]
    .map(([method, bucket]) => ({
      method,
      label: SPEND_METHOD_LABEL[method] ?? method.toUpperCase(),
      amount: bucket.amount,
      count: bucket.count,
      share: monthTotal > 0 ? bucket.amount / monthTotal : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  // 3. Weekday Heatmap (trailing 60 days of spends for reliable pattern)
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0]
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]
  const sixtyDaysAgo = addDaysISO(today, -60)
  for (const s of spends) {
    if (s.date >= sixtyDaysAgo && s.date <= today) {
      const idx = weekdayIndexMon(s.date)
      if (idx >= 0 && idx < 7) {
        weekdayTotals[idx] += convert(s.amount, s.currency, base)
        weekdayCounts[idx] += 1
      }
    }
  }
  const sixtyTotal = weekdayTotals.reduce((a, b) => a + b, 0)
  const weekdays: SpendWeekdayPoint[] = weekdayTotals.map((amount, dayIndex) => ({
    dayIndex,
    dayName: WEEKDAY_NAMES[dayIndex].full,
    shortName: WEEKDAY_NAMES[dayIndex].short,
    amount,
    count: weekdayCounts[dayIndex],
    share: sixtyTotal > 0 ? amount / sixtyTotal : 0,
  }))

  // 4. Top Merchants (Clean normalized merchant clusters)
  const merchantMap = new Map<string, { amount: number; count: number; category: SpendCategory; lastDate: string }>()
  for (const s of monthSpends) {
    const norm = s.title.trim().toLowerCase()
    const bucket = merchantMap.get(norm) ?? { amount: 0, count: 0, category: s.category, lastDate: s.date }
    bucket.amount += convert(s.amount, s.currency, base)
    bucket.count += 1
    if (s.date > bucket.lastDate) bucket.lastDate = s.date
    merchantMap.set(norm, bucket)
  }
  const topMerchants: TopMerchant[] = [...merchantMap.entries()]
    .map(([rawName, bucket]) => {
      // Find representative title casing
      const rep = monthSpends.find((s) => s.title.trim().toLowerCase() === rawName)?.title || rawName
      return {
        title: rep,
        amount: bucket.amount,
        count: bucket.count,
        category: bucket.category,
        lastDate: bucket.lastDate,
      }
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)

  // 5. Largest Outlier Transactions this month
  const largestTransactions = [...monthSpends]
    .sort((a, b) => convert(b.amount, b.currency, base) - convert(a.amount, a.currency, base))
    .slice(0, 5)

  return {
    base,
    monthKey: thisMonth,
    monthTotal,
    forecast,
    split,
    methods,
    weekdays,
    topMerchants,
    largestTransactions,
    categorySlices: categorySlices(spends, base, thisMonth),
  }
}

export type SpendRangePreset = 'all' | 'today' | '7d' | '30d' | 'this_month' | 'last_month'

/** Filter helper for spends by preset date window */
export function filterSpendsByRange(spends: Spend[], preset: SpendRangePreset, today: string = todayISO()): Spend[] {
  if (preset === 'all') return spends
  if (preset === 'today') return spends.filter((s) => s.date === today)
  if (preset === '7d') {
    const start = addDaysISO(today, -6)
    return spends.filter((s) => s.date >= start && s.date <= today)
  }
  if (preset === '30d') {
    const start = addDaysISO(today, -29)
    return spends.filter((s) => s.date >= start && s.date <= today)
  }
  if (preset === 'this_month') {
    const currentMonth = monthKey(today)
    return spends.filter((s) => monthKey(s.date) === currentMonth)
  }
  if (preset === 'last_month') {
    const prevMonth = shiftMonthKey(monthKey(today), -1)
    return spends.filter((s) => monthKey(s.date) === prevMonth)
  }
  return spends
}

function startOfWeekISO(iso: string): string {
  const offset = weekdayIndexMon(iso)
  return addDaysISO(iso, -offset)
}

function buildSpendNotes(
  spends: Spend[],
  today: string,
  weekStart: string,
  weekTotal: number,
  weekDiscretionary: number,
  limit: WeeklySpendLimit | null,
  weekUtilisation: number,
  categories: SpendCategorySlice[],
): SpendSystemNote[] {
  const notes: SpendSystemNote[] = []

  if (limit && limit.amount > 0) {
    if (weekUtilisation > 1) {
      notes.push({
        id: 'limit-broken',
        label: 'LIMITER EXCEEDED',
        signal: 'red',
        text: `Discretionary spend is ${formatDelta(weekUtilisation * 100)} over the weekly cap. Slow discretionary categories this week.`,
      })
    } else if (weekUtilisation >= DISCRETIONARY_THRESHOLD) {
      notes.push({
        id: 'limit-close',
        label: 'LIMITER NEAR',
        signal: 'orange',
        text: `${formatDelta(weekUtilisation * 100)} of the weekly discretionary cap is used — ${Math.max(0, limit.amount - weekDiscretionary).toFixed(0)} left.`,
      })
    } else if (weekUtilisation >= 0.4) {
      notes.push({
        id: 'limit-track',
        label: 'ON TRACK',
        signal: 'blue',
        text: `Handled ${formatDelta(weekUtilisation * 100)} of the discretionary envelope with ${Math.max(0, limit.amount - weekDiscretionary).toFixed(0)} to spare.`,
      })
    }
  }

  const top = categories[0]
  if (top && top.share >= 0.4) {
    notes.push({
      id: 'category-lean',
      label: 'CATEGORY LEAN',
      signal: 'magenta',
      text: `${top.label} is ${formatDelta(top.share * 100)} of this month's spend — ${top.amount.toFixed(0)} so far.`,
    })
  }

  const weekCount = spends.filter((spend) => spend.date >= weekStart).length
  const daysElapsedInWeek = weekdayIndexMon(today) + 1
  if (weekCount >= 5 && daysElapsedInWeek < 7) {
    const avg = weekTotal / daysElapsedInWeek
    notes.push({
      id: 'velocity',
      label: 'VELOCITY',
      signal: 'orange',
      text: `Already ${weekCount} transactions this week — average ${avg.toFixed(0)}/day across tracked spends.`,
    })
  }

  return notes.slice(0, 4)
}

function formatDelta(percent: number): string {
  const sign = percent >= 0 ? '' : '−'
  return `${sign}${Math.abs(percent).toFixed(0)}%`
}

/** Spend rows grouped by ISO date, newest first — the ledger's raw material. */
export function spendLedger(spends: Spend[]): { date: string; spends: Spend[] }[] {
  const grouped = new Map<string, Spend[]>()
  for (const spend of spends) {
    const bucket = grouped.get(spend.date) ?? []
    bucket.push(spend)
    grouped.set(spend.date, bucket)
  }
  return [...grouped.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, daySpends]) => ({
      date,
      spends: daySpends.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    }))
}

/** Convenience: month label 'SEP 2026' for a month key, reused by the cockpit. */
export function spendMonthLabel(key: string): string {
  const { y, m } = monthKeyParts(key)
  return `${MONTHS[m - 1]} ${y}`
}

export { monthKeyLabel }