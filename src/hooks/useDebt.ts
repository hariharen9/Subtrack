/**
 * SUBTRACK // DEBT HOOKS
 *
 * Reactive subscriptions to the loans store plus memoised analytics pipeline.
 * Mirrors useSystem so the Debt cockpit never touches Dexie directly.
 */
import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { Loan, LoanPayment } from '@/lib/types'
import { summarizeDebt, type DebtSummary } from '@/lib/debt'
import { todayISO } from '@/lib/date'
import { useUI } from '@/store/ui'

const EMPTY_LOANS: Loan[] = []
const EMPTY_PAYMENTS: LoanPayment[] = []

export function useLoans(): Loan[] {
  return useLiveQuery(() => db.loans.toArray(), [], EMPTY_LOANS)
}

export function useLoan(id: string | undefined): Loan | undefined {
  return useLiveQuery(() => (id ? db.loans.get(id) : undefined), [id], undefined)
}

export function useLoanPayments(loanId: string | undefined): LoanPayment[] {
  return useLiveQuery(
    () => (loanId ? db.loanPayments.where('loanId').equals(loanId).sortBy('emiNumber') : []),
    [loanId],
    EMPTY_PAYMENTS,
  )
}

export interface DebtData {
  summary: DebtSummary
  ready: boolean
}

export function useDebtSystem(): DebtData {
  const loans = useLoans()
  const allPayments = useLiveQuery(() => db.loanPayments.toArray(), [], EMPTY_PAYMENTS)
  const base = useUI((s) => s.baseCurrency)
  const today = todayISO()

  const summary = useMemo(
    () => summarizeDebt(loans, allPayments, base, today),
    [loans, allPayments, base, today],
  )

  return { summary, ready: loans.length > 0 }
}