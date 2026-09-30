/**
 * SPENDSTATE // SEED DATA
 *
 * Seventeen realistic Indian processes (15 active, 1 suspended, 1 terminated)
 * with pricing people actually pay, staggered ages and a derived payment
 * ledger. The first run should look like a system that has been monitoring for
 * months — because history is reconstructed from each process's own cycle
 * anchor, the seeded ledger is internally consistent, not decorative noise.
 */
import type { BillingCycle, Payment, ProcessStatus, Subscription } from './types'
import { CATALOG_BY_ID } from './catalog'
import { addDaysISO, addMonthsClamped, todayISO } from './date'
import { occurrencesBetween } from './cycle'
import { newId } from './id'

interface SeedSpec {
  serviceId: string
  /** Days from today until the next charge. Spread so the matrix looks alive. */
  offsetDays: number
  /** How many months ago the process was initialized. */
  monthsBack: number
  price?: number
  cycle?: BillingCycle
  status?: ProcessStatus
  /** Days ago the status changed (suspended / terminated). */
  statusChangedDaysAgo?: number
  lastUsedDaysAgo?: number
  notes?: string
}

export const SEED_SPECS: SeedSpec[] = [
  {
    serviceId: 'netflix',
    offsetDays: 4,
    monthsBack: 26,
    lastUsedDaysAgo: 1,
    notes: 'Standard tier. Shared with family — 4 screens.',
  },
  {
    serviceId: 'spotify',
    offsetDays: 9,
    monthsBack: 22,
    lastUsedDaysAgo: 0,
    notes: 'Individual plan. Student discount expired last year.',
  },
  {
    serviceId: 'youtube-premium',
    offsetDays: 12,
    monthsBack: 30,
    lastUsedDaysAgo: 1,
    notes: 'Includes YouTube Music. Main music source on Android.',
  },
  {
    serviceId: 'amazon-prime',
    offsetDays: 26,
    monthsBack: 18,
    lastUsedDaysAgo: 3,
    notes: 'Annual. Renews before the sale season — keep it.',
  },
  { serviceId: 'disney-hotstar', offsetDays: 17, monthsBack: 14, lastUsedDaysAgo: 9 },
  { serviceId: 'apple-music', offsetDays: 21, monthsBack: 24, lastUsedDaysAgo: 6 },
  {
    serviceId: 'icloud-plus',
    offsetDays: 2,
    monthsBack: 20,
    lastUsedDaysAgo: 0,
    notes: '200 GB tier — needed for device backups.',
  },
  { serviceId: 'google-one', offsetDays: 7, monthsBack: 12, lastUsedDaysAgo: 2 },
  {
    serviceId: 'github',
    offsetDays: 14,
    monthsBack: 16,
    lastUsedDaysAgo: 0,
    notes: 'Pro. Copilot billed separately on the same account.',
  },
  {
    serviceId: 'chatgpt',
    offsetDays: 19,
    monthsBack: 8,
    lastUsedDaysAgo: 0,
    notes: 'Plus. Heaviest single line item in the burn.',
  },
  { serviceId: 'notion', offsetDays: 23, monthsBack: 10, lastUsedDaysAgo: 4 },
  {
    serviceId: 'adobe',
    offsetDays: 28,
    monthsBack: 6,
    lastUsedDaysAgo: 2,
    notes: 'Photography plan — Lightroom + Photoshop only.',
  },
  { serviceId: 'canva', offsetDays: 11, monthsBack: 4, lastUsedDaysAgo: 26 },
  {
    serviceId: 'coursera-plus',
    offsetDays: 6,
    monthsBack: 3,
    lastUsedDaysAgo: 41,
    notes: 'Annual course access. Watch usage before the next renewal.',
  },
  { serviceId: 'figma', offsetDays: 16, monthsBack: 2, lastUsedDaysAgo: 1 },
  {
    serviceId: 'cult-fit',
    offsetDays: 8,
    monthsBack: 12,
    status: 'suspended',
    statusChangedDaysAgo: 38,
    lastUsedDaysAgo: 52,
    notes: 'Suspended while travelling. Decide before restarting the cycle.',
  },
  {
    serviceId: 'dropbox',
    offsetDays: 20,
    monthsBack: 20,
    status: 'terminated',
    statusChangedDaysAgo: 62,
    lastUsedDaysAgo: 74,
    notes: 'Terminated — migrated everything to Google One.',
  },
]

export interface SeedResult {
  subscriptions: Subscription[]
  payments: Payment[]
}

/** Build a complete, internally consistent dataset for a given day. */
export function buildSeed(today: string = todayISO()): SeedResult {
  const subscriptions: Subscription[] = []
  const payments: Payment[] = []

  for (const spec of SEED_SPECS) {
    const service = CATALOG_BY_ID.get(spec.serviceId)
    if (!service) continue

    const nextBillingDate = addDaysISO(today, spec.offsetDays)
    const createdAt = addMonthsClamped(nextBillingDate, -spec.monthsBack)
    const status: ProcessStatus = spec.status ?? 'active'
    const statusChangedAt =
      spec.statusChangedDaysAgo !== undefined
        ? addDaysISO(today, -spec.statusChangedDaysAgo)
        : undefined

    const id = newId()
    const sub: Subscription = {
      id,
      serviceId: service.id,
      name: service.name,
      price: spec.price ?? service.price,
      currency: 'INR',
      billingCycle: spec.cycle ?? service.cycle,
      nextBillingDate,
      category: service.category,
      icon: service.glyph,
      color: service.color,
      notes: spec.notes ?? '',
      status,
      createdAt,
      updatedAt: `${today}T09:14:00`,
      statusChangedAt,
      lastUsedAt:
        spec.lastUsedDaysAgo !== undefined ? addDaysISO(today, -spec.lastUsedDaysAgo) : undefined,
      cyclesExecuted: 0,
    }

    // History is reconstructed from the cycle anchor, capped at the day the
    // process stopped running: a terminated process must not keep charging.
    const historyEnd = statusChangedAt && statusChangedAt < today ? statusChangedAt : today
    const executed = occurrencesBetween(sub, createdAt, historyEnd)
    sub.cyclesExecuted = executed.length

    for (const date of executed) {
      payments.push({
        id: newId(),
        subId: id,
        name: sub.name,
        icon: sub.icon,
        color: sub.color,
        category: sub.category,
        date,
        amount: sub.price,
        currency: sub.currency,
        origin: 'derived',
      })
    }

    subscriptions.push(sub)
  }

  return { subscriptions, payments }
}

