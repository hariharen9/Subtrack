/**
 * SUBTRACK // LOCAL STORE (IndexedDB via Dexie)
 *
 * Local-first by construction: no backend, no auth, no remote database. The
 * app is fully functional offline and the data layer is written so a sync
 * engine could be attached later without changing a single view — every write
 * goes through the functions at the bottom of this file, never through the
 * tables directly.
 */
import Dexie, { type Table } from 'dexie'
import type { AppSettings, MetaRecord, Payment, ProcessStatus, Subscription } from './types'
import { buildSeed } from './seed'
import { occurrenceAt, occurrencesBetween } from './cycle'
import { nowStamp, todayISO } from './date'
import { newId } from './id'

export const DB_NAME = 'subtrack'

class SubTrackDB extends Dexie {
  subscriptions!: Table<Subscription, string>
  payments!: Table<Payment, string>
  meta!: Table<MetaRecord, string>

  constructor() {
    super(DB_NAME)
    this.version(1).stores({
      subscriptions: 'id, status, category, nextBillingDate, name, createdAt, updatedAt',
      payments: 'id, subId, date, [subId+date]',
      meta: 'key',
    })
  }
}

export const db = new SubTrackDB()

const META_SEEDED = 'seeded'
const META_SCHEMA = 'schema'

/* ------------------------------------------------------------------ boot --- */

let seedOnce: Promise<void> | null = null

/**
 * Idempotent boot: React StrictMode mounts effects twice in development and two
 * concurrent tabs can both open the volume, so seeding is guarded by a shared
 * promise *and* a marker row.
 */
export function ensureSeeded(): Promise<void> {
  if (!seedOnce) {
    seedOnce = (async () => {
      const marker = await db.meta.get(META_SEEDED)
      if (marker) return
      await seedDatabase()
    })()
  }
  return seedOnce
}

export async function seedDatabase(): Promise<void> {
  const today = todayISO()
  const { subscriptions, payments } = buildSeed(today)
  await db.transaction('rw', db.subscriptions, db.payments, db.meta, async () => {
    await db.subscriptions.bulkPut(subscriptions)
    await db.payments.bulkPut(payments)
    await db.meta.put({ key: META_SEEDED, value: nowStamp() })
    await db.meta.put({ key: META_SCHEMA, value: '1' })
  })
}

/* ------------------------------------------------------------------ reads --- */

export function listSubscriptions(): Promise<Subscription[]> {
  return db.subscriptions.toArray()
}

export function getSubscription(id: string): Promise<Subscription | undefined> {
  return db.subscriptions.get(id)
}

export function listPayments(): Promise<Payment[]> {
  return db.payments.toArray()
}

export function paymentsFor(subId: string): Promise<Payment[]> {
  return db.payments.where('subId').equals(subId).toArray()
}

/* ----------------------------------------------------------------- writes --- */

export interface SubscriptionDraft {
  name: string
  serviceId: string | null
  price: number
  currency: string
  billingCycle: Subscription['billingCycle']
  customIntervalDays?: number
  nextBillingDate: string
  category: Subscription['category']
  icon: string
  color: string
  notes: string
}

/** Initialize a process. History is reconstructed from the cycle anchor so a
 *  backdated entry still shows up in the spending signal. */
export async function createSubscription(draft: SubscriptionDraft): Promise<Subscription> {
  const today = todayISO()
  const now = nowStamp()
  const sub: Subscription = {
    id: newId(),
    serviceId: draft.serviceId,
    name: draft.name.trim(),
    price: draft.price,
    currency: draft.currency,
    billingCycle: draft.billingCycle,
    customIntervalDays:
      draft.billingCycle === 'custom' ? Math.max(1, draft.customIntervalDays ?? 30) : undefined,
    nextBillingDate: draft.nextBillingDate,
    category: draft.category,
    icon: draft.icon,
    color: draft.color,
    notes: draft.notes.trim(),
    status: 'active',
    createdAt: today,
    updatedAt: now,
    lastUsedAt: today,
    cyclesExecuted: 0,
  }

  // A process initialized with a past date has presumably already charged.
  const backfill = occurrencesBetween(sub, sub.createdAt, today)
  sub.cyclesExecuted = backfill.length

  const payments: Payment[] = backfill.map((date) => ({
    id: newId(),
    subId: sub.id,
    name: sub.name,
    icon: sub.icon,
    color: sub.color,
    category: sub.category,
    date,
    amount: sub.price,
    currency: sub.currency,
    origin: 'derived',
  }))

  await db.transaction('rw', db.subscriptions, db.payments, async () => {
    await db.subscriptions.add(sub)
    if (payments.length) await db.payments.bulkAdd(payments)
  })
  return sub
}

export async function updateSubscription(
  id: string,
  patch: Partial<SubscriptionDraft>,
  options: { rebuildHistory?: boolean } = {},
): Promise<void> {
  await db.transaction('rw', db.subscriptions, db.payments, async () => {
    const existing = await db.subscriptions.get(id)
    if (!existing) return

    const next: Subscription = {
      ...existing,
      ...patch,
      customIntervalDays:
        (patch.billingCycle ?? existing.billingCycle) === 'custom'
          ? Math.max(1, patch.customIntervalDays ?? existing.customIntervalDays ?? 30)
          : undefined,
      updatedAt: nowStamp(),
    }
    await db.subscriptions.put(next)

    const priceChanged = patch.price !== undefined && patch.price !== existing.price
    const currencyChanged = patch.currency !== undefined && patch.currency !== existing.currency
    if (priceChanged || currencyChanged || options.rebuildHistory) {
      const historyEnd =
        next.statusChangedAt && next.statusChangedAt < todayISO()
          ? next.statusChangedAt
          : todayISO()
      const dates = occurrencesBetween(next, next.createdAt, historyEnd)
      await db.payments.where('subId').equals(id).delete()
      const rows: Payment[] = dates.map((date) => ({
        id: newId(),
        subId: next.id,
        name: next.name,
        icon: next.icon,
        color: next.color,
        category: next.category,
        date,
        amount: next.price,
        currency: next.currency,
        origin: 'derived',
      }))
      if (rows.length) await db.payments.bulkAdd(rows)
      await db.subscriptions.update(id, { cyclesExecuted: rows.length })
    }
  })
}

