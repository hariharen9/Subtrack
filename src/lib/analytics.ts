/**
 * SUBTRACK // SYSTEM ANALYTICS
 *
 * Everything the interface claims is derived here from real rows: burn is a
 * normalised run-rate, the signal series is the recorded ledger (past) joined
 * to the scheduled future, and every "system note" is a plain calculation.
 * Nothing is random, nothing is dressed up as intelligence.
 */
import type { Category, Payment, Subscription } from './types'
import { CATEGORY_CODE, CATEGORY_LABEL, CATEGORY_SIGNAL } from './types'
import {
  addDaysISO,
  diffDays,
  endOfMonthISO,
  monthKey,
  monthKeyLabel,
  monthKeyParts,
  monthKeyShort,
  relativeDay,
  shiftMonthKey,
  startOfMonthISO,
  todayISO,
  type RelativeDay,
} from './date'
import { monthlyCost, occurrencesBetween } from './cycle'
import { convert, percentChange } from './money'

export interface SubscriptionView {
  sub: Subscription
  /** Normalised monthly cost in the base currency. */
  monthly: number
  annual: number
  next: RelativeDay & { date: string }
  /** Share of the total burn, 0..1. */
  share: number
}

export function viewOf(sub: Subscription, base: string, today: string, total = 0): SubscriptionView {
  const monthly = convert(monthlyCost(sub.price, sub.billingCycle, sub.customIntervalDays), sub.currency, base)
  return {
    sub,
    monthly,
    annual: monthly * 12,
    next: { date: sub.nextBillingDate, ...relativeDay(sub.nextBillingDate, today) },
    share: total > 0 ? monthly / total : 0,
  }
}

export interface CategorySlice {
  category: Category
  label: string
  code: string
  signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
  monthly: number
  annual: number
  count: number
  share: number
}

export interface ProcessEvent {
  id: string
  date: string
  sub: Subscription
  amount: number
  /** Base-currency value of this single charge. */
  baseAmount: number
  days: number
  overdue: boolean
  /** Running total of money leaving the system at this point in the stream. */
  cumulative: number
}

export interface SystemNote {
  id: string
  label: string
  text: string
  signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
}

export interface SeriesPoint {
  key: string
  label: string
  short: string
  year: number
  month: number
  amount: number
  kind: 'actual' | 'current' | 'projected'
}

export interface SystemSummary {
  base: string
  today: string
  active: Subscription[]
  suspended: Subscription[]
  terminated: Subscription[]
  views: SubscriptionView[]
  monthlyBurn: number
  annualLoad: number
  dailyBurn: number
  avgCost: number
  highest: SubscriptionView | null
  lowest: SubscriptionView | null
  activeCount: number
  /** Run-rate momentum: burn today vs burn 30 days ago. */
  runRateDelta: number
  /** Cash momentum: charges this cycle vs the previous cycle. */
  cashDelta: number
  thisMonthKey: string
  thisMonthCash: number
  prevMonthCash: number
  nextPayment: ProcessEvent | null
  incoming7: ProcessEvent[]
  incoming30: ProcessEvent[]
  incoming30Total: number
  overdue: ProcessEvent[]
  categories: CategorySlice[]
  concentration: { count: number; share: number }
  dormant: { view: SubscriptionView; days: number }[]
  longestRunning: SubscriptionView | null
  notes: SystemNote[]
}

const DORMANT_DAYS = 30

function activeDuring(sub: Subscription, startISO: string, endISO: string): boolean {
  if (sub.createdAt > endISO) return false
  if (sub.statusChangedAt && sub.statusChangedAt < startISO) return false
  return true
}

/** Sum of the normalised monthly cost of everything running inside a month. */
export function burnAt(subs: Subscription[], key: string, base: string): number {
  const start = `${key}-01`
  const end = endOfMonthISO(start)
  return subs.reduce(
    (sum, sub) =>
      activeDuring(sub, start, end)
        ? sum + convert(monthlyCost(sub.price, sub.billingCycle, sub.customIntervalDays), sub.currency, base)
        : sum,
    0,
  )
}

