/**
 * SPENDSTATE // DEBT ANALYTICS
 *
 * Pure functions over (loans, loanPayments, baseCurrency, today) — nothing
 * stored, nothing guessed. Every metric is derived from real rows.
 */
import type { Loan, LoanPayment, LoanType } from './types'
import { LOAN_TYPE_META } from './types'
import { convert, formatMoney } from './money'
import { addMonthsClamped, diffDays, formatSignalDate, todayISO } from './date'

/* ── EMI Calculator ──────────────────────────────────────────────────── */

/** Standard reducing-balance EMI formula: EMI = P × r × (1+r)^n / ((1+r)^n − 1) */
export function calcEMI(principal: number, annualRate: number, tenureMonths: number): number {
  if (tenureMonths <= 0) return principal
  if (annualRate === 0) return principal / tenureMonths
  const r = annualRate / 12 / 100
  const factor = Math.pow(1 + r, tenureMonths)
  return (principal * r * factor) / (factor - 1)
}

/** Total interest over the life of the loan. */
export function totalInterest(principal: number, emi: number, tenureMonths: number): number {
  return emi * tenureMonths - principal
}

/* ── Amortization ────────────────────────────────────────────────────── */

export interface AmortRow {
  emiNumber: number
  date: string
  emi: number
  principal: number
  interest: number
  balance: number
}

/** Generate a full amortization schedule from start date. */
export function amortize(loan: Loan): AmortRow[] {
  const rows: AmortRow[] = []
  const r = loan.interestRate / 12 / 100
  let balance = loan.principal
  for (let i = 1; i <= loan.tenureMonths; i++) {
    const interest = balance * r
    const principal = Math.min(loan.emi - interest, balance)
    balance = Math.max(0, balance - principal)
    rows.push({
      emiNumber: i,
      date: addMonthsClamped(loan.startDate, i - 1),
      emi: loan.emi,
      principal,
      interest,
      balance,
    })
    if (balance <= 0.01) break
  }
  return rows
}

/* ── Loan View ───────────────────────────────────────────────────────── */

export interface LoanView {
  loan: Loan
  /** Outstanding balance (from last recorded payment or computed from schedule). */
  outstanding: number
  /** How many EMIs have been paid. */
  emisPaid: number
  /** Remaining EMIs. */
  emisRemaining: number
  /** Total interest paid so far. */
  interestPaid: number
  /** Total principal paid so far. */
  principalPaid: number
  /** Total interest over the full tenure. */
  totalInterestCost: number
  /** Progress 0..1 (principal paid / principal). */
  progress: number
  /** Projected debt-free date. */
  debtFreeDate: string
  /** Days until debt-free. */
  daysRemaining: number
  /** Share of total outstanding debt. */
  share: number
  /** Monthly interest cost on current outstanding. */
  monthlyInterestCost: number
}

export function viewOf(
  loan: Loan,
  payments: LoanPayment[],
  _base: string,
  today: string,
  totalOutstanding: number,
): LoanView {
  const sorted = [...payments].sort((a, b) => a.emiNumber - b.emiNumber)
  const last = sorted[sorted.length - 1]
  const emisPaid = sorted.length
  const emisRemaining = Math.max(0, loan.tenureMonths - emisPaid)

  // Outstanding: use last recorded balance, or compute from schedule
  let outstanding: number
  if (last) {
    outstanding = last.balanceAfter
  } else {
    // No payments yet — full principal
    outstanding = loan.principal
  }

  const principalPaid = sorted.reduce((sum, p) => sum + p.principalComponent, 0)
  const interestPaid = sorted.reduce((sum, p) => sum + p.interestComponent, 0)
  const totalInterestCost = totalInterest(loan.principal, loan.emi, loan.tenureMonths)
  const progress = loan.principal > 0 ? principalPaid / loan.principal : 0

  // Debt-free date: from last payment date + remaining EMIs, or from start + tenure
  let debtFreeDate: string
  if (loan.status === 'paid_off') {
    debtFreeDate = loan.closedAt ?? today
  } else if (last) {
    debtFreeDate = addMonthsClamped(last.date, emisRemaining)
  } else {
    debtFreeDate = addMonthsClamped(loan.startDate, loan.tenureMonths - 1)
  }

  const daysRemaining = loan.status === 'paid_off' ? 0 : Math.max(0, diffDays(debtFreeDate, today))

  const share = totalOutstanding > 0 ? outstanding / totalOutstanding : 0
  const monthlyInterestCost = outstanding * (loan.interestRate / 12 / 100)

  return {
    loan,
    outstanding,
    emisPaid,
    emisRemaining,
    interestPaid,
    principalPaid,
    totalInterestCost,
    progress,
    debtFreeDate,
    daysRemaining,
    share,
    monthlyInterestCost,
  }
}

