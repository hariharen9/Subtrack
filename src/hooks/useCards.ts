/**
 * SPENDSTATE // CREDIT CARD HOOKS
 *
 * Reactive subscriptions to the cards store plus memoised analytics pipeline.
 * Mirrors useSystem/useSpends so views never touch Dexie directly.
 */
import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { CreditCard, CardTransaction } from '@/lib/types'
import { summarizeCards, buildCardNotes, type CardsSummary, type CardNote } from '@/lib/cards'
import { todayISO } from '@/lib/date'
import { useUI } from '@/store/ui'

const EMPTY_CARDS: CreditCard[] = []
const EMPTY_TXNS: CardTransaction[] = []

export function useCreditCards(): CreditCard[] {
  return useLiveQuery(() => db.creditCards.toArray(), [], EMPTY_CARDS)
}

export function useCreditCard(id: string | undefined): CreditCard | undefined {
  return useLiveQuery(() => (id ? db.creditCards.get(id) : undefined), [id], undefined)
}

export function useCardTransactions(cardId?: string): CardTransaction[] {
  return useLiveQuery(
    () => (cardId ? db.cardTransactions.where('cardId').equals(cardId).toArray() : db.cardTransactions.toArray()),
    [cardId],
    EMPTY_TXNS,
  )
}

export interface CardsData {
  summary: CardsSummary
  notes: CardNote[]
  ready: boolean
}

export function useCardsSystem(): CardsData {
  const cards = useCreditCards()
  const txns = useLiveQuery(() => db.cardTransactions.toArray(), [], EMPTY_TXNS)
  const base = useUI((s) => s.baseCurrency)
  const today = todayISO()

  const summary = useMemo(
    () => summarizeCards(cards, txns, base, today),
    [cards, txns, base, today],
  )
  const notes = useMemo(() => buildCardNotes(summary), [summary])

  return { summary, notes, ready: cards.length > 0 }
}
