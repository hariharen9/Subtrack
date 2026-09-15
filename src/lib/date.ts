/**
 * SUBTRACK // DATE ENGINE
 *
 * All dates in this system are plain ISO calendar days (YYYY-MM-DD) with no
 * time component and no timezone. Arithmetic runs on UTC internally so DST can
 * never shift a billing date by a day — the class of bug that makes a money app
 * untrustworthy.
 */

export interface YMD {
  y: number
  /** 1-12 */
  m: number
  /** 1-31 */
  d: number
}

export const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const

export const MONTHS_LONG = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
] as const

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)

export function toISO(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`
}

export function parseISO(iso: string): YMD {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

export function todayISO(now: Date = new Date()): string {
  return toISO(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

/** Days since epoch — the canonical integer for comparing calendar days. */
export function dayNumber(iso: string): number {
  const { y, m, d } = parseISO(iso)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function fromDayNumber(n: number): string {
  const dt = new Date(n * 86_400_000)
  return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

/** a - b in whole days. */
export function diffDays(a: string, b: string): number {
  return dayNumber(a) - dayNumber(b)
}

export function addDaysISO(iso: string, days: number): string {
  return fromDayNumber(dayNumber(iso) + days)
}

/**
 * Add months keeping the anchor day where possible: Jan 31 + 1 = Feb 28/29.
 * Always computed from an anchor rather than stepped, so a January subscription
 * can never drift to the 28th forever.
 */
export function addMonthsClamped(iso: string, months: number): string {
  const { y, m, d } = parseISO(iso)
  const total = y * 12 + (m - 1) + months
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return toISO(ny, nm, Math.min(d, daysInMonth(ny, nm)))
}

export function startOfMonthISO(iso: string): string {
  const { y, m } = parseISO(iso)
  return toISO(y, m, 1)
}

export function endOfMonthISO(iso: string): string {
  const { y, m } = parseISO(iso)
  return toISO(y, m, daysInMonth(y, m))
}

/** '2026-09' — the aggregation key for a calendar month. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function monthKeyToISOStart(key: string): string {
  return `${key}-01`
}

export function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const total = y * 12 + (m - 1) + delta
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`
}

export function monthKeyParts(key: string): { y: number; m: number } {
  const [y, m] = key.split('-').map(Number)
  return { y, m }
}

/** 'SEP 2026' */
export function monthKeyLabel(key: string): string {
  const { y, m } = monthKeyParts(key)
  return `${MONTHS[m - 1]} ${y}`
}

/** 'SEP' */
export function monthKeyShort(key: string): string {
  const { m } = monthKeyParts(key)
  return MONTHS[m - 1]
}

/** '19 SEP 2026' — the system's canonical date stamp. */
export function formatSignalDate(iso: string): string {
  const { y, m, d } = parseISO(iso)
  return `${pad(d)} ${MONTHS[m - 1]} ${y}`
}

/** '19.09' — compact rail / stream notation. */
export function formatDotDate(iso: string): string {
  const { m, d } = parseISO(iso)
  return `${pad(m)}.${pad(d)}`
}

/** '13:07:42' — live system clock. */
export function formatClock(now: Date = new Date()): string {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

/** '2026-09-19T13:07:42' — timestamp used on records. */
export function nowStamp(now: Date = new Date()): string {
  return `${todayISO(now)}T${formatClock(now)}`
}

export function isWeekend(iso: string): boolean {
  const dow = new Date(dayNumber(iso) * 86_400_000).getUTCDay()
  return dow === 0 || dow === 6
}

export function weekdayOf(iso: string): number {
  return new Date(dayNumber(iso) * 86_400_000).getUTCDay()
}

/** Monday-first index (0 = Monday). */
export function weekdayIndexMon(iso: string): number {
  return (weekdayOf(iso) + 6) % 7
}

export interface RelativeDay {
  days: number
  /** 'TODAY' | 'TOMORROW' | '2 DAYS' | 'IN 3 WEEKS' */
  label: string
  /** 'OVERDUE' when negative. */
  overdue: boolean
}

export function relativeDay(iso: string, today: string = todayISO()): RelativeDay {
  const days = diffDays(iso, today)
  if (days === 0) return { days, label: 'TODAY', overdue: false }
  if (days === 1) return { days, label: 'TOMORROW', overdue: false }
  if (days < 0) {
    const n = Math.abs(days)
    return { days, label: n === 1 ? '1 DAY LATE' : `${n} DAYS LATE`, overdue: true }
  }
  if (days < 14) return { days, label: `${days} DAYS`, overdue: false }
  if (days < 60) return { days, label: `${Math.round(days / 7)} WEEKS`, overdue: false }
  return { days, label: `${Math.round(days / 30.4375)} MONTHS`, overdue: false }
}

export interface MatrixCell {
  iso: string
  day: number
  /** False for the leading/trailing days that pad the 6-week matrix. */
  inMonth: boolean
  isToday: boolean
  isWeekend: boolean
  monthKey: string
}

/**
 * 6x7 payment matrix, Monday-first. Always 42 rows so the grid never jumps
 * height between months — a small thing that makes a calendar feel solid.
 */
export function monthMatrix(y: number, m: number, today: string = todayISO()): MatrixCell[] {
  const first = toISO(y, m, 1)
  const lead = weekdayIndexMon(first)
  const start = addDaysISO(first, -lead)
  const cells: MatrixCell[] = []
  for (let i = 0; i < 42; i++) {
    const iso = addDaysISO(start, i)
    const p = parseISO(iso)
    cells.push({
      iso,
      day: p.d,
      inMonth: p.m === m && p.y === y,
      isToday: iso === today,
      isWeekend: isWeekend(iso),
      monthKey: monthKey(iso),
    })
  }
  return cells
}

export const WEEKDAYS_MON = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
