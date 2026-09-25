/**
 * SUBTRACK // CREDIT CARD ANALYTICS
 *
 * Statement cycles, utilization, dues, and summaries — all derived from raw
 * rows. A statement period runs from one billing day to the day before the
 * next; dues come from the card's due day. Nothing stored, nothing guessed.
 */
import type { CreditCard, CardTransaction, SpendCategory, CardTxnType } from './types'
import { SPEND_CATEGORY_META } from './types'
import { convert, formatMoney } from './money'
import { addMonthsClamped, diffDays, formatSignalDate, parseISO, todayISO, daysInMonth as daysInMonthFn } from './date'

/* ── Statement cycle math ────────────────────────────────────────────── */

function clampDay(day: number, iso: string): number {
  const { y, m } = parseISO(iso)
  return Math.min(day, daysInMonthFn(y, m))
}

/** ISO date of the most recent billing day on or before `today` (period start). */
export function currentCycleStart(card: CreditCard, today: string): string {
  const t = parseISO(today)
  if (t.d >= card.billingDay) {
    return `${t.y}-${String(t.m).padStart(2, '0')}-${String(card.billingDay).padStart(2, '0')}`
  }
  const prevMonth = addMonthsClamped(today, -1)
  const p = parseISO(prevMonth)
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(Math.min(card.billingDay, daysInMonthFn(p.y, p.m))).padStart(2, '0')}`
}

/** Next billing day strictly after today (current period end + 1). */
export function nextCycleStart(card: CreditCard, today: string): string {
  return addMonthsClamped(currentCycleStart(card, today), 1)
}

/** Upcoming payment due date for the last closed statement. */
export function upcomingDueDate(card: CreditCard, today: string): string {
  const t = parseISO(today)
  const thisMonthDue = `${t.y}-${String(t.m).padStart(2, '0')}-${String(clampDay(card.dueDay, today)).padStart(2, '0')}`
  if (thisMonthDue >= today) return thisMonthDue
  const next = addMonthsClamped(today, 1)
  const n = parseISO(next)
  return `${n.y}-${String(n.m).padStart(2, '0')}-${String(clampDay(card.dueDay, next)).padStart(2, '0')}`
}

/* ── Card view ───────────────────────────────────────────────────────── */

export interface CardView {
  card: CreditCard
  /** Balance derived from transactions (purchases − payments − refunds + fees + interest − rewards as cash). */
  balance: number
  available: number
  utilisation: number
  /** Current (open) cycle spend — purchases only. */
  cycleSpend: number
  cyclePurchases: number
  cyclePayments: number
  cycleFees: number
  cycleRewards: number
  cycleStart: string
  nextBilling: string
  dueDate: string
  daysToDue: number
  /** Last statement (closed cycle) totals. */
  lastStatementSpend: number
  lastStatementDue: number
  /** Total rewards earned all-time. */
  totalRewards: number
  txnCount: number
  share: number
  signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
}

/** Balance: purchases, fees and interest add; payments, refunds and rewards subtract. */
function computeBalance(txns: CardTransaction[], base: string): number {
  let balance = 0
  for (const t of txns) {
    const amt = convert(t.amount, t.currency, base)
    if (t.type === 'purchase' || t.type === 'fee' || t.type === 'interest') balance += amt
    else if (t.type === 'payment' || t.type === 'refund') balance -= amt
    else if (t.type === 'reward') balance -= amt
  }
  return Math.max(0, Math.round(balance * 100) / 100)
}

function utilisationSignal(u: number): CardView['signal'] {
  if (u >= 0.8) return 'red'
  if (u >= 0.5) return 'orange'
  if (u >= 0.2) return 'blue'
  return 'acid'
}

export function viewOfCard(
  card: CreditCard,
  txns: CardTransaction[],
  base: string,
  today: string,
  totalOutstanding: number,
): CardView {
  const cycleStart = currentCycleStart(card, today)
  const nextBilling = nextCycleStart(card, today)
  const dueDate = upcomingDueDate(card, today)
  const daysToDue = Math.max(0, diffDays(dueDate, today))

  const cycleTxns = txns.filter((t) => t.date >= cycleStart)
  const sumType = (list: CardTransaction[], type: CardTxnType) =>
    list.filter((t) => t.type === type).reduce((s, t) => s + convert(t.amount, t.currency, base), 0)

  const cyclePurchases = sumType(cycleTxns, 'purchase')
  const cyclePayments = sumType(cycleTxns, 'payment')
  const cycleFees = sumType(cycleTxns, 'fee') + sumType(cycleTxns, 'interest')
  const cycleRewards = cycleTxns.filter((t) => t.type !== 'payment').reduce((s, t) => s + t.rewards, 0)
  const cycleSpend = cyclePurchases + cycleFees

  // Last closed statement
  const lastStart = addMonthsClamped(cycleStart, -1)
  const lastTxns = txns.filter((t) => t.date >= lastStart && t.date < cycleStart && (t.type === 'purchase' || t.type === 'fee' || t.type === 'interest'))
  const lastStatementSpend = lastTxns.reduce((s, t) => s + convert(t.amount, t.currency, base), 0)

  const balance = computeBalance(txns, base)
  const limit = convert(card.creditLimit, card.currency, base)
  const available = Math.max(0, limit - balance)
  const utilisation = limit > 0 ? Math.min(1, balance / limit) : 0

  const totalRewards = txns
    .filter((t) => t.type !== 'payment')
    .reduce((s, t) => s + t.rewards, 0)

  return {
    card,
    balance,
    available,
    utilisation,
    cycleSpend,
    cyclePurchases,
    cyclePayments,
    cycleFees,
    cycleRewards,
    cycleStart,
    nextBilling,
    dueDate,
    daysToDue,
    lastStatementSpend,
    lastStatementDue: lastStatementSpend,
    totalRewards,
    txnCount: txns.length,
    share: totalOutstanding > 0 ? balance / totalOutstanding : 0,
    signal: utilisationSignal(utilisation),
  }
}

/* ── Summary ─────────────────────────────────────────────────────────── */

export interface CardCategorySlice {
  category: SpendCategory
  label: string
  code: string
  signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
  amount: number
  count: number
  share: number
}

export interface CardsSummary {
  base: string
  today: string
  views: CardView[]
  activeViews: CardView[]
  totalLimit: number
  totalOutstanding: number
  totalAvailable: number
  totalUtilisation: number
  /** Nearest upcoming due payment across cards. */
  nextDue: { card: CreditCard; date: string; days: number; balance: number } | null
  /** Aggregate current-cycle spend across cards. */
  cycleSpendTotal: number
  cyclePaymentsTotal: number
  totalRewards: number
  txnCount: number
  categories: CardCategorySlice[]
  /** Daily series of purchases for the trailing 28 days. */
  dailySeries: { iso: string; label: string; amount: number }[]
}

export function summarizeCards(
  cards: CreditCard[],
  txns: CardTransaction[],
  base: string,
  today: string = todayISO(),
): CardsSummary {
  const views = cards.map((card) => viewOfCard(card, txns, base, today, 0))
  // Second pass for shares with the real total
  const totalOutstanding = views.reduce((s, v) => s + v.balance, 0)
  const withShares = cards.map((card) =>
    viewOfCard(card, txns, base, today, totalOutstanding),
  )
  const activeViews = withShares.filter((v) => v.card.status === 'active')

  const totalLimit = activeViews.reduce((s, v) => s + convert(v.card.creditLimit, v.card.currency, base), 0)
  const totalAvailable = activeViews.reduce((s, v) => s + v.available, 0)

  const dues = activeViews
    .map((v) => ({ card: v.card, date: v.dueDate, days: v.daysToDue, balance: v.balance }))
    .sort((a, b) => a.days - b.days)
  const nextDue = dues[0] ?? null

  const cycleSpendTotal = activeViews.reduce((s, v) => s + v.cycleSpend, 0)
  const cyclePaymentsTotal = activeViews.reduce((s, v) => s + v.cyclePayments, 0)
  const totalRewards = views.reduce((s, v) => s + v.totalRewards, 0)

  // Category slices — all purchases all-time
  const catMap = new Map<SpendCategory, { amount: number; count: number }>()
  for (const t of txns) {
    if (t.type !== 'purchase' && t.type !== 'fee') continue
    const bucket = catMap.get(t.category) ?? { amount: 0, count: 0 }
    bucket.amount += convert(t.amount, t.currency, base)
    bucket.count += 1
    catMap.set(t.category, bucket)
  }
  const catTotal = [...catMap.values()].reduce((s, b) => s + b.amount, 0)
  const categories: CardCategorySlice[] = [...catMap.entries()]
    .map(([category, bucket]) => {
      const meta = SPEND_CATEGORY_META[category]
      return {
        category,
        label: meta.label,
        code: meta.code,
        signal: meta.signal,
        amount: bucket.amount,
        count: bucket.count,
        share: catTotal > 0 ? bucket.amount / catTotal : 0,
      }
    })
    .sort((a, b) => b.amount - a.amount)

  // Daily series — trailing 28 days of purchase outflow
  const dailySeries: { iso: string; label: string; amount: number }[] = []
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  for (let i = 27; i >= 0; i--) {
    const d = new Date(Date.UTC(...(today.split('-').map(Number) as [number, number, number])))
    d.setUTCDate(d.getUTCDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const amount = txns
      .filter((t) => t.date === iso && (t.type === 'purchase' || t.type === 'fee' || t.type === 'interest'))
      .reduce((s, t) => s + convert(t.amount, t.currency, base), 0)
    dailySeries.push({ iso, label: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`, amount })
  }

  return {
    base,
    today,
    views: withShares,
    activeViews,
    totalLimit,
    totalOutstanding,
    totalAvailable,
    totalUtilisation: totalLimit > 0 ? totalOutstanding / totalLimit : 0,
    nextDue,
    cycleSpendTotal,
    cyclePaymentsTotal,
    totalRewards,
    txnCount: txns.length,
    categories,
    dailySeries,
  }
}

