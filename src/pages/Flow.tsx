/**
 * SUBTRACK // FLOW (SUBSCRIPTIONS)
 *
 * Every process the user runs, with a query bar that speaks the same language as
 * the command palette, status filters, sorting, and two densities: the command
 * grid of modules or the dense scanline list. Filters never hide the totals —
 * the strip always reports what the current selection costs.
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useSubscriptions, useSystem } from '@/hooks/useSystem'
import { useUI } from '@/store/ui'
import { viewOf } from '@/lib/analytics'
import { searchSubscriptions } from '@/lib/fuzzy'
import { formatMoney } from '@/lib/money'
import { todayISO } from '@/lib/date'
import { CATEGORIES, CATEGORY_LABEL, type Category, type ProcessStatus } from '@/lib/types'
import { CutPanel } from '@/components/ui/CutPanel'
import { CyberButton } from '@/components/ui/CyberButton'
import { DataStrip } from '@/components/ui/DataStrip'
import { EmptyState } from '@/components/ui/Skeleton'
import { Led } from '@/components/ui/Signal'
import { ProcessCard, ProcessRow } from '@/components/subs/ProcessCard'
import { IconGrid, IconList, IconPlus, IconSearch, IconClose } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

type StatusFilter = 'all' | ProcessStatus
type SortKey = 'cost' | 'next' | 'name' | 'cycle'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'active', label: 'ACTIVE' },
  { value: 'suspended', label: 'SUSPENDED' },
  { value: 'terminated', label: 'TERMINATED' },
]

const SORT_LABELS: Record<SortKey, string> = {
  cost: 'MONTHLY COST',
  next: 'NEXT CYCLE',
  name: 'NAME',
  cycle: 'CYCLES RUN',
}

export default function Flow() {
  const { summary } = useSystem()
  const subscriptions = useSubscriptions()
  const base = useUI((s) => s.baseCurrency)
  const openComposer = useUI((s) => s.openComposer)
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('cost')
  const [density, setDensity] = useState<'grid' | 'list'>('grid')
  const today = todayISO()

  // The manifest shortcut lands here with ?action=init.
  useEffect(() => {
    if (params.get('action') === 'init') {
      openComposer()
      const next = new URLSearchParams(params)
      next.delete('action')
      setParams(next, { replace: true })
    }
  }, [params, setParams, openComposer])

  const allViews = useMemo(
    () =>
      subscriptions.map((sub) => viewOf(sub, base, today, summary.monthlyBurn)),
    [subscriptions, base, today, summary.monthlyBurn],
  )

  const filtered = useMemo(() => {
    const hits = query.trim() ? searchSubscriptions(subscriptions, query, base) : null
    const allowed = hits ? new Set(hits.map((hit) => hit.sub.id)) : null

    let list = allViews.filter((view) => {
      if (status !== 'all' && view.sub.status !== status) return false
      if (category !== 'all' && view.sub.category !== category) return false
      if (allowed && !allowed.has(view.sub.id)) return false
      return true
    })

    list = list.sort((a, b) => {
      switch (sort) {
        case 'cost':
          return b.monthly - a.monthly
        case 'next':
          return a.sub.nextBillingDate < b.sub.nextBillingDate ? -1 : 1
        case 'name':
          return a.sub.name.localeCompare(b.sub.name)
        case 'cycle':
          return b.sub.cyclesExecuted - a.sub.cyclesExecuted
      }
    })
    // Query order wins when the user is searching: relevance beats sorting.
    if (hits) {
      const order = new Map(hits.map((hit, index) => [hit.sub.id, index]))
      list = list.sort((a, b) => (order.get(a.sub.id) ?? 0) - (order.get(b.sub.id) ?? 0))
    }
    return list
  }, [allViews, subscriptions, query, base, status, category, sort])

  const activeInView = filtered.filter((view) => view.sub.status === 'active')
  const monthlyInView = activeInView.reduce((sum, view) => sum + view.monthly, 0)
  const annualInView = monthlyInView * 12
  const categoryCounts = useMemo(() => {
    const counts = new Map<Category, number>()
    for (const view of allViews) {
      if (view.sub.status !== 'active') continue
      counts.set(view.sub.category, (counts.get(view.sub.category) ?? 0) + 1)
    }
    return counts
  }, [allViews])

  return (
    <div className="px-3 py-4 md:px-5 md:py-5">
      {/* query bar */}
      <div className="flex flex-col gap-3 border-b-2 border-linehard pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="micro border border-line2 px-1.5 py-0.5 text-dim">FLOW</span>
            <h1 className="text-[15px] font-semibold">SUBSCRIPTIONS</h1>
            <span className="micro hidden text-faint md:inline">
              {allViews.length} TRACKED · {summary.activeCount} ACTIVE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-line2" role="group" aria-label="Density">
              {(['grid', 'list'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDensity(mode)}
                  aria-pressed={density === mode}
                  aria-label={`${mode} view`}
                  className={cx(
                    'grid h-11 w-11 place-items-center border-r border-line2 transition-colors last:border-r-0',
                    density === mode ? 'bg-acid text-black' : 'text-faint hover:text-fg',
                  )}
                >
                  {mode === 'grid' ? <IconGrid size={15} /> : <IconList size={15} />}
                </button>
              ))}
            </div>
            <CyberButton
              variant="solid"
              leading={<IconPlus size={14} />}
              onClick={() => openComposer()}
              kbd="N"
            >
              <span className="hidden sm:inline">NEW SUBSCRIPTION</span>
              <span className="sm:hidden">+ NEW</span>
            </CyberButton>
          </div>
        </div>

        {/* query field */}
        <div className="flex items-center gap-2 border border-line2 bg-bg2 px-2.5 transition-colors focus-within:border-acid">
          <IconSearch size={15} className="shrink-0 text-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search subscriptions... (name, category, >500, monthly, sep)"
            aria-label="Search subscriptions"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent py-2.5 font-mono text-[12px] outline-none placeholder:text-faint"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="flex items-center gap-1 text-faint transition-colors hover:text-fg"
              aria-label="Clear query"
            >
              <IconClose size={13} />
            </button>
          )}
          <span className="micro hidden shrink-0 text-faint sm:inline">
            {filtered.length} MATCH{filtered.length === 1 ? '' : 'ES'}
          </span>
        </div>

        {/* filters */}
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
          {/* Status filters (Left) */}
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatus(filter.value)}
                aria-pressed={status === filter.value}
                className={cx(
                  'micro flex min-h-9 items-center gap-1.5 border px-2.5 transition-colors',
                  status === filter.value
                    ? 'border-fg bg-fg text-bg'
                    : 'border-line2 text-dim hover:border-linehard hover:text-fg',
                )}
              >
                {filter.value === 'active' && <Led signal="acid" size="sm" />}
                {filter.value === 'suspended' && <Led signal="orange" size="sm" />}
                {filter.value === 'terminated' && <Led signal="red" size="sm" />}
                {filter.label}
              </button>
            ))}
          </div>

          {/* Categories (Center) */}
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto xl:justify-center">
            <button
              type="button"
              onClick={() => setCategory('all')}
              aria-pressed={category === 'all'}
              className={cx(
                'micro min-h-9 shrink-0 border px-2.5 transition-colors',
                category === 'all'
                  ? 'border-acid text-acidink'
                  : 'border-line2 text-faint hover:border-linehard hover:text-dim',
              )}
            >
              ALL CATEGORIES
            </button>
            {CATEGORIES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setCategory(entry.id)}
                aria-pressed={category === entry.id}
                title={CATEGORY_LABEL[entry.id]}
                className={cx(
                  'micro min-h-9 shrink-0 border px-2 transition-colors',
                  category === entry.id
                    ? 'border-acid text-acidink'
                    : 'border-line2 text-faint hover:border-linehard hover:text-dim',
                )}
              >
                {entry.code}
                <span className="ml-1.5 text-linehard">{categoryCounts.get(entry.id) ?? 0}</span>
              </button>
            ))}
          </div>

          {/* Sort options (Right) */}
          <div className="flex shrink-0 flex-wrap items-center gap-1 xl:justify-end">
            <span className="tech-label mr-1">SORT</span>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                aria-pressed={sort === key}
                className={cx(
                  'micro min-h-9 border px-2.5 transition-colors',
                  sort === key
                    ? 'border-fg bg-fg text-bg'
                    : 'border-line2 text-faint hover:border-linehard hover:text-dim',
                )}
              >
                {SORT_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* selection readout */}
      <div className="mt-3">
        <CutPanel cut="br" cutSize={10} innerClassName="p-0">
          <DataStrip
            size="sm"
            items={[
              { label: 'Records in view', value: String(filtered.length).padStart(2, '0') },
              {
                label: 'Monthly burn in view',
                value: formatMoney(monthlyInView, base),
                signal: 'acid',
              },
              { label: 'Annualised', value: formatMoney(annualInView, base), signal: 'blue' },
              {
                label: 'Average',
                value: formatMoney(activeInView.length ? monthlyInView / activeInView.length : 0, base),
              },
              {
                label: 'Filters',
                value: `${status.toUpperCase()}${category === 'all' ? '' : ` · ${category.toUpperCase()}`}${
                  query ? ' · QUERY' : ''
                }`,
              },
            ]}
          />
        </CutPanel>
      </div>

      {/* results */}
      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            code={query || status !== 'all' || category !== 'all' ? 'NO RECORDS MATCH' : 'NO ACTIVE SUBSCRIPTIONS'}
            title={
              query || status !== 'all' || category !== 'all'
                ? 'QUERY RETURNED NOTHING.'
                : 'SYSTEM IS CURRENTLY CLEAN.'
            }
            description={
              query || status !== 'all' || category !== 'all'
                ? 'Widen the filters or clear the query. The index itself is intact.'
                : 'No subscriptions are being tracked yet. Initialize one to start monitoring the burn.'
            }
            action={
              query || status !== 'all' || category !== 'all'
                ? {
                    label: 'RESET FILTERS',
                    onClick: () => {
                      setQuery('')
                      setStatus('all')
                      setCategory('all')
                    },
                  }
                : { label: '+ ADD FIRST SUBSCRIPTION', onClick: () => openComposer() }
            }
          />
        </div>
      ) : density === 'grid' ? (
        <motion.div
          layout
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        >
          {filtered.map((view, index) => (
            <ProcessCard key={view.sub.id} view={view} index={index} />
          ))}
        </motion.div>
      ) : (
        <CutPanel cut="br" cutSize={12} innerClassName="p-0" className="mt-4">
          <div className="flex items-center justify-between gap-3 border-b-2 border-linehard px-3 py-2 md:px-4">
            <span className="tech-label">SUBSCRIPTION // SERVICE</span>
            <span className="tech-label hidden md:inline">DISTRIBUTION</span>
            <span className="tech-label">PRICE · NORMALISED</span>
          </div>
          <ul>
            {filtered.map((view) => (
              <li key={view.sub.id}>
                <ProcessRow view={view} />
              </li>
            ))}
          </ul>
        </CutPanel>
      )}
    </div>
  )
}
