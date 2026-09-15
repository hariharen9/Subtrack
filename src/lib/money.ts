/**
 * SUBTRACK // MONEY
 *
 * One rule: never build a currency string by hand. Every amount in the UI goes
 * through Intl.NumberFormat, so ₹1,49,760 groups the Indian way, ¥1,200 has no
 * decimals and $7.78 keeps its cents.
 *
 * Local-first means no FX calls: rates come from a static, documented table and
 * every screen states that aggregation uses it.
 */

export interface CurrencyDef {
  code: string
  name: string
  /** Locale used for grouping + symbol resolution. */
  locale: string
  symbol: string
  /** Units of this currency per 1 INR. Static reference table. */
  perINR: number
  /** 0 for currencies without minor units in practice. */
  decimals: number
}

export const BASE_CURRENCY = 'INR'

export const CURRENCIES: CurrencyDef[] = [
  { code: 'INR', name: 'Indian Rupee', locale: 'en-IN', symbol: '₹', perINR: 1, decimals: 2 },
  { code: 'USD', name: 'US Dollar', locale: 'en-US', symbol: '$', perINR: 1 / 83.4, decimals: 2 },
  { code: 'EUR', name: 'Euro', locale: 'en-IE', symbol: '€', perINR: 1 / 90.2, decimals: 2 },
  { code: 'GBP', name: 'Pound Sterling', locale: 'en-GB', symbol: '£', perINR: 1 / 105.8, decimals: 2 },
  { code: 'AED', name: 'UAE Dirham', locale: 'en-AE', symbol: 'AED', perINR: 1 / 22.7, decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar', locale: 'en-SG', symbol: 'S$', perINR: 1 / 62.1, decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', locale: 'en-AU', symbol: 'A$', perINR: 1 / 54.6, decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', locale: 'en-CA', symbol: 'C$', perINR: 1 / 60.9, decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', locale: 'ja-JP', symbol: '¥', perINR: 1 / 0.55, decimals: 0 },
]

export const CURRENCY_BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]))

export function currencyDef(code: string): CurrencyDef {
  return CURRENCY_BY_CODE.get(code) ?? CURRENCY_BY_CODE.get(BASE_CURRENCY)!
}

export function symbolOf(code: string): string {
  return currencyDef(code).symbol
}

/** Static conversion: amount[from] → amount[to]. */
export function convert(amount: number, from: string, to: string): number {
  if (from === to) return amount
  const f = currencyDef(from)
  const t = currencyDef(to)
  return (amount / f.perINR) * t.perINR
}

export function toBase(amount: number, from: string, base: string): number {
  return convert(amount, from, base)
}

export function fromBase(amount: number, base: string, to: string): number {
  return convert(amount, base, to)
}

/** ₹12,480 · ₹649.50 · ¥1,200 */
export function formatMoney(amount: number, currency: string): string {
  const def = currencyDef(currency)
  const rounded = Math.round(amount * 100) / 100
  const isWhole = Number.isInteger(rounded)
  return new Intl.NumberFormat(def.locale, {
    style: 'currency',
    currency: def.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: def.decimals === 0 ? 0 : isWhole ? 0 : 2,
  }).format(rounded)
}

/** ₹12.5K · ₹1.5L · $1.2K — for tight chips and rails. */
export function formatCompact(amount: number, currency: string): string {
  const def = currencyDef(currency)
  return new Intl.NumberFormat(def.locale, {
    style: 'currency',
    currency: def.code,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

/** The hero number splits symbol from digits so they can be styled separately. */
export function splitMoney(amount: number, currency: string): { symbol: string; value: string } {
  const formatted = formatMoney(amount, currency)
  const def = currencyDef(currency)
  if (formatted.startsWith(def.symbol)) {
    return { symbol: def.symbol, value: formatted.slice(def.symbol.length).trim() }
  }
  const match = formatted.match(/^([^\d\s-]*)\s?(.*)$/)
  if (match) return { symbol: match[1], value: match[2] }
  return { symbol: def.symbol, value: formatted }
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** +4.82% / −1.20% — signed, always two decimals for the signal readouts. */
export function formatPercent(value: number, decimals = 2): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toFixed(decimals)}%`
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / previous) * 100
}
