/**
 * SUBTRACK // SPEND COMPOSER
 *
 * The high-performance LOG SPEND console. Everything a day-to-day expense needs
 * up front: instant 1-click presets, dynamic recent merchant suggestions,
 * keyboard rapid capture (Ctrl+Enter / Alt+Enter for batch adding), categories
 * with semantic signals, payment method channels, and an inline date picker.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  SPEND_CATEGORIES,
  SPEND_METHOD_LABEL,
  type SpendCategory,
  type SpendMethod,
} from '@/lib/types'
import { CURRENCIES, formatMoney, symbolOf } from '@/lib/money'
import { todayISO } from '@/lib/date'
import { createSpend, updateSpend } from '@/lib/db'
import { useSpends } from '@/hooks/useSpends'
import { TOAST_VERBS, useUI } from '@/store/ui'
import { useFocusTrap, useIsCompact, useScrollLock } from '@/hooks/usePlatform'
import { cx } from '@/lib/cx'
import { CyberButton, IconButton } from '@/components/ui/CyberButton'
import { FieldShell, CyberSelect } from '@/components/ui/Controls'
import { CyberDatePicker } from '@/components/ui/CyberDatePicker'
import { IconClose, IconPlus } from '@/components/ui/Icons'
import { Led, SIGNAL_HEX, SIGNAL_TEXT } from '@/components/ui/Signal'
import { KeyCap } from '@/components/ui/Micro'

interface Draft {
  title: string
  amount: string
  currency: string
  category: SpendCategory
  method: SpendMethod
  date: string
  notes: string
}

function emptyDraft(currency: string): Draft {
  return {
    title: '',
    amount: '',
    currency,
    category: 'food',
    method: 'upi',
    date: todayISO(),
    notes: '',
  }
}

interface QuickPreset {
  label: string
  title: string
  category: SpendCategory
  method: SpendMethod
  defaultAmount?: number
}

const QUICK_PRESETS: QuickPreset[] = [
  { label: 'Chai / Coffee', title: 'Chai & Coffee', category: 'food', method: 'upi', defaultAmount: 40 },
  { label: 'Zomato / Swiggy', title: 'Food Delivery', category: 'food', method: 'upi', defaultAmount: 280 },
  { label: 'Blinkit / Zepto', title: 'Quick Groceries', category: 'groceries', method: 'upi', defaultAmount: 350 },
  { label: 'Uber / Auto', title: 'Cab / Auto Ride', category: 'transport', method: 'upi', defaultAmount: 180 },
  { label: 'Fuel / Petrol', title: 'Petrol / Fuel', category: 'transport', method: 'upi', defaultAmount: 500 },
  { label: 'Pharmacy', title: 'Pharmacy & Meds', category: 'health', method: 'upi', defaultAmount: 220 },
  { label: 'Amazon / Shop', title: 'Online Shopping', category: 'shopping', method: 'card', defaultAmount: 799 },
  { label: 'Dining Out', title: 'Restaurant Dining', category: 'food', method: 'card', defaultAmount: 1200 },
]

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.022, delayChildren: 0.03 } },
}
const ITEM = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 460, damping: 34 } },
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000]

export function SpendComposer() {
  const composer = useUI((s) => s.spendComposer)
  const close = useUI((s) => s.closeSpendComposer)
  const pushToast = useUI((s) => s.pushToast)
  const base = useUI((s) => s.baseCurrency)
  const compact = useIsCompact()

  const spends = useSpends()
  const editing = composer.editId
    ? spends.find((spend) => spend.id === composer.editId)
    : undefined

  const [draft, setDraft] = useState<Draft>(() => emptyDraft(base))
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const trapRef = useFocusTrap<HTMLDivElement>(composer.open)
  useScrollLock(composer.open)

  // Derive unique recent merchants for quick 1-tap autocomplete
  const recentMerchants = useMemo(() => {
    const map = new Map<string, { title: string; category: SpendCategory; method: SpendMethod }>()
    for (const s of spends.slice().reverse()) {
      const key = s.title.trim().toLowerCase()
      if (key && !map.has(key)) {
        map.set(key, { title: s.title.trim(), category: s.category, method: s.method })
      }
      if (map.size >= 6) break
    }
    return [...map.values()]
  }, [spends])

  useEffect(() => {
    if (!composer.open) return
    setShowErrors(false)
    setBusy(false)
    if (editing) {
      setDraft({
        title: editing.title,
        amount: String(editing.amount),
        currency: editing.currency,
        category: editing.category,
        method: editing.method,
        date: editing.date,
        notes: editing.notes,
      })
      window.setTimeout(() => amountRef.current?.focus(), 50)
      return
    }
    const preset = SPEND_CATEGORIES.find((c) => c.id === composer.presetCategory)
    setDraft({ ...emptyDraft(base), category: preset?.id ?? 'food' })
    window.setTimeout(() => titleRef.current?.focus(), 50)
  }, [composer.open, composer.editId, composer.presetCategory, editing, base])

  const amount = Number.parseFloat(draft.amount.replace(/,/g, '')) || 0
  const amountInBase = amount
  const titleError = showErrors && !draft.title.trim() ? 'DESCRIPTION REQUIRED' : undefined
  const amountError =
    showErrors && (!Number.isFinite(amount) || amount <= 0)
      ? 'ENTER AN AMOUNT ABOVE ZERO'
      : undefined

  const applyPreset = (preset: QuickPreset) => {
    setDraft((cur) => ({
      ...cur,
      title: preset.title,
      category: preset.category,
      method: preset.method,
      amount: preset.defaultAmount ? String(preset.defaultAmount) : cur.amount,
    }))
    amountRef.current?.focus()
    amountRef.current?.select()
  }

  const applyRecent = (merchant: { title: string; category: SpendCategory; method: SpendMethod }) => {
    setDraft((cur) => ({
      ...cur,
      title: merchant.title,
      category: merchant.category,
      method: merchant.method,
    }))
    amountRef.current?.focus()
  }

  const submit = async (addAnother = false) => {
    setShowErrors(true)
    if (!draft.title.trim() || !Number.isFinite(amount) || amount <= 0) return
    setBusy(true)
    const payload = {
      title: draft.title,
      amount,
      currency: draft.currency,
      category: draft.category,
      method: draft.method,
      date: draft.date,
      notes: draft.notes,
    }
    try {
      if (editing) {
        await updateSpend(editing.id, payload)
        pushToast(TOAST_VERBS.spendUpdated(draft.title.trim()))
      } else {
        const created = await createSpend(payload)
        pushToast(
          TOAST_VERBS.spendLogged(
            draft.title.trim(),
            `${formatMoney(amount, draft.currency)} · ${draft.category.toUpperCase()}`,
          ),
        )
        void created
      }
      setBusy(false)

      if (addAnother) {
        // Reset form for sequential entry while keeping date and currency
        setDraft((cur) => ({
          ...emptyDraft(cur.currency),
          date: cur.date,
          method: cur.method,
        }))
        setShowErrors(false)
        window.setTimeout(() => titleRef.current?.focus(), 30)
      } else {
        close()
      }
    } catch (error) {
      setBusy(false)
      pushToast(
        TOAST_VERBS.error(
          'WRITE FAILED',
          error instanceof Error ? error.message : 'Local store rejected the record',
        ),
      )
    }
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void submit(false)
    } else if (event.key === 'Enter' && event.altKey) {
      event.preventDefault()
      void submit(true)
    }
  }

  const cut = compact ? 'tl' : 'tl-br'

  return (
    <AnimatePresence>
      {composer.open && (
        <div
          className={cx(
            'fixed inset-0 z-[80] flex',
            compact ? 'items-end' : 'items-center justify-center p-4',
          )}
        >
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
            aria-labelledby="spend-composer-title"
            className={cx(
              'relative flex w-full flex-col',
              compact ? 'h-[92dvh]' : 'max-h-[88dvh] max-w-[700px]',
            )}
            initial={compact ? { y: '102%' } : { opacity: 0, scale: 0.975, y: 14 }}
            animate={compact ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={compact ? { y: '102%' } : { opacity: 0, scale: 0.985, y: 10 }}
            transition={
              compact
                ? { type: 'spring', stiffness: 420, damping: 40 }
                : { type: 'spring', stiffness: 440, damping: 36 }
            }
            onKeyDown={onKeyDown}
          >
            <div className="cp flex min-h-0 flex-1 flex-col">
              <span aria-hidden="true" className={cx('cp-shadow', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')} />
              <div className={cx('cp-frame flex min-h-0 flex-1 flex-col bg-line2', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')}>
                <div
                  className={cx(
                    'cp-in flex min-h-0 flex-1 flex-col bg-surface',
                    cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br',
                  )}
                >
                  {/* header */}
                  <div className="flex items-center justify-between gap-3 border-b-2 border-linehard px-3 py-2.5 md:px-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="micro flex items-center gap-1.5 border border-line2 px-1.5 py-0.5 text-acidink">
                        <Led signal="acid" size="sm" pulse />
                        {editing ? 'SPEND // EDIT' : 'NEW SPEND'}
                      </span>
                      <span id="spend-composer-title" className="truncate text-[13px] font-semibold text-fg">
                        {editing ? editing.title : 'Log a day-to-day expense'}
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

                  {/* quick presets strip */}
                  {!editing && (
                    <div className="border-b border-line bg-bg2 px-3 py-2 md:px-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="tech-label text-faint">RAPID PRESETS</span>
                        <span className="micro hidden text-faint sm:inline">1-TAP AUTOFILL</span>
                      </div>
                      <div className="no-scrollbar mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-0.5" data-lenis-prevent>
                        {QUICK_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            className="micro shrink-0 border border-line2 bg-surface px-2 py-1 transition-colors hover:border-acid hover:text-acidink"
                          >
                            + {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* body */}
                  <motion.div
                    variants={STAGGER}
                    initial="hidden"
                    animate="show"
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                    data-lenis-prevent
                  >
                    {/* 01 TITLE */}
                    <motion.section variants={ITEM} className="px-3 py-4 md:px-4">
                      <div className="mb-3 flex items-center gap-2.5">
                        <span className="micro border border-line2 px-1.5 py-0.5 text-acidink">01</span>
                        <h3 className="tech-label text-dim">TRANSACTION</h3>
                        <span className="rule-dotted flex-1" />
                      </div>
                      <FieldShell
                        label="WHAT WAS IT"
                        code="STRING"
                        htmlFor="spend-title"
                        error={titleError}
                        hint="Merchant, service or item line."
                      >
                        <input
                          id="spend-title"
                          ref={titleRef}
                          className="field"
                          value={draft.title}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, title: event.target.value }))
                          }
                          placeholder="ZOMATO — LUNCH / PETROL / BLINKIT..."
                          autoComplete="off"
                          spellCheck={false}
                          aria-invalid={Boolean(titleError)}
                        />
                      </FieldShell>

                      {/* recent merchant chips */}
                      {!editing && recentMerchants.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          <span className="micro mr-1 text-faint">RECENT:</span>
                          {recentMerchants.map((m) => (
                            <button
                              key={m.title}
                              type="button"
                              onClick={() => applyRecent(m)}
                              className="micro border border-line bg-bg2 px-1.5 py-0.5 text-dim transition-colors hover:border-linehard hover:text-fg"
                            >
                              {m.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.section>

                    {/* 02 AMOUNT + method */}
                    <motion.section variants={ITEM} className="border-t border-line px-3 py-4 md:px-4">
                      <div className="mb-3 flex items-center gap-2.5">
                        <span className="micro border border-line2 px-1.5 py-0.5 text-acidink">02</span>
                        <h3 className="tech-label text-dim">AMOUNT & CHANNEL</h3>
                        <span className="rule-dotted flex-1" />
                      </div>
                      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
                        <FieldShell label="DEBITED" code="DECIMAL" htmlFor="spend-amount" error={amountError}>
                          <div className="flex items-center border border-line2 bg-bg2 transition-colors focus-within:border-acid">
                            <span className="pl-3 font-mono text-[18px] text-faint">
                              {symbolOf(draft.currency)}
                            </span>
                            <input
                              id="spend-amount"
                              ref={amountRef}
                              value={draft.amount}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...current,
                                  amount: event.target.value.replace(/[^\d.]/g, '').slice(0, 12),
                                }))
                              }
                              inputMode="decimal"
                              placeholder="0"
                              aria-invalid={Boolean(amountError)}
                              className="w-full bg-transparent px-2 py-2.5 font-mono text-[24px] font-semibold tnum outline-none placeholder:text-faint"
                            />
                            <span className="micro pr-3 text-faint">{draft.currency}</span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {QUICK_AMOUNTS.map((quick) => (
                              <button
                                key={quick}
                                type="button"
                                onClick={() =>
                                  setDraft((current) => ({ ...current, amount: String(quick) }))
                                }
                                className={cx(
                                  'micro border px-1.5 py-1 transition-colors',
                                  Number(draft.amount) === quick
                                    ? 'border-acid text-acidink'
                                    : 'border-line2 text-faint hover:border-linehard hover:text-dim',
                                )}
                              >
                                {symbolOf(draft.currency)}{quick}
                              </button>
                            ))}
                          </div>
                        </FieldShell>

                        <div className="flex flex-col gap-3">
                          <FieldShell label="METHOD" code="CHANNEL">
                            <CyberSelect
                              ariaLabel="Payment method"
                              value={draft.method}
                              onChange={(value) =>
                                setDraft((current) => ({ ...current, method: value }))
                              }
                              options={(Object.keys(SPEND_METHOD_LABEL) as SpendMethod[]).map((m) => ({
                                value: m,
                                label: SPEND_METHOD_LABEL[m],
                              }))}
                            />
                          </FieldShell>
                          <FieldShell label="CURRENCY" code="ISO-4217">
                            <CyberSelect
                              ariaLabel="Currency"
                              value={draft.currency}
                              onChange={(value) =>
                                setDraft((current) => ({ ...current, currency: value }))
                              }
                              options={CURRENCIES.map((currency) => ({
                                value: currency.code,
                                label: `${currency.symbol} ${currency.code}`,
                                hint: currency.name,
                              }))}
                            />
                          </FieldShell>
                        </div>
                      </div>
                    </motion.section>

                    {/* 03 CATEGORY */}
                    <motion.section variants={ITEM} className="border-t border-line px-3 py-4 md:px-4">
                      <div className="mb-3 flex items-center gap-2.5">
                        <span className="micro border border-line2 px-1.5 py-0.5 text-acidink">03</span>
                        <h3 className="tech-label text-dim">CATEGORY</h3>
                        <span className="rule-dotted flex-1" />
                      </div>
                      <FieldShell label="CATEGORY" code="SIGNAL" hint="Wants (lifestyle spends) count against your weekly budget.">
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                          {SPEND_CATEGORIES.map((category) => {
                            const isSelected = draft.category === category.id
                            return (
                              <button
                                key={category.id}
                                type="button"
                                onClick={() =>
                                  setDraft((current) => ({ ...current, category: category.id }))
                                }
                                className={cx(
                                  'flex items-center gap-2 border px-2.5 py-2 text-left transition-all',
                                  isSelected
                                    ? 'border-acid bg-acid text-black font-semibold shadow-sm'
                                    : 'border-line2 bg-surface2 text-dim hover:border-linehard hover:text-fg',
                                )}
                              >
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: isSelected ? '#000000' : SIGNAL_HEX[category.signal] }}
                                />
                                <span className="text-[12px] truncate font-medium">{category.label}</span>
                              </button>
                            )
                          })}
                        </div>
                        <p className={cx('micro mt-2', SIGNAL_TEXT[SPEND_CATEGORIES.find((c) => c.id === draft.category)?.signal ?? 'blue'])}>
                          {SPEND_CATEGORIES.find((c) => c.id === draft.category)?.label?.toUpperCase()}
                          {' · '}
                          {SPEND_CATEGORIES.find((c) => c.id === draft.category)?.discretionary
                            ? 'WANT (COUNTS TOWARD WEEKLY BUDGET)'
                            : 'NEED (ESSENTIAL LIVING EXPENSE)'}
                        </p>
                      </FieldShell>
                    </motion.section>

                    {/* 04 DATE + notes */}
                    <motion.section variants={ITEM} className="border-t border-line px-3 py-4 md:px-4">
                      <div className="mb-3 flex items-center gap-2.5">
                        <span className="micro border border-line2 px-1.5 py-0.5 text-acidink">04</span>
                        <h3 className="tech-label text-dim">DATE & ANNOTATION</h3>
                        <span className="rule-dotted flex-1" />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <FieldShell label="DATE" code="ISO">
                          <CyberDatePicker
                            value={draft.date}
                            ariaLabel="Spend date"
                            onChange={(iso) => setDraft((current) => ({ ...current, date: iso }))}
                          />
                        </FieldShell>
                        <FieldShell label="NOTE" code="FREETEXT" htmlFor="spend-notes">
                          <input
                            id="spend-notes"
                            className="field"
                            value={draft.notes}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                notes: event.target.value.slice(0, 300),
                              }))
                            }
                            placeholder="OPTIONAL — WITH WHOM / PLACE"
                            autoComplete="off"
                          />
                        </FieldShell>
                      </div>
                    </motion.section>
                  </motion.div>

                  {/* footer */}
                  <div className="border-t-2 border-linehard bg-bg2 px-3 py-2.5 md:px-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div className="flex items-end gap-3">
                        <span className="flex items-baseline gap-1">
                          <span className="numeral text-[26px] text-fg">
                            {formatMoney(amountInBase, draft.currency)}
                          </span>
                          <span className="micro pb-1 text-faint">DEBITED</span>
                        </span>
                        <span className={cx('meta hidden sm:block', SIGNAL_TEXT[SPEND_CATEGORIES.find((c) => c.id === draft.category)?.signal ?? 'blue'])}>
                          {SPEND_CATEGORIES.find((c) => c.id === draft.category)?.code}
                          {SPEND_CATEGORIES.find((c) => c.id === draft.category)?.discretionary
                            ? ' · WANT (WEEKLY BUDGET)'
                            : ' · NEED (ESSENTIAL)'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <CyberButton variant="ghost" onClick={close} disabled={busy}>
                          CANCEL
                        </CyberButton>

                        {!editing && (
                          <CyberButton
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => void submit(true)}
                            title="Log expense and keep console open for next receipt"
                          >
                            LOG & ADD ANOTHER
                          </CyberButton>
                        )}

                        <CyberButton
                          variant="solid"
                          busy={busy}
                          busyLabel="SAVING"
                          onClick={() => void submit(false)}
                          leading={editing ? undefined : <IconPlus size={14} />}
                        >
                          {editing ? 'SAVE CHANGES' : 'LOG SPEND'}
                        </CyberButton>
                      </div>
                    </div>

                    <div className="mt-2 hidden items-center justify-between border-t border-line pt-1 text-faint md:flex">
                      <span className="micro flex items-center gap-2">
                        <span><KeyCap>⌘⏎</KeyCap> SAVE</span>
                        {!editing && <span><KeyCap>⌥⏎</KeyCap> SAVE & ADD ANOTHER</span>}
                        <span><KeyCap>ESC</KeyCap> CANCEL</span>
                      </span>
                      <span className="micro text-faint">DETERMINISTIC · SCHEMA V2</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
