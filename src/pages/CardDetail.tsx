/**
 * SUBTRACK // CARD DIAGNOSTIC
 *
 * Per-card board: the card face, a control rail (pay / freeze / close / delete),
 * statement history with settlement state, credit economics (min due, carry
 * cost, grace), rewards telemetry, the 12-month register and the full
 * transaction history with edit + armed delete.
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useCreditCard, useCardTransactions } from '@/hooks/useCards'
import { useUI } from '@/store/ui'
import { formatMoney, formatCompact } from '@/lib/money'
import { formatSignalDate, todayISO } from '@/lib/date'
import {
  viewOfCard,
  statementHistory,
  monthlyCardSeries,
  rewardsAnalytics,
  type StatementStatus,
  type CardStatement,
} from '@/lib/cards'
import { SPEND_CATEGORY_META, CARD_TXN_TYPE_LABEL, CARD_NETWORK_LABEL, type CardTransaction } from '@/lib/types'
import { updateCreditCard, deleteCreditCard, deleteCardTransaction } from '@/lib/db'
import { CutPanel } from '@/components/ui/CutPanel'
import { DataStrip } from '@/components/ui/DataStrip'
import { SectionHeader } from '@/components/ui/Micro'
import { EmptyState, BootScreen } from '@/components/ui/Skeleton'
import { SIGNAL_TEXT } from '@/components/ui/Signal'
import { ArmedButton } from '@/components/ui/Controls'
import { CardVisual } from '@/components/cards/CardVisual'
import { CyberButton, IconButton } from '@/components/ui/CyberButton'
import { IconChevronLeft, IconPlus, IconEdit, IconTerminate } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }
const RISE = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } } }

const STATEMENT_CHIP: Record<StatementStatus, { label: string; cls: string }> = {
  paid: { label: 'PAID', cls: 'border-acid text-acidink' },
  partial: { label: 'PARTIAL', cls: 'border-orange text-orangeink' },
  unpaid: { label: 'UNPAID', cls: 'border-red text-redink' },
  current: { label: 'OPEN', cls: 'border-blue text-blueink' },
  empty: { label: 'NO ACTIVITY', cls: 'border-line2 text-faint' },
}

export default function CardDetail() {
  const { id } = useParams<{ id: string }>()
  const card = useCreditCard(id)
  const txns = useCardTransactions(id)
  const booted = useUI((s) => s.booted)
  const openCardComposer = useUI((s) => s.openCardComposer)
  const pushToast = useUI((s) => s.pushToast)
  const navigate = useNavigate()
  const today = todayISO()

  const view = card ? viewOfCard(card, txns, card.currency, today, 0) : null
  const statements = card ? statementHistory(card, txns, card.currency, today, 6) : []
  const series = card ? monthlyCardSeries(txns, card.currency, today, 12, card.id) : []
  const rewards = card ? rewardsAnalytics(txns, card.currency, today, card.id) : null

  if (!booted) return <div className="px-3 py-6 md:px-5"><BootScreen label="LOADING CARD" /></div>

  if (!card || !view) {
    return (
      <div className="px-3 py-6 md:px-5">
        <EmptyState code="CARD NOT FOUND" title="NO RECORD ON THIS VOLUME." description="This card does not exist in the local store." action={{ label: 'BACK TO VAULT', onClick: () => navigate(-1) }} />
      </div>
    )
  }

  const settle = view.statement.due > 0 ? view.statement.due : view.balance

  const payStatement = () =>
    openCardComposer({ mode: 'txn', presetCardId: card.id, presetType: 'payment', presetAmount: settle })

  const setStatus = async (status: 'active' | 'frozen' | 'closed', verb: string) => {
    try {
      await updateCreditCard(card.id, { status })
      pushToast({ kind: status === 'active' ? 'ok' : 'warn', label: `CARD ${verb}`, text: `${card.name} ··${card.last4}` })
    } catch (error) {
      pushToast({ kind: 'alert', label: 'UPDATE FAILED', text: error instanceof Error ? error.message : 'Local store rejected the write', sticky: true })
    }
  }

  const destroyCard = async () => {
    try {
      await deleteCreditCard(card.id)
      pushToast({ kind: 'alert', label: 'CARD PURGED', text: `${card.name} ··${card.last4} and its transaction history were erased` })
      navigate('/cards')
    } catch (error) {
      pushToast({ kind: 'alert', label: 'DELETE FAILED', text: error instanceof Error ? error.message : 'Local store rejected the delete', sticky: true })
    }
  }

  const trendMax = Math.max(1, ...series.map((m) => Math.max(m.spend, m.payments)))

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="px-3 py-4 md:px-5 md:py-5">
      <motion.div variants={RISE}>
        <Link to="/cards" className="micro inline-flex items-center gap-1 text-dim transition-colors hover:text-acidink">
          <IconChevronLeft size={12} /> BACK TO VAULT
        </Link>
      </motion.div>

      {/* Identity + economics */}
      <motion.div variants={RISE} className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-3">
            <CardVisual card={card} balance={view.balance} utilisation={view.utilisation} size="lg" />
            <div className="mt-2 flex items-center justify-between">
              <span className="micro text-faint">{CARD_NETWORK_LABEL[card.network].toUpperCase()} · {card.interestRate}% APR</span>
              <div className="flex gap-1.5">
                <CyberButton variant="ghost" size="sm" onClick={() => openCardComposer({ mode: 'card', editCardId: card.id })}>EDIT</CyberButton>
                <CyberButton variant="solid" size="sm" leading={<IconPlus size={12} />} onClick={() => openCardComposer({ mode: 'txn', presetCardId: card.id })}>LOG TXN</CyberButton>
              </div>
            </div>

            {/* Control rail */}
            <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-line pt-2">
              <CyberButton variant="ink" size="sm" onClick={payStatement}>PAY STATEMENT</CyberButton>
              <CyberButton
                variant="ghost"
                size="sm"
                onClick={() => void setStatus(card.status === 'frozen' ? 'active' : 'frozen', card.status === 'frozen' ? 'UNFROZEN' : 'FROZEN')}
              >
                {card.status === 'frozen' ? 'UNFREEZE' : 'FREEZE'}
              </CyberButton>
              {card.status !== 'closed' && (
                <ArmedButton
                  label="CLOSE CARD"
                  armedLabel="CONFIRM CLOSE"
                  tone="warn"
                  onConfirm={() => void setStatus('closed', 'CLOSED')}
                />
              )}
              <ArmedButton label="DELETE CARD" armedLabel="CONFIRM DELETE" onConfirm={() => void destroyCard()} />
            </div>
            <p className="micro mt-1.5 text-faint">DELETE ERASES THE CARD AND ITS ENTIRE TRANSACTION HISTORY.</p>

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
                  { label: 'Balance', value: formatMoney(view.balance, card.currency), signal: view.signal },
                  { label: 'Limit', value: formatCompact(card.creditLimit, card.currency), signal: 'blue' },
                  { label: 'Available', value: formatMoney(view.available, card.currency), signal: 'acid' },
                  { label: 'Utilisation', value: `${(view.utilisation * 100).toFixed(0)}%`, signal: view.signal },
                  { label: 'Billing day', value: String(card.billingDay) },
                  { label: 'Due day', value: String(card.dueDay) },
                ]}
              />
            </div>
            {/* Cycle state */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="border border-line bg-bg2 p-2.5">
                <span className="micro block text-faint">CYCLE SPEND</span>
                <span className="numeral mt-0.5 block text-[16px] font-bold text-fg">{formatCompact(view.cycleSpend, card.currency)}</span>
                <span className="micro text-faint">SINCE {formatSignalDate(view.cycleStart)}</span>
              </div>
              <div className="border border-line bg-bg2 p-2.5">
                <span className="micro block text-faint">NEXT DUE</span>
                <span className="numeral mt-0.5 block text-[16px] font-bold text-fg">{view.daysToDue}D</span>
                <span className="micro text-faint">{formatSignalDate(view.dueDate)}</span>
              </div>
              <div className="border border-line bg-bg2 p-2.5">
                <span className="micro block text-faint">MIN DUE</span>
                <span className="numeral mt-0.5 block text-[16px] font-bold text-orangeink">{formatCompact(view.minDue, card.currency)}</span>
                <span className="micro text-faint">{formatCompact(view.statement.due, card.currency)} FULL</span>
              </div>
              <div className="border border-line bg-bg2 p-2.5">
                <span className="micro block text-faint">CARRY COST</span>
                <span className="numeral mt-0.5 block text-[16px] font-bold text-redink">{formatCompact(view.carryInterest, card.currency)}</span>
                <span className="micro text-faint">INTEREST / MO AT APR</span>
              </div>
            </div>
            {/* Utilisation bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <span className="micro text-faint">CREDIT UTILISATION</span>
                <span className={cx('micro font-bold', SIGNAL_TEXT[view.signal])}>{(view.utilisation * 100).toFixed(0)}%</span>
              </div>
              <div className="mt-1 h-3 w-full bg-surface2 border border-line">
                <motion.div
                  className={cx('h-full', view.utilisation >= 0.8 ? 'bg-red' : view.utilisation >= 0.5 ? 'bg-orange' : 'bg-blue')}
                  initial={{ width: 0 }}
                  animate={{ width: `${view.utilisation * 100}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="micro mt-1 text-faint">
                GRACE WINDOW {Math.max(0, view.daysToDue)}D TO DUE · PAYING {formatMoney(view.statement.due, card.currency)} IN FULL AVOIDS INTEREST · {(view.utilisation * 100).toFixed(0)}% NOW
              </p>
            </div>
          </CutPanel>
        </div>
      </motion.div>

      {/* Statement history + category/rewards */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <motion.div variants={RISE} className="lg:col-span-7">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
            <SectionHeader code="STMT" title="Statement history" signal="blue" right={<span className="micro text-faint">LAST {statements.length} CYCLES</span>} />
            <div className="divide-y divide-line">
              {statements.filter((st) => st.status !== 'empty' || st.spend > 0).slice(0, 6).map((st) => (
                <StatementRow key={st.close} statement={st} currency={card.currency} />
              ))}
              {statements.every((st) => st.status === 'empty') && (
                <p className="meta px-3 py-5 text-faint">NO CLOSED STATEMENTS YET — FIRST CYCLE STILL OPEN.</p>
              )}
            </div>
          </CutPanel>
        </motion.div>

        <motion.div variants={RISE} className="lg:col-span-5">
          <CutPanel cut="tr" cutSize={14} innerClassName="p-0">
            <SectionHeader code="RWD" title="Rewards telemetry" signal="magenta" />
            <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
              <div className="p-3">
                <span className="micro block text-faint">EARNED</span>
                <span className="numeral mt-0.5 block text-[18px] font-bold text-magentaink">{Math.round(rewards?.total ?? 0)}</span>
                <span className="micro text-faint">POINTS ALL-TIME</span>
              </div>
              <div className="p-3">
                <span className="micro block text-faint">VELOCITY</span>
                <span className="numeral mt-0.5 block text-[18px] font-bold text-fg">{(rewards?.rate ?? 0).toFixed(1)}</span>
                <span className="micro text-faint">PTS / {formatMoney(100, card.currency)}</span>
              </div>
              <div className="p-3">
                <span className="micro block text-faint">TOP EARN</span>
                <span className="micro mt-1 block font-semibold text-fg">
                  {rewards?.topCategory ? SPEND_CATEGORY_META[rewards.topCategory.category].code : '—'}
                </span>
                <span className="micro text-faint">
                  {rewards?.topCategory ? `${Math.round(rewards.topCategory.points)} PTS` : 'NO REWARDS YET'}
                </span>
              </div>
            </div>
            {/* 6-month rewards bars */}
            <div className="p-3">
              <span className="micro text-faint">POINTS / MONTH</span>
              <div className="mt-2 flex items-end gap-1" style={{ height: 44 }}>
                {(rewards?.byMonth ?? []).map((m) => {
                  const max = Math.max(1, ...(rewards?.byMonth ?? []).map((x) => x.points))
                  return (
                    <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${m.label}: ${Math.round(m.points)} pts`}>
                      <span className="block w-full bg-magenta" style={{ height: Math.max(2, (m.points / max) * 32), opacity: m.points > 0 ? 1 : 0.25 }} />
                      <span className="micro text-[8px] text-faint">{m.label.slice(0, 3)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CutPanel>
        </motion.div>
      </div>

      {/* 12-month register */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="none" cutSize={0} innerClassName="p-4 md:p-5">
          <SectionHeader code="REG" title="12-month register" signal="blue" className="border-b-0 px-0 pt-0" right={<span className="micro text-faint">SPEND VS PAYMENTS</span>} />
          <div className="mt-3 flex items-end gap-1.5" style={{ height: 96 }}>
            {series.map((m) => (
              <div key={m.key} className="group/m relative flex min-w-0 flex-1 flex-col items-center justify-end gap-[2px]" title={`${m.label} — spend ${formatMoney(m.spend, card.currency)} · payments ${formatMoney(m.payments, card.currency)}`}>
                <span className="block w-full bg-line2 transition-colors group-hover/m:bg-fg" style={{ height: Math.max(2, (m.spend / trendMax) * 78) }} title={`Spend ${formatMoney(m.spend, card.currency)}`} />
                <span className="block w-full bg-acid transition-opacity" style={{ height: Math.max(2, (m.payments / trendMax) * 78), opacity: m.payments > 0 ? 0.9 : 0.2 }} title={`Payments ${formatMoney(m.payments, card.currency)}`} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-between border-t border-line pt-1.5">
            <span className="micro text-faint">{series[0]?.label} — {series[series.length - 1]?.label}</span>
            <span className="micro flex items-center gap-3 text-faint">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-line2" /> SPEND</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-acid" /> PAYMENTS</span>
            </span>
          </div>
        </CutPanel>
      </motion.div>

      {/* History */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tr" cutSize={14} innerClassName="p-0">
          <SectionHeader
            code="HIST"
            title="Transaction history"
            signal="acid"
            right={
              <button
                type="button"
                onClick={() => openCardComposer({ mode: 'txn', presetCardId: card.id })}
                className="micro flex items-center gap-1 text-dim transition-colors hover:text-acidink"
              >
                + LOG TXN
              </button>
            }
          />
          {txns.length ? (
            <div className="max-h-[520px] overflow-y-auto" data-lenis-prevent>
              <div className="divide-y divide-line">
                {[...txns].sort((a, b) => (a.date < b.date ? 1 : -1)).map((t) => (
                  <CardTxnRow key={t.id} txn={t} />
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="meta text-faint">NO TRANSACTIONS RECORDED FOR THIS CARD YET.</p>
              <div className="mt-2 flex justify-center">
                <CyberButton variant="ghost" size="sm" leading={<IconPlus size={12} />} onClick={() => openCardComposer({ mode: 'txn', presetCardId: card.id })}>
                  LOG FIRST TRANSACTION
                </CyberButton>
              </div>
            </div>
          )}
        </CutPanel>
      </motion.div>
    </motion.div>
  )
}

/* ── Statement row ─────────────────────────────────────────────────────── */

function StatementRow({ statement, currency }: { statement: CardStatement; currency: string }) {
  const chip = STATEMENT_CHIP[statement.status]
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 md:px-4">
      <span className="w-16 shrink-0">
        <span className="micro block font-semibold text-fg">{statement.label.split(' ')[0]}</span>
        <span className="micro text-faint">{statement.label.split(' ')[1]}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="micro text-faint">SPEND {formatMoney(statement.spend, currency)} · PAID {formatMoney(statement.paidTotal, currency)}</span>
          <span className="numeral text-[12px] font-semibold text-fg">{formatMoney(statement.due, currency)}</span>
        </span>
        <span className="micro block text-faint">
          CLOSED {formatSignalDate(statement.close)} · DUE {formatSignalDate(statement.dueDate)}
        </span>
      </span>
      <span className={cx('micro shrink-0 border px-1.5 py-0.5 font-semibold', chip.cls)}>{chip.label}</span>
    </div>
  )
}

/* ── Transaction row with edit + armed delete ──────────────────────────── */

function CardTxnRow({ txn }: { txn: CardTransaction }) {
  const openCardComposer = useUI((s) => s.openCardComposer)
  const pushToast = useUI((s) => s.pushToast)
  const [armed, setArmed] = useState(false)

  const isDebit = txn.type === 'purchase' || txn.type === 'fee' || txn.type === 'interest'
  const meta = SPEND_CATEGORY_META[txn.category]

  const doDelete = () => {
    if (!armed) {
      setArmed(true)
      window.setTimeout(() => setArmed(false), 4000)
      return
    }
    setArmed(false)
    void (async () => {
      try {
        await deleteCardTransaction(txn.id)
        pushToast({ kind: 'alert', label: 'TRANSACTION REMOVED', text: `${txn.title} · entry erased` })
      } catch (error) {
        pushToast({ kind: 'alert', label: 'DELETE FAILED', text: error instanceof Error ? error.message : 'Local store rejected the delete', sticky: true })
      }
    })()
  }

  return (
    <div className="group flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-surface2 md:px-4">
      <span className={cx('grid h-6 w-6 shrink-0 place-items-center border text-[7px] font-bold', isDebit ? 'border-line2 text-dim' : 'border-acid text-acidink')}>
        {txn.type === 'payment' ? 'PAY' : txn.type === 'refund' ? 'REF' : txn.type === 'fee' ? 'FEE' : txn.type === 'interest' ? 'INT' : txn.type === 'reward' ? 'RWD' : 'PUR'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[12px] font-medium text-fg">{txn.title}</span>
          <span className={cx('micro shrink-0', SIGNAL_TEXT[meta.signal])}>{meta.code}</span>
        </span>
        <span className="micro block truncate text-faint">
          {formatSignalDate(txn.date)} · {CARD_TXN_TYPE_LABEL[txn.type]}
          {txn.rewards > 0 && txn.type !== 'payment' ? ` · +${txn.rewards} PTS` : ''}
          {txn.notes ? ` · ${txn.notes}` : ''}
        </span>
      </span>
      <span className={cx('numeral shrink-0 text-[13px] font-semibold', isDebit ? 'text-fg' : 'text-acidink')}>
        {isDebit ? '' : '+'}{formatMoney(txn.amount, txn.currency)}
      </span>
      <div className="flex shrink-0 items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
        <IconButton label="Edit transaction" size="sm" onClick={() => openCardComposer({ mode: 'txn', editTxnId: txn.id })}>
          <IconEdit size={12} />
        </IconButton>
        <IconButton
          label={armed ? 'Confirm delete' : 'Delete transaction'}
          size="sm"
          className={cx(armed && 'border-red bg-redsoft text-redink')}
          title={armed ? 'Click again to permanently delete' : 'Delete'}
          onClick={doDelete}
        >
          <IconTerminate size={13} />
        </IconButton>
      </div>
    </div>
  )
}
