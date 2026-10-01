/**
 * SPENDSTATE // INCOME SEED
 *
 * A short demo ledger of received payments — the last few months of salary,
 * freelance and rental inflows — so the net-cashflow readout has something to
 * show on first boot.
 */
import type { Income, IncomeCategory } from './types'
import { addDaysISO, nowStamp, todayISO } from './date'
import { db } from './db'

interface IncomeSeedSpec {
  daysAgo: number
  title: string
  amount: number
  category: IncomeCategory
  notes?: string
}

const SEED_SPECS: IncomeSeedSpec[] = [
  { daysAgo: 2, title: 'Salary — Acme Technologies', amount: 95000, category: 'salary' },
  { daysAgo: 9, title: 'Freelance — Studio Nine', amount: 28000, category: 'freelance', notes: 'Brand identity retainer' },
  { daysAgo: 16, title: 'Flat Rent — Block C', amount: 22000, category: 'rental' },
  { daysAgo: 24, title: 'Dividend — Index Fund', amount: 6500, category: 'investment' },
  { daysAgo: 33, title: 'Salary — Acme Technologies', amount: 95000, category: 'salary' },
  { daysAgo: 41, title: 'Freelance — Studio Nine', amount: 21000, category: 'freelance' },
  { daysAgo: 52, title: 'Salary — Acme Technologies', amount: 95000, category: 'salary' },
]

export function buildIncomeSeed(today: string): Income[] {
  const now = nowStamp()
  return SEED_SPECS.map((spec, i) => ({
    id: `seed-income-${i}`,
    title: spec.title,
    amount: spec.amount,
    currency: 'INR',
    category: spec.category,
    method: 'netbanking' as const,
    date: addDaysISO(today, -spec.daysAgo),
    notes: spec.notes ?? '',
    createdAt: now,
    updatedAt: now,
  }))
}

let incomeSeedOnce: Promise<void> | null = null

export async function ensureIncomeSeeded(): Promise<void> {
  if (incomeSeedOnce) return incomeSeedOnce
  incomeSeedOnce = (async () => {
    // Purge rows left over from the earlier recurring-income shape (they carry
    // `nextDate` instead of `date`) so nothing downstream reads a bad record.
    const rows = await db.incomes.toArray()
    const stale = rows.filter((row) => typeof (row as { date?: unknown }).date !== 'string')
    if (stale.length) {
      await db.incomes.bulkDelete(stale.map((row) => row.id))
      await db.meta.delete('income.seeded')
    }

    const marker = await db.meta.get('income.seeded')
    if (marker) return
    const incomes = buildIncomeSeed(todayISO())
    await db.transaction('rw', db.incomes, db.meta, async () => {
      await db.incomes.bulkPut(incomes)
      await db.meta.put({ key: 'income.seeded', value: nowStamp() })
    })
  })()
  return incomeSeedOnce
}

/** Clears the one-shot guard so a demo reset can re-seed income. */
export function resetIncomeSeed(): void {
  incomeSeedOnce = null
}
