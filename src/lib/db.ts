/**
 * SPENDSTATE // LOCAL STORE (IndexedDB via Dexie)
 *
 * Local-first by construction: no backend, no auth, no remote database. The
 * app is fully functional offline and the data layer is written so a sync
 * engine could be attached later without changing a single view — every write
 * goes through the functions at the bottom of this file, never through the
 * tables directly.
 */
import Dexie, { type Table } from 'dexie'
import type {
  AppSettings,
  MetaRecord,
  Payment,
  ProcessStatus,
  Spend,
  SpendCategory,
  SpendMethod,
  Subscription,
  WeeklySpendLimit,
  Loan,
  LoanPayment,
  LoanType,
  LoanStatus,
  CreditCard,
  CardTransaction,
  CardTxnType,
  Income,
  IncomeCategory,
  Account,
  AccountStatus,
  AccountType,
  Transfer,
} from './types'
import { buildSeed, buildSpendSeed } from './seed'
import { occurrenceAt, occurrencesBetween } from './cycle'
import { nowStamp, todayISO } from './date'
import { newId } from './id'

export const DB_NAME = 'spendstate'

/** Newest Dexie schema version declared below — surfaced in the System Host. */
export const DB_SCHEMA_VERSION = 6

class SpendStateDB extends Dexie {
  subscriptions!: Table<Subscription, string>
  payments!: Table<Payment, string>
  spends!: Table<Spend, string>
  loans!: Table<Loan, string>
  loanPayments!: Table<LoanPayment, string>
  creditCards!: Table<CreditCard, string>
  cardTransactions!: Table<CardTransaction, string>
  incomes!: Table<Income, string>
  accounts!: Table<Account, string>
  transfers!: Table<Transfer, string>
  meta!: Table<MetaRecord, string>

  constructor() {
    super(DB_NAME)
    this.version(1).stores({
      subscriptions: 'id, status, category, nextBillingDate, name, createdAt, updatedAt',
      payments: 'id, subId, date, [subId+date]',
      meta: 'key',
    })
    this.version(2).stores({
      spends: 'id, date, category, method, createdAt, updatedAt, [date+category]',
    })
    this.version(3).stores({
      loans: 'id, status, loanType, lender, startDate, name, createdAt, updatedAt',
      loanPayments: 'id, loanId, date, emiNumber, [loanId+date]',
    })
    this.version(4).stores({
      creditCards: 'id, status, issuer, network, name, createdAt, updatedAt',
      cardTransactions: 'id, cardId, date, type, category, [cardId+date]',
    })
    this.version(5).stores({
      incomes: 'id, date, category, method, createdAt, updatedAt, [date+category]',
    })
    this.version(6).stores({
      accounts: 'id, type, status, currency, name, createdAt, updatedAt',
      transfers: 'id, fromAccountId, toAccountId, date',
    })
  }
}

export const db = new SpendStateDB()

const META_SEEDED = 'seeded'
const META_SCHEMA = 'schema'
const META_SPENDS_SEEDED = 'spends.seeded'
const META_DEBT_SEEDED = 'debt.seeded'
const META_CARDS_SEEDED = 'cards.seeded'
const META_INCOME_SEEDED = 'income.seeded'
const META_ACCOUNTS_SEEDED = 'accounts.seeded'

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

let spendsSeedOnce: Promise<void> | null = null

/**
 * Seeds the daily-spends demo on first boot, independent of the subscription
 * marker so existing installs still get an explorable /spends cockpit.
 */
