/**
 * SUBTRACK // CARD DIAGNOSTIC
 *
 * Per-card board: the card face, statement cycle state, utilisation gauge,
 * cycle telemetry, category mix and the full transaction history.
 */
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useCreditCard, useCardTransactions } from '@/hooks/useCards'
import { useUI } from '@/store/ui'
import { formatMoney, formatCompact } from '@/lib/money'
import { formatSignalDate } from '@/lib/date'
import { SPEND_CATEGORY_META, CARD_TXN_TYPE_LABEL, CARD_NETWORK_LABEL } from '@/lib/types'
import { currentCycleStart, nextCycleStart, upcomingDueDate } from '@/lib/cards'
import { CutPanel } from '@/components/ui/CutPanel'
import { DataStrip } from '@/components/ui/DataStrip'
import { SectionHeader } from '@/components/ui/Micro'
import { EmptyState, BootScreen } from '@/components/ui/Skeleton'
import { SIGNAL_TEXT } from '@/components/ui/Signal'
import { CardVisual } from '@/components/cards/CardVisual'
import { CyberButton } from '@/components/ui/CyberButton'
import { IconChevronLeft, IconPlus } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }
const RISE = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } } }

export default function CardDetail() {
  const { id } = useParams<{ id: string }>()
  const card = useCreditCard(id)
  const txns = useCardTransactions(id)
  const booted = useUI((s) => s.booted)
  const openCardComposer = useUI((s) => s.openCardComposer)

  const stats = useMemo(() => {
    if (!card) return null
    const today = new Date().toISOString().slice(0, 10)
    const cycleStart = currentCycleStart(card, today)
    const nextBilling = nextCycleStart(card, today)
    const dueDate = upcomingDueDate(card, today)
    const daysToDue = Math.max(0, Math.round((new Date(dueDate).getTime() - new Date(today).getTime()) / 86400000))

    const inCycle = txns.filter((t) => t.date >= cycleStart)
    const sumType = (list: typeof txns, ...types: string[]) =>
      list.filter((t) => types.includes(t.type)).reduce((s, t) => s + t.amount, 0)

    const balance = txns.reduce((s, t) => {
      const amt = t.amount
      if (t.type === 'purchase' || t.type === 'fee' || t.type === 'interest') return s + amt
      if (t.type === 'payment' || t.type === 'refund' || t.type === 'reward') return s - amt
      return s
    }, 0)

    const utilisation = card.creditLimit > 0 ? Math.min(1, balance / card.creditLimit) : 0
    const signal: 'acid' | 'blue' | 'magenta' | 'orange' | 'red' =
      utilisation >= 0.8 ? 'red' : utilisation >= 0.5 ? 'orange' : utilisation >= 0.2 ? 'blue' : 'acid'

    // Category mix within current cycle
    const catMap = new Map<string, { amount: number; count: number }>()
    for (const t of inCycle) {
      if (t.type !== 'purchase' && t.type !== 'fee') continue
      const b = catMap.get(t.category) ?? { amount: 0, count: 0 }
      b.amount += t.amount
      b.count++
      catMap.set(t.category, b)
    }
    const catTotal = [...catMap.values()].reduce((s, b) => s + b.amount, 0)
    const categories = [...catMap.entries()]
      .map(([category, b]) => {
        const meta = SPEND_CATEGORY_META[category as keyof typeof SPEND_CATEGORY_META]
        return { category, ...b, share: catTotal > 0 ? b.amount / catTotal : 0, meta }
      })
      .sort((a, b) => b.amount - a.amount)

    return {
      cycleStart, nextBilling, dueDate, daysToDue, balance, utilisation, signal, categories,
      cyclePurchases: sumType(inCycle, 'purchase'),
      cyclePayments: sumType(inCycle, 'payment'),
      cycleFees: sumType(inCycle, 'fee', 'interest'),
      totalRewards: txns.filter((t) => t.type !== 'payment').reduce((s, t) => s + t.rewards, 0),
      lastStatement: (() => {
        const lastStart = cycleStart
        return { start: lastStart }
      })(),
    }
  }, [card, txns])

  if (!booted) return <div className="px-3 py-6 md:px-5"><BootScreen label="LOADING CARD" /></div>

  if (!card || !stats) {
    return (
      <div className="px-3 py-6 md:px-5">
        <EmptyState code="CARD NOT FOUND" title="NO RECORD ON THIS VOLUME." description="This card does not exist in the local store." action={{ label: 'BACK TO VAULT', onClick: () => history.back() }} />
      </div>
    )
  }

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="px-3 py-4 md:px-5 md:py-5">
      <motion.div variants={RISE}>
        <Link to="/cards" className="micro inline-flex items-center gap-1 text-dim transition-colors hover:text-acidink">
          <IconChevronLeft size={12} /> BACK TO VAULT
        </Link>
      </motion.div>

      {/* Identity */}
      <motion.div variants={RISE} className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-3">
            <CardVisual card={card} balance={stats.balance} utilisation={stats.utilisation} size="lg" />
            <div className="mt-2 flex items-center justify-between">
              <span className="micro text-faint">{CARD_NETWORK_LABEL[card.network].toUpperCase()} · {card.interestRate}% APR</span>
              <div className="flex gap-1.5">
                <CyberButton variant="ghost" size="sm" onClick={() => openCardComposer({ mode: 'card', editCardId: card.id })}>EDIT</CyberButton>
                <CyberButton variant="solid" size="sm" leading={<IconPlus size={12} />} onClick={() => openCardComposer({ mode: 'txn', presetCardId: card.id })}>LOG TXN</CyberButton>
              </div>
            </div>
            {card.notes && <p className="meta mt-2 border-t border-line pt-2 text-faint">{card.notes}</p>}
          </CutPanel>
        </div>

        <div className="lg:col-span-7">
          <CutPanel cut="br" cutSize={14} innerClassName="p-4">
            <div className="flex items-center gap-2">
              <span className="micro border border-line2 px-1.5 py-0.5 text-dim">{card.issuer.toUpperCase()}</span>
              <span className="micro text-fg font-semibold">{card.name}</span>
              <span className="micro text-faint">··{card.last4}</span>
            </div>
            <div className="mt-3">
              <DataStrip
                items={[
                  { label: 'Balance', value: formatMoney(stats.balance, card.currency), signal: stats.signal },
                  { label: 'Limit', value: formatCompact(card.creditLimit, card.currency), signal: 'blue' },
                  { label: 'Available', value: formatMoney(card.creditLimit - stats.balance, card.currency), signal: 'acid' },
                  { label: 'Utilisation', value: `${(stats.utilisation * 100).toFixed(0)}%`, signal: stats.signal },
                  { label: 'Billing day', value: String(card.billingDay) },
                  { label: 'Due day', value: String(card.dueDay) },
                ]}
              />
            </div>
            {/* Cycle state */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="border border-line bg-bg2 p-2.5">
                <span className="micro block text-faint">CYCLE SPEND</span>
                <span className="numeral mt-0.5 block text-[16px] font-bold text-fg">{formatCompact(stats.cyclePurchases + stats.cycleFees, card.currency)}</span>
                <span className="micro text-faint">SINCE {formatSignalDate(stats.cycleStart)}</span>
              </div>
              <div className="border border-line bg-bg2 p-2.5">
                <span className="micro block text-faint">PAYMENTS</span>
                <span className="numeral mt-0.5 block text-[16px] font-bold text-acidink">{formatCompact(stats.cyclePayments, card.currency)}</span>
                <span className="micro text-faint">THIS CYCLE</span>
              </div>
              <div className="border border-line bg-bg2 p-2.5">
                <span className="micro block text-faint">NEXT DUE</span>
                <span className="numeral mt-0.5 block text-[16px] font-bold text-fg">{stats.daysToDue}D</span>
                <span className="micro text-faint">{formatSignalDate(stats.dueDate)}</span>
              </div>
            </div>
            {/* Utilisation bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <span className="micro text-faint">CREDIT UTILISATION</span>
                <span className={cx('micro font-bold', SIGNAL_TEXT[stats.signal])}>{(stats.utilisation * 100).toFixed(0)}%</span>
              </div>
              <div className="mt-1 h-3 w-full bg-surface2 border border-line">
                <motion.div
                  className={cx('h-full', stats.utilisation >= 0.8 ? 'bg-red' : stats.utilisation >= 0.5 ? 'bg-orange' : 'bg-blue')}
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.utilisation * 100}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="micro mt-1 text-faint">KEEPING UNDER 30% PROTECTS YOUR SCORE · {(stats.utilisation * 100).toFixed(0)}% NOW</p>
            </div>
          </CutPanel>
        </div>
      </motion.div>

      {/* Category mix + history */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <motion.div variants={RISE} className="lg:col-span-5">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
            <SectionHeader code="CAT" title="Cycle category mix" signal="magenta" />
            {stats.categories.length ? (
              <div className="divide-y divide-line">
                {stats.categories.map((c) => (
                  <div key={c.category} className="flex items-center gap-3 px-3 py-2 md:px-4">
                    <span className="micro w-9 font-semibold" style={{ color: `var(--c-${c.meta?.signal ?? 'blue'})` }}>{c.meta?.code}</span>
                    <span className="micro min-w-0 flex-1 truncate text-faint">{c.meta?.label}</span>
                    <div className="h-1.5 w-20 shrink-0 bg-surface2 border border-line">
                      <div className="h-full" style={{ width: `${Math.max(4, c.share * 100)}%`, background: `var(--c-${c.meta?.signal ?? 'blue'})` }} />
                    </div>
                    <span className="numeral w-16 shrink-0 text-right text-[12px] text-fg">{formatMoney(c.amount, card.currency)}</span>
                    <span className="micro w-8 shrink-0 text-right text-faint">{(c.share * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="meta px-3 py-5 text-faint">NO PURCHASES THIS CYCLE.</p>
            )}
            <div className="border-t border-line bg-bg2 px-3 py-1.5">
              <span className="micro text-faint">TOTAL REWARDS EARNED · <span className="numeral font-bold text-magentaink">{Math.round(stats.totalRewards)}</span> PTS</span>
            </div>
          </CutPanel>
        </motion.div>

        <motion.div variants={RISE} className="lg:col-span-7">
          <CutPanel cut="tr" cutSize={14} innerClassName="p-0">
            <SectionHeader code="HIST" title="Transaction history" signal="acid" right={<span className="micro text-faint">{txns.length} TXNS</span>} />
            {txns.length ? (
              <div className="max-h-[480px] overflow-y-auto" data-lenis-prevent>
                <div className="divide-y divide-line">
                  {[...txns].sort((a, b) => (a.date < b.date ? 1 : -1)).map((t) => {
                    const isDebit = t.type === 'purchase' || t.type === 'fee' || t.type === 'interest'
                    return (
                      <div key={t.id} className="flex items-center gap-2.5 px-3 py-2 md:px-4">
                        <span className={cx('grid h-6 w-6 shrink-0 place-items-center border text-[7px] font-bold', isDebit ? 'border-line2 text-dim' : 'border-acid text-acidink')}>
                          {t.type === 'payment' ? 'PAY' : t.type === 'refund' ? 'REF' : t.type === 'fee' ? 'FEE' : t.type === 'interest' ? 'INT' : t.type === 'reward' ? 'RWD' : 'PUR'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-medium text-fg">{t.title}</span>
                          <span className="micro block text-faint">{formatSignalDate(t.date)} · {CARD_TXN_TYPE_LABEL[t.type]}{t.rewards > 0 && t.type !== 'payment' ? ` · +${t.rewards} PTS` : ''}</span>
                        </span>
                        <span className={cx('numeral shrink-0 text-[13px] font-semibold', isDebit ? 'text-fg' : 'text-acidink')}>
                          {isDebit ? '' : '+'}{formatMoney(t.amount, t.currency)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="meta px-3 py-5 text-faint">NO TRANSACTIONS YET.</p>
            )}
          </CutPanel>
        </motion.div>
      </div>
    </motion.div>
  )
}