/* ── Debt Summary ────────────────────────────────────────────────────── */

export interface DebtTypeSlice {
  loanType: LoanType
  label: string
  code: string
  signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
  outstanding: number
  emi: number
  count: number
  share: number
}

export interface DebtSummary {
  base: string
  today: string
  /** All loan views (active + paid off). */
  views: LoanView[]
  /** Active only. */
  activeViews: LoanView[]
  /** Paid off. */
  paidOffViews: LoanView[]
  /** Total outstanding across active loans (base currency). */
  totalOutstanding: number
  /** Total monthly EMI burden (base currency). */
  monthlyBurden: number
  /** Total interest paid across all loans (base currency). */
  totalInterestPaid: number
  /** Total interest cost over full tenure (active loans). */
  totalInterestCost: number
  /** Average interest rate (weighted by outstanding). */
  avgInterestRate: number
  /** Nearest debt-free date among active loans. */
  nearestDebtFree: { loan: Loan; date: string; days: number } | null
  /** Furthest debt-free date. */
  furthestDebtFree: { loan: Loan; date: string; days: number } | null
  /** Grouped by loan type. */
  types: DebtTypeSlice[]
  /** Active loan count. */
  activeCount: number
  /** Total loans (all statuses). */
  totalCount: number
  /** Overall progress (total principal paid / total principal). */
  overallProgress: number
}

