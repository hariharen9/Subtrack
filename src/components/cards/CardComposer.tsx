/**
 * SUBTRACK // CARD COMPOSER
 *
 * Two consoles in one overlay: the CARD console (add/edit a credit card) and
 * the TRANSACTION console (record a purchase, payment, fee, interest, reward
 * or refund against a card). Driven by the Zustand store so it survives
 * navigation like the subscription/spend composers.
 */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  SPEND_CATEGORIES,
  type SpendCategory,
  type CardNetwork,
  type CardStatus,
  type CardTransaction,
  type CardTxnType,
} from '@/lib/types'
import { CURRENCIES, formatMoney, symbolOf } from '@/lib/money'
import { todayISO } from '@/lib/date'
import { minDueFor } from '@/lib/cards'
import {
  createCreditCard,
  updateCreditCard,
  createCardTransaction,
  updateCardTransaction,
} from '@/lib/db'
import { useCreditCards, useCardTransactions } from '@/hooks/useCards'
import { TOAST_VERBS, useUI } from '@/store/ui'
import { useFocusTrap, useScrollLock } from '@/hooks/usePlatform'
import { cx } from '@/lib/cx'
import { CyberButton, IconButton } from '@/components/ui/CyberButton'
import { FieldShell, CyberSelect } from '@/components/ui/Controls'
import { CyberDatePicker } from '@/components/ui/CyberDatePicker'
import { IconClose } from '@/components/ui/Icons'
import { Led } from '@/components/ui/Signal'
import { KeyCap } from '@/components/ui/Micro'

const NETWORK_OPTIONS: { value: CardNetwork; label: string }[] = [
  { value: 'visa', label: 'VISA' },
  { value: 'mastercard', label: 'MASTERCARD' },
  { value: 'amex', label: 'AMEX' },
  { value: 'rupay', label: 'RUPAY' },
  { value: 'diners', label: 'DINERS' },
  { value: 'other', label: 'OTHER' },
]

const STATUS_OPTIONS: { value: CardStatus; label: string }[] = [
  { value: 'active', label: 'ACTIVE' },
  { value: 'frozen', label: 'FROZEN' },
  { value: 'closed', label: 'CLOSED' },
]

const CARD_COLORS = ['#F4F4F4', '#00C8FF', '#FF7A00', '#FF2BD6', '#B7FF00', '#FF304F', '#7A5CFF', '#FFD166']

const TXN_TYPES: { value: CardTxnType; label: string }[] = [
  { value: 'purchase', label: 'PURCHASE' },
  { value: 'payment', label: 'PAYMENT' },
  { value: 'refund', label: 'REFUND' },
  { value: 'fee', label: 'FEE' },
  { value: 'interest', label: 'INTEREST' },
  { value: 'reward', label: 'REWARD' },
]

interface CardForm {
  name: string
  issuer: string
  last4: string
  network: CardNetwork
  status: CardStatus
  creditLimit: string
  interestRate: string
  billingDay: string
  dueDay: string
  currency: string
  color: string
  notes: string
}

interface TxnForm {
  cardId: string
  title: string
  amount: string
  currency: string
  category: SpendCategory
  type: CardTxnType
  date: string
  rewards: string
  notes: string
}