/** Real cash in a month: recorded rows for the past, schedule for the future. */
export function cashAt(
  subs: Subscription[],
  payments: Payment[],
  key: string,
  base: string,
  today: string,
): { amount: number; kind: SeriesPoint['kind'] } {
  const start = `${key}-01`
  const end = endOfMonthISO(start)
  const rowTotal = payments.reduce(
    (sum, p) => (p.date >= start && p.date <= end ? sum + convert(p.amount, p.currency, base) : sum),
    0,
  )
  if (end < today) return { amount: rowTotal, kind: 'actual' }

  // Current and future months also include scheduled charges not yet recorded.
  const from = key === monthKey(today) ? addDaysISO(today, 1) : start
  const scheduled = subs.reduce((sum, sub) => {
    if (sub.status !== 'active') return sum
    const dates = occurrencesBetween(sub, from > start ? from : start, end)
    return sum + dates.length * convert(sub.price, sub.currency, base)
  }, 0)
  return { amount: rowTotal + scheduled, kind: key === monthKey(today) ? 'current' : 'projected' }
}

export function buildSignalSeries(
  subs: Subscription[],
  payments: Payment[],
  base: string,
  today: string,
  mode: 'cash' | 'runrate',
  back = 7,
  forward = 3,
): SeriesPoint[] {
  const currentKey = monthKey(today)
  const points: SeriesPoint[] = []
  for (let i = -back; i <= forward; i++) {
    const key = shiftMonthKey(currentKey, i)
    const { y, m } = monthKeyParts(key)
    let amount: number
    let kind: SeriesPoint['kind']
    if (mode === 'runrate') {
      amount = burnAt(subs, key, base)
      kind = i < 0 ? 'actual' : i === 0 ? 'current' : 'projected'
    } else {
      const cash = cashAt(subs, payments, key, base, today)
      amount = cash.amount
      kind = cash.kind
    }
    points.push({
      key,
      label: monthKeyLabel(key),
      short: monthKeyShort(key),
      year: y,
      month: m,
      amount,
      kind,
    })
  }
  return points
}

/**
 * Scheduled charges from today forward, ascending, with a running total so the
 * stream reads as money leaving the system. History is the ledger's job — this
 * window is strictly the future.
 */
export function incomingStream(
  subs: Subscription[],
  base: string,
  today: string,
  horizonDays = 30,
): ProcessEvent[] {
  const to = addDaysISO(today, horizonDays)
  const events: ProcessEvent[] = []
  for (const sub of subs) {
    if (sub.status !== 'active') continue
    for (const date of occurrencesBetween(sub, today, to)) {
      const days = diffDays(date, today)
      events.push({
        id: `${sub.id}:${date}`,
        date,
        sub,
        amount: sub.price,
        baseAmount: convert(sub.price, sub.currency, base),
        days,
        overdue: false,
        cumulative: 0,
      })
    }
  }
  events.sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.sub.name.localeCompare(b.sub.name),
  )
  let running = 0
  for (const event of events) {
    running += event.baseAmount
    event.cumulative = running
  }
  return events
}

/**
 * Cycles whose anchor has already passed without confirmation. A tracked
 * subscription past its billing date is the one thing this system must shout
 * about, so it is derived from the anchor rather than from the charge window.
 */
export function overdueStream(
  subs: Subscription[],
  base: string,
  today: string,
): ProcessEvent[] {
  return subs
    .filter((sub) => sub.status === 'active' && sub.nextBillingDate < today)
    .map((sub) => ({
      id: `${sub.id}:${sub.nextBillingDate}`,
      date: sub.nextBillingDate,
      sub,
      amount: sub.price,
      baseAmount: convert(sub.price, sub.currency, base),
      days: diffDays(sub.nextBillingDate, today),
      overdue: true,
      cumulative: 0,
    }))
    .sort((a, b) => a.days - b.days)
}

export function matrixFor(
  subs: Subscription[],
  base: string,
  startISO: string,
  endISO: string,
): Map<string, ProcessEvent[]> {
  const map = new Map<string, ProcessEvent[]>()
  for (const sub of subs) {
    if (sub.status !== 'active') continue
    for (const date of occurrencesBetween(sub, startISO, endISO)) {
      const event: ProcessEvent = {
        id: `${sub.id}:${date}`,
        date,
        sub,
        amount: sub.price,
        baseAmount: convert(sub.price, sub.currency, base),
        days: 0,
        overdue: false,
        cumulative: 0,
      }
      const bucket = map.get(date)
      if (bucket) bucket.push(event)
      else map.set(date, [event])
    }
  }
  return map
}

