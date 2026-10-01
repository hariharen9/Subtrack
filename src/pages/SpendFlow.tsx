/**
 * SPENDSTATE // SPENDS FLOW (LEDGER REGISTRY)
 *
 * One registry, two logs: day-to-day **spends** and received **income**. The
 * ledger toggles between them (URL: `?log=income`), sharing the search, time
 * envelope, method rail, sort and CSV export.
 */
import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useSearchParams } from 'react-router-dom'
import {
  SPEND_CATEGORY_LABEL,
  SPEND_METHOD_LABEL,
  INCOME_CATEGORIES,
  INCOME_CATEGORY_META,
  type SpendCategory,
  type SpendMethod,
  type Income,
  type IncomeCategory,
} from '@/lib/types'
import { useSpends } from '@/hooks/useSpends'
import { useIncomes } from '@/hooks/useIncome'
import { useUI } from '@/store/ui'
import { formatMoney, convert } from '@/lib/money'
import { addDaysISO, monthKey, shiftMonthKey, todayISO, formatSignalDate } from '@/lib/date'
import { exportSpendsCsv, exportIncomesCsv } from '@/lib/portability'
import {
  filterSpendsByRange,
  spendLedger,
  type SpendRangePreset,
} from '@/lib/spends'
import { cx } from '@/lib/cx'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { CyberButton, IconButton } from '@/components/ui/CyberButton'
import { EmptyState } from '@/components/ui/Skeleton'
import { Led, SIGNAL_HEX, SIGNAL_TEXT } from '@/components/ui/Signal'
import { SpendLedger } from '@/components/spends/SpendLedger'
import { SpendCalendar } from '@/components/spends/SpendCalendar'
import { IconPlus, IconSearch, IconDownload, IconClose, IconEdit } from '@/components/ui/Icons'

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.03 } },
}
const RISE = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } },
}

type SortOrder = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc' | 'title_asc'

const RANGE_OPTIONS: { id: SpendRangePreset; label: string; short: string }[] = [
  { id: 'all', label: 'ALL TIME', short: 'ALL' },
  { id: 'today', label: 'TODAY', short: 'TODAY' },
  { id: '7d', label: '7 DAYS', short: '7D' },
  { id: '30d', label: '30 DAYS', short: '30D' },
  { id: 'this_month', label: 'THIS MONTH', short: 'THIS MO' },
  { id: 'last_month', label: 'LAST MONTH', short: 'LAST MO' },
]

function inRange(date: string, preset: SpendRangePreset, today: string): boolean {
  if (preset === 'all') return true
  if (preset === 'today') return date === today
  if (preset === '7d') return date >= addDaysISO(today, -6) && date <= today
  if (preset === '30d') return date >= addDaysISO(today, -29) && date <= today
  if (preset === 'this_month') return monthKey(date) === monthKey(today)
  if (preset === 'last_month') return monthKey(date) === shiftMonthKey(monthKey(today), -1)
  return true
}

