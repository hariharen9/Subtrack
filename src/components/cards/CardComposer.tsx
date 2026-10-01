/**
 * SPENDSTATE // CARD COMPOSER
 *
 * Two consoles in one panel — matching the Subscription & Loan design language:
 *   CARD mode — add or edit a credit card, limits, APR, billing/due cycle days
 *   TXN mode  — record/edit a purchase, payment, fee, interest, reward or refund
 *
 * Layout mirrors the subscription console: numbered Section headers with dotted
 * rules, scrollable flex body, sticky live-readout footer with balance forecast,
 * two-step destruction safety, and fluid spring animations.
 */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  SPEND_CATEGORY_META,
  CARD_TXN_TYPE_LABEL,
  type SpendCategory,
  type CardNetwork,
  type CardStatus,
  type CardTransaction,
  type CardTxnType,
} from '@/lib/types'
import { CURRENCIES, formatMoney, symbolOf, convert } from '@/lib/money'
import { todayISO } from '@/lib/date'
import { minDueFor } from '@/lib/cards'
import { AccountField } from '@/components/accounts/AccountField'
import {
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
  createCardTransaction,
  updateCardTransaction,
  deleteCardTransaction,
  type CardDraft,
  type CardTxnDraft,
} from '@/lib/db'
import { useCreditCards, useCardTransactions } from '@/hooks/useCards'
import { TOAST_VERBS, useUI } from '@/store/ui'
import { useFocusTrap, useIsCompact, useScrollLock } from '@/hooks/usePlatform'
import { cx } from '@/lib/cx'
import { CyberButton, IconButton } from '@/components/ui/CyberButton'
import { FieldShell, CyberSelect, SegmentedControl } from '@/components/ui/Controls'
import { CyberDatePicker } from '@/components/ui/CyberDatePicker'
import { IconClose, IconPlus } from '@/components/ui/Icons'
import { Led, SIGNAL_HEX, SIGNAL_TEXT } from '@/components/ui/Signal'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { KeyCap } from '@/components/ui/Micro'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.022, delayChildren: 0.03 } } }
const ITEM = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 460, damping: 34 } } }

const NETWORK_OPTIONS: { value: CardNetwork; label: string; hint?: string }[] = [
  { value: 'visa', label: 'VISA', hint: 'Visa' },
  { value: 'mastercard', label: 'MASTERCARD', hint: 'Mastercard' },
  { value: 'amex', label: 'AMEX', hint: 'American Express' },
  { value: 'rupay', label: 'RUPAY', hint: 'RuPay' },
  { value: 'diners', label: 'DINERS', hint: 'Diners Club' },
  { value: 'other', label: 'OTHER', hint: 'Other network' },
]

const STATUS_OPTIONS: { value: CardStatus; label: string; hint?: string }[] = [
  { value: 'active', label: 'ACTIVE', hint: 'Card in active rotation' },
  { value: 'frozen', label: 'FROZEN', hint: 'Temporarily blocked' },
  { value: 'closed', label: 'CLOSED', hint: 'Account cancelled' },
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
  accountId?: string
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

function emptyCardForm(base: string): CardForm {
  return {
    name: '',
    issuer: '',
    last4: '',
    network: 'visa',
    status: 'active',
    creditLimit: '',
    interestRate: '42',
    billingDay: '18',
    dueDay: '5',
    currency: base,
    accountId: '',
    color: '#F4F4F4',
    notes: '',
  }
}

function cardToForm(card: {
  name: string
  issuer: string
  last4: string
  network: CardNetwork
  status: CardStatus
  creditLimit: number
  interestRate: number
  billingDay: number
  dueDay: number
  currency: string
  accountId?: string
  color: string
  notes: string
}): CardForm {
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
    accountId: card.accountId ?? '',
    color: card.color,
    notes: card.notes,
  }
}

