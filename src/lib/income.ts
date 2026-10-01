/**
 * SPENDSTATE // INCOME ANALYTICS
 *
 * Pure functions over (incomes, baseCurrency, today). Income is a *log* of
 * received payments — the mirror of the spend ledger — so everything here sums
 * recorded rows: this-month inflow, month-over-month delta, category mix and
 * the net-cashflow input the dashboard consumes.
 */
import type { Income, IncomeCategory } from './types'
import { INCOME_CATEGORY_META } from './types'
import { monthKey, shiftMonthKey, startOfMonthISO, todayISO } from './date'
import { convert, formatMoney, percentChange } from './money'

export function sumIncome(
  incomes: Income[],
  base: string,
  predicate: (income: Income) => boolean,
): number {
  let total = 0
  for (const income of incomes) {
    if (predicate(income)) total += convert(income.amount, income.currency, base)
  }
  return total
}

/** Total inflow logged in a given 'YYYY-MM' month. */
export function incomeFor(incomes: Income[], base: string, key: string): number {
  return sumIncome(incomes, base, (i) => monthKey(i.date) === key)
}

export interface IncomeCategorySlice {
  category: IncomeCategory
  label: string
  code: string
  signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
  amount: number
  count: number
  share: number
}

export function incomeCategorySlices(
  incomes: Income[],
  base: string,
  month: string,
): IncomeCategorySlice[] {
  const map = new Map<IncomeCategory, { amount: number; count: number }>()
  for (const income of incomes) {
    if (monthKey(income.date) !== month) continue
    const bucket = map.get(income.category) ?? { amount: 0, count: 0 }
    bucket.amount += convert(income.amount, income.currency, base)
    bucket.count += 1
    map.set(income.category, bucket)
  }
  const total = [...map.values()].reduce((sum, b) => sum + b.amount, 0)
  return [...map.entries()]
    .map(([category, bucket]) => {
      const meta = INCOME_CATEGORY_META[category]
      return {
        category,
        label: meta.label,
        code: meta.code,
        signal: meta.signal,
        amount: bucket.amount,
        count: bucket.count,
        share: total > 0 ? bucket.amount / total : 0,
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

export interface IncomeNote {
  id: string
  label: string
  text: string
  signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
}

export interface IncomeSummary {
  base: string
  today: string
  monthKey: string
  monthTotal: number
  prevMonthTotal: number
  monthDelta: number
  countMonth: number
  yearTotal: number
  total: number
  count: number
  avgPerEntry: number
  categories: IncomeCategorySlice[]
  recent: Income[]
  notes: IncomeNote[]
}

export function summarizeIncome(
  incomes: Income[],
  base: string,
  today: string = todayISO(),
): IncomeSummary {
  // Ignore malformed rows (e.g. records from an earlier data shape) so the
  // cockpit never crashes on stray local data.
  const rows = incomes.filter((i) => typeof i.date === 'string' && i.date.length >= 10)
  incomes = rows

  const thisMonth = monthKey(today)
  const prevMonth = shiftMonthKey(thisMonth, -1)
  const year = thisMonth.slice(0, 4)

  const monthEntries = incomes.filter((i) => monthKey(i.date) === thisMonth)
  const monthTotal = sumIncome(incomes, base, (i) => monthKey(i.date) === thisMonth)
  const prevMonthTotal = sumIncome(incomes, base, (i) => monthKey(i.date) === prevMonth)
  const yearTotal = sumIncome(incomes, base, (i) => monthKey(i.date).startsWith(year))
  const total = sumIncome(incomes, base, () => true)
  const count = incomes.length

  const recent = [...incomes]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 8)

  const summary: IncomeSummary = {
    base,
    today,
    monthKey: thisMonth,
    monthTotal,
    prevMonthTotal,
    monthDelta: percentChange(monthTotal, prevMonthTotal),
    countMonth: monthEntries.length,
    yearTotal,
    total,
    count,
    avgPerEntry: count > 0 ? total / count : 0,
    categories: incomeCategorySlices(incomes, base, thisMonth),
    recent,
    notes: [],
  }
  summary.notes = buildIncomeNotes(summary)
  return summary
}

function buildIncomeNotes(summary: IncomeSummary): IncomeNote[] {
  const notes: IncomeNote[] = []
  if (summary.count === 0) return notes

  if (summary.monthTotal === 0) {
    notes.push({
      id: 'none',
      label: 'NO INFLOW THIS MONTH',
      signal: 'orange',
      text: 'Nothing logged yet this cycle — log your salary or any receipt to compute net cashflow.',
    })
  } else if (summary.prevMonthTotal > 0 && Math.abs(summary.monthDelta) >= 15) {
    const up = summary.monthDelta > 0
    notes.push({
      id: 'delta',
      label: up ? 'INFLOW RISING' : 'INFLOW COOLING',
      signal: up ? 'acid' : 'blue',
      text: `This cycle is ${up ? 'up' : 'down'} ${Math.abs(summary.monthDelta).toFixed(0)}% vs last (${formatMoney(summary.monthTotal, summary.base)}).`,
    })
  }

  const top = summary.categories[0]
  if (top && top.share >= 0.6 && summary.categories.length > 1) {
    notes.push({
      id: 'lean',
      label: 'INCOME LEAN',
      signal: 'magenta',
      text: `${top.label} is ${(top.share * 100).toFixed(0)}% of this month's inflow.`,
    })
  }

  if (summary.count > 0) {
    notes.push({
      id: 'avg',
      label: 'AVG RECEIPT',
      signal: 'acid',
      text: `${formatMoney(summary.avgPerEntry, summary.base)} average across ${summary.count} logged entr${summary.count === 1 ? 'y' : 'ies'} (${formatMoney(summary.total, summary.base)} lifetime).`,
    })
  }

  return notes.slice(0, 3)
}

/** Income rows grouped by ISO date, newest first — the ledger's raw material. */
export function incomeLedger(incomes: Income[]): { date: string; incomes: Income[] }[] {
  const grouped = new Map<string, Income[]>()
  for (const income of incomes) {
    if (typeof income.date !== 'string') continue
    const bucket = grouped.get(income.date) ?? []
    bucket.push(income)
    grouped.set(income.date, bucket)
  }
  return [...grouped.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, dayIncomes]) => ({ date, incomes: dayIncomes }))
}

/** First day of the current month — handy for "this cycle" windows. */
export function currentMonthStart(today: string = todayISO()): string {
  return startOfMonthISO(today)
}