export async function setProcessStatus(id: string, status: ProcessStatus): Promise<void> {
  const today = todayISO()
  await db.transaction('rw', db.subscriptions, async () => {
    await db.subscriptions.update(id, {
      status,
      statusChangedAt: status === 'active' ? undefined : today,
      updatedAt: nowStamp(),
    })
  })
}

/**
 * Execute the scheduled cycle by hand: records the charge, then advances the
 * anchor one interval. Used for "CONFIRM CYCLE" and for clearing overdue items.
 */
export async function executeCycle(id: string, date?: string): Promise<Payment | undefined> {
  const sub = await db.subscriptions.get(id)
  if (!sub) return undefined
  const paidOn = date ?? sub.nextBillingDate
  const payment: Payment = {
    id: newId(),
    subId: sub.id,
    name: sub.name,
    icon: sub.icon,
    color: sub.color,
    category: sub.category,
    date: paidOn,
    amount: sub.price,
    currency: sub.currency,
    origin: 'confirmed',
  }
  const advanced = occurrenceAt(sub, 1)
  const next = advanced > todayISO() ? advanced : rollForward(sub, todayISO()).date
  await db.transaction('rw', db.subscriptions, db.payments, async () => {
    await db.payments.add(payment)
    await db.subscriptions.update(id, {
      nextBillingDate: next,
      cyclesExecuted: sub.cyclesExecuted + 1,
      updatedAt: nowStamp(),
      lastUsedAt: todayISO(),
    })
  })
  return payment
}

/** Advance a stale anchor past `past`, keeping the original day-of-month. */
export function rollForward(sub: Subscription, past: string): { date: string; skipped: number } {
  let date = sub.nextBillingDate
  let skipped = 0
  let guard = 0
  while (date <= past && guard < 400) {
    date = occurrenceAt({ ...sub, nextBillingDate: date }, 1)
    skipped++
    guard++
  }
  return { date, skipped }
}

/** Explicit, user-triggered schedule repair (Settings → RECONCILE). */
export async function reconcileSchedules(): Promise<number> {
  const today = todayISO()
  const subs = await db.subscriptions.where('status').equals('active').toArray()
  let repaired = 0
  for (const sub of subs) {
    if (sub.nextBillingDate > today) continue
    const { date } = rollForward(sub, today)
    await db.subscriptions.update(sub.id, { nextBillingDate: date, updatedAt: nowStamp() })
    repaired++
  }
  return repaired
}

/** Record usage: powers the dormant-process observation. */
export async function markUsed(id: string): Promise<void> {
  await db.subscriptions.update(id, { lastUsedAt: todayISO(), updatedAt: nowStamp() })
}

/** Permanent removal. The UI calls this TERMINATE + PURGE and explains it. */
export async function purgeSubscription(id: string): Promise<void> {
  await db.transaction('rw', db.subscriptions, db.payments, async () => {
    await db.payments.where('subId').equals(id).delete()
    await db.subscriptions.delete(id)
  })
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', db.subscriptions, db.payments, db.meta, async () => {
    await db.subscriptions.clear()
    await db.payments.clear()
    await db.meta.clear()
  })
}

export async function resetToSeed(): Promise<void> {
  await wipeAll()
  await seedDatabase()
}

/* ------------------------------------------------------- portability ------ */

export interface Snapshot {
  app: 'subtrack'
  version: 1
  exportedAt: string
  settings: AppSettings
  subscriptions: Subscription[]
  payments: Payment[]
}

export async function exportSnapshot(settings: AppSettings): Promise<Snapshot> {
  const [subscriptions, payments] = await Promise.all([listSubscriptions(), listPayments()])
  return {
    app: 'subtrack',
    version: 1,
    exportedAt: nowStamp(),
    settings,
    subscriptions,
    payments,
  }
}

export interface ImportReport {
  subscriptions: number
  payments: number
  mode: 'replace' | 'merge'
}

export async function importSnapshot(
  snapshot: Snapshot,
  mode: 'replace' | 'merge' = 'replace',
): Promise<ImportReport> {
  if (snapshot.app !== 'subtrack' || !Array.isArray(snapshot.subscriptions)) {
    throw new Error('Not a SUBTRACK snapshot')
  }
  const subscriptions = snapshot.subscriptions
  const payments = Array.isArray(snapshot.payments) ? snapshot.payments : []

  await db.transaction('rw', db.subscriptions, db.payments, db.meta, async () => {
    if (mode === 'replace') {
      await db.subscriptions.clear()
      await db.payments.clear()
    }
    await db.subscriptions.bulkPut(subscriptions)
    if (payments.length) await db.payments.bulkPut(payments)
    await db.meta.put({ key: META_SEEDED, value: nowStamp() })
  })

  return { subscriptions: subscriptions.length, payments: payments.length, mode }
}

export type { Subscription, Payment, ProcessStatus }
