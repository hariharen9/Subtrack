/**
 * SUBTRACK // QUERY ENGINE
 *
 * Global search behaves like a system query, not a text filter: terms can be a
 * name, a category, a cycle, a status, an amount (`>500`, `<200`, `649`) or a
 * month (`sep`, `2026-09`, `19/09`). Every term must match, so queries narrow.
 */
import type { BillingCycle, Category, ProcessStatus, Subscription } from './types'
import { CATEGORY_LABEL } from './types'
import { MONTHS, formatSignalDate, parseISO } from './date'
import { cycleNoun } from './cycle'
import { formatMoney } from './money'
import { pidOf } from './id'

const CYCLES: BillingCycle[] = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom']
const STATUSES: ProcessStatus[] = ['active', 'suspended', 'terminated']

export interface QueryIntent {
  raw: string
  terms: string[]
  amount?: { op: '>' | '<' | '='; value: number }
  cycles: BillingCycle[]
  categories: Category[]
  statuses: ProcessStatus[]
  months: string[]
  days: number[]
  years: number[]
}

function toMonthIndex(word: string): number | null {
  const upper = word.slice(0, 3).toUpperCase()
  const idx = MONTHS.indexOf(upper as (typeof MONTHS)[number])
  return idx >= 0 ? idx + 1 : null
}

export function parseQuery(raw: string): QueryIntent {
  const intent: QueryIntent = {
    raw,
    terms: [],
    cycles: [],
    categories: [],
    statuses: [],
    months: [],
    days: [],
    years: [],
  }

  for (const token of raw.trim().toLowerCase().split(/\s+/).filter(Boolean)) {
    const amount = token.match(/^(>=|<=|>|<|=)?(\d+(?:\.\d+)?)$/)
    if (amount) {
      const raw = amount[1] ?? '='
      const op: '>' | '<' | '=' = raw.startsWith('>') ? '>' : raw.startsWith('<') ? '<' : '='
      intent.amount = { op, value: Number(amount[2]) }
      continue
    }

    if (token.startsWith('>') || token.startsWith('<')) {
      const value = Number(token.slice(1))
      if (!Number.isNaN(value)) {
        intent.amount = { op: token[0] as '>' | '<', value }
        continue
      }
    }

    const monthKey = token.match(/^(\d{4})-(\d{2})$/)
    if (monthKey) {
      intent.months.push(token)
      intent.years.push(Number(monthKey[1]))
      continue
    }

    const slashDate = token.match(/^(\d{1,2})[/.](\d{1,2})$/)
    if (slashDate) {
      intent.days.push(Number(slashDate[1]))
      intent.months.push(`-${slashDate[2].padStart(2, '0')}`) // partial month key
      continue
    }

    if ((CYCLES as string[]).includes(token) || token === 'mo' || token === 'yr' || token === 'wk') {
      const normalized: BillingCycle =
        token === 'mo' ? 'monthly' : token === 'yr' ? 'yearly' : token === 'wk' ? 'weekly' : (token as BillingCycle)
      intent.cycles.push(normalized)
      continue
    }

    if ((STATUSES as string[]).includes(token) || token === 'on' || token === 'off') {
      intent.statuses.push(token === 'on' ? 'active' : token === 'off' ? 'terminated' : (token as ProcessStatus))
      continue
    }

    const month = toMonthIndex(token)
    if (month && token.length >= 3) {
      intent.months.push(`-${String(month).padStart(2, '0')}`)
      continue
    }

    const category = (Object.keys(CATEGORY_LABEL) as Category[]).find(
      (c) => c.startsWith(token) && token.length >= 3,
    )
    if (category) {
      intent.categories.push(category)
      continue
    }

    if (/^\d{4}$/.test(token)) {
      intent.years.push(Number(token))
      continue
    }

    intent.terms.push(token)
  }

  return intent
}

/** 0 = no match. Higher is better. Subsequence matching keeps typos useful. */
export function fuzzyScore(text: string, term: string): number {
  if (!term) return 0
  const haystack = text.toLowerCase()
  if (haystack === term) return 100
  if (haystack.startsWith(term)) return 86
  const idx = haystack.indexOf(term)
  if (idx >= 0) return 72 - Math.min(idx, 24)
  let ti = 0
  let streak = 0
  let best = 0
  for (let i = 0; i < haystack.length && ti < term.length; i++) {
    if (haystack[i] === term[ti]) {
      ti++
      streak++
      best = Math.max(best, streak)
    } else {
      streak = 0
    }
  }
  if (ti === term.length) return 26 + Math.min(best, 8)
  return 0
}

export interface SearchHit {
  sub: Subscription
  score: number
  /** Which fields produced the match — surfaced as a technical annotation. */
  via: string[]
}

function searchableText(sub: Subscription, base: string): { field: string; text: string }[] {
  return [
    { field: 'NAME', text: sub.name },
    { field: 'CAT', text: CATEGORY_LABEL[sub.category] },
    { field: 'CYCLE', text: cycleNoun(sub.billingCycle, sub.customIntervalDays) },
    { field: 'AMOUNT', text: formatMoney(sub.price, sub.currency).replace(/[^\d.]/g, '') },
    { field: 'AMOUNT', text: String(sub.price) },
    { field: 'NEXT', text: formatSignalDate(sub.nextBillingDate) },
    { field: 'NEXT', text: sub.nextBillingDate },
    { field: 'PID', text: pidOf(sub.id) },
    { field: 'NOTES', text: sub.notes ?? '' },
    { field: 'STATUS', text: sub.status },
    { field: 'CCY', text: sub.currency },
    { field: 'BASE', text: String(base) },
  ]
}

export function searchSubscriptions(
  subs: Subscription[],
  raw: string,
  base: string,
): SearchHit[] {
  const intent = parseQuery(raw)

  const hits: SearchHit[] = []
  for (const sub of subs) {
    // Hard filters first — a query that excludes must not be scored softly.
    if (intent.cycles.length && !intent.cycles.includes(sub.billingCycle)) continue
    if (intent.categories.length && !intent.categories.includes(sub.category)) continue
    if (intent.statuses.length && !intent.statuses.includes(sub.status)) continue

    const day = parseISO(sub.nextBillingDate).d
    const monthKey = sub.nextBillingDate.slice(0, 7)

    if (intent.amount) {
      const { op, value } = intent.amount
      if (op === '>' && !(sub.price > value)) continue
      if (op === '<' && !(sub.price < value)) continue
      if (op === '=' && Math.abs(sub.price - value) > 0.5) continue
    }

    if (intent.months.length) {
      const ok = intent.months.some((m) =>
        m.startsWith('-') ? monthKey.endsWith(m) : monthKey === m,
      )
      if (!ok) continue
    }

    if (intent.days.length && !intent.days.includes(day)) continue
    if (intent.years.length && !intent.years.includes(parseISO(sub.nextBillingDate).y)) continue

    let total = 0
    let matchedAll = true
    const via = new Set<string>()

    for (const term of intent.terms) {
      let best = 0
      let bestField = ''
      for (const { field, text } of searchableText(sub, base)) {
        const score = fuzzyScore(text, term)
        if (score > best) {
          best = score
          bestField = field
        }
      }
      if (best === 0) {
        matchedAll = false
        break
      }
      total += best
      via.add(bestField)
    }

    if (!matchedAll) continue
    // A pure filter query (no free terms) still returns everything it selects.
    hits.push({ sub, score: intent.terms.length ? total : 1, via: [...via] })
  }

  return hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.sub.name.localeCompare(b.sub.name)
  })
}