function emptyTxnForm(base: string, presetCardId?: string | null, firstCardId?: string): TxnForm {
  return {
    cardId: presetCardId ?? firstCardId ?? '',
    title: '',
    amount: '',
    currency: base,
    category: 'food',
    type: 'purchase',
    date: todayISO(),
    rewards: '',
    notes: '',
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

function Section({ code, title, children, last = false }: { code: string; title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <motion.section variants={ITEM} className={cx('px-3 py-4 md:px-4', !last && 'border-b border-line')}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="micro border border-line2 px-1.5 py-0.5 text-acidink">{code}</span>
        <h3 className="tech-label text-dim">{title}</h3>
        <span className="rule-dotted flex-1" />
      </div>
      {children}
    </motion.section>
  )
}

export function CardComposer() {
  const state = useUI((s) => s.cardComposer)
  const close = useUI((s) => s.closeCardComposer)
  const pushToast = useUI((s) => s.pushToast)
  const base = useUI((s) => s.baseCurrency)
  const spendCategories = useUI((s) => s.spendCategories)
  const compact = useIsCompact()
  const cards = useCreditCards()
  const txns = useCardTransactions()

  const isCard = state.mode === 'card'
  const editingCard = cards.find((c) => c.id === state.editCardId)
  const editingTxn = state.editTxnId ? txns.find((t) => t.id === state.editTxnId) : undefined

  // Balance per card (native currency)
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

  // ── Card form state ──
  const [cardForm, setCardForm] = useState<CardForm>(() => emptyCardForm(base))
  const [cardBusy, setCardBusy] = useState(false)
  const [showCardErrors, setShowCardErrors] = useState(false)
  const [showCardDelete, setShowCardDelete] = useState(false)

  // ── Txn form state ──
  const [txnForm, setTxnForm] = useState<TxnForm>(() => emptyTxnForm(base))
  const [txnBusy, setTxnBusy] = useState(false)
  const [showTxnErrors, setShowTxnErrors] = useState(false)
  const [showTxnDelete, setShowTxnDelete] = useState(false)

  // Sync state when open changes
  useEffect(() => {
    if (!state.open) return
    setShowCardErrors(false)
    setShowCardDelete(false)
    setShowTxnErrors(false)
    setShowTxnDelete(false)
    setCardBusy(false)
    setTxnBusy(false)

    if (isCard) {
      setCardForm(editingCard ? cardToForm(editingCard) : emptyCardForm(base))
    } else if (state.editTxnId && editingTxn) {
      setTxnForm(txnToForm(editingTxn))
    } else {
      const fresh = emptyTxnForm(base, state.presetCardId, cards[0]?.id)
      if (state.presetType) fresh.type = state.presetType
      if (state.presetAmount && state.presetAmount > 0) fresh.amount = String(Math.round(state.presetAmount * 100) / 100)
      if (state.presetType === 'payment') {
        fresh.title = 'Statement payment'
        fresh.category = 'other'
      }
      setTxnForm(fresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.mode, state.editCardId, state.presetCardId, state.editTxnId, state.presetType, state.presetAmount])

  // Card economics
  const limitValue = parseFloat(cardForm.creditLimit) || 0
  const aprValue = parseFloat(cardForm.interestRate) || 0
  const billingDayValue = parseInt(cardForm.billingDay) || 0
  const dueDayValue = parseInt(cardForm.dueDay) || 0
  const limitInBase = convert(limitValue, cardForm.currency, base)
  const estMonthlyCarry = aprValue > 0 && limitValue > 0 ? (limitValue * (aprValue / 100)) / 12 : 0

  // Txn economics
  const txnAmountValue = parseFloat(txnForm.amount) || 0
  const targetCard = cards.find((c) => c.id === txnForm.cardId) ?? cards[0]
  const targetBalance = Math.max(0, Math.round((cardBalances.get(txnForm.cardId) ?? 0) * 100) / 100)
  const targetMinDue = minDueFor(targetBalance)
  const isDebit = txnForm.type === 'purchase' || txnForm.type === 'fee' || txnForm.type === 'interest'
  const newBalanceForecast = isDebit ? targetBalance + txnAmountValue : Math.max(0, targetBalance - txnAmountValue)

  // Validation
  const cardNameError = showCardErrors && !cardForm.name.trim() ? 'CARD NAME REQUIRED' : undefined
  const cardLimitError = showCardErrors && limitValue <= 0 ? 'ENTER A LIMIT ABOVE ZERO' : undefined
  const cardBillingError = showCardErrors && (billingDayValue < 1 || billingDayValue > 28) ? 'DAY 1–28' : undefined
  const cardDueError = showCardErrors && (dueDayValue < 1 || dueDayValue > 28) ? 'DAY 1–28' : undefined

  const txnTitleError = showTxnErrors && !txnForm.title.trim() ? 'TITLE REQUIRED' : undefined
  const txnAmountError = showTxnErrors && txnAmountValue <= 0 ? 'AMOUNT ABOVE ZERO REQUIRED' : undefined

  const saveCard = async () => {
    setShowCardErrors(true)
    if (!cardForm.name.trim() || limitValue <= 0 || billingDayValue < 1 || billingDayValue > 28 || dueDayValue < 1 || dueDayValue > 28) {
      return
    }
    setCardBusy(true)
    try {
      const draft: CardDraft = {
        name: cardForm.name,
        issuer: cardForm.issuer,
        last4: cardForm.last4,
        network: cardForm.network,
        creditLimit: limitValue,
        interestRate: aprValue,
        billingDay: billingDayValue,
        dueDay: dueDayValue,
        currency: cardForm.currency,
        accountId: cardForm.accountId || undefined,
        color: cardForm.color,
        notes: cardForm.notes,
      }
      if (editingCard) {
        await updateCreditCard(editingCard.id, { ...draft, status: cardForm.status })
        pushToast(TOAST_VERBS.cardUpdated(cardForm.name))
      } else {
        const created = await createCreditCard(draft)
        pushToast(TOAST_VERBS.cardAdded(created.name, `${formatMoney(created.creditLimit, created.currency)} LIMIT ···${created.last4 || '····'}`))
      }
      close()
    } catch (err) {
      pushToast(TOAST_VERBS.error('WRITE FAILED', err instanceof Error ? err.message : 'Local store rejected'))
    } finally {
      setCardBusy(false)
    }
  }

  const handleDeleteCard = async () => {
    if (!editingCard) return
    setCardBusy(true)
    try {
      await deleteCreditCard(editingCard.id)
      pushToast(TOAST_VERBS.cardDeleted(editingCard.name))
      close()
    } catch (err) {
      pushToast(TOAST_VERBS.error('DELETE FAILED', err instanceof Error ? err.message : 'Could not remove'))
    } finally {
      setCardBusy(false)
    }
  }

  const saveTxn = async () => {
    setShowTxnErrors(true)
    if (!txnForm.cardId || !txnForm.title.trim() || txnAmountValue <= 0) {
      return
    }
    setTxnBusy(true)
    try {
      const draft: CardTxnDraft = {
        cardId: txnForm.cardId,
        title: txnForm.title,
        amount: txnAmountValue,
        currency: txnForm.currency,
        category: txnForm.category,
        type: txnForm.type,
        date: txnForm.date,
        rewards: parseFloat(txnForm.rewards) || 0,
        notes: txnForm.notes,
      }
      if (editingTxn) {
        await updateCardTransaction(editingTxn.id, draft)
        pushToast(TOAST_VERBS.cardTxnUpdated(txnForm.title))
      } else {
        await createCardTransaction(draft)
        pushToast(TOAST_VERBS.cardTxnLogged(txnForm.title, `${symbolOf(txnForm.currency)}${txnAmountValue} · ${CARD_TXN_TYPE_LABEL[txnForm.type]}`))
      }
      close()
    } catch (err) {
      pushToast(TOAST_VERBS.error('WRITE FAILED', err instanceof Error ? err.message : 'Could not record'))
    } finally {
      setTxnBusy(false)
    }
  }

  const handleDeleteTxn = async () => {
    if (!editingTxn) return
    setTxnBusy(true)
    try {
      await deleteCardTransaction(editingTxn.id)
      pushToast(TOAST_VERBS.cardTxnDeleted(editingTxn.title))
      close()
    } catch (err) {
      pushToast(TOAST_VERBS.error('DELETE FAILED', err instanceof Error ? err.message : 'Could not remove'))
    } finally {
      setTxnBusy(false)
    }
  }

  const cut = compact ? 'tl' : 'tl-br'

  return (
    <AnimatePresence>
      {state.open && (
        <div className={cx('fixed inset-0 z-[80] flex', compact ? 'items-end' : 'items-center justify-center p-4')}>
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
            aria-labelledby="card-composer-title"
            className={cx('relative flex w-full flex-col', compact ? 'h-[92dvh]' : 'max-h-[88dvh] max-w-[720px]')}
            initial={compact ? { y: '102%' } : { opacity: 0, scale: 0.975, y: 14 }}
            animate={compact ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={compact ? { y: '102%' } : { opacity: 0, scale: 0.985, y: 10 }}
            transition={compact ? { type: 'spring', stiffness: 420, damping: 40 } : { type: 'spring', stiffness: 440, damping: 36 }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                close()
              }
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                if (isCard) void saveCard()
                else void saveTxn()
              }
            }}
          >
            <div className="cp flex min-h-0 flex-1 flex-col">
              <span aria-hidden="true" className={cx('cp-shadow', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')} />
              <div className={cx('cp-frame flex min-h-0 flex-1 flex-col bg-line2', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')}>
                <div className={cx('cp-in flex min-h-0 flex-1 flex-col bg-surface', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')}>

                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 border-b-2 border-linehard px-3 py-2.5 md:px-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={cx('micro flex items-center gap-1.5 border px-1.5 py-0.5', isCard ? 'border-line2 text-blueink' : 'border-line2 text-acidink')}>
                        <Led signal={isCard ? 'blue' : 'acid'} size="sm" pulse />
                        {isCard ? (editingCard ? 'CRD // EDIT CARD' : 'NEW CREDIT CARD') : editingTxn ? 'CRD // EDIT TXN' : 'CRD // RECORD TXN'}
                      </span>
                      <span id="card-composer-title" className="truncate text-[13px] font-semibold text-fg">
                        {isCard
                          ? editingCard ? `${editingCard.name} ··${editingCard.last4}` : 'Initialize card'
                          : editingTxn ? editingTxn.title : targetCard ? `${targetCard.name} ··${targetCard.last4}` : 'Card transaction'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tech-label hidden md:inline">100% OFFLINE</span>
                      <IconButton label="Close console" size="sm" onClick={close}>
                        <IconClose size={14} />
                      </IconButton>
                    </div>
                  </div>

                  {compact && (
                    <div className="flex justify-center border-b border-line py-1.5" aria-hidden="true">
                      <span className="block h-1 w-12 bg-line2" />
                    </div>
                  )}

                  {/* Body */}
                  {isCard ? (
                    <motion.div key="card-body" variants={STAGGER} initial="hidden" animate="show" className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
                      {/* 01 IDENTITY */}
                      <Section code="01" title="IDENTITY">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="md:col-span-2">
                            <FieldShell label="CARD NAME" code="STRING" htmlFor="card-name" error={cardNameError}>
                              <input id="card-name" className="field" value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} placeholder="Infinia / Millennia / Coral" autoComplete="off" spellCheck={false} aria-invalid={Boolean(cardNameError)} autoFocus />
                            </FieldShell>
                          </div>
                          <FieldShell label="ISSUER" code="BANK" htmlFor="card-issuer">
                            <input id="card-issuer" className="field" value={cardForm.issuer} onChange={(e) => setCardForm({ ...cardForm, issuer: e.target.value })} placeholder="HDFC / ICICI / SBI" autoComplete="off" spellCheck={false} />
                          </FieldShell>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_2fr]">
                          <FieldShell label="LAST 4 DIGITS" code="DIGITS" htmlFor="card-last4" hint="Card identification">
                            <input id="card-last4" className="field tracking-widest text-center" value={cardForm.last4} onChange={(e) => setCardForm({ ...cardForm, last4: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="4521" inputMode="numeric" />
                          </FieldShell>
                          <FieldShell label="CARD NETWORK" code="RAIL">
                            <SegmentedControl
                              ariaLabel="Card network"
                              columns={3}
                              size="sm"
                              value={cardForm.network}
                              onChange={(v) => setCardForm({ ...cardForm, network: v })}
                              options={NETWORK_OPTIONS}
                            />
                          </FieldShell>
                        </div>
                      </Section>

                      {/* 02 ECONOMICS */}
                      <Section code="02" title="ECONOMICS & LIMIT">
                        <FieldShell label="CREDIT LIMIT" code="MAX CAPACITY" htmlFor="card-limit" error={cardLimitError}>
                          <div className="flex items-center border border-line2 bg-bg2 transition-colors focus-within:border-acid">
                            <span className="pl-3 font-mono text-[18px] text-faint">{symbolOf(cardForm.currency)}</span>
                            <input
                              id="card-limit"
                              value={cardForm.creditLimit}
                              onChange={(e) => setCardForm({ ...cardForm, creditLimit: e.target.value.replace(/[^\d.]/g, '').slice(0, 10) })}
                              inputMode="decimal"
                              placeholder="0"
                              aria-invalid={Boolean(cardLimitError)}
                              className="w-full bg-transparent px-2 py-2.5 font-mono text-[22px] font-semibold tnum outline-none placeholder:text-faint"
                            />
                            <span className="micro pr-3 text-faint">{cardForm.currency}</span>
                          </div>
                        </FieldShell>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <FieldShell label="APR %" code="RATE" htmlFor="card-apr" hint="Annual finance charge (e.g. 42%)">
                            <input id="card-apr" className="field" value={cardForm.interestRate} onChange={(e) => setCardForm({ ...cardForm, interestRate: e.target.value.replace(/[^\d.]/g, '').slice(0, 4) })} placeholder="42" inputMode="decimal" />
                          </FieldShell>
                          <AccountField value={cardForm.accountId} onChange={(id) => setCardForm({ ...cardForm, accountId: id })} label="SETTLED FROM" code="ACCOUNT" />
                          <FieldShell label="CURRENCY" code="ISO-4217">
                            <CyberSelect ariaLabel="Currency" value={cardForm.currency} onChange={(v) => setCardForm({ ...cardForm, currency: v })} options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.code}`, hint: c.name }))} />
                          </FieldShell>
                          <FieldShell label="ACCENT TONE" code="COLOR">
                            <div className="flex flex-wrap gap-1.5 py-1">
                              {CARD_COLORS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setCardForm({ ...cardForm, color: c })}
                                  className={cx('h-6 w-6 border transition-transform', cardForm.color === c ? 'scale-110 border-fg' : 'border-line2 hover:scale-105')}
                                  style={{ background: c }}
                                  aria-label={`Color ${c}`}
                                />
                              ))}
                            </div>
                          </FieldShell>
                        </div>
                      </Section>

                      {/* 03 CYCLE & DATES */}
                      <Section code="03" title="CYCLE & DATES">
                        <div className="grid gap-3 md:grid-cols-2">
                          <FieldShell label="BILLING DAY" code="STATEMENT CUT" htmlFor="card-billing" error={cardBillingError} hint="Day of month statement closes (1–28)">
                            <input id="card-billing" className="field" value={cardForm.billingDay} onChange={(e) => setCardForm({ ...cardForm, billingDay: e.target.value.replace(/\D/g, '').slice(0, 2) })} placeholder="18" inputMode="numeric" />
                          </FieldShell>
                          <FieldShell label="DUE DAY" code="PAYMENT DUE" htmlFor="card-due" error={cardDueError} hint="Day of month balance must clear (1–28)">
                            <input id="card-due" className="field" value={cardForm.dueDay} onChange={(e) => setCardForm({ ...cardForm, dueDay: e.target.value.replace(/\D/g, '').slice(0, 2) })} placeholder="5" inputMode="numeric" />
                          </FieldShell>
                        </div>

                        {editingCard && (
                          <div className="mt-3">
                            <FieldShell label="CARD STATUS" code="VAULT STATE" hint="Frozen cards stop counting toward dues; closed cards are archived">
                              <SegmentedControl
                                ariaLabel="Card status"
                                columns={3}
                                size="sm"
                                value={cardForm.status}
                                onChange={(v) => setCardForm({ ...cardForm, status: v })}
                                options={STATUS_OPTIONS}
                              />
                            </FieldShell>
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-2 border border-line bg-bg2 px-3 py-2 text-faint">
                          <Led signal="acid" size="sm" />
                          <span className="micro text-acidink font-semibold">GRACE PERIOD</span>
                          <span className="text-linehard">·</span>
                          <span className="micro text-faint">~20–50 days interest-free window when statement balance is paid in full</span>
                        </div>
                      </Section>

                      {/* 04 NOTES */}
                      <Section code="04" title="NOTES" last>
                        <FieldShell label="CARD NOTES" code="FREETEXT" htmlFor="card-notes" hint="Cashback rules, milestone bonus conditions, lounge access, customer care number.">
                          <textarea id="card-notes" className="field min-h-16 resize-y" value={cardForm.notes} onChange={(e) => setCardForm({ ...cardForm, notes: e.target.value.slice(0, 300) })} placeholder="5% cashback on Amazon & Flipkart · 4 lounge visits per quarter" />
                        </FieldShell>
                      </Section>
                    </motion.div>
                  ) : (
                    /* ── TXN FORM ── */
                    <motion.div key="txn-body" variants={STAGGER} initial="hidden" animate="show" className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
                      {/* Context banner */}
                      {targetCard && (
                        <motion.div variants={ITEM} className="mx-3 mt-3 flex items-center justify-between border border-line bg-bg2 px-3 py-2 md:mx-4">
                          <div>
                            <span className="block text-[12px] font-semibold text-fg">{targetCard.name} ··{targetCard.last4}</span>
                            <span className="micro text-faint">{targetCard.issuer} · {formatMoney(targetCard.creditLimit, targetCard.currency)} LIMIT</span>
                          </div>
                          <div className="text-right">
                            <span className="micro block text-dim">CURR BALANCE: {formatMoney(targetBalance, targetCard.currency)}</span>
                            <span className="micro text-faint">MIN DUE: {formatMoney(targetMinDue, targetCard.currency)}</span>
                          </div>
                        </motion.div>
                      )}

                      {/* 01 SOURCE & TYPE */}
                      <Section code="01" title="SOURCE & TYPE">
                        <FieldShell label="ASSIGNED CARD" code="VAULT" hint="Select the credit card to apply this entry to">
                          <CyberSelect
                            ariaLabel="Card"
                            value={txnForm.cardId}
                            onChange={(v) => {
                              const c = cards.find((x) => x.id === v)
                              setTxnForm({ ...txnForm, cardId: v, currency: c?.currency ?? base })
                            }}
                            options={cards.map((c) => ({
                              value: c.id,
                              label: `${c.name} ··${c.last4}`,
                              hint: `${c.issuer} (${formatMoney(cardBalances.get(c.id) ?? 0, c.currency)})`,
                            }))}
                          />
                        </FieldShell>
                        <div className="mt-3">
                          <FieldShell label="TRANSACTION TYPE" code="CLASSIFIER">
                            <SegmentedControl
                              ariaLabel="Transaction type"
                              columns={3}
                              size="sm"
                              value={txnForm.type}
                              onChange={(v) => {
                                const updates: Partial<TxnForm> = { type: v }
                                if (v === 'payment') {
                                  updates.title = txnForm.title || 'Statement payment'
                                  updates.category = 'other'
                                }
                                setTxnForm((prev) => ({ ...prev, ...updates }))
                              }}
                              options={TXN_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                            />
                          </FieldShell>
                        </div>

                        {txnForm.type === 'payment' && (
                          <div className="mt-3 flex flex-wrap items-center gap-2 border border-line bg-bg2 p-2">
                            <span className="micro text-faint">PAYMENT QUICK-FILL:</span>
                            <button
                              type="button"
                              onClick={() => setTxnForm({ ...txnForm, title: 'Statement payment', category: 'other', amount: String(targetBalance) })}
                              className="micro border border-line2 bg-surface px-2 py-1 text-dim transition-colors hover:border-acid hover:text-acidink"
                            >
                              PAY FULL BALANCE · {formatMoney(targetBalance, txnForm.currency)}
                            </button>
                            <button
                              type="button"
                              onClick={() => setTxnForm({ ...txnForm, title: 'Minimum due payment', category: 'other', amount: String(targetMinDue) })}
                              className="micro border border-line2 bg-surface px-2 py-1 text-dim transition-colors hover:border-acid hover:text-acidink"
                            >
                              PAY MIN DUE · {formatMoney(targetMinDue, txnForm.currency)}
                            </button>
                          </div>
                        )}
                      </Section>

                      {/* 02 ENTRY DETAILS */}
                      <Section code="02" title="TRANSACTION DETAILS">
                        <div className="grid gap-3 md:grid-cols-2">
                          <FieldShell label="TITLE / MERCHANT" code="STRING" htmlFor="txn-title" error={txnTitleError}>
                            <input
                              id="txn-title"
                              className="field"
                              value={txnForm.title}
                              onChange={(e) => setTxnForm({ ...txnForm, title: e.target.value })}
                              placeholder="Swiggy — dinner / AWS / Fuel"
                              autoComplete="off"
                              spellCheck={false}
                              aria-invalid={Boolean(txnTitleError)}
                              autoFocus
                            />
                          </FieldShell>
                          <FieldShell label="AMOUNT" code={symbolOf(txnForm.currency)} htmlFor="txn-amount" error={txnAmountError}>
                            <div className="flex items-center border border-line2 bg-bg2 transition-colors focus-within:border-acid">
                              <span className="pl-3 font-mono text-[18px] text-faint">{symbolOf(txnForm.currency)}</span>
                              <input
                                id="txn-amount"
                                value={txnForm.amount}
                                onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value.replace(/[^\d.]/g, '').slice(0, 12) })}
                                inputMode="decimal"
                                placeholder="0"
                                aria-invalid={Boolean(txnAmountError)}
                                className="w-full bg-transparent px-2 py-2 font-mono text-[22px] font-semibold tnum outline-none placeholder:text-faint"
                              />
                              <span className="micro pr-3 text-faint">{txnForm.currency}</span>
                            </div>
                          </FieldShell>
                        </div>
                        <div className="mt-3">
                          <FieldShell label="SPEND CATEGORY" code="CATEGORY" hint="Maps transaction into category mix & rewards engine">
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                              {spendCategories.map((c) => {
                                const isSelected = txnForm.category === c.id
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setTxnForm({ ...txnForm, category: c.id })}
                                    className={cx(
                                      'flex items-center gap-2 border px-2.5 py-2 text-left transition-all',
                                      isSelected
                                        ? 'border-acid bg-acid text-black font-semibold shadow-sm'
                                        : 'border-line2 bg-surface2 text-dim hover:border-linehard hover:text-fg',
                                    )}
                                  >
                                    <span
                                      className="h-2 w-2 shrink-0 rounded-full"
                                      style={{ backgroundColor: isSelected ? '#000000' : SIGNAL_HEX[c.signal] }}
                                    />
                                    <span className="text-[12px] truncate font-medium">{c.label}</span>
                                  </button>
                                )
                              })}
                            </div>
                            <p className={cx('micro mt-1.5', SIGNAL_TEXT[SPEND_CATEGORY_META[txnForm.category]?.signal ?? 'blue'])}>
                              {SPEND_CATEGORY_META[txnForm.category]?.label.toUpperCase()}
                            </p>
                          </FieldShell>
                        </div>
                      </Section>

                      {/* 03 DATE & REWARDS */}
                      <Section code="03" title="DATE & REWARDS">
                        <div className="grid gap-3 md:grid-cols-2">
                          <FieldShell label="TRANSACTION DATE" code="ISO DATE" hint="The billing charge or settlement date">
                            <CyberDatePicker value={txnForm.date} onChange={(v) => setTxnForm({ ...txnForm, date: v })} ariaLabel="Transaction date" />
                          </FieldShell>
                          <FieldShell label="REWARDS / POINTS EARNED" code="POINTS" htmlFor="txn-rewards" hint="Credit card reward points or cashback units">
                            <input
                              id="txn-rewards"
                              className="field"
                              value={txnForm.rewards}
                              onChange={(e) => setTxnForm({ ...txnForm, rewards: e.target.value.replace(/[^\d.]/g, '').slice(0, 8) })}
                              placeholder="0"
                              inputMode="decimal"
                            />
                          </FieldShell>
                        </div>
                      </Section>

                      {/* 04 NOTES */}
                      <Section code="04" title="NOTES" last>
                        <FieldShell label="ANNOTATION" code="FREETEXT" htmlFor="txn-notes" hint="Invoice numbers, EMI conversion notes, receipt references.">
                          <input
                            id="txn-notes"
                            className="field"
                            value={txnForm.notes}
                            onChange={(e) => setTxnForm({ ...txnForm, notes: e.target.value.slice(0, 200) })}
                            placeholder="Optional transaction reference"
                          />
                        </FieldShell>
                      </Section>
                    </motion.div>
                  )}

                  {/* Footer */}
                  {isCard ? (
                    <div className="border-t-2 border-linehard bg-bg2 px-3 py-2.5 md:px-4">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="flex items-end gap-3">
                          <span className="flex items-baseline gap-1">
                            <span className="numeral text-[26px] text-fg">
                              <AnimatedNumber value={limitInBase} format={(v) => formatMoney(v, base)} stiffness={260} damping={28} />
                            </span>
                            <span className="micro pb-1 text-faint">LIMIT</span>
                          </span>
                          {estMonthlyCarry > 0 && (
                            <span className="meta hidden text-redink sm:block">
                              ~{formatMoney(estMonthlyCarry, cardForm.currency)}/MO CARRY AT {cardForm.interestRate}% APR
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {editingCard && !showCardDelete && (
                            <CyberButton variant="danger" size="sm" onClick={() => setShowCardDelete(true)}>
                              DELETE
                            </CyberButton>
                          )}
                          {editingCard && showCardDelete && (
                            <>
                              <span className="micro text-redink">CONFIRM PURGE?</span>
                              <CyberButton variant="ghost" size="sm" onClick={() => setShowCardDelete(false)}>
                                NO
                              </CyberButton>
                              <CyberButton variant="danger" size="sm" busy={cardBusy} onClick={() => void handleDeleteCard()}>
                                PURGE
                              </CyberButton>
                            </>
                          )}
                          {!showCardDelete && (
                            <>
                              <CyberButton variant="ghost" onClick={close} disabled={cardBusy}>
                                CANCEL
                              </CyberButton>
                              <CyberButton variant="solid" busy={cardBusy} busyLabel="SAVING" onClick={() => void saveCard()} leading={editingCard ? undefined : <IconPlus size={14} />}>
                                {editingCard ? 'SAVE CHANGES' : 'ADD CARD'}
                              </CyberButton>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 hidden items-center justify-between border-t border-line pt-1 text-faint md:flex">
                        <span className="micro flex items-center gap-2">
                          <span><KeyCap>⌘⏎</KeyCap> SAVE</span>
                          <span><KeyCap>ESC</KeyCap> CANCEL</span>
                        </span>
                        <span className="micro text-faint">DETERMINISTIC · 100% LOCAL</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t-2 border-linehard bg-bg2 px-3 py-2.5 md:px-4">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="flex items-end gap-3">
                          <span className="flex items-baseline gap-1">
                            <span className={cx('numeral text-[26px]', isDebit ? 'text-fg' : 'text-acidink')}>
                              <AnimatedNumber value={txnAmountValue} format={(v) => `${isDebit ? '' : '+'}${formatMoney(v, txnForm.currency)}`} stiffness={260} damping={28} />
                            </span>
                            <span className="micro pb-1 text-faint">{CARD_TXN_TYPE_LABEL[txnForm.type]}</span>
                          </span>
                          <span className="meta hidden sm:block">
                            <span className="text-dim">BALANCE FORECAST:</span>{' '}
                            <span className="text-fg font-semibold">{formatMoney(newBalanceForecast, txnForm.currency)}</span>
                            {parseFloat(txnForm.rewards) > 0 && (
                              <span className="text-magentaink"> · +{parseFloat(txnForm.rewards)} PTS</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {editingTxn && !showTxnDelete && (
                            <CyberButton variant="danger" size="sm" onClick={() => setShowTxnDelete(true)}>
                              DELETE
                            </CyberButton>
                          )}
                          {editingTxn && showTxnDelete && (
                            <>
                              <span className="micro text-redink">DELETE ENTRY?</span>
                              <CyberButton variant="ghost" size="sm" onClick={() => setShowTxnDelete(false)}>
                                NO
                              </CyberButton>
                              <CyberButton variant="danger" size="sm" busy={txnBusy} onClick={() => void handleDeleteTxn()}>
                                ERASE
                              </CyberButton>
                            </>
                          )}
                          {!showTxnDelete && (
                            <>
                              <CyberButton variant="ghost" onClick={close} disabled={txnBusy}>
                                CANCEL
                              </CyberButton>
                              <CyberButton variant="solid" busy={txnBusy} busyLabel="SAVING" onClick={() => void saveTxn()}>
                                {editingTxn ? 'SAVE CHANGES' : 'LOG TRANSACTION'}
                              </CyberButton>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 hidden items-center justify-between border-t border-line pt-1 text-faint md:flex">
                        <span className="micro flex items-center gap-2">
                          <span><KeyCap>⌘⏎</KeyCap> SAVE</span>
                          <span><KeyCap>ESC</KeyCap> CANCEL</span>
                        </span>
                        <span className="micro text-faint">DETERMINISTIC · 100% LOCAL</span>
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