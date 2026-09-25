/**
 * SUBTRACK // DOMAIN TYPES
 *
 * The vocabulary of the system:
 *   a subscription is a PROCESS, money is the RESOURCE, a renewal is an EVENT.
 * The metaphor lives in the UI copy; the data model stays plain and boring so
 * a sync layer could be dropped behind it later without touching the views.
 */

export type Category =
  | 'ai'
  | 'entertainment'
  | 'productivity'
  | 'cloud'
  | 'music'
  | 'fitness'
  | 'education'
  | 'shopping'
  | 'other'

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

export type ProcessStatus = 'active' | 'suspended' | 'terminated'

export interface Subscription {
  id: string
  /** Catalog key when the process came from a known service; else null. */
  serviceId: string | null
  name: string
  price: number
  currency: string
  billingCycle: BillingCycle
  /** Days per interval, only used when billingCycle === 'custom'. */
  customIntervalDays?: number
  /** ISO date (YYYY-MM-DD) of the next scheduled charge. Also the cycle anchor. */
  nextBillingDate: string
  category: Category
  /** Glyph key for the visual mark (see components/brand/ServiceGlyph). */
  icon: string
  /** Accent for the process module (brand colour or user choice). */
  color: string
  notes: string
  status: ProcessStatus
  /** ISO date the process was initialized — history is derived from here. */
  createdAt: string
  updatedAt: string
  /** ISO timestamp of suspension / termination, for the archive. */
  statusChangedAt?: string
  /** ISO date the user last confirmed they actually use this process. */
  lastUsedAt?: string
  /** Monotonic counter: how many cycles this process has executed since init. */
  cyclesExecuted: number
}

/** A recorded charge. History is real rows, not a formula. */
export interface Payment {
  id: string
  subId: string
  /** Denormalised so history survives a process purge. */
  name: string
  icon: string
  color: string
  category: Category
  /** ISO date the charge landed. */
  date: string
  amount: number
  currency: string
  /** 'derived' = reconstructed from the schedule; 'confirmed' = user executed it. */
  origin: 'derived' | 'confirmed'
}

export interface MetaRecord {
  key: string
  value: string
}

export interface AppSettings {
  /** Display + aggregation currency. Everything is normalised to this. */
  baseCurrency: string
  theme: 'dark' | 'day'
  /** Show the decorative grid/grain field. */
  field: boolean
  /** Reduce decorative motion further than the OS setting. */
  calmMode: boolean
  /** Days ahead used by the incoming stream. */
  horizonDays: number
}

export const CATEGORIES: { id: Category; label: string; code: string }[] = [
  { id: 'ai', label: 'AI & Intelligence', code: 'AI' },
  { id: 'entertainment', label: 'Entertainment', code: 'ENT' },
  { id: 'productivity', label: 'Productivity', code: 'PRD' },
  { id: 'cloud', label: 'Cloud', code: 'CLD' },
  { id: 'music', label: 'Music', code: 'MUS' },
  { id: 'fitness', label: 'Fitness', code: 'FIT' },
  { id: 'education', label: 'Education', code: 'EDU' },
  { id: 'shopping', label: 'Shopping', code: 'SHP' },
  { id: 'other', label: 'Other', code: 'OTH' },
]

export const CATEGORY_LABEL: Record<Category, string> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c.label
    return acc
  },
  {} as Record<Category, string>,
)

export const CATEGORY_CODE: Record<Category, string> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c.code
    return acc
  },
  {} as Record<Category, string>,
)

/** Category → signal colour token name. Used by charts and chips. */
export const CATEGORY_SIGNAL: Record<Category, 'acid' | 'blue' | 'magenta' | 'orange' | 'red'> =
  {
    ai: 'acid',
    entertainment: 'magenta',
    productivity: 'blue',
    cloud: 'blue',
    music: 'orange',
    fitness: 'red',
    education: 'magenta',
    shopping: 'orange',
    other: 'acid',
  }

export const CYCLE_LABEL: Record<BillingCycle, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
}

export const CYCLE_SHORT: Record<BillingCycle, string> = {
  weekly: 'WK',
  monthly: 'MO',
  quarterly: 'QT',
  yearly: 'YR',
  custom: 'CS',
}
export type SpendMethod = 'upi' | 'card' | 'cash' | 'netbanking' | 'wallet' | 'other'

export type SpendCategory =
  | 'food'
  | 'transport'
  | 'groceries'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'utilities'
  | 'travel'
  | 'education'
  | 'personal'
  | 'other'

/** A single day-to-day expense. Denormalised enough to survive on its own. */
export interface Spend {
  id: string
  /** What it was / merchant line (e.g. "Zomato — lunch"). */
  title: string
  amount: number
  currency: string
  category: SpendCategory
  method: SpendMethod
  /** ISO date the money left (YYYY-MM-DD). */
  date: string
  notes: string
  createdAt: string
  updatedAt: string
}

/** Display + signal metadata for a spend category. */
export interface SpendCategoryMeta {
  id: SpendCategory
  label: string
  code: string
  signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
  /** Spends in this category count toward the discretionary weekly limiter. */
  discretionary: boolean
}