/**
 * Daily-spends demo seed. A plausible month of Indian day-to-day spend across
 * three weeks before today — groceries, transport, food delivery, a couple of
 * discretionary purchases and utilities — so the Spends cockpit is alive on
 * first boot the same way the subscription ledger is.
 */
import type { Spend, SpendCategory, SpendMethod } from './types'

interface SpendSeedSpec {
  /** Days ago the expense happened. */
  daysAgo: number
  title: string
  amount: number
  category: SpendCategory
  method: SpendMethod
  notes?: string
}

export const SPEND_SEED_SPECS: SpendSeedSpec[] = [
  { daysAgo: 0, title: 'Zomato — dinner', amount: 389, category: 'food', method: 'upi' },
  { daysAgo: 0, title: 'Metro card top-up', amount: 200, category: 'transport', method: 'wallet' },
  { daysAgo: 1, title: 'BigBasket — weekly groceries', amount: 1245, category: 'groceries', method: 'card' },
  { daysAgo: 1, title: 'Swiggy — lunch', amount: 214, category: 'food', method: 'upi' },
  { daysAgo: 2, title: 'Amazon — desk lamp', amount: 1499, category: 'shopping', method: 'netbanking' },
  { daysAgo: 2, title: 'Petrol', amount: 900, category: 'transport', method: 'card' },
  { daysAgo: 3, title: 'Electricity bill', amount: 1180, category: 'utilities', method: 'netbanking' },
  { daysAgo: 3, title: 'Pharmacy — vitamins', amount: 465, category: 'health', method: 'upi' },
  { daysAgo: 4, title: 'BookMyShow — movie', amount: 540, category: 'entertainment', method: 'card' },
  { daysAgo: 4, title: 'Cafe — coffee + pastry', amount: 326, category: 'food', method: 'cash' },
  { daysAgo: 5, title: 'Railways — weekend ticket', amount: 1230, category: 'travel', method: 'upi' },
  { daysAgo: 5, title: 'Salon — haircut', amount: 499, category: 'personal', method: 'cash' },
  { daysAgo: 6, title: 'DMart — household staples', amount: 892, category: 'groceries', method: 'card' },
  { daysAgo: 6, title: 'Recharge — mobile plan', amount: 349, category: 'utilities', method: 'upi' },
  { daysAgo: 7, title: "Domino's — dinner", amount: 445, category: 'food', method: 'upi' },
  { daysAgo: 8, title: 'Auto fares', amount: 180, category: 'transport', method: 'cash' },
  { daysAgo: 9, title: 'Myntra — T-shirt', amount: 899, category: 'shopping', method: 'card' },
  { daysAgo: 10, title: 'BigBasket — groceries', amount: 1380, category: 'groceries', method: 'upi' },
  { daysAgo: 11, title: "Netflix won't do — cinema", amount: 620, category: 'entertainment', method: 'card' },
  { daysAgo: 12, title: 'Udemy — course', amount: 899, category: 'education', method: 'netbanking' },
  { daysAgo: 13, title: 'Swiggy — lunch', amount: 268, category: 'food', method: 'upi' },
  { daysAgo: 14, title: 'Gym membership — week pass', amount: 700, category: 'health', method: 'upi' },
  { daysAgo: 15, title: 'Diesel', amount: 1000, category: 'transport', method: 'card' },
  { daysAgo: 16, title: 'Amazon — headphones', amount: 2299, category: 'shopping', method: 'netbanking' },
  { daysAgo: 17, title: 'Gas cylinder', amount: 1050, category: 'utilities', method: 'cash' },
  { daysAgo: 18, title: 'Zomato — weekend feast', amount: 512, category: 'food', method: 'upi' },
  { daysAgo: 19, title: 'Blinkit — snacks', amount: 320, category: 'groceries', method: 'upi' },
  { daysAgo: 20, title: 'IMAX — movie', amount: 720, category: 'entertainment', method: 'card' },
]

/** Week start (Monday) of `today` in ISO form, used to stress the limiter. */
export function buildSpendSeed(today: string): Spend[] {
  const rows: Spend[] = []
  for (const spec of SPEND_SEED_SPECS) {
    rows.push({
      id: `seed-spend-${rows.length}-${spec.daysAgo}`,
      title: spec.title,
      amount: spec.amount,
      currency: 'INR',
      category: spec.category,
      method: spec.method,
      date: addDaysISO(today, -spec.daysAgo),
      notes: spec.notes ?? '',
      createdAt: `${addDaysISO(today, -spec.daysAgo)}T${String(12 + (spec.daysAgo % 9)).padStart(2, '0')}:0${spec.daysAgo % 10}:00`,
      updatedAt: `${addDaysISO(today, -spec.daysAgo)}T${String(12 + (spec.daysAgo % 9)).padStart(2, '0')}:0${spec.daysAgo % 10}:00`,
    })
  }
  return rows
}