export function summarize(
  subs: Subscription[],
  payments: Payment[],
  base: string,
  today: string = todayISO(),
): SystemSummary {
  const active = subs.filter((s) => s.status === 'active')
  const suspended = subs.filter((s) => s.status === 'suspended')
  const terminated = subs.filter((s) => s.status === 'terminated')

  const rawBurn = active.reduce(
    (sum, sub) => sum + convert(monthlyCost(sub.price, sub.billingCycle, sub.customIntervalDays), sub.currency, base),
    0,
  )
  const views = active
    .map((sub) => viewOf(sub, base, today, rawBurn))
    .sort((a, b) => b.monthly - a.monthly)

  const sorted = views
  const highest = sorted[0] ?? null
  const lowest = sorted.length ? sorted[sorted.length - 1] : null

  const top3 = sorted.slice(0, 3).reduce((sum, v) => sum + v.monthly, 0)
  const concentration = {
    count: Math.min(3, sorted.length),
    share: rawBurn > 0 ? top3 / rawBurn : 0,
  }

  const thisMonthKey = monthKey(today)
  const prevKey = shiftMonthKey(thisMonthKey, -1)
  const thisMonthCash = cashAt(subs, payments, thisMonthKey, base, today).amount
  const prevMonthCash = cashAt(subs, payments, prevKey, base, today).amount

  const prevBurn = burnAt(subs, prevKey, base)
  const runRateDelta = percentChange(rawBurn, prevBurn)
  const cashDelta = percentChange(thisMonthCash, prevMonthCash)

  const events = incomingStream(subs, base, today, 30)
  const overdue = overdueStream(subs, base, today)
  const forward = events.filter((event) => !event.overdue)
  const incoming7 = forward.filter((event) => event.days <= 7)
  const incoming30 = forward
  const incoming30Total = forward.reduce((sum, event) => sum + event.baseAmount, 0)

  const categoryMap = new Map<Category, CategorySlice>()
  for (const view of views) {
    const bucket = categoryMap.get(view.sub.category) ?? {
      category: view.sub.category,
      label: CATEGORY_LABEL[view.sub.category],
      code: CATEGORY_CODE[view.sub.category],
      signal: CATEGORY_SIGNAL[view.sub.category],
      monthly: 0,
      annual: 0,
      count: 0,
      share: 0,
    }
    bucket.monthly += view.monthly
    bucket.annual += view.annual
    bucket.count += 1
    categoryMap.set(view.sub.category, bucket)
  }
  const categories = [...categoryMap.values()]
    .map((c) => ({ ...c, share: rawBurn > 0 ? c.monthly / rawBurn : 0 }))
    .sort((a, b) => b.monthly - a.monthly)

  const dormant = views
    .filter((v) => {
      const last = v.sub.lastUsedAt
      if (!last) return true
      return diffDays(today, last) >= DORMANT_DAYS
    })
    .map((v) => ({ view: v, days: v.sub.lastUsedAt ? diffDays(today, v.sub.lastUsedAt) : 999 }))
    .sort((a, b) => b.days - a.days)

  const longestRunning = [...views].sort((a, b) => b.sub.cyclesExecuted - a.sub.cyclesExecuted)[0] ?? null

  const summary: SystemSummary = {
    base,
    today,
    active,
    suspended,
    terminated,
    views,
    monthlyBurn: rawBurn,
    annualLoad: rawBurn * 12,
    dailyBurn: rawBurn / 30.4375,
    avgCost: views.length ? rawBurn / views.length : 0,
    highest,
    lowest,
    activeCount: active.length,
    runRateDelta,
    cashDelta,
    thisMonthKey,
    thisMonthCash,
    prevMonthCash,
    nextPayment: forward[0] ?? null,
    incoming7,
    incoming30,
    incoming30Total,
    overdue,
    categories,
    concentration,
    dormant,
    longestRunning,
    notes: [],
  }

  summary.notes = buildNotes(summary, views, payments, base, today)
  return summary
}

