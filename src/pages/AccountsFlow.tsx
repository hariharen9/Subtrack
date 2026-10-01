/**
 * SPENDSTATE // ACCOUNTS FLOW (REGISTRY)
 *
 * The account registry — search, type & status filters, sort — plus the
 * transfer rail (money moved between accounts) with per-row removal.
 */
import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useAccounts, useAccountsSystem, useTransfers } from '@/hooks/useAccounts'
import { deleteTransfer } from '@/lib/db'
import { useUI, TOAST_VERBS } from '@/store/ui'
import { formatMoney, formatCompact } from '@/lib/money'
import { formatSignalDate } from '@/lib/date'
import { ACCOUNT_TYPES, ACCOUNT_TYPE_META, type AccountType } from '@/lib/types'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { EmptyState } from '@/components/ui/Skeleton'
import { CyberButton, IconButton } from '@/components/ui/CyberButton'
import { Led, SIGNAL_TEXT } from '@/components/ui/Signal'
import { IconPlus, IconSearch, IconClose, IconEdit, IconTerminate } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.03 } } }
const RISE = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } } }

type SortOrder = 'balance' | 'name' | 'type'

export default function AccountsFlow() {
  const accounts = useAccounts()
  const { summary } = useAccountsSystem()
  const transfers = useTransfers()
  const base = useUI((s) => s.baseCurrency)
  const openAccountComposer = useUI((s) => s.openAccountComposer)
  const pushToast = useUI((s) => s.pushToast)

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | AccountType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all')
  const [sort, setSort] = useState<SortOrder>('balance')

  const balanceById = useMemo(() => {
    const map = new Map<string, { balance: number; base: number }>()
    for (const v of summary.views) map.set(v.account.id, { balance: v.balance, base: v.balanceBase })
    return map
  }, [summary.views])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return accounts
      .filter((a) => {
        if (typeFilter !== 'all' && a.type !== typeFilter) return false
        if (statusFilter !== 'all' && a.status !== statusFilter) return false
        if (q && !`${a.name} ${a.institution} ${a.type}`.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name)
        if (sort === 'type') return a.type.localeCompare(b.type)
        return (balanceById.get(b.id)?.base ?? 0) - (balanceById.get(a.id)?.base ?? 0)
      })
  }, [accounts, query, typeFilter, statusFilter, sort, balanceById])

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—'
  const recentTransfers = useMemo(
    () => [...transfers].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 12),
    [transfers],
  )

  const hasFilters = query || typeFilter !== 'all' || statusFilter !== 'all'
  const clearFilters = () => {
    setQuery('')
    setTypeFilter('all')
    setStatusFilter('all')
    setSort('balance')
  }

  const removeTransfer = async (id: string) => {
    await deleteTransfer(id)
    pushToast(TOAST_VERBS.info('TRANSFER REMOVED', 'Movement reversed'))
  }

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="px-3 py-4 md:px-5 md:py-5">
      <motion.div variants={RISE}>
        <CutPanel cut="tl-br" cutSize={16} innerClassName="p-2 md:p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="micro border border-line2 bg-bg2 px-1.5 py-0.5 text-dim">FLOW</span>
            <h1 className="text-[14px] font-semibold text-fg">ACCOUNT REGISTRY</h1>
            <span className="micro text-faint">{filtered.length}/{accounts.length}</span>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 border border-line2 bg-bg2 px-2 focus-within:border-acid">
              <IconSearch size={13} className="shrink-0 text-faint" />
              <input className="w-32 bg-transparent py-1.5 font-mono text-[11px] outline-none placeholder:text-faint" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." autoComplete="off" spellCheck={false} aria-label="Search accounts" />
              {query && <button type="button" onClick={() => setQuery('')} className="text-faint hover:text-fg" aria-label="Clear search"><IconClose size={11} /></button>}
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortOrder)} aria-label="Sort accounts" className="micro border border-line2 bg-bg2 px-1.5 py-1.5 font-mono text-fg outline-none focus:border-acid">
              <option value="balance">BALANCE</option>
              <option value="name">NAME</option>
              <option value="type">TYPE</option>
            </select>
            <CyberButton variant="ink" size="sm" leading={<IconPlus size={12} />} onClick={() => openAccountComposer({ mode: 'transfer' })}>TRANSFER</CyberButton>
            <CyberButton variant="solid" size="sm" leading={<IconPlus size={12} />} onClick={() => openAccountComposer()}>ADD ACCOUNT</CyberButton>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className="micro text-[9px] text-faint">TYPE:</span>
            <button type="button" onClick={() => setTypeFilter('all')} className={cx('micro border px-1.5 py-0.5 transition-colors', typeFilter === 'all' ? 'border-acid bg-acid text-black font-semibold' : 'border-line2 text-dim hover:text-fg')}>ALL</button>
            {ACCOUNT_TYPES.map((t) => (
              <button key={t.id} type="button" onClick={() => setTypeFilter(t.id)} className={cx('micro border px-1.5 py-0.5 transition-colors', typeFilter === t.id ? 'border-fg bg-fg text-bg font-semibold' : 'border-line2 text-dim hover:text-fg')}>{t.code}</button>
            ))}
            <span className="micro ml-2 text-[9px] text-faint">STATUS:</span>
            {(['all', 'active', 'archived'] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatusFilter(s)} className={cx('micro border px-1.5 py-0.5 transition-colors', statusFilter === s ? 'border-acid bg-acid text-black font-semibold' : 'border-line2 text-dim hover:text-fg')}>{s.toUpperCase()}</button>
            ))}
            {hasFilters && <button type="button" onClick={clearFilters} className="micro ml-1 text-acidink underline hover:text-fg">RESET</button>}
          </div>
        </CutPanel>
      </motion.div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <motion.div variants={RISE} className="lg:col-span-7">
          <CutPanel cut="br" cutSize={14} innerClassName="p-0">
            <SectionHeader code="ACCT" title="Accounts" signal={filtered.length ? 'acid' : 'blue'} right={<span className="micro text-faint">{filtered.length} RECORDS</span>} />
            {filtered.length ? (
              <div className="divide-y divide-line">
                {filtered.map((a) => {
                  const meta = ACCOUNT_TYPE_META[a.type]
                  const bal = balanceById.get(a.id)
                  return (
                    <div key={a.id} className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-surface2 md:px-4">
                      <span className="grid h-9 w-9 shrink-0 place-items-center border font-mono text-[10px] font-semibold" style={{ borderColor: a.color, color: a.color, background: `${a.color}14` }}>{meta.code}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-semibold text-fg">{a.name}</span>
                          <span className={cx('micro', SIGNAL_TEXT[meta.signal])}>{meta.label}</span>
                          {a.status !== 'active' && <span className="micro text-faint">{a.status.toUpperCase()}</span>}
                        </span>
                        <span className="micro block truncate text-faint">
                          {a.institution || '—'}{a.type === 'credit' && a.creditLimit ? ` · LIMIT ${formatCompact(a.creditLimit, a.currency)}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className={cx('numeral block text-[14px] font-bold', (bal?.balance ?? 0) < 0 ? 'text-redink' : 'text-fg')}>
                          {formatMoney(bal?.balance ?? a.openingBalance, a.currency)}
                        </span>
                        <span className="micro block text-faint">{formatMoney(bal?.base ?? 0, base)} BASE</span>
                      </span>
                      <IconButton label={`Edit ${a.name}`} size="sm" onClick={() => openAccountComposer({ editId: a.id })}>
                        <IconEdit size={13} />
                      </IconButton>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-4">
                <EmptyState code="NO MATCHES" title="NO ACCOUNTS FOUND." description={accounts.length ? 'Your filters matched no accounts.' : 'No accounts yet.'} action={hasFilters ? { label: 'RESET FILTERS', onClick: clearFilters } : { label: 'ADD ACCOUNT', onClick: () => openAccountComposer() }} />
              </div>
            )}
          </CutPanel>
        </motion.div>

        <motion.div variants={RISE} className="lg:col-span-5">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-0" className="h-full">
            <SectionHeader code="TX" title="Transfers" signal="magenta" right={<span className="micro text-faint">{transfers.length} MOVES</span>} />
            {recentTransfers.length ? (
              <div className="divide-y divide-line">
                {recentTransfers.map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5 px-3 py-2.5 md:px-4">
                    <Led signal="blue" size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-fg">
                        {accountName(t.fromAccountId)} → {accountName(t.toAccountId)}
                      </span>
                      <span className="micro block text-faint">{formatSignalDate(t.date)}{t.notes ? ` · ${t.notes}` : ''}</span>
                    </span>
                    <span className="numeral shrink-0 text-[12px] text-fg">{formatMoney(t.amount, t.currency)}</span>
                    <IconButton label="Remove transfer" size="sm" onClick={() => void removeTransfer(t.id)} className="text-faint hover:text-redink">
                      <IconTerminate size={12} />
                    </IconButton>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4">
                <EmptyState code="NO TRANSFERS" title="NO MOVES YET." description="Move money between accounts — a bank → wallet top-up, a card settlement, anything that is neither income nor spend." action={{ label: 'RECORD TRANSFER', onClick: () => openAccountComposer({ mode: 'transfer' }) }} />
              </div>
            )}
          </CutPanel>
        </motion.div>
      </div>
    </motion.div>
  )
}
