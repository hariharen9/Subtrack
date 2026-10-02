/**
 * SPENDSTATE // ACCOUNT HOOKS
 *
 * Live queries for accounts + transfers, and a memoised net-worth pipeline that
 * feeds every movement source into the account ledger.
 */
import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { Account, Transfer, CardTransaction, LoanPayment } from '@/lib/types'
import { summarizeAccounts, type AccountsSummary } from '@/lib/accounts'
import { todayISO } from '@/lib/date'
import { useUI } from '@/store/ui'
import { useIncomes } from './useIncome'
import { useSpends } from './useSpends'
import { usePayments, useSubscriptions } from './useSystem'
import { useLoans } from './useDebt'
import { useCreditCards } from './useCards'

const EMPTY_ACCOUNTS: Account[] = []
const EMPTY_TRANSFERS: Transfer[] = []
const EMPTY: never[] = []

export function useAccounts(): Account[] {
  return useLiveQuery(() => db.accounts.toArray(), [], EMPTY_ACCOUNTS)
}

export function useAccount(id: string | undefined): Account | undefined {
  return useLiveQuery(() => (id ? db.accounts.get(id) : undefined), [id], undefined)
}

export function useTransfers(): Transfer[] {
  return useLiveQuery(() => db.transfers.toArray(), [], EMPTY_TRANSFERS)
}

export interface AccountsData {
  summary: AccountsSummary
  ready: boolean
}

export function useAccountsSystem(): AccountsData {
  const accounts = useAccounts()
  const transfers = useTransfers()
  const incomes = useIncomes()
  const spends = useSpends()
  const subscriptions = useSubscriptions()
  const payments = usePayments()
  const loans = useLoans()
  const loanPayments = useLiveQuery(() => db.loanPayments.toArray(), [], EMPTY as unknown as LoanPayment[])
  const cards = useCreditCards()
  const cardTransactions = useLiveQuery(() => db.cardTransactions.toArray(), [], EMPTY as unknown as CardTransaction[])
  const base = useUI((s) => s.baseCurrency)
  const today = todayISO()

  const summary = useMemo(
    () =>
      summarizeAccounts(
        accounts,
        { incomes, spends, subscriptions, payments, loans, loanPayments, cards, cardTransactions, transfers },
        base,
        today,
      ),
    [accounts, transfers, incomes, spends, subscriptions, payments, loans, loanPayments, cards, cardTransactions, base, today],
  )

  return { summary, ready: accounts.length > 0 }
}
