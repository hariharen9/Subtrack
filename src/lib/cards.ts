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
import {
  addMonthsClamped,
  diffDays,
  formatSignalDate,
  monthKey,
  monthKeyLabel,
  parseISO,
  todayISO,
  daysInMonth as daysInMonthFn,
} from './date'

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

/* ── Statement engine ────────────────────────────────────────────────── */

export type StatementStatus = 'paid' | 'partial' | 'unpaid' | 'current' | 'empty'

/** A closed statement period: spend, payments and settlement state. */
export interface CardStatement {
  /** Statement close date (the card's billing day). */
  close: string
  /** Statement window [start, close). */
  start: string
  dueDate: string
  /** Purchases + fees + interest inside the statement window (base currency). */
  spend: number
  purchases: number
  fees: number
  /** Payments received during the statement window (base currency). */
  payments: number
  /** Points earned by transactions in the window. */
  rewards: number
  /** Amount due after in-window payments: max(0, spend − payments). */
  due: number
  /** Payments credited between close and due date (the settlement). */
  paidAfterClose: number
  paidTotal: number
  status: StatementStatus
  /** 'SEP 2026' — the close month. */
  label: string
}

/** Payment due date for the statement that closed on `close` (a billing day). */
export function statementDueDate(card: CreditCard, close: string): string {
  const sameMonthDue = `${close.slice(0, 7)}-${String(clampDay(card.dueDay, close)).padStart(2, '0')}`
  if (sameMonthDue > close) return sameMonthDue
  const next = addMonthsClamped(close, 1)
  const n = parseISO(next)
  return `${n.y}-${String(n.m).padStart(2, '0')}-${String(clampDay(card.dueDay, next)).padStart(2, '0')}`
}

/**
 * Derive the statement that closed on `close` from raw transactions.
 * Payments made during the window reduce the due; payments credited between
 * close and the due date settle it.
 */
export function statementFor(
  card: CreditCard,
  txns: CardTransaction[],
  base: string,
  close: string,
  today: string,
): CardStatement {
  const start = addMonthsClamped(close, -1)
  const dueDate = statementDueDate(card, close)
  const conv = (t: CardTransaction) => convert(t.amount, t.currency, base)

  const inWindow = txns.filter((t) => t.date >= start && t.date < close)
  const purchases = inWindow.filter((t) => t.type === 'purchase').reduce((s, t) => s + conv(t), 0)
  const fees = inWindow
    .filter((t) => t.type === 'fee' || t.type === 'interest')
    .reduce((s, t) => s + conv(t), 0)
  const payments = inWindow.filter((t) => t.type === 'payment').reduce((s, t) => s + conv(t), 0)
  const rewards = inWindow.filter((t) => t.type !== 'payment').reduce((s, t) => s + t.rewards, 0)
  const spend = purchases + fees
  const due = Math.max(0, Math.round((spend - payments) * 100) / 100)

  const paidAfterClose = txns
    .filter((t) => t.type === 'payment' && t.date >= close && t.date <= dueDate)
    .reduce((s, t) => s + conv(t), 0)
  const paidTotal = payments + paidAfterClose

  let status: StatementStatus
  if (spend <= 0.005 && payments <= 0.005) status = 'empty'
  else if (due <= 0.005 || paidTotal >= due - 0.005) status = 'paid'
  else if (today > dueDate) status = paidTotal > 0.005 ? 'partial' : 'unpaid'
  else status = 'current'

  return {
    close, start, dueDate, spend, purchases, fees, payments, rewards,
    due, paidAfterClose, paidTotal, status,
    label: monthKeyLabel(monthKey(close)),
  }
}

/** The last `count` closed statements, most recent first. */
export function statementHistory(
  card: CreditCard,
  txns: CardTransaction[],
  base: string,
  today: string,
  count = 6,
): CardStatement[] {
  const out: CardStatement[] = []
  let close = currentCycleStart(card, today)
  for (let i = 0; i < count; i++) {
    out.push(statementFor(card, txns, base, close, today))
    close = addMonthsClamped(close, -1)
  }
  return out
}

/* ── Credit economics ────────────────────────────────────────────────── */

/** Minimum-due policy: 5% of the due with a 100-unit floor, capped at the due. */
export const MIN_DUE_RATE = 0.05
export const MIN_DUE_FLOOR = 100

export function minDueFor(due: number): number {
  if (due <= 0) return 0
  const raw = Math.max(due * MIN_DUE_RATE, Math.min(MIN_DUE_FLOOR, due))
  return Math.min(due, Math.round(raw))
}