export const SPEND_CATEGORIES: SpendCategoryMeta[] = [
  { id: 'food', label: 'Food & Dining', code: 'FNB', signal: 'orange', discretionary: true },
  { id: 'transport', label: 'Transport', code: 'TRN', signal: 'blue', discretionary: false },
  { id: 'groceries', label: 'Groceries', code: 'GRC', signal: 'acid', discretionary: false },
  { id: 'shopping', label: 'Shopping', code: 'SHP', signal: 'magenta', discretionary: true },
  { id: 'entertainment', label: 'Entertainment', code: 'ENT', signal: 'magenta', discretionary: true },
  { id: 'health', label: 'Health', code: 'HLT', signal: 'red', discretionary: false },
  { id: 'utilities', label: 'Utilities', code: 'UTL', signal: 'blue', discretionary: false },
  { id: 'travel', label: 'Travel', code: 'TRV', signal: 'magenta', discretionary: true },
  { id: 'education', label: 'Education', code: 'EDU', signal: 'acid', discretionary: false },
  { id: 'personal', label: 'Personal Care', code: 'PER', signal: 'orange', discretionary: true },
  { id: 'other', label: 'Other', code: 'OTH', signal: 'blue', discretionary: true },
]

export const SPEND_CATEGORY_META: Record<SpendCategory, SpendCategoryMeta> =
  Object.fromEntries(SPEND_CATEGORIES.map((c) => [c.id, c])) as Record<
    SpendCategory,
    SpendCategoryMeta
  >

export const SPEND_CATEGORY_LABEL: Record<SpendCategory, string> = SPEND_CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c.label
    return acc
  },
  {} as Record<SpendCategory, string>,
)

export const SPEND_CATEGORY_CODE: Record<SpendCategory, string> = SPEND_CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c.code
    return acc
  },
  {} as Record<SpendCategory, string>,
)

export const SPEND_METHOD_LABEL: Record<SpendMethod, string> = {
  upi: 'UPI',
  card: 'Card',
  cash: 'Cash',
  netbanking: 'Netbanking',
  wallet: 'Wallet',
  other: 'Other',
}

/** Weekly discretionary limiter stored in the meta table. */
export interface WeeklySpendLimit {
  /** Max discretionary spend per ISO week (Mon–Sun), in base currency. */
  amount: number
  currency: string
}

/* ── Debt / Loans / EMIs ─────────────────────────────────────────────── */

export type LoanType =
  | 'home'
  | 'vehicle'
  | 'personal'
  | 'education'
  | 'gold'
  | 'credit_card'
  | 'other'

export type LoanStatus = 'active' | 'paid_off' | 'defaulted'

export interface Loan {
  id: string
  name: string
  lender: string
  /** Loan type — drives the icon and grouping. */
  loanType: LoanType
  status: LoanStatus
  /** Original sanctioned amount in native currency. */
  principal: number
  /** Annual interest rate as a percentage (e.g. 8.5 for 8.5%). */
  interestRate: number
  /** Total tenure in months when the loan was taken. */
  tenureMonths: number
  /** Monthly EMI amount in native currency. */
  emi: number
  currency: string
  /** ISO date of the first EMI payment. */
  startDate: string
  /** ISO date when the loan was fully paid off (null if active). */
  closedAt?: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface LoanPayment {
  id: string
  loanId: string
  /** ISO date of the EMI payment. */
  date: string
  /** Total EMI amount paid. */
  amount: number
  currency: string
  /** Principal component of this EMI. */
  principalComponent: number
  /** Interest component of this EMI. */
  interestComponent: number
  /** Outstanding balance after this payment. */
  balanceAfter: number
  /** EMI sequence number (1-indexed). */
  emiNumber: number
  createdAt: string
}

export interface LoanTypeMeta {
  id: LoanType
  label: string
  code: string
  signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red'
}

export const LOAN_TYPES: LoanTypeMeta[] = [
  { id: 'home', label: 'Home Loan', code: 'HME', signal: 'blue' },
  { id: 'vehicle', label: 'Vehicle Loan', code: 'VHC', signal: 'acid' },
  { id: 'personal', label: 'Personal Loan', code: 'PRN', signal: 'orange' },
  { id: 'education', label: 'Education Loan', code: 'EDU', signal: 'magenta' },
  { id: 'gold', label: 'Gold Loan', code: 'GLD', signal: 'orange' },
  { id: 'credit_card', label: 'Credit Card', code: 'CRD', signal: 'red' },
  { id: 'other', label: 'Other', code: 'OTH', signal: 'blue' },
]

export const LOAN_TYPE_META: Record<LoanType, LoanTypeMeta> =
  Object.fromEntries(LOAN_TYPES.map((t) => [t.id, t])) as Record<LoanType, LoanTypeMeta>

export const LOAN_TYPE_LABEL: Record<LoanType, string> = Object.fromEntries(
  LOAN_TYPES.map((t) => [t.id, t.label]),
) as Record<LoanType, string>

export const LOAN_TYPE_CODE: Record<LoanType, string> = Object.fromEntries(
  LOAN_TYPES.map((t) => [t.id, t.code]),
) as Record<LoanType, string>