/* ── Notes ───────────────────────────────────────────────────────────── */

export interface CardNote {
  id: string
  label: string
  text: string
  signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
}

export function buildCardNotes(summary: CardsSummary): CardNote[] {
  const notes: CardNote[] = []

  if (summary.totalUtilisation >= 0.5) {
    notes.push({
      id: 'util-high',
      label: summary.totalUtilisation >= 0.8 ? 'UTILISATION CRITICAL' : 'HIGH UTILISATION',
      signal: summary.totalUtilisation >= 0.8 ? 'red' : 'orange',
      text: `Overall utilisation is ${(summary.totalUtilisation * 100).toFixed(0)}% — keeping it under 30% protects your credit score.`,
    })
  } else if (summary.totalUtilisation > 0 && summary.totalUtilisation < 0.3) {
    notes.push({
      id: 'util-ok',
      label: 'UTILISATION HEALTHY',
      signal: 'acid',
      text: `Overall utilisation is ${(summary.totalUtilisation * 100).toFixed(0)}% — inside the recommended 30% band.`,
    })
  }

  if (summary.nextDue && summary.nextDue.days <= 7) {
    notes.push({
      id: 'due-soon',
      label: summary.nextDue.days <= 2 ? 'PAYMENT DUE IMMINENT' : 'PAYMENT DUE THIS WEEK',
      signal: summary.nextDue.days <= 2 ? 'red' : 'orange',
      text: `${summary.nextDue.card.name} ··${summary.nextDue.card.last4} due ${formatSignalDate(summary.nextDue.date)} (${summary.nextDue.days}d).`,
    })
  }

  const hottest = summary.activeViews.slice().sort((a, b) => b.utilisation - a.utilisation)[0]
  if (hottest && hottest.utilisation >= 0.7) {
    notes.push({
      id: 'card-hot',
      label: 'CARD NEARLY MAXED',
      signal: 'orange',
      text: `${hottest.card.name} is at ${(hottest.utilisation * 100).toFixed(0)}% of its limit.`,
    })
  }

  const topCat = summary.categories[0]
  if (topCat && topCat.share >= 0.4) {
    notes.push({
      id: 'cat-lean',
      label: 'CATEGORY LEAN',
      signal: 'magenta',
      text: `${topCat.label} is ${(topCat.share * 100).toFixed(0)}% of all card spend.`,
    })
  }

  const interestTxns = summary.views.filter((v) => v.cycleFees > 0)
  if (interestTxns.length) {
    notes.push({
      id: 'fees',
      label: 'FEES & INTEREST THIS CYCLE',
      signal: 'red',
      text: `${formatMoney(interestTxns.reduce((s, v) => s + v.cycleFees, 0), summary.base)} in fees/interest this cycle — paying statements in full avoids this.`,
    })
  }

  return notes.slice(0, 5)
}