export default function SpendFlow() {
  const spends = useSpends()
  const incomes = useIncomes()
  const base = useUI((s) => s.baseCurrency)
  const spendCategories = useUI((s) => s.spendCategories)
  const openSpendComposer = useUI((s) => s.openSpendComposer)
  const openIncomeComposer = useUI((s) => s.openIncomeComposer)

  const [params, setParams] = useSearchParams()
  const mode: 'spend' | 'income' = params.get('log') === 'income' ? 'income' : 'spend'
  const setMode = (next: 'spend' | 'income') => {
    const p = new URLSearchParams(params)
    if (next === 'income') p.set('log', 'income')
    else p.delete('log')
    setParams(p, { replace: true })
    setCategory('all')
  }

  const today = todayISO()
  const [query, setQuery] = useState('')
  const [range, setRange] = useState<SpendRangePreset>('all')
  const [category, setCategory] = useState<string>('all')
  const [method, setMethod] = useState<'all' | SpendMethod>('all')
  const [sort, setSort] = useState<SortOrder>('newest')

  // ── Spends in view ──
  const filteredSpends = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = filterSpendsByRange(spends, range).filter((spend) => {
      if (category !== 'all' && spend.category !== category) return false
      if (method !== 'all' && spend.method !== method) return false
      if (!q) return true
      return (
        spend.title.toLowerCase().includes(q) ||
        spend.notes.toLowerCase().includes(q) ||
        spend.category.includes(q) ||
        String(spend.amount).includes(q) ||
        spend.date.includes(q)
      )
    })
    return matches.sort((a, b) => {
      if (sort === 'oldest') return a.date > b.date ? 1 : a.date < b.date ? -1 : 0
      if (sort === 'amount_desc') return b.amount - a.amount
      if (sort === 'amount_asc') return a.amount - b.amount
      if (sort === 'title_asc') return a.title.localeCompare(b.title)
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0
    })
  }, [spends, query, range, category, method, sort])

  // ── Income in view ──
  const filteredIncomes = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = incomes.filter((income) => {
      if (typeof income.date !== 'string') return false
      if (!inRange(income.date, range, today)) return false
      if (category !== 'all' && income.category !== category) return false
      if (method !== 'all' && income.method !== method) return false
      if (!q) return true
      return (
        income.title.toLowerCase().includes(q) ||
        income.notes.toLowerCase().includes(q) ||
        income.category.includes(q) ||
        String(income.amount).includes(q) ||
        income.date.includes(q)
      )
    })
    return matches.sort((a, b) => {
      if (sort === 'oldest') return a.date > b.date ? 1 : a.date < b.date ? -1 : 0
      if (sort === 'amount_desc') return b.amount - a.amount
      if (sort === 'amount_asc') return a.amount - b.amount
      if (sort === 'title_asc') return a.title.localeCompare(b.title)
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0
    })
  }, [incomes, query, range, category, method, sort, today])

  const isIncome = mode === 'income'
  const source = isIncome ? incomes : spends
  const filtered = isIncome ? filteredIncomes : filteredSpends
  const groups = useMemo(() => spendLedger(filteredSpends), [filteredSpends])

  const incomeGroups = useMemo(() => {
    const map = new Map<string, Income[]>()
    for (const income of filteredIncomes) {
      const bucket = map.get(income.date) ?? []
      bucket.push(income)
      map.set(income.date, bucket)
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [filteredIncomes])

  const total = useMemo(
    () => filtered.reduce((sum, row) => sum + convert(row.amount, row.currency, base), 0),
    [filtered, base],
  )

  const hasFilters = query !== '' || range !== 'all' || category !== 'all' || method !== 'all'
  const clearFilters = () => {
    setQuery('')
    setRange('all')
    setCategory('all')
    setMethod('all')
    setSort('newest')
  }

  const methodOptions = Object.keys(SPEND_METHOD_LABEL) as SpendMethod[]

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="px-3 py-4 md:px-5 md:py-5">
      <motion.div variants={RISE}>
        <CutPanel cut="tl-br" cutSize={16} innerClassName="p-3 md:p-4">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <span className="micro border border-line2 bg-bg2 px-1.5 py-0.5 text-dim">FLOW</span>
              <h1 className="text-[15px] font-semibold text-fg">{isIncome ? 'INCOME LEDGER' : 'TRANSACTION REGISTRY'}</h1>
              <span className="micro hidden text-faint sm:inline">
                {filtered.length} / {source.length} RECORDS
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Log toggle */}
              <div className="flex items-center border border-line2 bg-bg2 p-0.5">
                {(['spend', 'income'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cx(
                      'micro px-2.5 py-1 transition-colors',
                      mode === m ? 'bg-acid text-black font-semibold' : 'text-dim hover:text-fg',
                    )}
                  >
                    {m === 'spend' ? 'SPENDS' : 'INCOME'}
                  </button>
                ))}
              </div>
              <CyberButton
                variant="ink"
                size="sm"
                leading={<IconDownload size={13} />}
                onClick={() => (isIncome ? exportIncomesCsv(filteredIncomes) : exportSpendsCsv(filteredSpends))}
                title="Export the filtered ledger to CSV"
              >
                CSV
              </CyberButton>
              <CyberButton
                variant="solid"
                size="sm"
                leading={<IconPlus size={13} />}
                onClick={() => (isIncome ? openIncomeComposer() : openSpendComposer())}
                kbd={isIncome ? 'I' : 'X'}
              >
                {isIncome ? 'LOG INCOME' : 'LOG SPEND'}
              </CyberButton>
            </div>
          </div>

          {/* Search & Sort Row */}
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
            <div className="flex items-center gap-2 border border-line2 bg-bg2 px-3 transition-colors focus-within:border-acid">
              <IconSearch size={15} className="shrink-0 text-faint" />
              <input
                className="w-full bg-transparent py-2 font-mono text-[12px] outline-none placeholder:text-faint"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={isIncome ? 'Search source, note, amount, category or date...' : 'Search merchant, note, amount, category or date...'}
                autoComplete="off"
                spellCheck={false}
                aria-label={isIncome ? 'Search income' : 'Search spends'}
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="flex items-center gap-1 text-faint hover:text-fg" aria-label="Clear search">
                  <IconClose size={13} />
                </button>
              )}
              <span className="micro hidden shrink-0 text-faint sm:inline">
                {filtered.length} MATCH{filtered.length === 1 ? '' : 'ES'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="micro shrink-0 text-faint">SORT:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOrder)}
                aria-label="Sort ledger"
                className="micro border border-line2 bg-bg2 px-2.5 py-2 font-mono text-fg outline-none transition-colors focus:border-acid"
              >
                <option value="newest">NEWEST FIRST</option>
                <option value="oldest">OLDEST FIRST</option>
                <option value="amount_desc">AMOUNT: HIGH → LOW</option>
                <option value="amount_asc">AMOUNT: LOW → HIGH</option>
                <option value="title_asc">TITLE A → Z</option>
              </select>
            </div>
          </div>

          {/* Dual-Rail Filter Console */}
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="micro text-[10px] text-faint">TIME ENVELOPE</span>
              <div className="flex flex-wrap items-center border border-line2 bg-bg2 p-0.5">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRange(opt.id)}
                    className={cx('micro flex-1 min-w-[54px] py-1 text-center transition-colors', range === opt.id ? 'bg-acid text-black font-semibold shadow-sm' : 'text-dim hover:text-fg')}
                  >
                    {opt.short}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="micro text-[10px] text-faint">{isIncome ? 'RECEIVED VIA' : 'PAYMENT CHANNEL'}</span>
              <div className="flex flex-wrap items-center border border-line2 bg-bg2 p-0.5">
                <button type="button" onClick={() => setMethod('all')} className={cx('micro flex-1 min-w-[42px] py-1 text-center transition-colors', method === 'all' ? 'bg-acid text-black font-semibold shadow-sm' : 'text-dim hover:text-fg')}>
                  ALL
                </button>
                {methodOptions.map((m) => (
                  <button key={m} type="button" onClick={() => setMethod(m)} className={cx('micro flex-1 min-w-[42px] py-1 text-center transition-colors', method === m ? 'bg-acid text-black font-semibold shadow-sm' : 'text-dim hover:text-fg')}>
                    {SPEND_METHOD_LABEL[m].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category Rail */}
          <div className="mt-3 flex flex-col gap-1">
            <span className="micro text-[10px] text-faint">{isIncome ? 'INCOME CATEGORY' : 'SECTOR (CATEGORY)'}</span>
            <div className="no-scrollbar flex items-center gap-1 overflow-x-auto pb-0.5" data-lenis-prevent>
              <button type="button" onClick={() => setCategory('all')} className={cx('micro shrink-0 border px-2.5 py-1 transition-colors', category === 'all' ? 'border-acid bg-acid text-black font-semibold' : 'border-line2 text-dim hover:border-linehard hover:text-fg')}>
                {isIncome ? 'ALL' : 'ALL SECTORS'}
              </button>
              {(isIncome
                ? INCOME_CATEGORIES.map((c) => ({ id: c.id as string, label: c.label, signal: c.signal }))
                : spendCategories.map((c) => ({ id: c.id as string, label: c.label, signal: c.signal }))
              ).map((cat) => {
                const isActive = category === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cx('micro flex shrink-0 items-center gap-1.5 border px-2 py-1 transition-colors', isActive ? 'border-fg bg-fg text-bg font-semibold' : 'border-line2 text-dim hover:border-linehard hover:text-fg')}
                    title={cat.label}
                  >
                    <span className="block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: isActive ? 'currentColor' : SIGNAL_HEX[cat.signal] }} />
                    <span>{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active Filter Chips & Selection Telemetry Bar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="micro text-faint">ACTIVE:</span>
              {range !== 'all' && (
                <button type="button" onClick={() => setRange('all')} className="micro flex items-center gap-1 border border-linehard bg-surface2 px-1.5 py-0.5 text-fg hover:border-red" title="Remove range filter">
                  {RANGE_OPTIONS.find((r) => r.id === range)?.label} <IconClose size={10} />
                </button>
              )}
              {category !== 'all' && (
                <button type="button" onClick={() => setCategory('all')} className="micro flex items-center gap-1 border border-linehard bg-surface2 px-1.5 py-0.5 text-fg hover:border-red" title="Remove category filter">
                  {isIncome ? INCOME_CATEGORY_META[category as IncomeCategory]?.label ?? category : SPEND_CATEGORY_LABEL[category as SpendCategory]} <IconClose size={10} />
                </button>
              )}
              {method !== 'all' && (
                <button type="button" onClick={() => setMethod('all')} className="micro flex items-center gap-1 border border-linehard bg-surface2 px-1.5 py-0.5 text-fg hover:border-red" title="Remove method filter">
                  {SPEND_METHOD_LABEL[method]} <IconClose size={10} />
                </button>
              )}
              {query && (
                <button type="button" onClick={() => setQuery('')} className="micro flex items-center gap-1 border border-linehard bg-surface2 px-1.5 py-0.5 text-fg hover:border-red" title="Clear search query">
                  "{query}" <IconClose size={10} />
                </button>
              )}
              {!hasFilters && <span className="micro text-dim">ALL RECORDS IN VIEW</span>}
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="micro ml-1 text-acidink underline hover:text-fg">
                  RESET ALL
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="micro font-semibold text-fg">
                {isIncome ? '+' : ''}{formatMoney(total, base)}
              </span>
            </div>
          </div>
        </CutPanel>
      </motion.div>

      {/* Ledger (+ calendar for spends) */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <motion.div variants={RISE} className={isIncome ? 'lg:col-span-12' : 'lg:col-span-7'}>
          <CutPanel cut="br" cutSize={14} innerClassName="p-0">
            <SectionHeader
              code="LDG"
              title={isIncome ? 'Income stream' : 'Ledger stream'}
              signal={filtered.length ? 'acid' : 'blue'}
              right={<span className="micro text-faint">{isIncome ? incomeGroups.length : groups.length} ACTIVE DAY GROUPS</span>}
            />
            {isIncome ? (
              filteredIncomes.length ? (
                <div className="max-h-[75vh] divide-y divide-line overflow-y-auto" data-lenis-prevent>
                  {incomeGroups.map(([date, dayIncomes]) => {
                    const dayTotal = dayIncomes.reduce((sum, i) => sum + convert(i.amount, i.currency, base), 0)
                    return (
                      <section key={date}>
                        <div className="flex items-center justify-between border-b border-line bg-bg2 px-3 py-1.5 md:px-4">
                          <span className="micro font-semibold text-faint">{formatSignalDate(date)}</span>
                          <span className="micro font-mono text-dim">{dayIncomes.length} RECEIPT{dayIncomes.length === 1 ? '' : 'S'} · +{formatMoney(dayTotal, base)}</span>
                        </div>
                        {dayIncomes.map((income) => {
                          const meta = INCOME_CATEGORY_META[income.category]
                          return (
                            <div key={income.id} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface2 md:px-4">
                              <span className={cx('micro w-8 shrink-0 font-semibold', SIGNAL_TEXT[meta?.signal ?? 'acid'])}>{meta?.code ?? '—'}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[12.5px] font-medium text-fg">{income.title}</span>
                                <span className="micro block truncate text-faint">
                                  {SPEND_METHOD_LABEL[income.method]}{income.notes ? ` · ${income.notes}` : ''}
                                </span>
                              </span>
                              <span className="numeral shrink-0 text-[13px] font-semibold text-acidink">+{formatMoney(income.amount, income.currency)}</span>
                              <IconButton label={`Edit ${income.title}`} size="sm" onClick={() => openIncomeComposer({ editId: income.id })}>
                                <IconEdit size={12} />
                              </IconButton>
                            </div>
                          )
                        })}
                      </section>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState
                    code="NO MATCHES"
                    title="NO INCOME FOUND."
                    description={incomes.length ? 'Your search or active filters matched no receipts.' : 'No income logged yet. Record your first receipt to see net cashflow.'}
                    action={incomes.length ? { label: 'RESET FILTERS', onClick: clearFilters } : { label: '+ LOG FIRST INCOME', onClick: () => openIncomeComposer() }}
                  />
                </div>
              )
            ) : groups.length ? (
              <div className="max-h-[75vh] overflow-y-auto" data-lenis-prevent>
                <SpendLedger groups={groups} base={base} />
              </div>
            ) : (
              <div className="p-4">
                <EmptyState
                  code="NO MATCHES"
                  title="NOTHING FOUND."
                  description={spends.length ? 'Your search or active filters matched no records. Try resetting the filters or searching for something else.' : 'No daily spends recorded yet. Log your first expense to populate the registry.'}
                  action={spends.length ? { label: 'RESET FILTERS', onClick: clearFilters } : { label: '+ LOG FIRST SPEND', onClick: () => openSpendComposer() }}
                />
              </div>
            )}
          </CutPanel>
        </motion.div>

        {!isIncome && (
          <motion.div variants={RISE} className="lg:col-span-5">
            <CutPanel cut="tl" cutSize={14} innerClassName="p-0" className="h-full">
              <SectionHeader code="CAL" title="Spend calendar" signal="orange" right={<span className="micro text-faint">MONTH VIEW</span>} />
              <SpendCalendar spends={filteredSpends.length ? filteredSpends : spends} base={base} />
            </CutPanel>
          </motion.div>
        )}
      </div>

      {/* Income summary strip (income mode only) */}
      {isIncome && (
        <motion.div variants={RISE} className="mt-3">
          <CutPanel cut="tl" cutSize={14} innerClassName="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 md:px-4">
            <span className="micro text-dim">
              <Led signal="acid" size="sm" /> INCOME LEDGER · {incomes.length} TOTAL RECEIPTS · LIFETIME {formatMoney(incomes.reduce((s, i) => s + convert(i.amount, i.currency, base), 0), base)}
            </span>
            <span className="micro text-faint">MANAGED IN THE SPEND DOMAIN · NET CASHFLOW ON MASTER COMMAND</span>
          </CutPanel>
        </motion.div>
      )}
    </motion.div>
  )
}
