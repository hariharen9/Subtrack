/**
 * SUBTRACK // CARDS FLOW (TRANSACTION REGISTRY)
 *
 * Every card transaction in one registry: search, card filter, type filter,
 * category filter, sort, and CSV export. High density, keyboard friendly.
 */
import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useCreditCards, useCardTransactions } from '@/hooks/useCards'
import { useUI } from '@/store/ui'
import { formatMoney } from '@/lib/money'
import { formatSignalDate, todayISO } from '@/lib/date'
import { SPEND_CATEGORIES, SPEND_CATEGORY_META, CARD_TXN_TYPE_LABEL, type SpendCategory, type CardTxnType } from '@/lib/types'
import { downloadFile } from '@/lib/portability'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { CyberButton, IconButton } from '@/components/ui/CyberButton'
import { EmptyState } from '@/components/ui/Skeleton'
import { SIGNAL_TEXT } from '@/components/ui/Signal'
import { IconSearch, IconClose, IconDownload, IconPlus, IconEdit } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.03 } } }
const RISE = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } } }

type SortOrder = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc'
type TypeFilter = 'all' | CardTxnType

const TXN_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'purchase', label: 'PURCHASE' },
  { id: 'payment', label: 'PAYMENT' },
  { id: 'fee', label: 'FEE' },
  { id: 'interest', label: 'INTEREST' },
  { id: 'reward', label: 'REWARD' },
  { id: 'refund', label: 'REFUND' },
]

