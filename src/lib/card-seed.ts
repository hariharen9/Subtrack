/**
 * SPENDSTATE // CARD SEED
 *
 * Demo credit card dataset — 3 cards with realistic transactions spanning
 * the last 60 days: purchases, payments, a fee and rewards.
 */
import type { CreditCard, CardTransaction, SpendCategory, CardTxnType } from './types'
import { addDaysISO, nowStamp, todayISO } from './date'
import { db } from './db'

interface CardSeedSpec {
  name: string
  issuer: string
  last4: string
  network: CreditCard['network']
  creditLimit: number
  interestRate: number
  billingDay: number
  dueDay: number
  currency: string
  color: string
  notes: string
}

const CARD_SPECS: CardSeedSpec[] = [
  {
    name: 'Millennia',
    issuer: 'HDFC Bank',
    last4: '4521',
    network: 'mastercard',
    creditLimit: 200000,
    interestRate: 42,
    billingDay: 18,
    dueDay: 5,
    currency: 'INR',
    color: '#F4F4F4',
    notes: '5% cashback on Amazon & Swiggy',
  },
  {
    name: 'SimplyCLICK',
    issuer: 'SBI Card',
    last4: '8107',
    network: 'visa',
    creditLimit: 150000,
    interestRate: 40,
    billingDay: 10,
    dueDay: 28,
    currency: 'INR',
    color: '#00C8FF',
    notes: '10X points on online spends',
  },
  {
    name: 'Platinum Travel',
    issuer: 'Axis Bank',
    last4: '3392',
    network: 'visa',
    creditLimit: 300000,
    interestRate: 38,
    billingDay: 24,
    dueDay: 12,
    currency: 'INR',
    color: '#FF7A00',
    notes: 'Miles on travel & dining',
  },
]

interface TxnSpec {
  daysAgo: number
  title: string
  amount: number
  category: SpendCategory
  type: CardTxnType
  rewards: number
  card: number
}

const TXN_SPECS: TxnSpec[] = [
  { daysAgo: 2, title: 'Swiggy — dinner', amount: 480, category: 'food', type: 'purchase', rewards: 24, card: 0 },
  { daysAgo: 4, title: 'Amazon — electronics', amount: 5999, category: 'shopping', type: 'purchase', rewards: 300, card: 0 },
  { daysAgo: 6, title: 'Petrol — HP pump', amount: 2000, category: 'transport', type: 'purchase', rewards: 20, card: 0 },
  { daysAgo: 9, title: 'BigBasket — groceries', amount: 2450, category: 'groceries', type: 'purchase', rewards: 25, card: 0 },
  { daysAgo: 12, title: 'Statement payment', amount: 12400, category: 'other', type: 'payment', rewards: 0, card: 0 },
  { daysAgo: 15, title: 'Netflix subscription', amount: 649, category: 'entertainment', type: 'purchase', rewards: 6, card: 0 },
  { daysAgo: 18, title: 'Zomato — lunch', amount: 380, category: 'food', type: 'purchase', rewards: 19, card: 0 },

  { daysAgo: 3, title: 'Flipkart — home goods', amount: 3200, category: 'shopping', type: 'purchase', rewards: 320, card: 1 },
  { daysAgo: 5, title: 'Uber — ride', amount: 240, category: 'transport', type: 'purchase', rewards: 24, card: 1 },
  { daysAgo: 8, title: 'Cult.fit membership', amount: 1250, category: 'health', type: 'purchase', rewards: 125, card: 1 },
  { daysAgo: 11, title: 'Airbnb — weekend stay', amount: 8500, category: 'travel', type: 'purchase', rewards: 850, card: 1 },
  { daysAgo: 14, title: 'Statement payment', amount: 9800, category: 'other', type: 'payment', rewards: 0, card: 1 },
  { daysAgo: 17, title: 'Domino\'s — pizza', amount: 560, category: 'food', type: 'purchase', rewards: 56, card: 1 },
  { daysAgo: 20, title: 'Late payment fee', amount: 500, category: 'other', type: 'fee', rewards: 0, card: 1 },

  { daysAgo: 1, title: 'IndiGo — flight BLR-DEL', amount: 6450, category: 'travel', type: 'purchase', rewards: 1290, card: 2 },
  { daysAgo: 4, title: 'Taj Hotels — dinner', amount: 3200, category: 'food', type: 'purchase', rewards: 640, card: 2 },
  { daysAgo: 7, title: 'MakeMyTrip — hotel', amount: 11200, category: 'travel', type: 'purchase', rewards: 2240, card: 2 },
  { daysAgo: 10, title: 'Statement payment', amount: 18600, category: 'other', type: 'payment', rewards: 0, card: 2 },
  { daysAgo: 13, title: 'Coursera Plus', amount: 3999, category: 'education', type: 'purchase', rewards: 400, card: 2 },
  { daysAgo: 16, title: 'Apple Store — accessories', amount: 4900, category: 'shopping', type: 'purchase', rewards: 490, card: 2 },
]

export function buildCardSeed(today: string): { cards: CreditCard[]; transactions: CardTransaction[] } {
  const now = nowStamp()
  const cards: CreditCard[] = CARD_SPECS.map((spec, i) => ({
    id: `seed-card-${i}`,
    name: spec.name,
    issuer: spec.issuer,
    last4: spec.last4,
    network: spec.network,
    status: 'active' as const,
    creditLimit: spec.creditLimit,
    interestRate: spec.interestRate,
    billingDay: spec.billingDay,
    dueDay: spec.dueDay,
    currency: spec.currency,
    color: spec.color,
    notes: spec.notes,
    createdAt: now,
    updatedAt: now,
  }))

  const transactions: CardTransaction[] = TXN_SPECS.map((spec, i) => {
    const card = cards[spec.card]
    return {
      id: `seed-ctxn-${i}`,
      cardId: card.id,
      title: spec.title,
      amount: spec.amount,
      currency: card.currency,
      category: spec.category,
      type: spec.type,
      date: addDaysISO(today, -spec.daysAgo),
      rewards: spec.rewards,
      notes: '',
      createdAt: now,
      updatedAt: now,
    }
  })

  return { cards, transactions }
}

let cardSeedOnce: Promise<void> | null = null

export async function ensureCardsSeeded(): Promise<void> {
  if (cardSeedOnce) return cardSeedOnce
  cardSeedOnce = (async () => {
    const marker = await db.meta.get('cards.seeded')
    if (marker) return
    const { cards, transactions } = buildCardSeed(todayISO())
    await db.transaction('rw', [db.creditCards, db.cardTransactions, db.meta], async () => {
      await db.creditCards.bulkPut(cards)
      await db.cardTransactions.bulkPut(transactions)
      await db.meta.put({ key: 'cards.seeded', value: nowStamp() })
    })
  })()
  return cardSeedOnce
}

/** Clears the one-shot guard so a demo reset can re-seed cards. */
export function resetCardsSeed(): void {
  cardSeedOnce = null
}
