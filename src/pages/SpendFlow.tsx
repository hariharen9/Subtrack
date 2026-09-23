/**
 * SUBTRACK // SPENDS FLOW (LEDGER REGISTRY)
 *
 * The full daily-spend registry: every transaction in reverse-chronological
 * day groups, with live search across title/notes/amounts, date range presets,
 * category & payment method multi-filters, custom sort orders, and 1-click CSV export.
 */
import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import {
  SPEND_CATEGORIES,
  SPEND_CATEGORY_LABEL,
  SPEND_METHOD_LABEL,
  type SpendCategory,
  type SpendMethod,
} from '@/lib/types'
import { useSpends } from '@/hooks/useSpends'
import { useUI } from '@/store/ui'
import { formatMoney } from '@/lib/money'
import { exportSpendsCsv } from '@/lib/portability'
import {
  filterSpendsByRange,
  spendLedger,
  type SpendRangePreset,
} from '@/lib/spends'
import { cx } from '@/lib/cx'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { CyberButton } from '@/components/ui/CyberButton'
import { EmptyState } from '@/components/ui/Skeleton'
import { SpendLedger } from '@/components/spends/SpendLedger'
import { SpendCalendar } from '@/components/spends/SpendCalendar'
import { SIGNAL_HEX } from '@/components/ui/Signal'
import { IconPlus, IconSearch, IconDownload, IconClose } from '@/components/ui/Icons'

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

