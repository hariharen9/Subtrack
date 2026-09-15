/**
 * SUBTRACK // CYCLE ENGINE
 *
 * The economics of a process: how often it charges, what that costs per month,
 * and every date it will fire. Occurrences are always computed as
 * anchor + k * interval (never stepped), so a monthly process anchored on the
 * 31st keeps charging on the 31st instead of drifting to the 28th.
 */
import type { BillingCycle, Subscription } from './types'
import { addDaysISO, addMonthsClamped, diffDays, formatSignalDate, monthKey } from './date'

/** Mean interval in days. Yearly uses the Gregorian mean, weekly the true 7. */
export const CYCLE_DAYS: Record<BillingCycle, number> = {
  weekly: 7,
  monthly: 30.4375,
  quarterly: 91.3125,
  yearly: 365.25,
  custom: 30,
}

export const CYCLES_PER_YEAR: Record<BillingCycle, number> = {
  weekly: 365.25 / 7,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
  custom: 365.25 / 30,
}

export function cyclesPerYear(cycle: BillingCycle, customDays?: number): number {
  if (cycle === 'custom') {
    const days = Math.max(1, customDays ?? 30)
    return 365.25 / days
  }
  return CYCLES_PER_YEAR[cycle]
}

export function stepDays(cycle: BillingCycle, customDays?: number): number {
  if (cycle === 'custom') return Math.max(1, customDays ?? 30)
  return CYCLE_DAYS[cycle]
}

/** The run-rate: what a process costs per calendar month. */
export function monthlyCost(price: number, cycle: BillingCycle, customDays?: number): number {
  return (price * cyclesPerYear(cycle, customDays)) / 12
}

export function annualCost(price: number, cycle: BillingCycle, customDays?: number): number {
  return price * cyclesPerYear(cycle, customDays)
}

/** k = 0 is the next scheduled charge; negative k walks into history. */
export function occurrenceAt(sub: Subscription, k: number): string {
  switch (sub.billingCycle) {
    case 'weekly':
      return addDaysISO(sub.nextBillingDate, 7 * k)
    case 'monthly':
      return addMonthsClamped(sub.nextBillingDate, k)
    case 'quarterly':
      return addMonthsClamped(sub.nextBillingDate, 3 * k)
    case 'yearly':
      return addMonthsClamped(sub.nextBillingDate, 12 * k)
    case 'custom':
      return addDaysISO(sub.nextBillingDate, stepDays('custom', sub.customIntervalDays) * k)
  }
}

const MAX_STEPS = 900

/** Every scheduled charge inside [from, to], ascending. */
export function occurrencesBetween(sub: Subscription, from: string, to: string): string[] {
  if (to < from) return []
  const step = stepDays(sub.billingCycle, sub.customIntervalDays)
  const kStart = Math.floor(diffDays(from, sub.nextBillingDate) / step) - 1
  const out: string[] = []
  for (let k = kStart; k < kStart + MAX_STEPS; k++) {
    const iso = occurrenceAt(sub, k)
    if (iso > to) break
    if (iso >= from) out.push(iso)
  }
  return out
}

/** Smallest scheduled charge strictly after `after`. */
export function nextOccurrence(sub: Subscription, after: string): string {
  const step = stepDays(sub.billingCycle, sub.customIntervalDays)
  const kStart = Math.max(0, Math.floor(diffDays(after, sub.nextBillingDate) / step) - 2)
  for (let k = kStart; k < kStart + 8; k++) {
    const iso = occurrenceAt(sub, k)
    if (iso > after) return iso
  }
  return sub.nextBillingDate
}

/** Charges per calendar month for a process, keyed 'YYYY-MM'. */
export function occurrencesByMonth(
  sub: Subscription,
  fromMonth: string,
  toMonth: string,
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  const dates = occurrencesBetween(sub, `${fromMonth}-01`, `${toMonth}-31`)
  for (const date of dates) {
    const key = monthKey(date)
    const bucket = map.get(key)
    if (bucket) bucket.push(date)
    else map.set(key, [date])
  }
  return map
}

/** 'PER MONTH' / 'PER YEAR' / 'PER 14 DAYS' — always readable, never obscure. */
export function cycleSuffix(cycle: BillingCycle, customDays?: number): string {
  switch (cycle) {
    case 'weekly':
      return '/ WEEK'
    case 'monthly':
      return '/ MONTH'
    case 'quarterly':
      return '/ QUARTER'
    case 'yearly':
      return '/ YEAR'
    case 'custom':
      return `/ ${customDays ?? 30} DAYS`
  }
}

export function cycleNoun(cycle: BillingCycle, customDays?: number): string {
  switch (cycle) {
    case 'weekly':
      return 'WEEKLY'
    case 'monthly':
      return 'MONTHLY'
    case 'quarterly':
      return 'QUARTERLY'
    case 'yearly':
      return 'YEARLY'
    case 'custom':
      return `EVERY ${customDays ?? 30} DAYS`
  }
}

/** '19 SEP 2026' — what the next-cycle stamp shows in the UI. */
export function cycleStamp(sub: Subscription): string {
  return formatSignalDate(sub.nextBillingDate)
}

/** Roughly how a process's cost compares with a 30-day month (for labels). */
export function cyclesPerMonth(cycle: BillingCycle, customDays?: number): number {
  return cyclesPerYear(cycle, customDays) / 12
}