export function summarizeDebt(
  loans: Loan[],
  allPayments: LoanPayment[],
  base: string,
  today: string = todayISO(),
): DebtSummary {
  const paymentsByLoan = new Map<string, LoanPayment[]>()
  for (const p of allPayments) {
    const bucket = paymentsByLoan.get(p.loanId) ?? []
    bucket.push(p)
    paymentsByLoan.set(p.loanId, bucket)
  }

  // Compute total outstanding first (for share calculation)
  const activeLoans = loans.filter((l) => l.status === 'active')
  let totalOutstanding = 0
  for (const loan of activeLoans) {
    const payments = paymentsByLoan.get(loan.id) ?? []
    const sorted = [...payments].sort((a, b) => a.emiNumber - b.emiNumber)
    const last = sorted[sorted.length - 1]
    const outstanding = last ? last.balanceAfter : loan.principal
    totalOutstanding += convert(outstanding, loan.currency, base)
  }

  const views: LoanView[] = loans.map((loan) =>
    viewOf(loan, paymentsByLoan.get(loan.id) ?? [], base, today, totalOutstanding),
  )

  const activeViews = views.filter((v) => v.loan.status === 'active')
  const paidOffViews = views.filter((v) => v.loan.status === 'paid_off')

  const monthlyBurden = activeViews.reduce((sum, v) => sum + convert(v.loan.emi, v.loan.currency, base), 0)
  const totalInterestPaid = views.reduce((sum, v) => sum + convert(v.interestPaid, v.loan.currency, base), 0)
  const totalInterestCost = activeViews.reduce((sum, v) => sum + convert(v.totalInterestCost, v.loan.currency, base), 0)

  // Weighted average interest rate
  let weightedRate = 0
  let weightTotal = 0
  for (const v of activeViews) {
    const out = convert(v.outstanding, v.loan.currency, base)
    weightedRate += v.loan.interestRate * out
    weightTotal += out
  }
  const avgInterestRate = weightTotal > 0 ? weightedRate / weightTotal : 0

  // Debt-free projections
  const activeDated = activeViews
    .filter((v) => v.daysRemaining > 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
  const nearestDebtFree = activeDated[0]
    ? { loan: activeDated[0].loan, date: activeDated[0].debtFreeDate, days: activeDated[0].daysRemaining }
    : null
  const furthestDebtFree = activeDated.length > 0
    ? {
        loan: activeDated[activeDated.length - 1].loan,
        date: activeDated[activeDated.length - 1].debtFreeDate,
        days: activeDated[activeDated.length - 1].daysRemaining,
      }
    : null

  // By type
  const typeMap = new Map<LoanType, { outstanding: number; emi: number; count: number }>()
  for (const v of activeViews) {
    const bucket = typeMap.get(v.loan.loanType) ?? { outstanding: 0, emi: 0, count: 0 }
    bucket.outstanding += convert(v.outstanding, v.loan.currency, base)
    bucket.emi += convert(v.loan.emi, v.loan.currency, base)
    bucket.count++
    typeMap.set(v.loan.loanType, bucket)
  }
  const types: DebtTypeSlice[] = [...typeMap.entries()]
    .map(([loanType, bucket]) => {
      const meta = LOAN_TYPE_META[loanType]
      return {
        loanType,
        label: meta.label,
        code: meta.code,
        signal: meta.signal,
        outstanding: bucket.outstanding,
        emi: bucket.emi,
        count: bucket.count,
        share: totalOutstanding > 0 ? bucket.outstanding / totalOutstanding : 0,
      }
    })
    .sort((a, b) => b.outstanding - a.outstanding)

  // Overall progress
  const totalPrincipal = views.reduce((sum, v) => sum + convert(v.loan.principal, v.loan.currency, base), 0)
  const totalPrincipalPaid = views.reduce((sum, v) => sum + convert(v.principalPaid, v.loan.currency, base), 0)
  const overallProgress = totalPrincipal > 0 ? totalPrincipalPaid / totalPrincipal : 0

  return {
    base,
    today,
    views,
    activeViews,
    paidOffViews,
    totalOutstanding,
    monthlyBurden,
    totalInterestPaid,
    totalInterestCost,
    avgInterestRate,
    nearestDebtFree,
    furthestDebtFree,
    types,
    activeCount: activeLoans.length,
    totalCount: loans.length,
    overallProgress,
  }
}

/* ── Debt Notes ──────────────────────────────────────────────────────── */

export interface DebtNote {
  id: string
  label: string
  text: string
  signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
}

export function buildDebtNotes(summary: DebtSummary): DebtNote[] {
  const notes: DebtNote[] = []

  // High interest burden
  if (summary.avgInterestRate >= 12) {
    notes.push({
      id: 'high-rate',
      label: 'HIGH INTEREST BURDEN',
      signal: 'red',
      text: `Weighted average rate is ${summary.avgInterestRate.toFixed(1)}% — consider refinancing or accelerated repayment.`,
    })
  }

  // Near debt-free
  if (summary.nearestDebtFree && summary.nearestDebtFree.days <= 90) {
    notes.push({
      id: 'near-free',
      label: 'ALMOST DEBT-FREE',
      signal: 'acid',
      text: `${summary.nearestDebtFree.loan.name} clears in ${summary.nearestDebtFree.days} days (${formatSignalDate(summary.nearestDebtFree.date)}).`,
    })
  }

  // Single loan dominance
  const topShare = summary.activeViews[0]?.share ?? 0
  if (summary.activeViews.length > 1 && topShare >= 0.6) {
    notes.push({
      id: 'dominance',
      label: 'CONCENTRATED DEBT',
      signal: 'magenta',
      text: `${summary.activeViews[0].loan.name} is ${(topShare * 100).toFixed(0)}% of your total outstanding.`,
    })
  }

  // Heavy EMI burden (more than 40% of outstanding as monthly)
  const emiRatio = summary.totalOutstanding > 0 ? (summary.monthlyBurden * 12) / summary.totalOutstanding : 0
  if (emiRatio >= 0.3) {
    notes.push({
      id: 'emi-heavy',
      label: 'HEAVY EMI BURDEN',
      signal: 'orange',
      text: `Annual EMI outflow is ${(emiRatio * 100).toFixed(0)}% of total outstanding — cash flow is tight.`,
    })
  }

  // Interest vs principal
  if (summary.totalInterestCost > summary.totalOutstanding * 0.5) {
    notes.push({
      id: 'interest-cost',
      label: 'INTEREST OVERHEAD',
      signal: 'orange',
      text: `Total interest cost (${formatMoney(summary.totalInterestCost, summary.base)}) exceeds 50% of outstanding principal.`,
    })
  }

  return notes.slice(0, 5)
}