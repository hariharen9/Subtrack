/**
 * SPENDSTATE // ACCOUNT ANALYTICS
 *
 * The spine. An account's balance is **derived** — never stored — from every
 * logged movement that touches it: income in, spends out, subscription charges,
 * loan EMIs, card settlements and transfers. Net worth is then assets minus
 * credit liabilities across all active accounts.
 */
import type {
  Account,
  AccountType,
  Transfer,
  Income,
  Spend,
  Subscription,
  Payment,
  Loan,
  LoanPayment,
  CreditCard,
  CardTransaction,
} from './types'
import { ACCOUNT_TYPE_META } from './types'
import { convert } from './money'
import { monthKey, todayISO } from './date'

export interface AccountMovement {
  id: string
  date: string
  label: string
  /** Signed, already in the account's own currency. */
  amount: number
  kind: 'income' | 'spend' | 'subscription' | 'loan' | 'card' | 'transfer'
}

/** Every dataset the account ledger reads from. */
export interface LedgerInput {
  incomes: Income[]
  spends: Spend[]
  subscriptions: Subscription[]
  payments: Payment[]
  loans: Loan[]
  loanPayments: LoanPayment[]
  cards: CreditCard[]
  cardTransactions: CardTransaction[]
  transfers: Transfer[]
}

export function accountMovements(account: Account, input: LedgerInput): AccountMovement[] {
  const out: AccountMovement[] = []
  const conv = (amount: number, currency: string) => convert(amount, currency, account.currency)

  for (const i of input.incomes) {
    if (i.accountId === account.id) {
      out.push({ id: `inc-${i.id}`, date: i.date, label: i.title, amount: conv(i.amount, i.currency), kind: 'income' })
    }
  }
  for (const s of input.spends) {
    if (s.accountId === account.id) {
      out.push({ id: `spd-${s.id}`, date: s.date, label: s.title, amount: -conv(s.amount, s.currency), kind: 'spend' })
    }
  }

  const subById = new Map(input.subscriptions.map((s) => [s.id, s]))
  for (const p of input.payments) {
    const sub = subById.get(p.subId)
    if (sub?.accountId === account.id) {
      out.push({ id: `pay-${p.id}`, date: p.date, label: `${p.name} · subscription`, amount: -conv(p.amount, p.currency), kind: 'subscription' })
    }
  }

  const loanById = new Map(input.loans.map((l) => [l.id, l]))
  for (const p of input.loanPayments) {
    const loan = loanById.get(p.loanId)
    if (loan?.accountId === account.id) {
      out.push({ id: `emi-${p.id}`, date: p.date, label: `${loan.name} · EMI`, amount: -conv(p.amount, p.currency), kind: 'loan' })
    }
  }

  const cardById = new Map(input.cards.map((c) => [c.id, c]))
  for (const t of input.cardTransactions) {
    const card = cardById.get(t.cardId)
    if (card?.accountId === account.id && t.type === 'payment') {
      out.push({ id: `crd-${t.id}`, date: t.date, label: `${card.name} payment`, amount: -conv(t.amount, t.currency), kind: 'card' })
    }
  }

  for (const tr of input.transfers) {
    if (tr.fromAccountId === account.id) {
      out.push({ id: `tro-${tr.id}`, date: tr.date, label: 'Transfer out', amount: -conv(tr.amount, tr.currency), kind: 'transfer' })
    }
    if (tr.toAccountId === account.id) {
      out.push({ id: `tri-${tr.id}`, date: tr.date, label: 'Transfer in', amount: conv(tr.amount, tr.currency), kind: 'transfer' })
    }
  }

  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export function accountBalance(account: Account, input: LedgerInput): number {
  const net = accountMovements(account, input).reduce((sum, m) => sum + m.amount, 0)
  return Math.round((account.openingBalance + net) * 100) / 100
}

export interface AccountView {
  account: Account
  /** Balance in the account's own currency. */
  balance: number
  /** Balance normalised to the base currency. */
  balanceBase: number
  liability: boolean
  movements: AccountMovement[]
  movementCount: number
  /** Net movement this calendar month, in base. */
  monthNet: number
  /** Share of total assets, 0..1. */
  share: number
}

export interface AccountTypeSlice {
  type: AccountType
  label: string
  code: string
  signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
  total: number
  count: number
  share: number
}

export interface AccountNote {
  id: string
  label: string
  text: string
  signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
}

export interface AccountsSummary {
  base: string
  today: string
  views: AccountView[]
  active: AccountView[]
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  /** Cash-like balances (bank/savings/cash/wallet). */
  liquid: number
  byType: AccountTypeSlice[]
  recent: (AccountMovement & { account: Account })[]
  movementCount: number
  notes: AccountNote[]
}

export function summarizeAccounts(
  accounts: Account[],
  input: LedgerInput,
  base: string,
  today: string = todayISO(),
): AccountsSummary {
  const thisMonth = monthKey(today)

  const views: AccountView[] = accounts.map((account) => {
    const movements = accountMovements(account, input)
    const balance = Math.round((account.openingBalance + movements.reduce((s, m) => s + m.amount, 0)) * 100) / 100
    const monthNet = movements
      .filter((m) => monthKey(m.date) === thisMonth)
      .reduce((s, m) => s + convert(m.amount, account.currency, base), 0)
    return {
      account,
      balance,
      balanceBase: convert(balance, account.currency, base),
      liability: ACCOUNT_TYPE_META[account.type].liability,
      movements,
      movementCount: movements.length,
      monthNet,
      share: 0,
    }
  })

  const active = views.filter((v) => v.account.status === 'active')
  const totalAssets = active.filter((v) => !v.liability).reduce((s, v) => s + Math.max(0, v.balanceBase), 0)
  const totalLiabilities = active.filter((v) => v.liability).reduce((s, v) => s + Math.abs(v.balanceBase), 0)
  const netWorth = totalAssets - totalLiabilities

  for (const v of views) {
    v.share = totalAssets > 0 && !v.liability && v.balanceBase > 0 ? v.balanceBase / totalAssets : 0
  }

  const liquidTypes = new Set<AccountType>(['bank', 'savings', 'cash', 'wallet'])
  const liquid = active.filter((v) => liquidTypes.has(v.account.type)).reduce((s, v) => s + v.balanceBase, 0)

  const typeMap = new Map<AccountType, { total: number; count: number }>()
  for (const v of active) {
    if (v.liability) continue
    const b = typeMap.get(v.account.type) ?? { total: 0, count: 0 }
    b.total += Math.max(0, v.balanceBase)
    b.count += 1
    typeMap.set(v.account.type, b)
  }
  const byType: AccountTypeSlice[] = [...typeMap.entries()]
    .map(([type, b]) => {
      const meta = ACCOUNT_TYPE_META[type]
      return { type, label: meta.label, code: meta.code, signal: meta.signal, total: b.total, count: b.count, share: totalAssets > 0 ? b.total / totalAssets : 0 }
    })
    .sort((a, b) => b.total - a.total)

  const recent = views
    .flatMap((v) => v.movements.map((m) => ({ ...m, account: v.account })))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 12)

  const movementCount = views.reduce((s, v) => s + v.movementCount, 0)

  const summary: AccountsSummary = {
    base,
    today,
    views,
    active,
    netWorth,
    totalAssets,
    totalLiabilities,
    liquid,
    byType,
    recent,
    movementCount,
    notes: [],
  }
  summary.notes = buildAccountNotes(summary)
  return summary
}