function buildNotes(
  summary: SystemSummary,
  views: SubscriptionView[],
  payments: Payment[],
  base: string,
  today: string,
): SystemNote[] {
  const notes: SystemNote[] = []

  if (summary.concentration.count >= 2 && summary.concentration.share > 0.35) {
    notes.push({
      id: 'concentration',
      label: 'SYSTEM NOTE',
      signal: 'magenta',
      text: `${summary.concentration.count} processes account for ${Math.round(
        summary.concentration.share * 100,
      )}% of your monthly burn — ${views
        .slice(0, summary.concentration.count)
        .map((v) => v.sub.name)
        .join(', ')}.`,
    })
  }

  // Category momentum: this calendar month vs last, from recorded charges.
  const thisKey = monthKey(today)
  const prevKey = shiftMonthKey(thisKey, -1)
  const byCategory = new Map<Category, { now: number; before: number }>()
  for (const p of payments) {
    const key = monthKey(p.date)
    if (key !== thisKey && key !== prevKey) continue
    const bucket = byCategory.get(p.category) ?? { now: 0, before: 0 }
    const value = convert(p.amount, p.currency, base)
    if (key === thisKey) bucket.now += value
    else bucket.before += value
    byCategory.set(p.category, bucket)
  }
  const movers = [...byCategory.entries()]
    .filter(([, v]) => v.before > 0 && v.now > v.before * 1.05 && v.now - v.before > 200)
    .map(([category, v]) => ({ category, delta: percentChange(v.now, v.before) }))
    .sort((a, b) => b.delta - a.delta)
  if (movers[0]) {
    notes.push({
      id: `category-${movers[0].category}`,
      label: 'COST SIGNAL',
      signal: 'orange',
      text: `${CATEGORY_LABEL[movers[0].category]} spending is up ${movers[0].delta.toFixed(0)}% this cycle.`,
    })
  }

  if (summary.dormant.length) {
    const names = summary.dormant
      .slice(0, 3)
      .map((d) => d.view.sub.name)
      .join(', ')
    notes.push({
      id: 'dormant',
      label: 'DORMANT PROCESS',
      signal: 'red',
      text: `${summary.dormant.length} tracked ${
        summary.dormant.length === 1 ? 'process has' : 'processes have'
      } not been marked as used in ${DORMANT_DAYS}+ days (${names}) — ${formatInBase(
        summary.dormant.reduce((sum, d) => sum + d.view.monthly, 0),
        summary.base,
      )}/month is running on them.`,
    })
  }

  if (summary.incoming7.length >= 3) {
    notes.push({
      id: 'cluster',
      label: 'LOAD CLUSTER',
      signal: 'blue',
      text: `${summary.incoming7.length} charges land in the next 7 days, moving ${formatInBase(
        summary.incoming7.reduce((sum, e) => sum + e.baseAmount, 0),
        summary.base,
      )} out of the system.`,
    })
  }

  const newThisCycle = views.filter((v) => diffDays(today, v.sub.createdAt) <= 30)
  if (newThisCycle.length) {
    notes.push({
      id: 'new',
      label: 'PROCESS INIT',
      signal: 'acid',
      text: `${newThisCycle.length} process${
        newThisCycle.length === 1 ? ' was' : 'es were'
      } initialized in the last 30 days, adding ${formatInBase(
        newThisCycle.reduce((sum, v) => sum + v.monthly, 0),
        summary.base,
      )} to monthly burn.`,
    })
  }

  if (summary.longestRunning && summary.longestRunning.sub.cyclesExecuted > 6) {
    const v = summary.longestRunning
    notes.push({
      id: 'longest',
      label: 'UPTIME RECORD',
      signal: 'acid',
      text: `${v.sub.name} is your longest-running process: ${v.sub.cyclesExecuted} cycles since ${v.sub.createdAt}. It has moved ${formatInBase(
        v.sub.cyclesExecuted * v.monthly,
        summary.base,
      )} in total.`,
    })
  }

  if (summary.overdue.length) {
    notes.push({
      id: 'overdue',
      label: 'CYCLE OVERDUE',
      signal: 'red',
      text: `${summary.overdue.length} scheduled charge${
        summary.overdue.length === 1 ? ' is' : 's are'
      } past their date without confirmation. Confirm or reconcile the schedule.`,
    })
  }

  return notes.slice(0, 6)
}

/** Small local helper so notes can show money without importing the formatter. */
function formatInBase(amount: number, base: string): string {
  const def = base === 'INR' ? 'en-IN' : 'en-US'
  return new Intl.NumberFormat(def, {
    style: 'currency',
    currency: base,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

/** Ledger rows grouped by month for the per-process spending signal. */
export function paymentSeriesFor(
  payments: Payment[],
  base: string,
  months = 6,
  today: string = todayISO(),
): SeriesPoint[] {
  const currentKey = monthKey(today)
  const points: SeriesPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const key = shiftMonthKey(currentKey, -i)
    const start = startOfMonthISO(`${key}-01`)
    const end = endOfMonthISO(start)
    const amount = payments.reduce(
      (sum, p) => (p.date >= start && p.date <= end ? sum + convert(p.amount, p.currency, base) : sum),
      0,
    )
    const { y, m } = monthKeyParts(key)
    points.push({
      key,
      label: monthKeyLabel(key),
      short: monthKeyShort(key),
      year: y,
      month: m,
      amount,
      kind: i === 0 ? 'current' : 'actual',
    })
  }
  return points
}