export interface CardEconomics {
  minDue: number
  /** Estimated interest for carrying the current balance one month (APR/12). */
  carryInterestMonthly: number
  carryInterestDaily: number
  /** Interest-free days between statement close and the due date. */
  graceDays: number
  /** Cost of carrying the current balance a full year at APR. */
  annualInterest: number
}

export function cardEconomics(
  card: CreditCard,
  balance: number,
  today: string,
  statement?: CardStatement,
): CardEconomics {
  const close = statement?.close ?? currentCycleStart(card, today)
  const dueDate = statement?.dueDate ?? statementDueDate(card, close)
  return {
    minDue: minDueFor(statement ? statement.due : balance),
    carryInterestMonthly: (balance * card.interestRate) / 1200,
    carryInterestDaily: (balance * card.interestRate) / 36500,
    graceDays: Math.max(0, diffDays(dueDate, close)),
    annualInterest: (balance * card.interestRate) / 100,
  }
}

/* ── Monthly series ──────────────────────────────────────────────────── */

export interface CardMonthPoint {
  /** 'YYYY-MM'. */
  key: string
  /** 'SEP 2026'. */
  label: string
  spend: number
  payments: number
  fees: number
  rewards: number
}

/** Per-month spend/payments/fees/rewards for the trailing `months` months. */
export function monthlyCardSeries(
  txns: CardTransaction[],
  base: string,
  today: string,
  months = 12,
  cardId?: string,
): CardMonthPoint[] {
  const rows = cardId ? txns.filter((t) => t.cardId === cardId) : txns
  const byKey = new Map<string, CardMonthPoint>()
  const keys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const key = monthKey(addMonthsClamped(today, -i))
    keys.push(key)
    byKey.set(key, { key, label: monthKeyLabel(key), spend: 0, payments: 0, fees: 0, rewards: 0 })
  }
  for (const t of rows) {
    const point = byKey.get(monthKey(t.date))
    if (!point) continue
    const amt = convert(t.amount, t.currency, base)
    if (t.type === 'purchase') point.spend += amt
    else if (t.type === 'fee' || t.type === 'interest') {
      point.fees += amt
      point.spend += amt
    } else if (t.type === 'payment') point.payments += amt
    if (t.type !== 'payment') point.rewards += t.rewards
  }
  return keys.map((key) => byKey.get(key) as CardMonthPoint)
}

/* ── Rewards analytics ───────────────────────────────────────────────── */

export interface RewardsAnalytics {
  /** Points earned all-time (non-payment transactions). */
  total: number
  /** Purchase volume the points were earned on (base currency). */
  spend: number
  /** Points per 100 units spent. */
  rate: number
  topCategory: { category: SpendCategory; points: number } | null
  /** Points per month, most recent last. */
  byMonth: { key: string; label: string; points: number }[]
}

export function rewardsAnalytics(
  txns: CardTransaction[],
  base: string,
  today: string,
  cardId?: string,
): RewardsAnalytics {
  const rows = cardId ? txns.filter((t) => t.cardId === cardId) : txns
  const earning = rows.filter((t) => t.type !== 'payment')
  const total = earning.reduce((s, t) => s + t.rewards, 0)
  const spend = earning
    .filter((t) => t.type === 'purchase' || t.type === 'fee' || t.type === 'interest')
    .reduce((s, t) => s + convert(t.amount, t.currency, base), 0)

  const catMap = new Map<SpendCategory, number>()
  for (const t of earning) {
    if (!t.rewards) continue
    catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.rewards)
  }
  const topCategory =
    [...catMap.entries()].sort((a, b) => b[1] - a[1])[0] ?? null

  const byMonth: { key: string; label: string; points: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const key = monthKey(addMonthsClamped(today, -i))
    const points = earning
      .filter((t) => monthKey(t.date) === key)
      .reduce((s, t) => s + t.rewards, 0)
    byMonth.push({ key, label: monthKeyShortSafe(key), points })
  }

  return {
    total,
    spend,
    rate: spend > 0 ? total / (spend / 100) : 0,
    topCategory: topCategory ? { category: topCategory[0], points: topCategory[1] } : null,
    byMonth,
  }
}