export function ensureSpendsSeeded(): Promise<void> {
  if (!spendsSeedOnce) {
    spendsSeedOnce = (async () => {
      const marker = await db.meta.get(META_SPENDS_SEEDED)
      if (marker) return
      const today = todayISO()
      const spends = buildSpendSeed(today)
      await db.transaction('rw', db.spends, db.meta, async () => {
        await db.spends.bulkPut(spends)
        await db.meta.put({ key: META_SPENDS_SEEDED, value: nowStamp() })
      })
    })()
  }
  return spendsSeedOnce
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

export function listSpends(): Promise<Spend[]> {
  return db.spends.toArray()
}

export function getSpend(id: string): Promise<Spend | undefined> {
  return db.spends.get(id)
}

export function spendsBetween(fromISO: string, toISO: string): Promise<Spend[]> {
  return db.spends.where('date').between(fromISO, toISO).toArray()
}

/* ----------------------------------------------------------------- writes --- */

export interface SubscriptionDraft {
  name: string
  serviceId: string | null
  accountId?: string
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
    accountId: draft.accountId,
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

/**
 * Correct a single recorded charge — its date and/or amount — without touching
 * the rest of the ledger. Marked CONFIRMED so a hand-edited row is never shown
 * as a derived schedule entry.
 */
export async function updatePayment(
  id: string,
  patch: Partial<Pick<Payment, 'date' | 'amount' | 'name'>>,
): Promise<void> {
  await db.payments.update(id, { ...patch, origin: 'confirmed' })
}

/** Remove one recorded charge on its own. The subscription and schedule stay put. */
export async function deletePayment(id: string): Promise<void> {
  await db.payments.delete(id)
}

/** Correct a single recorded EMI — its date and/or amount. */
export async function updateLoanPayment(
  id: string,
  patch: Partial<Pick<LoanPayment, 'date' | 'amount'>>,
): Promise<void> {
  await db.loanPayments.update(id, patch)
}

/**
 * Remove one recorded EMI and renumber the remaining ones for that loan so the
 * sequence stays contiguous and "EMIs paid" keeps its meaning.
 */
export async function deleteLoanPayment(id: string): Promise<void> {
  await db.transaction('rw', db.loanPayments, async () => {
    const row = await db.loanPayments.get(id)
    if (!row) return
    await db.loanPayments.delete(id)
    const rest = await db.loanPayments.where('loanId').equals(row.loanId).sortBy('date')
    for (let i = 0; i < rest.length; i++) {
      if (rest[i].emiNumber !== i + 1) await db.loanPayments.update(rest[i].id, { emiNumber: i + 1 })
    }
  })
}

/** Reassign subscriptions and payments from an old category to a fallback category. */
export async function migrateSubCategory(fromCategory: string, toCategory: string = 'other'): Promise<void> {
  await db.transaction('rw', db.subscriptions, db.payments, async () => {
    await db.subscriptions.where('category').equals(fromCategory).modify({ category: toCategory, updatedAt: nowStamp() })
    await db.payments.where('category').equals(fromCategory).modify({ category: toCategory })
  })
}

/** Reassign daily spends and card transactions from an old category to a fallback category. */
export async function migrateSpendCategory(fromCategory: string, toCategory: string = 'other'): Promise<void> {
  await db.transaction('rw', db.spends, db.cardTransactions, async () => {
    await db.spends.where('category').equals(fromCategory).modify({ category: toCategory, updatedAt: nowStamp() })
    await db.cardTransactions.where('category').equals(fromCategory).modify({ category: toCategory, updatedAt: nowStamp() })
  })
}


/* ----------------------------------------------------------------- spends --- */

export interface SpendDraft {
  title: string
  amount: number
  currency: string
  category: SpendCategory
  method: SpendMethod
  accountId?: string
  /** ISO date the money left. */
  date: string
  notes: string
}

/** Record a day-to-day expense. Every field is denormalised at the row level. */
export async function createSpend(draft: SpendDraft): Promise<Spend> {
  const now = nowStamp()
  const spend: Spend = {
    id: newId(),
    title: draft.title.trim(),
    amount: draft.amount,
    currency: draft.currency,
    category: draft.category,
    method: draft.method,
    accountId: draft.accountId,
    date: draft.date,
    notes: draft.notes.trim(),
    createdAt: now,
    updatedAt: now,
  }
  await db.spends.add(spend)
  return spend
}

export async function updateSpend(id: string, patch: Partial<SpendDraft>): Promise<void> {
  await db.spends.update(id, { ...patch, updatedAt: nowStamp() })
}

export async function deleteSpend(id: string): Promise<void> {
  await db.spends.delete(id)
}

/* ----------------------------------------------------------------- loans --- */

export interface LoanDraft {
  name: string
  lender: string
  loanType: LoanType
  principal: number
  interestRate: number
  tenureMonths: number
  emi: number
  currency: string
  accountId?: string
  startDate: string
  notes: string
}

export async function listLoans(): Promise<Loan[]> {
  return db.loans.toArray()
}

export async function getLoan(id: string): Promise<Loan | undefined> {
  return db.loans.get(id)
}

export async function listLoanPayments(loanId: string): Promise<LoanPayment[]> {
  return db.loanPayments.where('loanId').equals(loanId).sortBy('emiNumber')
}

export async function createLoan(draft: LoanDraft): Promise<Loan> {
  const now = nowStamp()
  const loan: Loan = {
    id: newId(),
    name: draft.name.trim(),
    lender: draft.lender.trim(),
    loanType: draft.loanType,
    status: 'active',
    principal: draft.principal,
    interestRate: draft.interestRate,
    tenureMonths: draft.tenureMonths,
    emi: draft.emi,
    currency: draft.currency,
    accountId: draft.accountId,
    startDate: draft.startDate,
    notes: draft.notes.trim(),
    createdAt: now,
    updatedAt: now,
  }
  await db.loans.add(loan)
  return loan
}

export async function updateLoan(id: string, patch: Partial<LoanDraft>): Promise<void> {
  await db.loans.update(id, { ...patch, updatedAt: nowStamp() })
}

export async function setLoanStatus(id: string, status: LoanStatus, closedAt?: string): Promise<void> {
  await db.loans.update(id, {
    status,
    closedAt: status === 'paid_off' ? (closedAt ?? todayISO()) : undefined,
    updatedAt: nowStamp(),
  })
}

export async function recordLoanPayment(
  loanId: string,
  date: string,
  amount: number,
  principalComponent: number,
  interestComponent: number,
  balanceAfter: number,
  emiNumber: number,
  currency: string,
): Promise<LoanPayment> {
  const payment: LoanPayment = {
    id: newId(),
    loanId,
    date,
    amount,
    currency,
    principalComponent,
    interestComponent,
    balanceAfter,
    emiNumber,
    createdAt: nowStamp(),
  }
  await db.loanPayments.add(payment)
  return payment
}

export async function deleteLoan(id: string): Promise<void> {
  await db.transaction('rw', db.loans, db.loanPayments, async () => {
    await db.loanPayments.where('loanId').equals(id).delete()
    await db.loans.delete(id)
  })
}

/* ---------------------------------------------------------- credit cards --- */

export interface CardDraft {
  name: string
  issuer: string
  last4: string
  network: CreditCard['network']
  creditLimit: number
  interestRate: number
  billingDay: number
  dueDay: number
  currency: string
  accountId?: string
  color: string
  notes: string
}

export async function listCreditCards(): Promise<CreditCard[]> {
  return db.creditCards.toArray()
}

export async function getCreditCard(id: string): Promise<CreditCard | undefined> {
  return db.creditCards.get(id)
}

export async function createCreditCard(draft: CardDraft): Promise<CreditCard> {
  const now = nowStamp()
  const card: CreditCard = {
    id: newId(),
    name: draft.name.trim(),
    issuer: draft.issuer.trim(),
    last4: draft.last4.trim().slice(-4),
    network: draft.network,
    status: 'active',
    creditLimit: draft.creditLimit,
    interestRate: draft.interestRate,
    billingDay: draft.billingDay,
    dueDay: draft.dueDay,
    currency: draft.currency,
    accountId: draft.accountId,
    color: draft.color,
    notes: draft.notes.trim(),
    createdAt: now,
    updatedAt: now,
  }
  await db.creditCards.add(card)
  return card
}

export async function updateCreditCard(id: string, patch: Partial<CardDraft> & { status?: CreditCard['status'] }): Promise<void> {
  await db.creditCards.update(id, { ...patch, updatedAt: nowStamp() })
}

export async function deleteCreditCard(id: string): Promise<void> {
  await db.transaction('rw', db.creditCards, db.cardTransactions, async () => {
    await db.cardTransactions.where('cardId').equals(id).delete()
    await db.creditCards.delete(id)
  })
}

/* ------------------------------------------------- card transactions ----- */

export interface CardTxnDraft {
  cardId: string
  title: string
  amount: number
  currency: string
  category: CardTransaction['category']
  type: CardTxnType
  date: string
  rewards: number
  notes: string
}

export async function listCardTransactions(cardId?: string): Promise<CardTransaction[]> {
  if (cardId) return db.cardTransactions.where('cardId').equals(cardId).sortBy('date')
  return db.cardTransactions.toArray()
}

export async function createCardTransaction(draft: CardTxnDraft): Promise<CardTransaction> {
  const now = nowStamp()
  const txn: CardTransaction = {
    id: newId(),
    cardId: draft.cardId,
    title: draft.title.trim(),
    amount: draft.amount,
    currency: draft.currency,
    category: draft.category,
    type: draft.type,
    date: draft.date,
    rewards: draft.rewards,
    notes: draft.notes.trim(),
    createdAt: now,
    updatedAt: now,
  }
  await db.cardTransactions.add(txn)
  return txn
}

export async function updateCardTransaction(id: string, patch: Partial<CardTxnDraft>): Promise<void> {
  await db.cardTransactions.update(id, { ...patch, updatedAt: nowStamp() })
}

export async function deleteCardTransaction(id: string): Promise<void> {
  await db.cardTransactions.delete(id)
}

/* --------------------------------------------------------------- income --- */

export interface IncomeDraft {
  title: string
  amount: number
  currency: string
  category: IncomeCategory
  method: SpendMethod
  accountId?: string
  date: string
  notes: string
}

export function listIncomes(): Promise<Income[]> {
  return db.incomes.toArray()
}

export function getIncome(id: string): Promise<Income | undefined> {
  return db.incomes.get(id)
}

export async function createIncome(draft: IncomeDraft): Promise<Income> {
  const now = nowStamp()
  const income: Income = {
    id: newId(),
    title: draft.title.trim(),
    amount: draft.amount,
    currency: draft.currency,
    category: draft.category,
    method: draft.method,
    accountId: draft.accountId,
    date: draft.date,
    notes: draft.notes.trim(),
    createdAt: now,
    updatedAt: now,
  }
  await db.incomes.add(income)
  return income
}

export async function updateIncome(id: string, patch: Partial<IncomeDraft>): Promise<void> {
  await db.incomes.update(id, { ...patch, updatedAt: nowStamp() })
}

export async function deleteIncome(id: string): Promise<void> {
  await db.incomes.delete(id)
}

/* ------------------------------------------------------------- accounts --- */

export interface AccountDraft {
  name: string
  type: AccountType
  institution: string
  currency: string
  openingBalance: number
  creditLimit?: number
  color: string
  notes: string
}

export function listAccounts(): Promise<Account[]> {
  return db.accounts.toArray()
}

export function getAccount(id: string): Promise<Account | undefined> {
  return db.accounts.get(id)
}

export async function createAccount(draft: AccountDraft): Promise<Account> {
  const now = nowStamp()
  const account: Account = {
    id: newId(),
    name: draft.name.trim(),
    type: draft.type,
    institution: draft.institution.trim(),
    currency: draft.currency,
    openingBalance: draft.openingBalance,
    creditLimit: draft.type === 'credit' ? draft.creditLimit : undefined,
    color: draft.color,
    notes: draft.notes.trim(),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }
  await db.accounts.add(account)
  return account
}

export async function updateAccount(id: string, patch: Partial<AccountDraft>): Promise<void> {
  const next: Partial<Account> = { ...patch, updatedAt: nowStamp() }
  if (patch.type !== undefined) next.creditLimit = patch.type === 'credit' ? patch.creditLimit : undefined
  await db.accounts.update(id, next)
}

export async function setAccountStatus(id: string, status: AccountStatus): Promise<void> {
  await db.accounts.update(id, { status, updatedAt: nowStamp() })
}

export async function deleteAccount(id: string): Promise<void> {
  await db.transaction('rw', [db.accounts, db.transfers], async () => {
    await db.transfers.where('fromAccountId').equals(id).delete()
    await db.transfers.where('toAccountId').equals(id).delete()
    await db.accounts.delete(id)
  })
}

export interface TransferDraft {
  fromAccountId: string
  toAccountId: string
  amount: number
  currency: string
  date: string
  notes: string
}

export function listTransfers(): Promise<Transfer[]> {
  return db.transfers.toArray()
}

export async function createTransfer(draft: TransferDraft): Promise<Transfer> {
  const transfer: Transfer = {
    id: newId(),
    fromAccountId: draft.fromAccountId,
    toAccountId: draft.toAccountId,
    amount: draft.amount,
    currency: draft.currency,
    date: draft.date,
    notes: draft.notes.trim(),
    createdAt: nowStamp(),
  }
  await db.transfers.add(transfer)
  return transfer
}

export async function deleteTransfer(id: string): Promise<void> {
  await db.transfers.delete(id)
}

const META_WEEKLY_LIMIT = 'spends.weeklyLimit'

export async function getWeeklyLimit(): Promise<WeeklySpendLimit | null> {
  const row = await db.meta.get(META_WEEKLY_LIMIT)
  if (!row) return null
  try {
    return JSON.parse(row.value) as WeeklySpendLimit
  } catch {
    return null
  }
}

export async function setWeeklyLimit(limit: WeeklySpendLimit): Promise<void> {
  await db.meta.put({ key: META_WEEKLY_LIMIT, value: JSON.stringify(limit) })
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', [db.subscriptions, db.payments, db.spends, db.loans, db.loanPayments, db.creditCards, db.cardTransactions, db.incomes, db.accounts, db.transfers, db.meta], async () => {
    await db.subscriptions.clear()
    await db.payments.clear()
    await db.spends.clear()
    await db.loans.clear()
    await db.loanPayments.clear()
    await db.creditCards.clear()
    await db.cardTransactions.clear()
    await db.incomes.clear()
    await db.accounts.clear()
    await db.transfers.clear()
    await db.meta.clear()
  })
}