export default function CardsFlow() {
  const cards = useCreditCards()
  const txns = useCardTransactions()
  const openCardComposer = useUI((s) => s.openCardComposer)

  const [query, setQuery] = useState('')
  const [cardFilter, setCardFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [catFilter, setCatFilter] = useState<'all' | SpendCategory>('all')
  const [sort, setSort] = useState<SortOrder>('newest')

  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = txns.filter((t) => {
      if (cardFilter !== 'all' && t.cardId !== cardFilter) return false
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (catFilter !== 'all' && t.category !== catFilter) return false
      if (q) {
        const card = cardById.get(t.cardId)
        const hay = `${t.title} ${t.notes} ${t.category} ${t.type} ${card?.name ?? ''} ${card?.issuer ?? ''} ${t.amount}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    return list.sort((a, b) => {
      if (sort === 'newest') return a.date < b.date ? 1 : a.date > b.date ? -1 : 0
      if (sort === 'oldest') return a.date > b.date ? 1 : a.date < b.date ? -1 : 0
      if (sort === 'amount_desc') return b.amount - a.amount
      return a.amount - b.amount
    })
  }, [txns, query, cardFilter, typeFilter, catFilter, sort, cardById])

  const hasFilters = query || cardFilter !== 'all' || typeFilter !== 'all' || catFilter !== 'all'
  const clearFilters = () => { setQuery(''); setCardFilter('all'); setTypeFilter('all'); setCatFilter('all'); setSort('newest') }

  const doExport = () => {
    const header = ['date', 'card', 'title', 'type', 'category', 'amount', 'currency', 'rewards', 'notes']
    const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
    const rows = filtered.map((t) => {
      const card = cardById.get(t.cardId)
      return [t.date, card ? `${card.name} ··${card.last4}` : t.cardId, t.title, t.type, t.category, t.amount, t.currency, t.rewards, t.notes].map(esc).join(',')
    })
    downloadFile(`subtrack-cards-${todayISO()}.csv`, [header.join(','), ...rows].join('\n'), 'text/csv')
  }

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="px-3 py-4 md:px-5 md:py-5">
      {/* Filter console */}
      <motion.div variants={RISE}>
        <CutPanel cut="tl-br" cutSize={16} innerClassName="p-2 md:p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="micro border border-line2 bg-bg2 px-1.5 py-0.5 text-dim">FLOW</span>
            <h1 className="text-[14px] font-semibold text-fg">CARD TRANSACTIONS</h1>
            <span className="micro text-faint">{filtered.length}/{txns.length}</span>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 border border-line2 bg-bg2 px-2 focus-within:border-acid">
              <IconSearch size={13} className="shrink-0 text-faint" />
              <input className="w-32 bg-transparent py-1.5 font-mono text-[11px] outline-none placeholder:text-faint" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." autoComplete="off" spellCheck={false} aria-label="Search transactions" />
              {query && <button type="button" onClick={() => setQuery('')} className="text-faint hover:text-fg"><IconClose size={11} /></button>}
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortOrder)} className="micro border border-line2 bg-bg2 px-1.5 py-1.5 font-mono text-fg outline-none focus:border-acid" aria-label="Sort">
              <option value="newest">NEWEST</option>
              <option value="oldest">OLDEST</option>
              <option value="amount_desc">₹ HIGH</option>
              <option value="amount_asc">₹ LOW</option>
            </select>
            <CyberButton variant="ink" size="sm" leading={<IconDownload size={12} />} onClick={doExport}>CSV</CyberButton>
            <CyberButton variant="solid" size="sm" leading={<IconPlus size={12} />} onClick={() => openCardComposer({ mode: 'txn' })}>LOG TXN</CyberButton>
          </div>

          {/* Filters */}
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className="micro text-[9px] text-faint">CARD:</span>
            <button type="button" onClick={() => setCardFilter('all')} className={cx('micro border px-1.5 py-0.5 transition-colors', cardFilter === 'all' ? 'border-acid bg-acid text-black font-semibold' : 'border-line2 text-dim hover:text-fg')}>ALL</button>
            {cards.map((c) => (
              <button key={c.id} type="button" onClick={() => setCardFilter(c.id)} className={cx('micro border px-1.5 py-0.5 transition-colors', cardFilter === c.id ? 'border-fg bg-fg text-bg font-semibold' : 'border-line2 text-dim hover:text-fg')} title={`${c.name} ··${c.last4}`}>
                ··{c.last4}
              </button>
            ))}
            <span className="ml-2 micro text-[9px] text-faint">TYPE:</span>
            {TXN_FILTERS.map((t) => (
              <button key={t.id} type="button" onClick={() => setTypeFilter(t.id)} className={cx('micro border px-1.5 py-0.5 transition-colors', typeFilter === t.id ? 'border-acid bg-acid text-black font-semibold' : 'border-line2 text-dim hover:text-fg')}>{t.label}</button>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className="micro text-[9px] text-faint">CAT:</span>
            <button type="button" onClick={() => setCatFilter('all')} className={cx('micro border px-1.5 py-0.5 transition-colors', catFilter === 'all' ? 'border-acid bg-acid text-black font-semibold' : 'border-line2 text-dim hover:text-fg')}>ALL</button>
            {SPEND_CATEGORIES.map((c) => (
              <button key={c.id} type="button" onClick={() => setCatFilter(c.id)} className={cx('micro border px-1.5 py-0.5 transition-colors', catFilter === c.id ? 'border-fg bg-fg text-bg font-semibold' : 'border-line2 text-dim hover:text-fg')}>{c.code}</button>
            ))}
            {hasFilters && <button type="button" onClick={clearFilters} className="micro ml-1 text-acidink underline hover:text-fg">RESET</button>}
          </div>
        </CutPanel>
      </motion.div>

      {/* Ledger */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="br" cutSize={14} innerClassName="p-0">
          <SectionHeader
            code="LDG"
            title="Transaction stream"
            signal={filtered.length ? 'acid' : 'blue'}
            right={<span className="micro text-faint">{filtered.length} RECORDS</span>}
          />
          {filtered.length ? (
            <div className="divide-y divide-line">
              {filtered.map((t) => {
                const card = cardById.get(t.cardId)
                const meta = SPEND_CATEGORY_META[t.category]
                const isDebit = t.type === 'purchase' || t.type === 'fee' || t.type === 'interest'
                return (
                  <div key={t.id} className="group flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-surface2 md:px-4">
                    <span className={cx('grid h-7 w-7 shrink-0 place-items-center border text-[8px] font-bold', isDebit ? 'border-line2 text-dim' : 'border-acid text-acidink')}>
                      {t.type === 'payment' ? 'PAY' : t.type === 'refund' ? 'REF' : t.type === 'fee' ? 'FEE' : t.type === 'interest' ? 'INT' : t.type === 'reward' ? 'RWD' : 'PUR'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[12.5px] font-medium text-fg">{t.title}</span>
                        <span className={cx('micro shrink-0', SIGNAL_TEXT[meta.signal])}>{meta.code}</span>
                      </span>
                      <span className="micro block truncate text-faint">
                        {card ? `${card.name} ··${card.last4}` : '—'} · {CARD_TXN_TYPE_LABEL[t.type]} · {formatSignalDate(t.date)}
                        {t.notes ? ` · ${t.notes}` : ''}
                        {t.rewards > 0 && t.type !== 'payment' ? ` · +${t.rewards} PTS` : ''}
                      </span>
                    </span>
                    <span className={cx('numeral shrink-0 text-[13px] font-semibold', isDebit ? 'text-fg' : 'text-acidink')}>
                      {isDebit ? '' : '+'}{formatMoney(t.amount, t.currency)}
                    </span>
                    <div className="flex shrink-0 items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                      <IconButton label="Edit" size="sm" onClick={() => openCardComposer({ mode: 'txn', presetCardId: t.cardId })} title="Edit (creates a correction entry)">
                        <IconEdit size={12} />
                      </IconButton>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                code="NO MATCHES"
                title="NOTHING FOUND."
                description={txns.length ? 'Filters matched no transactions.' : 'No card transactions yet. Log one to populate the registry.'}
                action={hasFilters ? { label: 'RESET FILTERS', onClick: clearFilters } : { label: '+ LOG TRANSACTION', onClick: () => openCardComposer({ mode: 'txn' }) }}
              />
            </div>
          )}
        </CutPanel>
      </motion.div>
    </motion.div>
  )
}