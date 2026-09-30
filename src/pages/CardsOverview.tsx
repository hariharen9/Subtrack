/**
 * SUBTRACK // CARDS (CORE)
 *
 * The Credit Card cockpit. Total outstanding, utilisation gauge, upcoming due,
 * the card stack, cycle telemetry, category mix and recent card activity.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useCardsSystem } from '@/hooks/useCards'
import { useUI } from '@/store/ui'
import { formatMoney, splitMoney, formatCompact } from '@/lib/money'
import { formatSignalDate } from '@/lib/date'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { DataStrip } from '@/components/ui/DataStrip'
import { EmptyState, BootScreen } from '@/components/ui/Skeleton'
import { Led, SIGNAL_TEXT, SIGNAL_HEX } from '@/components/ui/Signal'
import { CardVisual } from '@/components/cards/CardVisual'
import { CyberButton } from '@/components/ui/CyberButton'
import { IconPlus } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }
const RISE = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } } }

export default function CardsOverview() {
  const { summary, notes, ready } = useCardsSystem()
  const base = useUI((s) => s.baseCurrency)
  const booted = useUI((s) => s.booted)
  const openCardComposer = useUI((s) => s.openCardComposer)

  const hero = useMemo(() => splitMoney(summary.totalOutstanding, base), [summary.totalOutstanding, base])
  const nearestDueView = useMemo(
    () => summary.activeViews.slice().sort((a, b) => a.daysToDue - b.daysToDue)[0],
    [summary.activeViews],
  )

  if (!booted) return <div className="px-3 py-6 md:px-5"><BootScreen label="LOADING CARD VAULT" /></div>

  if (!ready) {
    return (
      <div className="px-3 py-6 md:px-5">
        <EmptyState
          code="NO CARDS TRACKED"
          title="NO CREDIT CARDS ON THIS VOLUME."
          description="Track every card: limits, statements, dues, utilisation and rewards — all local. Add your first card to bring the vault online."
          action={{ label: '+ ADD FIRST CARD', onClick: () => openCardComposer({ mode: 'card' }) }}
        />
      </div>
    )
  }

  const util = summary.totalUtilisation
  const utilSignal = util >= 0.8 ? 'red' : util >= 0.5 ? 'orange' : util >= 0.2 ? 'blue' : 'acid'

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="px-3 py-4 md:px-5 md:py-5">
      {/* Header */}
      <motion.div variants={RISE}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-2.5 text-faint">
          <span className="micro flex items-center gap-2">
            <span className="text-fg font-medium">CREDIT CARDS // {summary.activeViews.length} ACTIVE</span>
            <span className="text-linehard">·</span>
            <span>{summary.txnCount} TXN ON RECORD</span>
            <span className="text-linehard hidden sm:inline">·</span>
            <span className="hidden sm:inline">{formatMoney(summary.cycleSpendTotal, base)} THIS CYCLE</span>
          </span>
          <div className="flex items-center gap-2">
            <CyberButton variant="ghost" size="sm" leading={<IconPlus size={12} />} onClick={() => openCardComposer({ mode: 'txn' })}>
              LOG TXN
            </CyberButton>
            <CyberButton variant="solid" size="sm" leading={<IconPlus size={12} />} onClick={() => openCardComposer({ mode: 'card' })}>
              ADD CARD
            </CyberButton>
          </div>
        </div>
      </motion.div>

      <div className="mt-4 grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        {/* LEFT 8 */}
        <div className="flex flex-col gap-3 lg:col-span-8">
          {/* Hero */}
          <motion.div variants={RISE}>
            <CutPanel cut="tl-br" cutSize={18} innerClassName="relative p-4 md:p-6" shadow="hard">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden dot-field opacity-[0.16]" />
              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="micro text-redink">TOTAL OUTSTANDING</span>
                    <h1 className="mt-1 flex items-start gap-1">
                      <span className="numeral mt-1 text-[clamp(1.6rem,4.5vw,2.6rem)] text-dim">{hero.symbol}</span>
                      <span className="numeral text-hero text-fg">
                        <AnimatedNumber value={summary.totalOutstanding} format={(v) => splitMoney(v, base).value} stiffness={120} damping={26} />
                      </span>
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="micro text-faint">{formatMoney(summary.totalLimit, base)} LIMIT</span>
                      <span className="micro text-acidink">{formatMoney(summary.totalAvailable, base)} AVAILABLE</span>
                      {summary.nextDue && (
                        <span className={cx('micro', summary.nextDue.days <= 3 ? 'text-redink' : summary.nextDue.days <= 7 ? 'text-orangeink' : 'text-fg')}>
                          DUE: {summary.nextDue.card.name} ··{summary.nextDue.card.last4} IN {summary.nextDue.days}D
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Utilisation radial */}
                  <div className="relative hidden shrink-0 sm:block">
                    <svg width="110" height="110" viewBox="0 0 100 100" className="-rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--c-line)" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="42" fill="none" stroke={`var(--c-${utilSignal})`} strokeWidth="8" strokeLinecap="butt"
                        strokeDasharray={`${Math.min(1, util) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                        className="transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={cx('numeral text-[20px] font-bold', SIGNAL_TEXT[utilSignal])}>
                        {(util * 100).toFixed(0)}%
                      </span>
                      <span className="micro text-faint">UTIL</span>
                    </div>
                  </div>
                </div>

                {/* Readouts */}
                <div className="mt-4 border-y border-line">
                  <DataStrip
                    items={[
                      { label: 'Limit', value: formatCompact(summary.totalLimit, base), signal: 'blue' },
                      { label: 'Available', value: formatCompact(summary.totalAvailable, base), signal: 'acid' },
                      { label: 'Cycle spend', value: formatMoney(summary.cycleSpendTotal, base), signal: 'orange' },
                      { label: 'Cycle payments', value: formatMoney(summary.cyclePaymentsTotal, base), signal: 'acid' },
                      { label: 'Min due', value: formatMoney(nearestDueView?.minDue ?? 0, base), signal: 'orange' },
                      { label: 'Rewards', value: String(Math.round(summary.totalRewards)), signal: 'magenta' },
                      { label: 'Utilisation', value: `${(util * 100).toFixed(0)}%`, signal: utilSignal },
                    ]}
                  />
                </div>

                {/* Category mix strip */}
                {summary.categories.length > 0 && (
                  <div className="mt-3">
                    <span className="micro text-faint">CARD SPEND BY CATEGORY</span>
                    <div className="mt-1 flex h-3 w-full overflow-hidden border border-line">
                      {summary.categories.slice(0, 8).map((c) => (
                        <div key={c.category} className="h-full" style={{ width: `${Math.max(1, c.share * 100)}%`, background: SIGNAL_HEX[c.signal] }} title={`${c.label}: ${formatMoney(c.amount, base)}`} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CutPanel>
          </motion.div>

          {/* Card stack */}
          <motion.div variants={RISE}>
            <SectionHeader
              code="VAULT"
              title="The card stack"
              right={
                <button type="button" onClick={() => openCardComposer({ mode: 'card' })} className="micro flex items-center gap-1 text-dim transition-colors hover:text-acidink">
                  + ADD CARD
                </button>
              }
            />
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {summary.views.map((view) => (
                <div key={view.card.id} className="group relative">
                  <Link to={`/cards/flow/${view.card.id}`} className="block focus-visible:outline-none">
                    <CutPanel cut="br" cutSize={12} innerClassName="p-2.5 group-hover:bg-surface2 transition-colors">
                      <CardVisual card={view.card} balance={view.balance} utilisation={view.utilisation} size="md" />
                      <div className="mt-2 flex items-center justify-between">
                        <span className="micro flex items-center gap-1.5">
                          <Led signal={view.card.status === 'active' ? view.signal : 'blue'} size="sm" />
                          <span className="text-dim">{view.card.status.toUpperCase()}</span>
                        </span>
                        <span className="micro text-faint">
                          {view.card.status === 'active' ? `DUE ${formatSignalDate(view.dueDate)}` : '—'}
                        </span>
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-2 border-t border-line pt-2">
                        <div>
                          <span className="micro block text-faint">CYCLE</span>
                          <span className="numeral text-[12px] text-fg">{formatCompact(view.cycleSpend, base)}</span>
                        </div>
                        <div className="text-right">
                          <span className="micro block text-faint">REWARDS</span>
                          <span className="numeral text-[12px] text-magentaink">{Math.round(view.totalRewards)}</span>
                        </div>
                      </div>
                    </CutPanel>
                  </Link>
                  {/* Quick actions on hover */}
                  <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        openCardComposer({ mode: 'card', editCardId: view.card.id })
                      }}
                      className="micro border border-linehard bg-surface/90 px-1.5 py-0.5 text-dim backdrop-blur-[2px] transition-colors hover:border-acid hover:text-acidink"
                      title="Edit card"
                    >
                      EDIT
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        openCardComposer({ mode: 'txn', presetCardId: view.card.id })
                      }}
                      className="micro border border-linehard bg-surface/90 px-1.5 py-0.5 text-dim backdrop-blur-[2px] transition-colors hover:border-acid hover:text-acidink"
                      title="Log transaction"
                    >
                      + TXN
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* RIGHT 4 */}
        <div className="flex flex-col gap-3 lg:col-span-4">
          {/* Upcoming dues */}
          <motion.div variants={RISE}>
            <CutPanel cut="br" cutSize={14} innerClassName="p-0">
              <SectionHeader code="DUE" title="Upcoming dues" signal="orange" right={<span className="micro text-faint">MIN DUE = 5% POLICY</span>} />
              <div className="divide-y divide-line">
                {summary.activeViews.slice().sort((a, b) => a.daysToDue - b.daysToDue).map((view) => {
                  const st = view.statement
                  const overdue = (st.status === 'unpaid' || st.status === 'partial') && st.dueDate < summary.today && st.due > 0
                  return (
                    <div key={view.card.id} className="group/due px-3 py-2 transition-colors hover:bg-surface2 md:px-4">
                      <div className="flex items-center gap-2.5">
                        <span className={cx('micro w-9 shrink-0 text-right font-bold', overdue ? 'text-redink' : view.daysToDue <= 3 ? 'text-redink' : view.daysToDue <= 7 ? 'text-orangeink' : 'text-dim')}>
                          {overdue ? 'LATE' : `${view.daysToDue}D`}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-[12px] font-medium text-fg">{view.card.name} ··{view.card.last4}</span>
                            <span className="numeral shrink-0 text-[12px] font-semibold text-fg">{formatMoney(view.minDue, base)}</span>
                          </span>
                          <span className="micro block truncate text-faint">
                            {formatSignalDate(view.dueDate)} · statement {formatMoney(st.due, base)}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            openCardComposer({
                              mode: 'txn',
                              presetCardId: view.card.id,
                              presetType: 'payment',
                              presetAmount: st.due > 0 ? st.due : view.balance,
                            })
                          }
                          className="micro shrink-0 border border-line2 px-2 py-1 text-dim opacity-70 transition-all hover:border-acid hover:text-acidink group-hover/due:opacity-100"
                          title="Log a statement payment"
                        >
                          PAY
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 pl-[46px]">
                        <span className={cx(
                          'micro border px-1 py-0.5 font-semibold',
                          st.status === 'paid' ? 'border-acid text-acidink' : overdue ? 'border-red text-redink' : st.status === 'partial' ? 'border-orange text-orangeink' : 'border-line2 text-faint',
                        )}>
                          {st.status === 'paid' ? 'PAID' : st.status === 'partial' ? 'PARTIAL' : st.status === 'current' ? 'OPEN' : st.status === 'empty' ? 'NO ACTIVITY' : 'UNPAID'}
                        </span>
                        <span className="micro text-faint">cycle {formatMoney(view.cycleSpend, base)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CutPanel>
          </motion.div>

          {/* Signals */}
          <motion.div variants={RISE}>
            <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
              <SectionHeader
                code="SIG"
                title="Card signals"
                signal={notes.some((n) => n.signal === 'red') ? 'red' : 'acid'}
                right={<span className="micro text-faint">{notes.length} OBS</span>}
              />
              {notes.length ? (
                <div className="divide-y divide-line">
                  {notes.map((note) => (
                    <div key={note.id} className="px-3 py-2 md:px-4">
                      <span className="micro flex items-center gap-1.5 text-dim">
                        <Led signal={note.signal} size="sm" pulse={note.signal === 'red' || note.signal === 'orange'} />
                        {note.label}
                      </span>
                      <p className="meta mt-0.5 text-faint">{note.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="meta px-3 py-4 text-faint">NO SIGNALS — CARDS HEALTHY.</p>
              )}
            </CutPanel>
          </motion.div>

          {/* Per-card utilisation */}
          <motion.div variants={RISE}>
            <CutPanel cut="tr" cutSize={14} innerClassName="p-0">
              <SectionHeader code="UTIL" title="Per-card utilisation" signal="blue" />
              <div className="divide-y divide-line">
                {summary.activeViews.map((view) => (
                  <Link key={view.card.id} to={`/cards/flow/${view.card.id}`} className="block px-3 py-2 transition-colors hover:bg-surface2 md:px-4">
                    <div className="flex items-center justify-between">
                      <span className="micro truncate text-fg">{view.card.name} ··{view.card.last4}</span>
                      <span className={cx('numeral text-[12px] font-semibold', SIGNAL_TEXT[view.signal])}>{(view.utilisation * 100).toFixed(0)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full bg-surface2 border border-line">
                      <div className={cx('h-full', view.utilisation >= 0.8 ? 'bg-red' : view.utilisation >= 0.5 ? 'bg-orange' : 'bg-blue')} style={{ width: `${Math.max(2, view.utilisation * 100)}%` }} />
                    </div>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="micro text-faint">{formatMoney(view.balance, view.card.currency)} / {formatMoney(view.card.creditLimit, view.card.currency)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CutPanel>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}