/**
 * Clears every synced table but keeps device-local settings, and marks each seed
 * as already run so the demo dataset cannot re-appear. Used when a device
 * restores its volume from the cloud instead of uploading its local data.
 */
export async function clearSyncedTables(): Promise<void> {
  await db.transaction('rw', [db.subscriptions, db.payments, db.spends, db.loans, db.loanPayments, db.creditCards, db.cardTransactions, db.incomes, db.accounts, db.transfers, db.meta], async () => {
    await db.subscriptions.clear()
    await db.payments.clear()
    await db.spends.clear()
    await db.loans.clear()
    await db.loanPayments.clear()
    await db.creditCards.clear()
    await db.cardTransactions.clear()
    await db.incomes.clear()
    await db.accounts.clear()
    await db.transfers.clear()
    const stamp = nowStamp()
    for (const key of ['seeded', 'spends.seeded', 'debt.seeded', 'cards.seeded', 'income.seeded', 'accounts.seeded']) {
      await db.meta.put({ key, value: stamp })
    }
  })
}

/** Re-arms the one-shot boot guards so a demo reset can re-run every seed.
 *  The orchestration itself lives in `seed-reset.ts` to avoid a module cycle. */
export function resetSubscriptionSeed(): void {
  seedOnce = null
}

export function resetSpendsSeed(): void {
  spendsSeedOnce = null
}

