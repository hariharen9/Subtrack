/**
 * SPENDSTATE // DEMO RESET
 *
 * Re-seeding orchestration lives here rather than in `db.ts` so the store never
 * has to import the seed modules back — that would close a module cycle
 * (`db → debt-seed → db`). Every generator is re-armed, the volume is wiped,
 * then each seed runs against the now-empty store.
 */
import { wipeAll, ensureSeeded, ensureSpendsSeeded, resetSubscriptionSeed, resetSpendsSeed } from './db'
import { ensureDebtSeeded, resetDebtSeed } from './debt-seed'
import { ensureCardsSeeded, resetCardsSeed } from './card-seed'
import { ensureIncomeSeeded, resetIncomeSeed } from './income-seed'
import { ensureAccountsSeeded, resetAccountsSeed } from './account-seed'

export async function resetToSeed(): Promise<void> {
  await wipeAll()
  resetSubscriptionSeed()
  resetSpendsSeed()
  resetDebtSeed()
  resetCardsSeed()
  resetIncomeSeed()
  resetAccountsSeed()
  await Promise.all([
    ensureSeeded(),
    ensureSpendsSeeded(),
    ensureDebtSeeded(),
    ensureCardsSeeded(),
    ensureIncomeSeeded(),
    ensureAccountsSeeded(),
  ])
}
