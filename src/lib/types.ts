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