function monthKeyShortSafe(key: string): string {
  return monthKeyLabel(key).split(' ')[0]
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
  /** Last closed statement (derived, not stored). */
  statement: CardStatement
  /** Minimum due on the outstanding statement (5%, floor 100, capped at due). */
  minDue: number
  /** Estimated interest for carrying the current balance one month. */
  carryInterest: number
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

  // Last closed statement — full derivation, replaces the old one-line sum
  const statement = statementFor(card, txns, base, cycleStart, today)

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
    statement,
    minDue: minDueFor(statement.due > 0 ? statement.due : balance),
    carryInterest: (balance * card.interestRate) / 1200,
    lastStatementSpend: statement.spend,
    lastStatementDue: statement.due,
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
  nextDue: { card: CreditCard; date: string; days: number; balance: number; minDue: number } | null
  /** Aggregate current-cycle spend across cards. */
  cycleSpendTotal: number
  cyclePaymentsTotal: number
  totalRewards: number
  /** Rewards analytics (rate, top category, monthly points). */
  rewards: RewardsAnalytics
  /** All-time fees + interest charged across cards (base currency). */
  totalFees: number
  /** Estimated monthly interest if every active balance is carried. */
  carryInterestMonthly: number
  /** Share of settleable statements (last 6 per card) paid in full; null when none. */
  statementCompliance: number | null
  /** 12-month spend/payments/fees/rewards across all cards. */
  monthlySeries: CardMonthPoint[]
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
    .map((v) => ({ card: v.card, date: v.dueDate, days: v.daysToDue, balance: v.balance, minDue: v.minDue }))
    .sort((a, b) => a.days - b.days)
  const nextDue = dues[0] ?? null

  const cycleSpendTotal = activeViews.reduce((s, v) => s + v.cycleSpend, 0)
  const cyclePaymentsTotal = activeViews.reduce((s, v) => s + v.cyclePayments, 0)
  const totalRewards = views.reduce((s, v) => s + v.totalRewards, 0)
  const rewards = rewardsAnalytics(txns, base, today)

  const totalFees = txns
    .filter((t) => t.type === 'fee' || t.type === 'interest')
    .reduce((s, t) => s + convert(t.amount, t.currency, base), 0)
  const carryInterestMonthly = activeViews.reduce((s, v) => s + v.carryInterest, 0)

  // Statement compliance across the last 6 closed statements per active card
  let settleable = 0
  let settled = 0
  for (const view of activeViews) {
    const history = statementHistory(view.card, txns, base, today, 6)
    for (const st of history) {
      if (st.status === 'current' || st.status === 'empty' || st.due <= 0.005) continue
      settleable += 1
      if (st.status === 'paid') settled += 1
    }
  }
  const statementCompliance = settleable > 0 ? settled / settleable : null

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
    rewards,
    totalFees,
    carryInterestMonthly,
    statementCompliance,
    monthlySeries: monthlyCardSeries(txns, base, today, 12),
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

  // Overdue statements — due date passed with the balance unsettled
  const overdue = summary.activeViews.find(
    (v) =>
      (v.statement.status === 'unpaid' || v.statement.status === 'partial') &&
      v.statement.dueDate < summary.today &&
      v.statement.due > 0.005,
  )
  if (overdue) {
    notes.push({
      id: 'statement-overdue',
      label: 'STATEMENT OVERDUE',
      signal: 'red',
      text: `${overdue.card.name} ··${overdue.card.last4} — ${formatMoney(overdue.statement.due, summary.base)} of the ${overdue.statement.label} statement is unpaid since ${formatSignalDate(overdue.statement.dueDate)}.`,
    })
  }

  // Minimum due reminder for the nearest payment
  const dueView = summary.nextDue
    ? summary.activeViews.find((v) => v.card.id === summary.nextDue?.card.id)
    : undefined
  if (dueView && dueView.minDue > 0 && dueView.daysToDue <= 7) {
    notes.push({
      id: 'min-due',
      label: 'MINIMUM DUE',
      signal: 'orange',
      text: `Paying ${formatMoney(dueView.minDue, summary.base)} keeps the account current; paying ${formatMoney(dueView.statement.due, summary.base)} avoids interest entirely.`,
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

  // Cost of carrying balances at APR
  if (summary.carryInterestMonthly > 0) {
    notes.push({
      id: 'carry',
      label: 'COST OF CARRY',
      signal: summary.carryInterestMonthly > 500 ? 'red' : 'magenta',
      text: `Carrying the current balances costs about ${formatMoney(summary.carryInterestMonthly, summary.base)}/month in interest at the cards' APRs.`,
    })
  }

  // Rewards velocity
  if (summary.rewards.rate >= 2 && summary.rewards.total > 0) {
    notes.push({
      id: 'rewards-rate',
      label: 'REWARDS VELOCITY',
      signal: 'magenta',
      text: `${summary.rewards.rate.toFixed(1)} pts per ${formatMoney(100, summary.base)} spent — ${summary.rewards.topCategory ? `${SPEND_CATEGORY_META[summary.rewards.topCategory.category].label} leads the earn` : 'spread across categories'}.`,
    })
  }

  return notes.slice(0, 6)
}