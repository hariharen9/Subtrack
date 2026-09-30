/**
 * SUBTRACK // DEBT SEED
 *
 * Demo loan dataset — 5 loans (4 active, 1 paid off) with reconstructed
 * payment histories. Realistic Indian pricing and rates.
 */
import type { Loan, LoanPayment, LoanType } from './types'
import { addMonthsClamped, todayISO, nowStamp } from './date'
import { db } from './db'

interface LoanSeedSpec {
  name: string
  lender: string
  loanType: LoanType
  principal: number
  interestRate: number
  tenureMonths: number
  emi: number
  currency: string
  monthsAgo: number
  emisPaid: number
  status: 'active' | 'paid_off'
}

const SEED_SPECS: LoanSeedSpec[] = [
  {
    name: 'Home Loan',
    lender: 'SBI',
    loanType: 'home',
    principal: 3500000,
    interestRate: 8.5,
    tenureMonths: 240,
    emi: 30326,
    currency: 'INR',
    monthsAgo: 48,
    emisPaid: 48,
    status: 'active',
  },
  {
    name: 'Car Loan',
    lender: 'HDFC Bank',
    loanType: 'vehicle',
    principal: 800000,
    interestRate: 9.25,
    tenureMonths: 60,
    emi: 16733,
    currency: 'INR',
    monthsAgo: 24,
    emisPaid: 24,
    status: 'active',
  },
  {
    name: 'Education Loan',
    lender: 'SBI',
    loanType: 'education',
    principal: 1200000,
    interestRate: 7.5,
    tenureMonths: 84,
    emi: 18618,
    currency: 'INR',
    monthsAgo: 36,
    emisPaid: 36,
    status: 'active',
  },
  {
    name: 'Personal Loan',
    lender: 'Bajaj Finserv',
    loanType: 'personal',
    principal: 300000,
    interestRate: 12.5,
    tenureMonths: 36,
    emi: 10041,
    currency: 'INR',
    monthsAgo: 18,
    emisPaid: 18,
    status: 'active',
  },
  {
    name: 'Gold Loan',
    lender: 'Muthoot Finance',
    loanType: 'gold',
    principal: 200000,
    interestRate: 11.0,
    tenureMonths: 24,
    emi: 9315,
    currency: 'INR',
    monthsAgo: 26,
    emisPaid: 24,
    status: 'paid_off',
  },
]

export function buildDebtSeed(today: string): { loans: Loan[]; loanPayments: LoanPayment[] } {
  const loans: Loan[] = []
  const loanPayments: LoanPayment[] = []
  const now = nowStamp()

  for (const spec of SEED_SPECS) {
    const id = `seed-loan-${spec.loanType}`
    const startDate = addMonthsClamped(today, -spec.monthsAgo)
    const closedAt = spec.status === 'paid_off' ? addMonthsClamped(startDate, spec.emisPaid - 1) : undefined

    const loan: Loan = {
      id,
      name: spec.name,
      lender: spec.lender,
      loanType: spec.loanType,
      status: spec.status,
      principal: spec.principal,
      interestRate: spec.interestRate,
      tenureMonths: spec.tenureMonths,
      emi: spec.emi,
      currency: spec.currency,
      startDate,
      closedAt,
      notes: '',
      createdAt: now,
      updatedAt: now,
    }
    loans.push(loan)

    // Generate amortization payments
    const r = spec.interestRate / 12 / 100
    let balance = spec.principal
    for (let i = 0; i < spec.emisPaid; i++) {
      const interest = balance * r
      const principalComponent = Math.min(spec.emi - interest, balance)
      balance = Math.max(0, balance - principalComponent)
      loanPayments.push({
        id: `seed-lp-${spec.loanType}-${i}`,
        loanId: id,
        date: addMonthsClamped(startDate, i),
        amount: spec.emi,
        currency: spec.currency,
        principalComponent,
        interestComponent: interest,
        balanceAfter: balance,
        emiNumber: i + 1,
        createdAt: now,
      })
    }
  }

  return { loans, loanPayments }
}

let debtSeedOnce: Promise<void> | null = null

export async function ensureDebtSeeded(): Promise<void> {
  if (debtSeedOnce) return debtSeedOnce
  debtSeedOnce = (async () => {
    const marker = await db.meta.get('debt.seeded')
    if (marker) return
    const { loans, loanPayments } = buildDebtSeed(todayISO())
    await db.transaction('rw', db.loans, db.loanPayments, db.meta, async () => {
      await db.loans.bulkPut(loans)
      await db.loanPayments.bulkPut(loanPayments)
      await db.meta.put({ key: 'debt.seeded', value: nowStamp() })
    })
  })()
  return debtSeedOnce
}

/** Clears the one-shot guard so a demo reset can re-seed loans. */
export function resetDebtSeed(): void {
  debtSeedOnce = null
}