/* ------------------------------------------------------- portability ------ */

export interface Snapshot {
  app: 'spendstate'
  version: 1
  exportedAt: string
  settings: AppSettings
  subscriptions: Subscription[]
  payments: Payment[]
  spends: Spend[]
  loans?: Loan[]
  loanPayments?: LoanPayment[]
  creditCards?: CreditCard[]
  cardTransactions?: CardTransaction[]
  incomes?: Income[]
  accounts?: Account[]
  transfers?: Transfer[]
}

export async function exportSnapshot(settings: AppSettings): Promise<Snapshot> {
  const [subscriptions, payments, spends, loans, loanPayments, creditCards, cardTransactions, incomes, accounts, transfers] = await Promise.all([
    listSubscriptions(),
    listPayments(),
    listSpends(),
    listLoans(),
    db.loanPayments.toArray(),
    listCreditCards(),
    db.cardTransactions.toArray(),
    listIncomes(),
    listAccounts(),
    listTransfers(),
  ])
  return {
    app: 'spendstate',
    version: 1,
    exportedAt: nowStamp(),
    settings,
    subscriptions,
    payments,
    spends,
    loans,
    loanPayments,
    creditCards,
    cardTransactions,
    incomes,
    accounts,
    transfers,
  }
}

export interface ImportReport {
  subscriptions: number
  payments: number
  spends: number
  loans: number
  loanPayments: number
  creditCards: number
  cardTransactions: number
  incomes: number
  accounts: number
  transfers: number
  mode: 'replace' | 'merge'
}

