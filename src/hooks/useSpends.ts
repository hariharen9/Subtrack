/**
 * SPENDSTATE // SPENDS DATA HOOKS
 *
 * Reactive subscriptions to the spends store plus a memoised summary pipeline.
 * Mirrors useSystem so the Spends cockpit never touches Dexie directly, and the
 * weekly limiter is threaded from the meta table into the arithmetic.
 */
import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { Spend, WeeklySpendLimit } from '@/lib/types'
import {
  buildSpendInsights,
  spendLedger,
  spendSeries,
  summarizeSpends,
  type SpendDayPoint,
  type SpendInsights,
  type SpendSummary,
} from '@/lib/spends'
import { todayISO } from '@/lib/date'
import { useUI } from '@/store/ui'

const EMPTY_SPENDS: Spend[] = []

export function useSpends(): Spend[] {
  return useLiveQuery(() => db.spends.toArray(), [], EMPTY_SPENDS)
}

export function useSpend(id: string | undefined): Spend | undefined {
  return useLiveQuery(() => (id ? db.spends.get(id) : undefined), [id], undefined)
}

/** Weekly discretionary limiter read live from the meta table. */
export function useWeeklyLimit(): WeeklySpendLimit | null {
  return useLiveQuery(
    () =>
      db.meta
        .get('spends.weeklyLimit')
        .then((row) => {
          if (!row?.value) return null
          try {
            return JSON.parse(row.value) as WeeklySpendLimit
          } catch {
            return null
          }
        })
        .catch(() => null),
    [],
    null,
  )
}

export interface SpendsData {
  summary: SpendSummary
  ledger: { date: string; spends: Spend[] }[]
  ready: boolean
}

/** The cockpit bundle: summary + reverse-chronological day ledger. */
export function useSpendsSystem(): SpendsData {
  const spends = useSpends()
  const limit = useWeeklyLimit()
  const base = useUI((s) => s.baseCurrency)
  const today = todayISO()

  const summary = useMemo(
    () => summarizeSpends(spends, base, today, limit),
    [spends, base, today, limit],
  )
  const ledger = useMemo(() => spendLedger(spends), [spends])

  return { summary, ledger, ready: spends.length > 0 }
}

/** Deep telemetry insights for the Spend Subsystem. */
export function useSpendInsights(): SpendInsights {
  const spends = useSpends()
  const base = useUI((s) => s.baseCurrency)
  const today = todayISO()

  return useMemo(() => buildSpendInsights(spends, base, today), [spends, base, today])
}

/** Trailing daily series for the velocity chart. */
export function useSpendSeries(days = 28): SpendDayPoint[] {
  const spends = useSpends()
  const base = useUI((s) => s.baseCurrency)
  const today = todayISO()
  return useMemo(() => spendSeries(spends, base, today, days), [spends, base, today, days])
}