export default function SpendFlow() {
  const spends = useSpends()
  const base = useUI((s) => s.baseCurrency)
  const openSpendComposer = useUI((s) => s.openSpendComposer)

  const [query, setQuery] = useState('')
  const [range, setRange] = useState<SpendRangePreset>('all')
  const [category, setCategory] = useState<'all' | SpendCategory>('all')
  const [method, setMethod] = useState<'all' | SpendMethod>('all')
  const [sort, setSort] = useState<SortOrder>('newest')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rangeSpends = filterSpendsByRange(spends, range)

    const matches = rangeSpends.filter((spend) => {
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
      if (sort === 'newest') return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt < a.createdAt ? -1 : 1)
      if (sort === 'oldest') return a.date > b.date ? 1 : a.date < b.date ? -1 : (a.createdAt < b.createdAt ? -1 : 1)
      if (sort === 'amount_desc') return b.amount - a.amount
      if (sort === 'amount_asc') return a.amount - b.amount
      if (sort === 'title_asc') return a.title.localeCompare(b.title)
      return 0
    })
  }, [spends, query, range, category, method, sort])

  const groups = useMemo(() => spendLedger(filtered), [filtered])
  const total = useMemo(() => filtered.reduce((sum, spend) => sum + spend.amount, 0), [filtered])

  const hasFilters = query !== '' || range !== 'all' || category !== 'all' || method !== 'all'
  const clearFilters = () => {
    setQuery('')
    setRange('all')
    setCategory('all')
    setMethod('all')
    setSort('newest')
  }

  return (
    <motion.div
      variants={STAGGER}
      initial="hidden"
      animate="show"
      className="px-3 py-4 md:px-5 md:py-5"
    >
      <motion.div variants={RISE}>
        <CutPanel cut="tl-br" cutSize={16} innerClassName="p-3 md:p-4">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <span className="micro border border-line2 bg-bg2 px-1.5 py-0.5 text-dim">FLOW</span>
              <h1 className="text-[15px] font-semibold text-fg">TRANSACTION REGISTRY</h1>
              <span className="micro hidden text-faint sm:inline">
                {filtered.length} / {spends.length} RECORDS
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CyberButton
                variant="ink"
                size="sm"
                leading={<IconDownload size={13} />}
                onClick={() => exportSpendsCsv(filtered)}
                title="Export filtered ledger to CSV"
              >
                EXPORT CSV
              </CyberButton>
              <CyberButton
                variant="solid"
                size="sm"
                leading={<IconPlus size={13} />}
                onClick={() => openSpendComposer()}
                kbd="N"
              >
                LOG SPEND
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
                placeholder="Search merchant, note, amount, category or date..."
                autoComplete="off"
                spellCheck={false}
                aria-label="Search spends"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="flex items-center gap-1 text-faint hover:text-fg"
                  aria-label="Clear search"
                >
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

          {/* Dual-Rail Filter Console (Time Envelope & Payment Channel) */}
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Time Envelope */}
            <div className="flex flex-col gap-1">
              <span className="micro text-[10px] text-faint">TIME ENVELOPE</span>
              <div className="flex flex-wrap items-center border border-line2 bg-bg2 p-0.5">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRange(opt.id)}
                    className={cx(
                      'micro flex-1 min-w-[54px] py-1 text-center transition-colors',
                      range === opt.id
                        ? 'bg-acid text-black font-semibold shadow-sm'
                        : 'text-dim hover:text-fg',
                    )}
                  >
                    {opt.short}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Channel */}
            <div className="flex flex-col gap-1">
              <span className="micro text-[10px] text-faint">PAYMENT CHANNEL</span>
              <div className="flex flex-wrap items-center border border-line2 bg-bg2 p-0.5">
                <button
                  type="button"
                  onClick={() => setMethod('all')}
                  className={cx(
                    'micro flex-1 min-w-[42px] py-1 text-center transition-colors',
                    method === 'all'
                      ? 'bg-acid text-black font-semibold shadow-sm'
                      : 'text-dim hover:text-fg',
                  )}
                >
                  ALL
                </button>
                {(Object.keys(SPEND_METHOD_LABEL) as SpendMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={cx(
                      'micro flex-1 min-w-[42px] py-1 text-center transition-colors',
                      method === m
                        ? 'bg-acid text-black font-semibold shadow-sm'
                        : 'text-dim hover:text-fg',
                    )}
                  >
                    {SPEND_METHOD_LABEL[m].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sector / Category Filter Rail */}
          <div className="mt-3 flex flex-col gap-1">
            <span className="micro text-[10px] text-faint">SECTOR (CATEGORY)</span>
            <div className="no-scrollbar flex items-center gap-1 overflow-x-auto pb-0.5" data-lenis-prevent>
              <button
                type="button"
                onClick={() => setCategory('all')}
                className={cx(
                  'micro shrink-0 border px-2.5 py-1 transition-colors',
                  category === 'all'
                    ? 'border-acid bg-acid text-black font-semibold'
                    : 'border-line2 text-dim hover:border-linehard hover:text-fg',
                )}
              >
                ALL SECTORS
              </button>
              {SPEND_CATEGORIES.map((cat) => {
                const isActive = category === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cx(
                      'micro flex shrink-0 items-center gap-1.5 border px-2 py-1 transition-colors',
                      isActive
                        ? 'border-fg bg-fg text-bg font-semibold'
                        : 'border-line2 text-dim hover:border-linehard hover:text-fg',
                    )}
                    title={cat.label}
                  >
                    <span
                      className="block h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: isActive ? 'currentColor' : SIGNAL_HEX[cat.signal] }}
                    />
                    <span>{cat.code}</span>
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
                <button
                  type="button"
                  onClick={() => setRange('all')}
                  className="micro flex items-center gap-1 border border-linehard bg-surface2 px-1.5 py-0.5 text-fg hover:border-red"
                  title="Remove range filter"
                >
                  {RANGE_OPTIONS.find((r) => r.id === range)?.label} <IconClose size={10} />
                </button>
              )}
              {category !== 'all' && (
                <button
                  type="button"
                  onClick={() => setCategory('all')}
                  className="micro flex items-center gap-1 border border-linehard bg-surface2 px-1.5 py-0.5 text-fg hover:border-red"
                  title="Remove category filter"
                >
                  {SPEND_CATEGORY_LABEL[category]} <IconClose size={10} />
                </button>
              )}
              {method !== 'all' && (
                <button
                  type="button"
                  onClick={() => setMethod('all')}
                  className="micro flex items-center gap-1 border border-linehard bg-surface2 px-1.5 py-0.5 text-fg hover:border-red"
                  title="Remove payment method filter"
                >
                  {SPEND_METHOD_LABEL[method]} <IconClose size={10} />
                </button>
              )}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="micro flex items-center gap-1 border border-linehard bg-surface2 px-1.5 py-0.5 text-fg hover:border-red"
                  title="Clear search query"
                >
                  "{query}" <IconClose size={10} />
                </button>
              )}
              {!hasFilters && (
                <span className="micro text-dim">ALL RECORDS IN VIEW</span>
              )}
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="micro ml-1 text-acidink underline hover:text-fg"
                >
                  RESET ALL
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="micro font-semibold text-fg">
                {filtered.length} TXN · {formatMoney(total, base)}
              </span>
            </div>
          </div>
        </CutPanel>
      </motion.div>

      {/* Ledger + Calendar */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Ledger Stream */}
        <motion.div variants={RISE} className="lg:col-span-7">
          <CutPanel cut="br" cutSize={14} innerClassName="p-0">
            <SectionHeader
              code="LDG"
              title="Ledger stream"
              signal={filtered.length ? 'acid' : 'blue'}
              right={<span className="micro text-faint">{groups.length} ACTIVE DAY GROUPS</span>}
            />
            {groups.length ? (
              <div className="max-h-[75vh] overflow-y-auto" data-lenis-prevent>
                <SpendLedger groups={groups} base={base} />
              </div>
            ) : (
              <div className="p-4">
                <EmptyState
                  code="NO MATCHES"
                  title="NOTHING FOUND."
                  description={
                    spends.length
                      ? 'Your search or active filters matched no records. Try resetting the filters or searching for something else.'
                      : 'No daily spends recorded yet. Log your first expense to populate the registry.'
                  }
                  action={
                    spends.length
                      ? { label: 'RESET FILTERS', onClick: clearFilters }
                      : { label: '+ LOG FIRST SPEND', onClick: () => openSpendComposer() }
                  }
                />
              </div>
            )}
          </CutPanel>
        </motion.div>

        {/* Spend Calendar */}
        <motion.div variants={RISE} className="lg:col-span-5">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-0" className="h-full">
            <SectionHeader
              code="CAL"
              title="Spend calendar"
              signal="orange"
              right={<span className="micro text-faint">MONTH VIEW</span>}
            />
            <SpendCalendar spends={filtered.length ? filtered : spends} base={base} />
          </CutPanel>
        </motion.div>
      </div>
    </motion.div>
  )
}