export async function importSnapshot(
  snapshot: Snapshot,
  mode: 'replace' | 'merge' = 'replace',
): Promise<ImportReport> {
  // Accept snapshots exported under the legacy "subtrack" brand as well.
  const app = snapshot.app as string
  if ((app !== 'spendstate' && app !== 'subtrack') || !Array.isArray(snapshot.subscriptions)) {
    throw new Error('Not a SPENDSTATE snapshot')
  }
  const subscriptions = snapshot.subscriptions
  const payments = Array.isArray(snapshot.payments) ? snapshot.payments : []
  const spends = Array.isArray(snapshot.spends) ? snapshot.spends : []
  const loans = Array.isArray(snapshot.loans) ? snapshot.loans : []
  const loanPayments = Array.isArray(snapshot.loanPayments) ? snapshot.loanPayments : []
  const creditCards = Array.isArray(snapshot.creditCards) ? snapshot.creditCards : []
  const cardTransactions = Array.isArray(snapshot.cardTransactions) ? snapshot.cardTransactions : []
  const incomes = Array.isArray(snapshot.incomes) ? snapshot.incomes : []
  const accounts = Array.isArray(snapshot.accounts) ? snapshot.accounts : []
  const transfers = Array.isArray(snapshot.transfers) ? snapshot.transfers : []

  await db.transaction('rw', [db.subscriptions, db.payments, db.spends, db.loans, db.loanPayments, db.creditCards, db.cardTransactions, db.incomes, db.accounts, db.transfers, db.meta], async () => {
    if (mode === 'replace') {
      await db.subscriptions.clear()
      await db.payments.clear()
      await db.spends.clear()
      await db.loans.clear()
      await db.loanPayments.clear()
      await db.creditCards.clear()
      await db.cardTransactions.clear()
      await db.incomes.clear()
      await db.accounts.clear()
      await db.transfers.clear()
    }
    await db.subscriptions.bulkPut(subscriptions)
    if (payments.length) await db.payments.bulkPut(payments)
    if (spends.length) await db.spends.bulkPut(spends)
    if (loans.length) await db.loans.bulkPut(loans)
    if (loanPayments.length) await db.loanPayments.bulkPut(loanPayments)
    if (creditCards.length) await db.creditCards.bulkPut(creditCards)
    if (cardTransactions.length) await db.cardTransactions.bulkPut(cardTransactions)
    if (incomes.length) await db.incomes.bulkPut(incomes)
    if (accounts.length) await db.accounts.bulkPut(accounts)
    if (transfers.length) await db.transfers.bulkPut(transfers)
    // Mark every demo generator as satisfied so a later boot can never inject
    // demo rows on top of restored data.
    await db.meta.put({ key: META_SEEDED, value: nowStamp() })
    await db.meta.put({ key: META_SPENDS_SEEDED, value: nowStamp() })
    await db.meta.put({ key: META_DEBT_SEEDED, value: nowStamp() })
    await db.meta.put({ key: META_CARDS_SEEDED, value: nowStamp() })
    await db.meta.put({ key: META_INCOME_SEEDED, value: nowStamp() })
    await db.meta.put({ key: META_ACCOUNTS_SEEDED, value: nowStamp() })
  })

  return {
    subscriptions: subscriptions.length,
    payments: payments.length,
    spends: spends.length,
    loans: loans.length,
    loanPayments: loanPayments.length,
    creditCards: creditCards.length,
    cardTransactions: cardTransactions.length,
    incomes: incomes.length,
    accounts: accounts.length,
    transfers: transfers.length,
    mode,
  }
}

export type { Subscription, Payment, ProcessStatus }
