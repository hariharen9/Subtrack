/**
 * SPENDSTATE // MIGRATE FROM SPENDWISER
 *
 * A one-time, one-direction, file-based handoff. The companion app
 * (spendwiser) exports a comprehensive JSON document; this module converts it
 * into a native SpendState Snapshot and reuses the existing import path so the
 * same validation and transactional bulk-write apply.
 *
 * The two schemas differ sharply, so this is a mapping, not a copy:
 *   - SW flat transactions split into spends / incomes / subscriptions-payments /
 *     loan-payments / card-transactions, each consumed exactly once.
 *   - Recurring transactions become Subscriptions (their generated charges
 *     become Payments); loan transactions become LoanPayments; credit-card
 *     account transactions become CardTransactions; anything left is a Spend
 *     or an Income on the mapped bank account.
 *   - Account `openingBalance` is back-solved so the reconstructed derived
 *     balance reconciles to the SW snapshot balance (pre-history folds into
 *     openingBalance rather than being lost).
 *   - SW has no home for budgets / goals / total-budget / shortcuts / tags /
 *     bill-splitting / sms -> those are dropped and reported as losses.
 */
import type { Snapshot, ImportReport } from './db'
import type {
  AppSettings,
  Subscription,
  Payment,
  Spend,
  Income,
  Loan,
  LoanPayment,
  CreditCard,
  CardTransaction,
  Account,
  BillingCycle,
  Category,
  SpendCategory,
  AccountType,
  LoanType,
  CardNetwork,
  IncomeCategory,
} from './types'
import { getCategorySignal } from './types'
import { CURRENCIES } from './money'
import { INCOME_CATEGORIES } from './types'
import { amortize } from './debt'
import { matchCatalog } from './catalog'
import { newId } from './id'
import { todayISO, nowStamp, addDaysISO, addMonthsClamped } from './date'

/* ── Input shape (mirrors what SpendWiser exports) ────────────────────── */