export function CardComposer() {
  const state = useUI((s) => s.cardComposer)
  const close = useUI((s) => s.closeCardComposer)
  const pushToast = useUI((s) => s.pushToast)
  const cards = useCreditCards()
  const txns = useCardTransactions()
  const base = useUI((s) => s.baseCurrency)

  const isCard = state.mode === 'card'
  const editingCard = cards.find((c) => c.id === state.editCardId)
  const editingTxn = state.editTxnId ? txns.find((t) => t.id === state.editTxnId) : undefined

  // Balance per card (native currency) — powers the PAY FULL / PAY MIN quick fills
  const cardBalances = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of txns) {
      const sign = t.type === 'purchase' || t.type === 'fee' || t.type === 'interest' ? 1 : -1
      map.set(t.cardId, (map.get(t.cardId) ?? 0) + sign * t.amount)
    }
    return map
  }, [txns])

  const trapRef = useFocusTrap<HTMLDivElement>(state.open)
  useScrollLock(state.open)

  // ── Card form ──
  const [cardForm, setCardForm] = useState<CardForm>(() => emptyCardForm(base))
  const [cardBusy, setCardBusy] = useState(false)
  const [cardErrors, setCardErrors] = useState(false)

  // ── Txn form ──
  const [txnForm, setTxnForm] = useState<TxnForm>(() => emptyTxnForm(base))
  const [txnBusy, setTxnBusy] = useState(false)
  const [txnErrors, setTxnErrors] = useState(false)

  useEffect(() => {
    if (!state.open) return
    if (isCard) {
      setCardForm(editingCard ? cardToForm(editingCard) : emptyCardForm(base))
      setCardErrors(false)
    } else if (state.editTxnId && editingTxn) {
      setTxnForm(txnToForm(editingTxn))
      setTxnErrors(false)
    } else {
      const fresh = emptyTxnForm(base, state.presetCardId, cards[0]?.id)
      if (state.presetType) fresh.type = state.presetType
      if (state.presetAmount && state.presetAmount > 0) fresh.amount = String(Math.round(state.presetAmount * 100) / 100)
      if (state.presetType === 'payment') fresh.title = 'Statement payment'
      if (state.presetType === 'payment') fresh.category = 'other'
      setTxnForm(fresh)
      setTxnErrors(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.mode, state.editCardId, state.presetCardId, state.editTxnId, state.presetType, state.presetAmount])

  // ⌘/Ctrl + Enter saves from anywhere in the dialog
  const submit = () => {
    if (!state.open) return
    if (isCard) void saveCard()
    else void saveTxn()
  }

  const selectedBalance = Math.max(0, Math.round((cardBalances.get(txnForm.cardId) ?? 0) * 100) / 100)

  const saveCard = async () => {
    const limit = Number.parseFloat(cardForm.creditLimit) || 0
    const rate = Number.parseFloat(cardForm.interestRate) || 0
    const billing = Number.parseInt(cardForm.billingDay) || 0
    const due = Number.parseInt(cardForm.dueDay) || 0
    if (!cardForm.name.trim() || limit <= 0 || billing < 1 || billing > 28 || due < 1 || due > 28) {
      setCardErrors(true)
      return
    }
    setCardBusy(true)
    try {
      const draft = {
        name: cardForm.name,
        issuer: cardForm.issuer,
        last4: cardForm.last4,
        network: cardForm.network,
        creditLimit: limit,
        interestRate: rate,
        billingDay: billing,
        dueDay: due,
        currency: cardForm.currency,
        color: cardForm.color,
        notes: cardForm.notes,
      }
      if (editingCard) {
        await updateCreditCard(editingCard.id, { ...draft, status: cardForm.status })
        pushToast(TOAST_VERBS.info('CARD UPDATED', `${cardForm.name} ··${draft.last4 || '····'}`))
      } else {
        const created = await createCreditCard(draft)
        pushToast(TOAST_VERBS.info('CARD ADDED', `${created.name} ··${created.last4}`))
      }
      close()
    } catch (error) {
      pushToast(TOAST_VERBS.error('WRITE FAILED', error instanceof Error ? error.message : 'Local store rejected the record'))
    } finally {
      setCardBusy(false)
    }
  }

  const saveTxn = async () => {
    const amount = Number.parseFloat(txnForm.amount) || 0
    if (!txnForm.cardId || !txnForm.title.trim() || amount <= 0) {
      setTxnErrors(true)
      return
    }
    setTxnBusy(true)
    try {
      const draft = {
        cardId: txnForm.cardId,
        title: txnForm.title,
        amount,
        currency: txnForm.currency,
        category: txnForm.category,
        type: txnForm.type,
        date: txnForm.date,
        rewards: Number.parseFloat(txnForm.rewards) || 0,
        notes: txnForm.notes,
      }
      await (editingTxn ? updateCardTransaction(editingTxn.id, draft) : createCardTransaction(draft))
      pushToast(
        editingTxn
          ? TOAST_VERBS.info('TRANSACTION UPDATED', `${txnForm.title} · ${symbolOf(txnForm.currency)}${amount}`)
          : TOAST_VERBS.info('TRANSACTION LOGGED', `${txnForm.title} · ${symbolOf(txnForm.currency)}${amount}`),
      )
      close()
    } catch (error) {
      pushToast(TOAST_VERBS.error('WRITE FAILED', error instanceof Error ? error.message : 'Local store rejected the record'))
    } finally {
      setTxnBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {state.open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={close}
            aria-hidden="true"
          />
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label={isCard ? 'Card console' : 'Card transaction console'}
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 440, damping: 38 }}
            className="relative max-h-[92dvh] w-full max-w-[560px] overflow-y-auto"
            data-lenis-prevent
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
          >
            <div className="cp">
              <span aria-hidden="true" className="cp-shadow clip-cut-tl" />
              <div className="cp-frame clip-cut-tl bg-line2">
                <div className="cp-in clip-cut-tl bg-surface">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <span className="micro flex items-center gap-2 text-acidink">
                      <Led signal="acid" size="sm" pulse />
                      {isCard
                        ? editingCard ? 'CRD // EDIT CARD' : 'CRD // CARD CONSOLE'
                        : editingTxn ? 'CRD // EDIT TRANSACTION' : 'CRD // TRANSACTION'}
                    </span>
                    <IconButton label="Close" size="sm" onClick={close}>
                      <IconClose size={14} />
                    </IconButton>
                  </div>

                  {isCard ? (
                    /* ── CARD FORM ── */
                    <div className="space-y-3 px-4 py-4">
                      <div className="grid grid-cols-2 gap-3">
                        <FieldShell label="CARD NAME" code="01">
                          <input className="w-full bg-transparent py-2 font-mono text-[13px] outline-none placeholder:text-faint" value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} placeholder="Millennia" aria-label="Card name" />
                        </FieldShell>
                        <FieldShell label="ISSUER" code="02">
                          <input className="w-full bg-transparent py-2 font-mono text-[13px] outline-none placeholder:text-faint" value={cardForm.issuer} onChange={(e) => setCardForm({ ...cardForm, issuer: e.target.value })} placeholder="HDFC Bank" aria-label="Issuer" />
                        </FieldShell>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <FieldShell label="LAST 4" code="03">
                          <input className="w-full bg-transparent py-2 font-mono text-[13px] tracking-widest outline-none" value={cardForm.last4} onChange={(e) => setCardForm({ ...cardForm, last4: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="4521" inputMode="numeric" aria-label="Last four digits" />
                        </FieldShell>
                        <FieldShell label="CREDIT LIMIT" code="04">
                          <input className="w-full bg-transparent py-2 font-mono text-[13px] outline-none" value={cardForm.creditLimit} onChange={(e) => setCardForm({ ...cardForm, creditLimit: e.target.value.replace(/[^\d.]/g, '').slice(0, 10) })} placeholder="200000" inputMode="decimal" aria-label="Credit limit" />
                        </FieldShell>
                        <FieldShell label="APR %" code="05">
                          <input className="w-full bg-transparent py-2 font-mono text-[13px] outline-none" value={cardForm.interestRate} onChange={(e) => setCardForm({ ...cardForm, interestRate: e.target.value.replace(/[^\d.]/g, '').slice(0, 4) })} placeholder="42" inputMode="decimal" aria-label="Annual interest rate" />
                        </FieldShell>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <FieldShell label="BILLING DAY" code="06" hint="Statement cut-off (1–28)">
                          <input className="w-full bg-transparent py-2 font-mono text-[13px] outline-none" value={cardForm.billingDay} onChange={(e) => setCardForm({ ...cardForm, billingDay: e.target.value.replace(/\D/g, '').slice(0, 2) })} placeholder="18" inputMode="numeric" aria-label="Billing day" />
                        </FieldShell>
                        <FieldShell label="DUE DAY" code="07" hint="Payment due (1–28)">
                          <input className="w-full bg-transparent py-2 font-mono text-[13px] outline-none" value={cardForm.dueDay} onChange={(e) => setCardForm({ ...cardForm, dueDay: e.target.value.replace(/\D/g, '').slice(0, 2) })} placeholder="5" inputMode="numeric" aria-label="Due day" />
                        </FieldShell>
                      </div>

                      <FieldShell label="NETWORK" code="08">
                        <CyberSelect ariaLabel="Network" value={cardForm.network} onChange={(v) => setCardForm({ ...cardForm, network: v as CardNetwork })} options={NETWORK_OPTIONS} />
                      </FieldShell>

                      {editingCard && (
                        <FieldShell label="STATUS" code="09" hint="Frozen cards stop counting toward dues; closed cards are archived.">
                          <CyberSelect ariaLabel="Card status" value={cardForm.status} onChange={(v) => setCardForm({ ...cardForm, status: v as CardStatus })} options={STATUS_OPTIONS} />
                        </FieldShell>
                      )}

                      <FieldShell label="CURRENCY" code={editingCard ? '10' : '09'}>
                        <CyberSelect ariaLabel="Currency" value={cardForm.currency} onChange={(v) => setCardForm({ ...cardForm, currency: v })} options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.code}`, hint: c.name }))} />
                      </FieldShell>

                      <FieldShell label="ACCENT" code={editingCard ? '11' : '10'}>
                        <div className="flex flex-wrap gap-1.5 py-1">
                          {CARD_COLORS.map((c) => (
                            <button key={c} type="button" onClick={() => setCardForm({ ...cardForm, color: c })} className={cx('h-6 w-6 border transition-transform', cardForm.color === c ? 'scale-110 border-fg' : 'border-line2 hover:scale-105')} style={{ background: c }} aria-label={`Accent ${c}`} />
                          ))}
                        </div>
                      </FieldShell>

                      <FieldShell label="NOTES" code={editingCard ? '12' : '11'} hint="Rewards structure, limits, etc.">
                        <textarea className="w-full resize-none bg-transparent py-2 font-mono text-[13px] outline-none placeholder:text-faint" rows={2} value={cardForm.notes} onChange={(e) => setCardForm({ ...cardForm, notes: e.target.value.slice(0, 200) })} placeholder="5% cashback on…" aria-label="Notes" />
                      </FieldShell>

                      {cardErrors && <p className="meta text-redink">NAME, LIMIT AND CYCLE DAYS (1–28) ARE REQUIRED.</p>}

                      <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                        <span className="micro text-faint">STORED LOCALLY · NO ACCOUNT</span>
                        <div className="flex gap-2">
                          <CyberButton variant="ghost" size="sm" onClick={close}>CANCEL</CyberButton>
                          <CyberButton variant="solid" size="sm" busy={cardBusy} busyLabel="SAVING" onClick={() => void saveCard()}>
                            {editingCard ? 'SAVE CHANGES' : 'ADD CARD'}
                          </CyberButton>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── TXN FORM ── */
                    <div className="space-y-3 px-4 py-4">
                      <FieldShell label="CARD" code="01">
                        <CyberSelect ariaLabel="Card" value={txnForm.cardId} onChange={(v) => setTxnForm({ ...txnForm, cardId: v })} options={cards.map((c) => ({ value: c.id, label: `${c.name} ··${c.last4}`, hint: c.issuer }))} />
                      </FieldShell>

                      <FieldShell label="TYPE" code="02">
                        <div className="flex flex-wrap gap-1 py-1">
                          {TXN_TYPES.map((t) => (
                            <button key={t.value} type="button" onClick={() => setTxnForm({ ...txnForm, type: t.value })} className={cx('micro border px-2 py-1 transition-colors', txnForm.type === t.value ? 'border-acid bg-acid text-black font-semibold' : 'border-line2 text-dim hover:text-fg')}>
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </FieldShell>

                      {txnForm.type === 'payment' && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="micro text-[9px] text-faint">QUICK FILL:</span>
                          <button
                            type="button"
                            onClick={() => setTxnForm({ ...txnForm, title: 'Statement payment', category: 'other', amount: String(selectedBalance) })}
                            className="micro border border-line2 px-2 py-1 text-dim transition-colors hover:border-acid hover:text-acidink"
                          >
                            PAY FULL BALANCE · {formatMoney(selectedBalance, txnForm.currency)}
                          </button>
                          <button
                            type="button"
                            onClick={() => setTxnForm({ ...txnForm, title: 'Minimum due payment', category: 'other', amount: String(minDueFor(selectedBalance)) })}
                            className="micro border border-line2 px-2 py-1 text-dim transition-colors hover:border-acid hover:text-acidink"
                          >
                            PAY MINIMUM · {formatMoney(minDueFor(selectedBalance), txnForm.currency)}
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <FieldShell label="TITLE" code="03">
                          <input className="w-full bg-transparent py-2 font-mono text-[13px] outline-none placeholder:text-faint" value={txnForm.title} onChange={(e) => setTxnForm({ ...txnForm, title: e.target.value })} placeholder="Swiggy — dinner" aria-label="Title" />
                        </FieldShell>
                        <FieldShell label={`AMOUNT (${symbolOf(txnForm.currency)})`} code="04">
                          <input className="w-full bg-transparent py-2 font-mono text-[16px] font-semibold outline-none" value={txnForm.amount} onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value.replace(/[^\d.]/g, '').slice(0, 12) })} placeholder="0" inputMode="decimal" aria-label="Amount" />
                        </FieldShell>
                      </div>

                      <FieldShell label="CATEGORY" code="05">
                        <div className="grid grid-cols-4 gap-1 py-1">
                          {SPEND_CATEGORIES.map((c) => (
                            <button key={c.id} type="button" onClick={() => setTxnForm({ ...txnForm, category: c.id })} className={cx('micro border px-1 py-1.5 text-[9px] transition-colors', txnForm.category === c.id ? `border-fg bg-fg text-bg font-semibold` : 'border-line2 text-dim hover:text-fg')}>
                              {c.code}
                            </button>
                          ))}
                        </div>
                      </FieldShell>

                      <div className="grid grid-cols-2 gap-3">
                        <FieldShell label="DATE" code="06">
                          <CyberDatePicker value={txnForm.date} onChange={(v) => setTxnForm({ ...txnForm, date: v })} ariaLabel="Transaction date" />
                        </FieldShell>
                        <FieldShell label="REWARDS / CASHBACK" code="07">
                          <input className="w-full bg-transparent py-2 font-mono text-[13px] outline-none" value={txnForm.rewards} onChange={(e) => setTxnForm({ ...txnForm, rewards: e.target.value.replace(/[^\d.]/g, '').slice(0, 8) })} placeholder="0" inputMode="decimal" aria-label="Rewards earned" />
                        </FieldShell>
                      </div>

                      <FieldShell label="NOTES" code="08">
                        <input className="w-full bg-transparent py-2 font-mono text-[13px] outline-none placeholder:text-faint" value={txnForm.notes} onChange={(e) => setTxnForm({ ...txnForm, notes: e.target.value.slice(0, 200) })} placeholder="Optional note" aria-label="Notes" />
                      </FieldShell>

                      {txnErrors && <p className="meta text-redink">CARD, TITLE AND AN AMOUNT ABOVE ZERO ARE REQUIRED.</p>}

                      <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                        <span className="flex items-center gap-2">
                          <KeyCap>⌘</KeyCap><KeyCap>⏎</KeyCap>
                          <span className="tech-label">SAVE</span>
                        </span>
                        <div className="flex gap-2">
                          <CyberButton variant="ghost" size="sm" onClick={close}>CANCEL</CyberButton>
                          <CyberButton variant="solid" size="sm" busy={txnBusy} busyLabel="SAVING" onClick={() => void saveTxn()}>
                            {editingTxn ? 'SAVE CHANGES' : 'LOG TRANSACTION'}
                          </CyberButton>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function emptyCardForm(base: string): CardForm {
  return { name: '', issuer: '', last4: '', network: 'visa', status: 'active', creditLimit: '', interestRate: '', billingDay: '18', dueDay: '5', currency: base, color: '#F4F4F4', notes: '' }
}

function cardToForm(card: { name: string; issuer: string; last4: string; network: CardNetwork; status: CardStatus; creditLimit: number; interestRate: number; billingDay: number; dueDay: number; currency: string; color: string; notes: string }): CardForm {
  return {
    name: card.name,
    issuer: card.issuer,
    last4: card.last4,
    network: card.network,
    status: card.status,
    creditLimit: String(card.creditLimit),
    interestRate: String(card.interestRate),
    billingDay: String(card.billingDay),
    dueDay: String(card.dueDay),
    currency: card.currency,
    color: card.color,
    notes: card.notes,
  }
}

function txnToForm(t: CardTransaction): TxnForm {
  return {
    cardId: t.cardId,
    title: t.title,
    amount: String(t.amount),
    currency: t.currency,
    category: t.category,
    type: t.type,
    date: t.date,
    rewards: String(t.rewards),
    notes: t.notes,
  }
}

function emptyTxnForm(base: string, presetCardId?: string | null, firstCardId?: string): TxnForm {
  return { cardId: presetCardId ?? firstCardId ?? '', title: '', amount: '', currency: base, category: 'food', type: 'purchase', date: todayISO(), rewards: '', notes: '' }
}