/**
 * SUBTRACK // DEBT FLOW (LOAN REGISTRY)
 *
 * Full loan registry with search, type filters, and sort.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useLoans } from '@/hooks/useDebt'
import { formatMoney, formatCompact } from '@/lib/money'
import { LOAN_TYPES, LOAN_TYPE_META, type LoanType, type LoanStatus } from '@/lib/types'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { EmptyState } from '@/components/ui/Skeleton'
import { Led, SIGNAL_TEXT } from '@/components/ui/Signal'
import { IconSearch, IconClose } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.03 } } }
const RISE = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } } }

type SortOrder = 'outstanding' | 'emi' | 'rate' | 'name' | 'progress'

export default function DebtFlow() {
  const loans = useLoans()

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | LoanType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | LoanStatus>('all')
  const [sort, setSort] = useState<SortOrder>('outstanding')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return loans
      .filter((loan) => {
        if (typeFilter !== 'all' && loan.loanType !== typeFilter) return false
        if (statusFilter !== 'all' && loan.status !== statusFilter) return false
        if (q) {
          const searchable = `${loan.name} ${loan.lender} ${loan.loanType} ${loan.notes}`.toLowerCase()
          if (!searchable.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sort === 'outstanding') return b.principal - a.principal
        if (sort === 'emi') return b.emi - a.emi
        if (sort === 'rate') return b.interestRate - a.interestRate
        if (sort === 'name') return a.name.localeCompare(b.name)
        if (sort === 'progress') return 0 // needs payments data
        return 0
      })
  }, [loans, query, typeFilter, statusFilter, sort])

  const hasFilters = query || typeFilter !== 'all' || statusFilter !== 'all'
  const clearFilters = () => { setQuery(''); setTypeFilter('all'); setStatusFilter('all'); setSort('outstanding') }

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="px-3 py-4 md:px-5 md:py-5">
      <motion.div variants={RISE}>
        <CutPanel cut="tl-br" cutSize={16} innerClassName="p-3 md:p-4">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <span className="micro border border-line2 bg-bg2 px-1.5 py-0.5 text-dim">FLOW</span>
              <h1 className="text-[15px] font-semibold text-fg">LOAN REGISTRY</h1>
              <span className="micro hidden text-faint sm:inline">{filtered.length} / {loans.length} LOANS</span>
            </div>
            <div className="flex items-center gap-2">
              <select value={sort} onChange={(e) => setSort(e.target.value as SortOrder)} className="micro border border-line2 bg-bg2 px-2 py-1.5 font-mono text-fg outline-none focus:border-acid">
                <option value="outstanding">OUTSTANDING</option>
                <option value="emi">EMI</option>
                <option value="rate">INTEREST RATE</option>
                <option value="name">NAME</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="mt-3 flex items-center gap-2 border border-line2 bg-bg2 px-3 transition-colors focus-within:border-acid">
            <IconSearch size={15} className="shrink-0 text-faint" />
            <input
              className="w-full bg-transparent py-2 font-mono text-[12px] outline-none placeholder:text-faint"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lender, name, type..."
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-faint hover:text-fg"><IconClose size={13} /></button>
            )}
          </div>

          {/* Filters */}
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div>
              <span className="micro text-[10px] text-faint">LOAN TYPE</span>
              <div className="mt-1 flex flex-wrap gap-1">
                <button type="button" onClick={() => setTypeFilter('all')} className={cx('micro border px-2 py-1 transition-colors', typeFilter === 'all' ? 'border-acid bg-acid text-black font-semibold' : 'border-line2 text-dim hover:text-fg')}>ALL</button>
                {LOAN_TYPES.map((t) => (
                  <button key={t.id} type="button" onClick={() => setTypeFilter(t.id)} className={cx('micro border px-2 py-1 transition-colors', typeFilter === t.id ? 'border-fg bg-fg text-bg font-semibold' : 'border-line2 text-dim hover:text-fg')}>{t.code}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="micro text-[10px] text-faint">STATUS</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {(['all', 'active', 'paid_off'] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setStatusFilter(s)} className={cx('micro border px-2 py-1 transition-colors', statusFilter === s ? 'border-acid bg-acid text-black font-semibold' : 'border-line2 text-dim hover:text-fg')}>{s === 'all' ? 'ALL' : s === 'active' ? 'ACTIVE' : 'PAID OFF'}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-2">
              <button type="button" onClick={clearFilters} className="micro text-acidink underline hover:text-fg">RESET ALL</button>
            </div>
          )}
        </CutPanel>
      </motion.div>

      {/* Loan list */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="br" cutSize={14} innerClassName="p-0">
          <SectionHeader code="LDG" title="Loan stream" signal={filtered.length ? 'acid' : 'blue'} right={<span className="micro text-faint">{filtered.length} RECORDS</span>} />
          {filtered.length ? (
            <div className="divide-y divide-line">
              {filtered.map((loan) => {
                const meta = LOAN_TYPE_META[loan.loanType]
                const isPaidOff = loan.status === 'paid_off'
                return (
                  <Link key={loan.id} to={`/loans/flow/${loan.id}`} className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-surface2 md:px-4">
                    <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center border', isPaidOff ? 'border-acid text-acidink' : `border-${meta.signal} ${SIGNAL_TEXT[meta.signal]}`)}>
                      <Led signal={isPaidOff ? 'acid' : meta.signal} size="sm" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-semibold text-fg">{loan.name}</span>
                        <span className={cx('micro', SIGNAL_TEXT[meta.signal])}>{meta.code}</span>
                      </span>
                      <span className="micro block truncate text-faint">
                        {loan.lender} · {loan.interestRate}% · {loan.tenureMonths} MO · EMI {formatMoney(loan.emi, loan.currency)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="numeral block text-[14px] font-bold text-fg">{formatCompact(loan.principal, loan.currency)}</span>
                      <span className={cx('micro', isPaidOff ? 'text-acidink' : 'text-faint')}>
                        {isPaidOff ? 'PAID OFF' : loan.status.toUpperCase()}
                      </span>
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState code="NO MATCHES" title="NO LOANS FOUND." description={loans.length ? 'Your filters matched no loans.' : 'No loans tracked yet.'} action={hasFilters ? { label: 'RESET FILTERS', onClick: clearFilters } : undefined} />
            </div>
          )}
        </CutPanel>
      </motion.div>
    </motion.div>
  )
}