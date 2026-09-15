/**
 * SUBTRACK // DATA HOOKS
 *
 * One subscription to the local store, everything derived in one memoised
 * pass. Views never query Dexie directly and never recompute analytics.
 */
import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { Payment, Subscription } from '@/lib/types'
import {
  buildSignalSeries,
  incomingStream,
  matrixFor,
  summarize,
  type SeriesPoint,
  type SystemSummary,
} from '@/lib/analytics'
import { monthKey, todayISO } from '@/lib/date'
import { endOfMonthISO, startOfMonthISO } from '@/lib/date'
import { useUI } from '@/store/ui'

const EMPTY_SUBS: Subscription[] = []
const EMPTY_PAYMENTS: Payment[] = []

export function useSubscriptions(): Subscription[] {
  return useLiveQuery(() => db.subscriptions.toArray(), [], EMPTY_SUBS)
}

export function usePayments(): Payment[] {
  return useLiveQuery(() => db.payments.toArray(), [], EMPTY_PAYMENTS)
}

export function useSubscription(id: string | undefined): Subscription | undefined {
  return useLiveQuery(() => (id ? db.subscriptions.get(id) : undefined), [id], undefined)
}

export function useSubscriptionPayments(id: string | undefined): Payment[] {
  return useLiveQuery(
    () => (id ? db.payments.where('subId').equals(id).toArray() : Promise.resolve(EMPTY_PAYMENTS)),
    [id],
    EMPTY_PAYMENTS,
  )
}

export interface SystemData {
  summary: SystemSummary
  ready: boolean
}

export function useSystem(): SystemData {
  const subs = useSubscriptions()
  const payments = usePayments()
  const base = useUI((s) => s.baseCurrency)
  const today = todayISO()

  const summary = useMemo(
    () => summarize(subs, payments, base, today),
    [subs, payments, base, today],
  )

  return { summary, ready: subs.length > 0 || payments.length > 0 }
}

export function useSignalSeries(
  mode: 'cash' | 'runrate',
  back = 7,
  forward = 3,
): SeriesPoint[] {
  const subs = useSubscriptions()
  const payments = usePayments()
  const base = useUI((s) => s.baseCurrency)
  const today = todayISO()
  return useMemo(
    () => buildSignalSeries(subs, payments, base, today, mode, back, forward),
    [subs, payments, base, today, mode, back, forward],
  )
}

export function useIncomingStream(days: number) {
  const subs = useSubscriptions()
  const base = useUI((s) => s.baseCurrency)
  const today = todayISO()
  return useMemo(() => incomingStream(subs, base, today, days), [subs, base, today, days])
}

/** Payment events for a whole month, keyed by ISO day. */
export function useMonthMatrix(month: string) {
  const subs = useSubscriptions()
  const base = useUI((s) => s.baseCurrency)
  return useMemo(() => {
    const start = startOfMonthISO(`${month}-01`)
    const end = endOfMonthISO(start)
    return matrixFor(subs, base, start, end)
  }, [subs, base, month])
}

export function useCurrentMonth(): string {
  return monthKey(todayISO())
}
