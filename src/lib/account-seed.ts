/**
 * SPENDSTATE // ACCOUNT SEED
 *
 * Demo accounts — a bank, a savings account, a wallet, cash and a credit line.
 * Their ids are referenced by the other demo seeds (`seed-account-bank` etc.) so
 * the derived balances are alive on first boot.
 */
import type { Account, AccountType } from './types'
import { nowStamp } from './date'
import { db } from './db'

interface AccountSeedSpec {
  id: string
  name: string
  type: AccountType
  institution: string
  currency: string
  openingBalance: number
  creditLimit?: number
  color: string
}

const SEED_SPECS: AccountSeedSpec[] = [
  { id: 'seed-account-bank', name: 'HDFC Savings', type: 'bank', institution: 'HDFC Bank', currency: 'INR', openingBalance: 180000, color: '#10A37F' },
  { id: 'seed-account-savings', name: 'SBI Savings', type: 'savings', institution: 'SBI', currency: 'INR', openingBalance: 96000, color: '#00C8FF' },
  { id: 'seed-account-wallet', name: 'Paytm Wallet', type: 'wallet', institution: 'Paytm', currency: 'INR', openingBalance: 4200, color: '#7C5CFF' },
  { id: 'seed-account-cash', name: 'Cash', type: 'cash', institution: '—', currency: 'INR', openingBalance: 6500, color: '#FF7A00' },
  { id: 'seed-account-credit', name: 'HDFC Credit Line', type: 'credit', institution: 'HDFC Bank', currency: 'INR', openingBalance: 0, creditLimit: 200000, color: '#FF2BD6' },
]

export function buildAccountSeed(): Account[] {
  const now = nowStamp()
  return SEED_SPECS.map((spec) => ({
    id: spec.id,
    name: spec.name,
    type: spec.type,
    institution: spec.institution,
    currency: spec.currency,
    openingBalance: spec.openingBalance,
    creditLimit: spec.creditLimit,
    color: spec.color,
    notes: '',
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  }))
}

let accountSeedOnce: Promise<void> | null = null

export async function ensureAccountsSeeded(): Promise<void> {
  if (accountSeedOnce) return accountSeedOnce
  accountSeedOnce = (async () => {
    const marker = await db.meta.get('accounts.seeded')
    if (marker) return
    const accounts = buildAccountSeed()
    await db.transaction('rw', db.accounts, db.meta, async () => {
      await db.accounts.bulkPut(accounts)
      await db.meta.put({ key: 'accounts.seeded', value: nowStamp() })
    })
  })()
  return accountSeedOnce
}

/** Clears the one-shot guard so a demo reset can re-seed accounts. */
export function resetAccountsSeed(): void {
  accountSeedOnce = null
}