function buildAccountNotes(summary: AccountsSummary): AccountNote[] {
  const notes: AccountNote[] = []
  if (summary.views.length === 0) return notes

  const negative = summary.active.find((v) => v.balance < 0)
  if (negative) {
    notes.push({
      id: 'negative',
      label: 'NEGATIVE BALANCE',
      signal: 'red',
      text: `${negative.account.name} is below zero (${formatInBase(negative.balanceBase, summary.base)}).`,
    })
  }

  const top = summary.byType[0]
  if (top && top.share >= 0.6 && summary.byType.length > 1) {
    notes.push({
      id: 'concentration',
      label: 'ASSET CONCENTRATION',
      signal: 'orange',
      text: `${top.label} holds ${(top.share * 100).toFixed(0)}% of your assets.`,
    })
  }

  if (summary.liquid > 0 && summary.netWorth > 0) {
    notes.push({
      id: 'liquid',
      label: 'LIQUID COVER',
      signal: 'acid',
      text: `${formatInBase(summary.liquid, summary.base)} is immediately liquid across cash-like accounts.`,
    })
  }

  return notes.slice(0, 3)
}

/** Small local currency formatter so notes need not import the money module. */
function formatInBase(amount: number, base: string): string {
  return new Intl.NumberFormat(base === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: base,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}
