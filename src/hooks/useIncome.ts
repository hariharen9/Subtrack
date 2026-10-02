/**
 * SPENDSTATE // INCOME HOOKS
 *
 * Reactive subscriptions to the incomes log plus a memoised analytics pipeline.
 * Mirrors useSpends so the dashboard never touches Dexie directly.
 */
import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { Income } from '@/lib/types'
import { summarizeIncome, type IncomeSummary } from '@/lib/income'
import { todayISO } from '@/lib/date'
import { useUI } from '@/store/ui'

const EMPTY_INCOMES: Income[] = []

export function useIncomes(): Income[] {
  return useLiveQuery(() => db.incomes.toArray(), [], EMPTY_INCOMES)
}

export function useIncome(id: string | undefined): Income | undefined {
  return useLiveQuery(() => (id ? db.incomes.get(id) : undefined), [id], undefined)
}

export interface IncomeData {
  summary: IncomeSummary
  ready: boolean
}

export function useIncomeSystem(): IncomeData {
  const incomes = useIncomes()
  const base = useUI((s) => s.baseCurrency)
  const today = todayISO()

  const summary = useMemo(() => summarizeIncome(incomes, base, today), [incomes, base, today])

  return { summary, ready: incomes.length > 0 }
}
