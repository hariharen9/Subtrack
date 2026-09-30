/**
 * SPENDSTATE // DEBT FLOW (LOAN REGISTRY)
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
import { CyberButton } from '@/components/ui/CyberButton'
import { useUI } from '@/store/ui'
import { cx } from '@/lib/cx'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.03 } } }
const RISE = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } } }

type SortOrder = 'principal' | 'emi' | 'rate' | 'name'

export default function DebtFlow() {
  const loans = useLoans()
  const openLoanComposer = useUI((s) => s.openLoanComposer)

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | LoanType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | LoanStatus>('all')
  const [sort, setSort] = useState<SortOrder>('principal')

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
        if (sort === 'principal') return b.principal - a.principal
        if (sort === 'emi') return b.emi - a.emi
        if (sort === 'rate') return b.interestRate - a.interestRate
        if (sort === 'name') return a.name.localeCompare(b.name)
        return 0
      })
  }, [loans, query, typeFilter, statusFilter, sort])

  const hasFilters = query || typeFilter !== 'all' || statusFilter !== 'all'
  const clearFilters = () => { setQuery(''); setTypeFilter('all'); setStatusFilter('all'); setSort('principal') }

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="px-3 py-4 md:px-5 md:py-5">
      <motion.div variants={RISE}>
        <CutPanel cut="tl-br" cutSize={16} innerClassName="p-2 md:p-3">
          {/* Header + Search + Sort — one compact row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="micro border border-line2 bg-bg2 px-1.5 py-0.5 text-dim">FLOW</span>
            <h1 className="text-[14px] font-semibold text-fg">LOAN REGISTRY</h1>
            <span className="micro text-faint">{filtered.length}/{loans.length}</span>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 border border-line2 bg-bg2 px-2 focus-within:border-acid">
              <IconSearch size={13} className="shrink-0 text-faint" />
              <input className="w-32 bg-transparent py-1.5 font-mono text-[11px] outline-none placeholder:text-faint" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." autoComplete="off" spellCheck={false} />
              {query && <button type="button" onClick={() => setQuery('')} className="text-faint hover:text-fg"><IconClose size={11} /></button>}
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortOrder)} aria-label="Sort loans" className="micro border border-line2 bg-bg2 px-1.5 py-1.5 font-mono text-fg outline-none focus:border-acid">
              <option value="principal">PRINCIPAL</option>
              <option value="emi">EMI</option>
              <option value="rate">RATE</option>
              <option value="name">NAME</option>
            </select>
            <CyberButton variant="solid" size="sm" onClick={() => openLoanComposer()}>+ ADD LOAN</CyberButton>
          </div>

          {/* Filters — compact single row */}
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className="micro text-[9px] text-faint">TYPE:</span>
            <button type="button" onClick={() => setTypeFilter('all')} className={cx('micro border px-1.5 py-0.5 transition-colors', typeFilter === 'all' ? 'border-acid bg-acid text-black font-semibold' : 'border-line2 text-dim hover:text-fg')}>ALL</button>
            {LOAN_TYPES.map((t) => (
              <button key={t.id} type="button" onClick={() => setTypeFilter(t.id)} className={cx('micro border px-1.5 py-0.5 transition-colors', typeFilter === t.id ? 'border-fg bg-fg text-bg font-semibold' : 'border-line2 text-dim hover:text-fg')}>{t.code}</button>
            ))}
            <span className="ml-2 micro text-[9px] text-faint">STATUS:</span>
            {(['all', 'active', 'paid_off'] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatusFilter(s)} className={cx('micro border px-1.5 py-0.5 transition-colors', statusFilter === s ? 'border-acid bg-acid text-black font-semibold' : 'border-line2 text-dim hover:text-fg')}>{s === 'all' ? 'ALL' : s === 'active' ? 'ACTIVE' : 'PAID'}</button>
            ))}
            {hasFilters && <button type="button" onClick={clearFilters} className="micro ml-1 text-acidink underline hover:text-fg">RESET</button>}
          </div>
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
                  <div key={loan.id} className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-surface2 md:px-4">
                    <Link to={`/loans/flow/${loan.id}`} className="flex flex-1 items-center gap-3 min-w-0 focus-visible:outline-none">
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
                    <button
                      type="button"
                      onClick={() => openLoanComposer({ mode: 'loan', editLoanId: loan.id })}
                      className="micro shrink-0 border border-line2 px-2 py-1 text-dim opacity-0 transition-all group-hover:opacity-100 hover:border-acid hover:text-acidink"
                      aria-label={`Edit ${loan.name}`}
                    >
                      EDIT
                    </button>
                  </div>
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