export interface SpendWiserMigrationExport {
  app: 'spendwiser'
  version: number
  exportedAt: string
  currency: string
  themePreference?: string
  baseCurrencyCode?: string
  entities: {
    transactions: Record<string, unknown>[]
    accounts: Record<string, unknown>[]
    budgets?: Record<string, unknown>[]
    goals?: Record<string, unknown>[]
    loans?: Record<string, unknown>[]
    recurringTransactions?: Record<string, unknown>[]
    shortcuts?: Record<string, unknown>[]
    pendingTransactions?: Record<string, unknown>[]
    billSplitting?: {
      participants?: Record<string, unknown>[]
      groups?: Record<string, unknown>[]
      expenses?: { groupId: string; docId: string; data: Record<string, unknown> }[]
    }
    totalBudget?: Record<string, unknown>[]
  }
  settings?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

interface Converted {
  snapshot: Snapshot & { migratedFrom: 'spendwiser'; migratedLosses: string[] }
  counts: Omit<ImportReport, 'mode'>
  losses: string[]
}

/* ── Small validated mappings ─────────────────────────────────────────── */

const SYMBOL_TO_CODE: Record<string, string> = {
  '₹': 'INR',
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  'AED': 'AED',
  'S$': 'SGD',
  'A$': 'AUD',
  'C$': 'CAD',
  '¥': 'JPY',
}

const SW_ACCOUNT_TYPE: Record<string, AccountType> = {
  Checking: 'bank',
  Savings: 'bank',
  'Business Checking': 'bank',
  Investment: 'investment',
  bank: 'bank',
  savings: 'bank',
  cash: 'cash',
  wallet: 'wallet',
  investment: 'investment',
  other: 'other',
}

const SW_LOAN_TYPE: Record<string, LoanType> = {
  home: 'home',
  auto: 'vehicle',
  student: 'education',
  personal: 'personal',
  other: 'other',
}

const SW_NETWORK: Record<string, CardNetwork> = {
  rupay: 'rupay',
  amex: 'amex',
  discover: 'other',
  maestro: 'other',
  visa: 'visa',
  mastercard: 'mastercard',
  diners: 'diners',
  jcb: 'other',
}

const SW_FREQUENCY: Record<string, BillingCycle> = {
  daily: 'custom',
  weekly: 'weekly',
  monthly: 'monthly',
  yearly: 'yearly',
}

/**
 * SpendState reads Income.category non-defensively (`INCOME_CATEGORY_META[cat].label`),
 * and IncomeCategory is a strict 7-value union with no free-form escape. SpendWiser
 * incomes carry arbitrary user categories, so we map onto the known vocabulary and
 * default anything unrecognised to 'other' — guaranteeing a migrated income can never
 * crash an insights render.
 */
const INCOME_BY_KEY: Record<string, IncomeCategory> = (() => {
  const map: Record<string, IncomeCategory> = {}
  for (const c of INCOME_CATEGORIES) {
    map[c.id] = c.id
    map[c.id.toLowerCase()] = c.id
    map[c.label.toLowerCase()] = c.id
    if (c.label.includes(' / ')) {
      // also register the second half of a two-part label, e.g. "Gift / Bonus"
      for (const part of c.label.split(' / ')) map[part.toLowerCase()] = c.id
    }
  }
  // Extra common synonyms an old app might have used.
  for (const [alias, id] of [
    ['sal', 'salary'],
    ['wages', 'salary'],
    ['payslip', 'salary'],
    ['free', 'freelance'],
    ['side hustle', 'freelance'],
    ['biz', 'business'],
    ['inv', 'investment'],
    ['investments', 'investment'],
    ['interest', 'investment'],
    ['dividend', 'investment'],
    ['rent', 'rental'],
    ['rental income', 'rental'],
    ['bonus', 'gift'],
    ['gift/bonus', 'gift'],
    ['everything else', 'other'],
  ] as [string, IncomeCategory][]) {
    map[alias] = id
  }
  return map
})()

function mapIncomeCategory(cat: string): IncomeCategory {
  const raw = (cat || '').trim()
  if (!raw) return 'other'
  const key = raw.toLowerCase()
  return INCOME_BY_KEY[key] ?? INCOME_BY_KEY[raw] ?? 'other'
}

const SIGNAL_HEX: Record<string, string> = {
  acid: '#a3e635',
  blue: '#60a5fa',
  magenta: '#f472b6',
  orange: '#fb923c',
  red: '#f87171',
}

const PALETTE = ['#22d3ee', '#f472b6', '#a3e635', '#fbbf24', '#60a5fa', '#a78bfa', '#34d399', '#fb7185']
const colorAt = (i: number): string => PALETTE[i % PALETTE.length]

/* ── Field readers (the file is loose, so default defensively) ────────── */

const str = (o: Record<string, unknown> | undefined, key: string, fb = ''): string =>
  (o && o[key] !== undefined && o[key] !== null ? String(o[key]) : fb) || fb
const num = (o: Record<string, unknown> | undefined, key: string): number => {
  const v = o?.[key]
  if (v === undefined || v === null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const absNum = (o: Record<string, unknown> | undefined, key: string): number => Math.abs(num(o, key))

/** A SW "YYYY-MM-DD" or ISO-timestamp or {seconds} → plain YYYY-MM-DD. */
function toIsoDate(raw: unknown, fallback = todayISO()): string {
  if (raw === undefined || raw === null) return fallback
  if (typeof raw === 'string') {
    const s = raw.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? fallback : d.toISOString().slice(0, 10)
  }
  if (typeof raw === 'object') {
    const o = raw as { seconds?: number; toDate?: () => Date }
    if (typeof o.toDate === 'function') return o.toDate().toISOString().slice(0, 10)
    if (typeof o.seconds === 'number') return new Date(o.seconds * 1000).toISOString().slice(0, 10)
  }
  return fallback
}

const round2 = (n: number): number => Math.round(n * 100) / 100

/** Map a firestore currency symbol (or code) to a SpendState currency code. */
function resolveBaseCurrency(raw: SpendWiserMigrationExport): string {
  const code = raw.baseCurrencyCode
  if (code && CURRENCIES.some((c) => c.code === code.toUpperCase())) return code.toUpperCase()
  const sym = raw.currency
  if (sym && CURRENCIES.some((c) => c.code === sym.toUpperCase())) return sym.toUpperCase()
  if (sym && SYMBOL_TO_CODE[sym]) return SYMBOL_TO_CODE[sym]
  return 'INR'
}

function buildNotes(txn: Record<string, unknown>): string {
  const bits: string[] = []
  const comments = str(txn, 'comments')
  if (comments) bits.push(comments)
  const tags = txn.tags
  if (Array.isArray(tags)) {
    const t = tags.map((x) => String(x)).filter(Boolean)
    if (t.length) bits.push(`tags: ${t.join(', ')}`)
  }
  return bits.join(' · ')
}

/* ── Converter ────────────────────────────────────────────────────────── */

export function convertSpendWiserToSnapshot(raw: SpendWiserMigrationExport): Converted {
  const base = resolveBaseCurrency(raw)

  const settings: AppSettings = {
    baseCurrency: base,
    theme: raw.themePreference === 'dark' ? 'dark' : 'day',
    uiMode: 'cyber',
    zenAccent: 'emerald',
    field: true,
    horizonDays: 30,
  }

  const now = nowStamp()
  const losses: string[] = []

  const en = raw.entities
  const swAccounts = Array.isArray(en?.accounts) ? en.accounts : []
  const swTransactions = Array.isArray(en?.transactions) ? en.transactions : []

  /* 0. One pass: SW account.id → new SpendState UUID (bank + credit cards). */
  const idMap = new Map<string, string>()
  for (const a of swAccounts) {
    const id = str(a, 'id')
    if (id) idMap.set(id, newId())
  }
  const mappedId = (sw?: Record<string, unknown>): string | undefined => {
    const ref = str(sw, 'accountId')
    return ref ? idMap.get(ref) : undefined
  }

  /* 1. Accounts + CreditCards from SW accounts. */
  const accounts: Account[] = []
  const cards: CreditCard[] = []
  const swCardByAccountId = new Map<string, CreditCard>()
  swAccounts.forEach((a, i) => {
    const newIdStr = idMap.get(str(a, 'id'))
    const type = str(a, 'type')
    if (type === 'Credit Card' || type === 'credit' || type === 'credit card') {
      const networkRaw = str(a, 'network').toLowerCase()
      const card: CreditCard = {
        id: newIdStr ?? newId(),
        name: str(a, 'name'),
        issuer: str(a, 'name'),
        last4: (str(a, 'last4Digits') || '').slice(-4),
        network: SW_NETWORK[networkRaw] ?? 'other',
        status: 'active',
        creditLimit: num(a, 'limit'),
        interestRate: 0,
        billingDay: clampDay(num(a, 'statementDate')),
        dueDay: clampDay(num(a, 'paymentDueDate')),
        currency: base,
        color: colorAt(i),
        notes: '',
        createdAt: now,
        updatedAt: now,
      }
      cards.push(card)
      if (str(a, 'id')) swCardByAccountId.set(str(a, 'id'), card)
    } else {
      accounts.push({
        id: newIdStr ?? newId(),
        name: str(a, 'name'),
        type: SW_ACCOUNT_TYPE[type] ?? 'other',
        institution: str(a, 'name'),
        currency: base,
        openingBalance: 0, // back-solved below
        color: colorAt(i),
        notes: '',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
    }
  })
  // Reverse SW-account-id → new-id lookup for balance reconciliation.
  const swIdByAccountId = new Map<string, string>()
  for (const [swIdVal, newIdVal] of idMap) swIdByAccountId.set(newIdVal, swIdVal)

  /* 2. Loans → Loan[]; their txns become LoanPayments. */
  const loans: Loan[] = []
  const loanPayments: LoanPayment[] = []
  const swLoans = Array.isArray(en?.loans) ? en.loans : []
  const loanIdBySw = new Map<string, string>()
  for (const l of swLoans) {
    const swId = str(l, 'id')
    const tenureMonths = num(l, 'tenureInMonths') || Math.round(num(l, 'tenure') * 12)
    const principal = num(l, 'loanAmount')
    const emiGiven = num(l, 'emi')
    const emi = emiGiven > 0 ? emiGiven : calcEMI(principal, num(l, 'interestRate'), tenureMonths)
    const loanId = newId()
    if (swId) loanIdBySw.set(swId, loanId)
    loans.push({
      id: loanId,
      name: str(l, 'name'),
      lender: '',
      loanType: SW_LOAN_TYPE[str(l, 'type').toLowerCase()] ?? 'other',
      status: 'active',
      principal,
      interestRate: num(l, 'interestRate'),
      tenureMonths: Math.max(1, tenureMonths),
      emi,
      currency: base,
      startDate: toIsoDate(l.startDate),
      notes: '',
      createdAt: now,
      updatedAt: now,
    })
  }
  // Build amortization schedules per new loan for component reconstruction.
  const amortByLoanId = new Map<string, ReturnType<typeof amortize>>()
  for (const loan of loans) amortByLoanId.set(loan.id, amortize(loan))

  // Rule 7: attribute each loan to the bank account its EMIs were mostly paid
  // from (SW loan-linked transactions' accountId — credit-card accounts excluded).
  for (const l of swLoans) {
    const swLoanId = str(l, 'id')
    const newLoanId = loanIdBySw.get(swLoanId)
    if (!newLoanId) continue
    const counts = new Map<string, number>()
    for (const t of swTransactions) {
      if (str(t, 'loanId') !== swLoanId) continue
      const acc = str(t, 'accountId')
      if (acc && idMap.has(acc) && !swCardByAccountId.has(acc)) {
        counts.set(acc, (counts.get(acc) ?? 0) + 1)
      }
    }
    let bestAcc: string | undefined
    let bestCount = 0
    for (const [acc, c] of counts) {
      if (c > bestCount) {
        bestCount = c
        bestAcc = acc
      }
    }
    if (bestAcc) {
      const loan = loans.find((lo) => lo.id === newLoanId)
      if (loan) loan.accountId = idMap.get(bestAcc)
    }
  }

  /* 3. Recurring → Subscriptions; generated txns → Payments. */
  const subscriptions: Subscription[] = []
  const payments: Payment[] = []
  const swRecurring = Array.isArray(en?.recurringTransactions) ? en.recurringTransactions : []
  const subIdBySwRecurring = new Map<string, string>()
  swRecurring.forEach((r) => {
    const categoryRaw = str(r, 'category')
    const matched = matchCatalog(str(r, 'name'))
    const category: Category = (matched?.category as Category) || (categoryRaw || 'other')
    const signal = getCategorySignal(category)
    const cycle = SW_FREQUENCY[str(r, 'frequency').toLowerCase()] ?? 'monthly'
    const nextBillingDate = rollForwardBilling(
      toIsoDate((r.lastProcessedDate || r.startDate) ?? undefined, todayISO()),
      cycle,
      todayISO(),
    )
    const subId = newId()
    if (str(r, 'id')) subIdBySwRecurring.set(str(r, 'id'), subId)
    subscriptions.push({
      id: subId,
      serviceId: matched?.id ?? null,
      accountId: mappedId(r),
      name: str(r, 'name'),
      price: absNum(r, 'amount'),
      currency: base,
      billingCycle: cycle,
      customIntervalDays: cycle === 'custom' ? 1 : undefined,
      nextBillingDate,
      category,
      icon: matched?.glyph ?? 'cloud',
      color: matched?.color ?? SIGNAL_HEX[signal] ?? '#60a5fa',
      notes: '',
      status: str(r, 'isPaused') === 'true' || r?.isPaused === true ? 'suspended' : 'active',
      createdAt: toIsoDate(r.startDate, now.slice(0, 10)),
      updatedAt: now,
      cyclesExecuted: 0,
      statusChangedAt: undefined,
      lastUsedAt: undefined,
    })
  })
  /* 4. Route every transaction exactly once. */
  const spends: Spend[] = []
  const incomes: Income[] = []
  const cardTransactions: CardTransaction[] = []
  const netByBankAccount = new Map<string, number>() // signed base-currency net

  const addNet = (accId: string | undefined, signedAmount: number): void => {
    if (!accId) return
    const cur = netByBankAccount.get(accId) ?? 0
    netByBankAccount.set(accId, cur + signedAmount)
  }

  for (const t of swTransactions) {
    const txnId = str(t, 'id')
    const kind = str(t, 'type')
    const amount = num(t, 'amount')
    const abs = Math.abs(amount)
    const date = toIsoDate(t.date)
    const cat = str(t, 'category')
    const notes = buildNotes(t)
    const swAccount = idMap.get(str(t, 'accountId'))

    // a) Recurring-generated → subscription charge.
    const recurringRef = str(t, 'recurringTransactionId')
    if (recurringRef && subIdBySwRecurring.has(recurringRef)) {
      const subId = subIdBySwRecurring.get(recurringRef)!
      const sub = subscriptions.find((s) => s.id === subId)
      payments.push({
        id: newId(),
        subId,
        name: str(t, 'name'),
        icon: sub?.icon ?? 'cloud',
        color: sub?.color ?? SIGNAL_HEX[getCategorySignal(cat)] ?? '#60a5fa',
        category: (cat || 'other') as Category,
        date,
        amount: abs,
        currency: base,
        origin: 'confirmed',
      })
      addNet(sub?.accountId, -abs)
      continue
    }

    // b) Loan-generated → LoanPayment.
    const loanRef = str(t, 'loanId')
    if (loanRef && loanIdBySw.has(loanRef)) {
      const loanId = loanIdBySw.get(loanRef)!
      const loan = loans.find((l) => l.id === loanId)
      // EMI sequence by date order (1..n).
      const schedule = amortByLoanId.get(loanId) ?? []
      const seq = loanPayments.filter((p) => p.loanId === loanId).length + 1
      const row = schedule[seq - 1]
      loanPayments.push({
        id: newId(),
        loanId,
        date,
        amount: abs,
        currency: base,
        principalComponent: row ? round2(row.principal) : abs,
        interestComponent: row ? round2(row.interest) : 0,
        balanceAfter: row ? round2(row.balance) : 0,
        emiNumber: seq,
        createdAt: now,
      })
      addNet(loan?.accountId, -abs)
      continue
    }

    // c) On a credit-card account → CardTransaction.
    const card = str(t, 'accountId') ? swCardByAccountId.get(str(t, 'accountId')) : undefined
    if (card) {
      const isPayment = str(t, 'creditCardPaymentId').length > 0 || t.creditCardPaymentId !== undefined
      cardTransactions.push({
        id: newId(),
        cardId: card.id,
        title: str(t, 'name'),
        amount: abs,
        currency: base,
        category: (cat || 'other') as SpendCategory,
        type: isPayment ? 'payment' : 'purchase',
        date,
        rewards: 0,
        notes,
        createdAt: now,
        updatedAt: now,
      })
      continue
    }

    // d) Bank leftovers → Income / Spend.
    if (kind === 'income' || amount > 0) {
      incomes.push({
        id: newId(),
        title: str(t, 'name'),
        amount: abs,
        currency: base,
        category: mapIncomeCategory(cat),
        method: 'other',
        accountId: swAccount,
        date,
        notes,
        createdAt: now,
        updatedAt: now,
      })
      addNet(swAccount, abs)
    } else {
      spends.push({
        id: newId(),
        title: str(t, 'name'),
        amount: abs,
        currency: base,
        category: (cat || 'other') as SpendCategory,
        method: 'other',
        accountId: swAccount,
        date,
        notes,
        createdAt: now,
        updatedAt: now,
      })
      addNet(swAccount, -abs)
    }

    void txnId
  }

  /* 5. Back-solve bank openingBalance so derived balance == SW balance. */
  const swBalanceBySwAccountId = new Map(swAccounts.map((a) => [str(a, 'id'), num(a, 'balance')]))
  for (const acc of accounts) {
    const swId = swIdByAccountId.get(acc.id)
    const swBalance = swId ? swBalanceBySwAccountId.get(swId) ?? 0 : 0
    const net = netByBankAccount.get(acc.id) ?? 0
    acc.openingBalance = round2(swBalance - net)
  }

  /* 6. Losses — SpendState has no home for these. */
  for (const key of ['budgets', 'goals', 'shortcuts', 'pendingTransactions', 'totalBudget'] as const) {
    if (Array.isArray(en?.[key]) && en[key]!.length > 0) losses.push(key)
  }
  if (en?.billSplitting) {
    const g = en.billSplitting.groups?.length ?? 0
    const e = en.billSplitting.expenses?.length ?? 0
    if (g > 0 || e > 0) losses.push(`bill-splitting (${g} groups, ${e} expenses)`)
  }

  const snapshot: Snapshot & { migratedFrom: 'spendwiser'; migratedLosses: string[] } = {
    app: 'spendstate',
    version: 1,
    exportedAt: nowStamp(),
    settings,
    subscriptions,
    payments,
    spends,
    loans,
    loanPayments,
    creditCards: cards,
    cardTransactions,
    incomes,
    accounts,
    transfers: [],
    migratedFrom: 'spendwiser',
    migratedLosses: losses,
  }

  return {
    snapshot,
    counts: {
      subscriptions: subscriptions.length,
      payments: payments.length,
      spends: spends.length,
      loans: loans.length,
      loanPayments: loanPayments.length,
      creditCards: cards.length,
      cardTransactions: cardTransactions.length,
      incomes: incomes.length,
      accounts: accounts.length,
      transfers: 0,
    },
    losses,
  }
}

/* ── Small math / date helpers ────────────────────────────────────────── */

function calcEMI(principal: number, annualRate: number, tenureMonths: number): number {
  const n = Math.max(1, tenureMonths)
  if (annualRate === 0) return principal / n
  const r = annualRate / 12 / 100
  const factor = Math.pow(1 + r, n)
  return (principal * r * factor) / (factor - 1)
}

function clampDay(v: number, fb = 1): number {
  if (!Number.isFinite(v) || v <= 0) return fb
  return Math.max(1, Math.min(28, Math.floor(v)))
}

/** nextBillingDate = anchor + one interval, rolled forward into the future. */
function rollForwardBilling(anchorIso: string, cycle: BillingCycle, today: string): string {
  const step = (d: string): string => {
    switch (cycle) {
      case 'weekly':
        return addDaysISO(d, 7)
      case 'yearly':
        return addMonthsClamped(d, 12)
      case 'custom':
        return addDaysISO(d, 1)
      default:
        return addMonthsClamped(d, 1)
    }
  }
  let candidate = step(anchorIso)
  let guard = 0
  while (candidate < today && guard < 2000) {
    candidate = step(candidate)
    guard++
  }
  return candidate
}

/* ── Importer ─────────────────────────────────────────────────────────── */

/** Convert + import in replace mode. Returns import counts plus dropped features. */
export async function importFromSpendwiser(
  raw: SpendWiserMigrationExport,
): Promise<ImportReport & { losses: string[]; settings: AppSettings }> {
  const converted = convertSpendWiserToSnapshot(raw)
  const { importSnapshot } = await import('./db')
  const report = await importSnapshot(converted.snapshot, 'replace')
  return { ...report, losses: converted.losses, settings: converted.snapshot.settings }
}