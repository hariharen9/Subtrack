/**
 * SPENDSTATE // REPOSITORY
 *
 * The single data-layer entry point. The UI imports its writes from here (never
 * from `db.ts`), so the active storage implementation is an implementation
 * detail. Reads stay on Dexie via `useLiveQuery` — Dexie is always the local
 * read cache, which is what keeps the app fully online/offline identical.
 *
 * Switching to the Firestore implementation never changes these call sites.
 */
import { dexieRepository } from './dexie'
import type { Repository } from './types'

export type { Repository, RepositoryKind, SyncTable } from './types'
export { SYNC_TABLES } from './types'
export { isCloudConfigured, firebaseConfig } from './env'
export type { FirebaseConfig } from './env'
export type {
  SubscriptionDraft,
  SpendDraft,
  LoanDraft,
  CardDraft,
  CardTxnDraft,
  IncomeDraft,
  AccountDraft,
  TransferDraft,
} from '../db'

let active: Repository = dexieRepository

const implListeners = new Set<() => void>()
const mutationListeners = new Set<() => void>()

export function getRepository(): Repository {
  return active
}

/** Swap the active implementation (used when cloud sync is enabled/disabled). */
export function setRepository(repo: Repository): void {
  active = repo
  implListeners.forEach((listener) => listener())
}

export function resetRepository(): void {
  setRepository(dexieRepository)
}

export function subscribeRepository(cb: () => void): () => void {
  implListeners.add(cb)
  return () => {
    implListeners.delete(cb)
  }
}

/** The sync engine subscribes here to learn that a local write just happened. */
export function onMutation(cb: () => void): () => void {
  mutationListeners.add(cb)
  return () => {
    mutationListeners.delete(cb)
  }
}

export function notifyMutation(): void {
  mutationListeners.forEach((listener) => listener())
}

/**
 * Builds the named write facade for one repository method: it dispatches to the
 * active implementation, then notifies mutation listeners so an attached sync
 * engine can mirror the change — without a single call site knowing about it.
 */
function write<K extends keyof Repository>(name: K): Repository[K] {
  return (async (...args: unknown[]) => {
    const repo = getRepository()
    const fn = repo[name] as unknown as (...a: unknown[]) => unknown
    const result = await fn.apply(repo, args)
    notifyMutation()
    return result
  }) as unknown as Repository[K]
}

/* Subscriptions */
export const createSubscription = write('createSubscription')
export const updateSubscription = write('updateSubscription')
export const setProcessStatus = write('setProcessStatus')
export const executeCycle = write('executeCycle')
export const markUsed = write('markUsed')
export const purgeSubscription = write('purgeSubscription')
export const reconcileSchedules = write('reconcileSchedules')
export const updatePayment = write('updatePayment')
export const deletePayment = write('deletePayment')
export const migrateSubCategory = write('migrateSubCategory')

/* Daily spends */
export const createSpend = write('createSpend')
export const updateSpend = write('updateSpend')
export const deleteSpend = write('deleteSpend')
export const setWeeklyLimit = write('setWeeklyLimit')
export const migrateSpendCategory = write('migrateSpendCategory')

/* Loans & EMIs */
export const createLoan = write('createLoan')
export const updateLoan = write('updateLoan')
export const setLoanStatus = write('setLoanStatus')
export const recordLoanPayment = write('recordLoanPayment')
export const deleteLoan = write('deleteLoan')
export const updateLoanPayment = write('updateLoanPayment')
export const deleteLoanPayment = write('deleteLoanPayment')

/* Credit cards */
export const createCreditCard = write('createCreditCard')
export const updateCreditCard = write('updateCreditCard')
export const deleteCreditCard = write('deleteCreditCard')
export const createCardTransaction = write('createCardTransaction')
export const updateCardTransaction = write('updateCardTransaction')
export const deleteCardTransaction = write('deleteCardTransaction')

/* Income */
export const createIncome = write('createIncome')
export const updateIncome = write('updateIncome')
export const deleteIncome = write('deleteIncome')

/* Accounts & transfers */
export const createAccount = write('createAccount')
export const updateAccount = write('updateAccount')
export const setAccountStatus = write('setAccountStatus')
export const deleteAccount = write('deleteAccount')
export const createTransfer = write('createTransfer')
export const deleteTransfer = write('deleteTransfer')

/* Maintenance */
export const wipeAll = write('wipeAll')
export const importSnapshot = write('importSnapshot')
export const ensureSeeded = write('ensureSeeded')
export const ensureSpendsSeeded = write('ensureSpendsSeeded')
