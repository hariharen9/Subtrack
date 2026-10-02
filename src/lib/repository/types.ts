/**
 * SPENDSTATE // REPOSITORY CONTRACT
 *
 * The seam between the UI and the storage engine. The app writes through a
 * `Repository`; `src/lib/db.ts` is the default (Dexie/IndexedDB) implementation
 * and the optional Firestore implementation is a second one, loaded lazily.
 *
 * Method signatures are derived from the Dexie implementation so they can never
 * drift — the interface states *which* operations form the data layer, and the
 * types come straight from the source of truth.
 */
import type * as DexieImpl from '../db'

type Db = typeof DexieImpl

export type RepositoryKind = 'dexie' | 'firestore'

/**
 * Tables that participate in cloud sync, mapped 1:1 to Dexie stores and to
 * `users/{uid}/{table}/{id}` documents in Firestore.
 *
 * `meta` is deliberately excluded: it holds device-local seed markers and the
 * weekly limit, which are not part of the financial record.
 */
export const SYNC_TABLES = [
  'subscriptions',
  'payments',
  'spends',
  'loans',
  'loanPayments',
  'creditCards',
  'cardTransactions',
  'incomes',
  'accounts',
  'transfers',
] as const

export type SyncTable = (typeof SYNC_TABLES)[number]

export interface Repository {
  readonly kind: RepositoryKind

  /* Subscriptions */
  createSubscription: Db['createSubscription']
  updateSubscription: Db['updateSubscription']
  setProcessStatus: Db['setProcessStatus']
  executeCycle: Db['executeCycle']
  markUsed: Db['markUsed']
  purgeSubscription: Db['purgeSubscription']
  reconcileSchedules: Db['reconcileSchedules']
  updatePayment: Db['updatePayment']
  deletePayment: Db['deletePayment']
  migrateSubCategory: Db['migrateSubCategory']

  /* Daily spends */
  createSpend: Db['createSpend']
  updateSpend: Db['updateSpend']
  deleteSpend: Db['deleteSpend']
  setWeeklyLimit: Db['setWeeklyLimit']
  migrateSpendCategory: Db['migrateSpendCategory']

  /* Loans & EMIs */
  createLoan: Db['createLoan']
  updateLoan: Db['updateLoan']
  setLoanStatus: Db['setLoanStatus']
  recordLoanPayment: Db['recordLoanPayment']
  deleteLoan: Db['deleteLoan']
  updateLoanPayment: Db['updateLoanPayment']
  deleteLoanPayment: Db['deleteLoanPayment']

  /* Credit cards */
  createCreditCard: Db['createCreditCard']
  updateCreditCard: Db['updateCreditCard']
  deleteCreditCard: Db['deleteCreditCard']
  createCardTransaction: Db['createCardTransaction']
  updateCardTransaction: Db['updateCardTransaction']
  deleteCardTransaction: Db['deleteCardTransaction']

  /* Income */
  createIncome: Db['createIncome']
  updateIncome: Db['updateIncome']
  deleteIncome: Db['deleteIncome']

  /* Accounts & transfers */
  createAccount: Db['createAccount']
  updateAccount: Db['updateAccount']
  setAccountStatus: Db['setAccountStatus']
  deleteAccount: Db['deleteAccount']
  createTransfer: Db['createTransfer']
  deleteTransfer: Db['deleteTransfer']

  /* Maintenance */
  wipeAll: Db['wipeAll']
  importSnapshot: Db['importSnapshot']
  ensureSeeded: Db['ensureSeeded']
  ensureSpendsSeeded: Db['ensureSpendsSeeded']
}
