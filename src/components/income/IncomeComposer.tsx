/**
 * SPENDSTATE // INCOME COMPOSER
 *
 * A quick-capture console for logging a received payment — the pleasant mirror
 * of the Log Spend flow. Presets for the usual sources, a date, and a note.
 */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  INCOME_CATEGORIES,
  SPEND_METHOD_LABEL,
  type Income,
  type IncomeCategory,
  type SpendMethod,
} from '@/lib/types'
import { CURRENCIES, symbolOf, formatMoney, convert } from '@/lib/money'
import { todayISO, monthKey } from '@/lib/date'
import { sumIncome } from '@/lib/income'
import { createIncome, updateIncome, deleteIncome, type IncomeDraft } from '@/lib/db'
import { AccountField } from '@/components/accounts/AccountField'
import { useIncomes } from '@/hooks/useIncome'
import { TOAST_VERBS, useUI } from '@/store/ui'
import { useFocusTrap, useIsCompact, useScrollLock } from '@/hooks/usePlatform'
import { cx } from '@/lib/cx'
import { CyberButton, IconButton } from '@/components/ui/CyberButton'
import { FieldShell, CyberSelect } from '@/components/ui/Controls'
import { CyberDatePicker } from '@/components/ui/CyberDatePicker'
import { IconClose, IconPlus } from '@/components/ui/Icons'
import { Led, SIGNAL_TEXT } from '@/components/ui/Signal'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'

const ITEM = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 460, damping: 34 } },
}

const METHODS: SpendMethod[] = ['netbanking', 'upi', 'cash', 'card', 'wallet', 'other']

const PRESETS: { label: string; title: string; category: IncomeCategory; method: SpendMethod }[] = [
  { label: 'SALARY', title: 'Salary', category: 'salary', method: 'netbanking' },
  { label: 'FREELANCE', title: 'Freelance', category: 'freelance', method: 'upi' },
  { label: 'RENT', title: 'Rent received', category: 'rental', method: 'netbanking' },
  { label: 'DIVIDEND', title: 'Dividend', category: 'investment', method: 'netbanking' },
  { label: 'BONUS', title: 'Bonus', category: 'gift', method: 'netbanking' },
]

interface IncomeForm {
  title: string
  amount: string
  currency: string
  category: IncomeCategory
  method: SpendMethod
  accountId?: string
  date: string
  notes: string
}

function emptyForm(base: string): IncomeForm {
  return { title: '', amount: '', currency: base, category: 'salary', method: 'netbanking', accountId: '', date: todayISO(), notes: '' }
}
function toForm(i: Income): IncomeForm {
  return { title: i.title, amount: String(i.amount), currency: i.currency, category: i.category, method: i.method, accountId: i.accountId ?? '', date: i.date, notes: i.notes }
}

export function IncomeComposer() {
  const state = useUI((s) => s.incomeComposer)
  const close = useUI((s) => s.closeIncomeComposer)
  const pushToast = useUI((s) => s.pushToast)
  const base = useUI((s) => s.baseCurrency)
  const compact = useIsCompact()
  const incomes = useIncomes()

  const editing = incomes.find((i) => i.id === state.editId)

  const trapRef = useFocusTrap<HTMLDivElement>(state.open)
  useScrollLock(state.open)

  const [form, setForm] = useState<IncomeForm>(() => emptyForm(base))
  const [busy, setBusy] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    if (!state.open) return
    setShowErrors(false)
    setShowDelete(false)
    setBusy(false)
    setForm(editing ? toForm(editing) : emptyForm(base))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.editId])

  const amount = parseFloat(form.amount) || 0
  const titleError = showErrors && !form.title.trim() ? 'DESCRIPTION REQUIRED' : undefined
  const amountError = showErrors && amount <= 0 ? 'ENTER AN AMOUNT ABOVE ZERO' : undefined

  const monthTotal = useMemo(
    () => sumIncome(incomes, base, (i) => monthKey(i.date) === monthKey(form.date)),
    [incomes, base, form.date],
  )

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setForm((f) => ({ ...f, title: p.title, category: p.category, method: p.method }))
  }

  const save = async () => {
    setShowErrors(true)
    if (!form.title.trim() || amount <= 0) return
    setBusy(true)
    try {
      const draft: IncomeDraft = {
        title: form.title,
        amount,
        currency: form.currency,
        category: form.category,
        method: form.method,
        accountId: form.accountId || undefined,
        date: form.date,
        notes: form.notes,
      }
      if (editing) {
        await updateIncome(editing.id, draft)
        pushToast(TOAST_VERBS.incomeUpdated(form.title))
      } else {
        const created = await createIncome(draft)
        pushToast(TOAST_VERBS.incomeLogged(created.title, formatMoney(created.amount, created.currency)))
      }
      close()
    } catch (err) {
      pushToast(TOAST_VERBS.error('WRITE FAILED', err instanceof Error ? err.message : 'Local store rejected'))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!editing) return
    setBusy(true)
    try {
      await deleteIncome(editing.id)
      pushToast(TOAST_VERBS.incomeDeleted(editing.title))
      close()
    } catch (err) {
      pushToast(TOAST_VERBS.error('DELETE FAILED', err instanceof Error ? err.message : 'Could not remove'))
    } finally {
      setBusy(false)
    }
  }

  const cut = compact ? 'tl' : 'tl-br'

  return (
    <AnimatePresence>
      {state.open && (
        <div className={cx('fixed inset-0 z-[80] flex', compact ? 'items-end' : 'items-center justify-center p-4')}>
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={close} aria-hidden="true" />
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="income-composer-title"
            className={cx('relative flex w-full flex-col', compact ? 'h-[92dvh]' : 'max-h-[88dvh] max-w-[640px]')}
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
                void save()
              }
            }}
          >
            <div className={cx('cp flex min-h-0 flex-1 flex-col')}>
              <span aria-hidden="true" className={cx('cp-shadow', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')} />
              <div className={cx('cp-frame flex min-h-0 flex-1 flex-col bg-line2', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')}>
                <div className={cx('cp-in flex min-h-0 flex-1 flex-col bg-surface', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')}>
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 border-b-2 border-linehard px-3 py-2.5 md:px-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="micro flex items-center gap-1.5 border border-line2 px-1.5 py-0.5 text-acidink">
                        <Led signal="acid" size="sm" pulse />
                        {editing ? 'INC // EDIT INCOME' : 'LOG INCOME'}
                      </span>
                      <span id="income-composer-title" className="truncate text-[13px] font-semibold text-fg">
                        {editing ? editing.title : 'Record a received payment'}
                      </span>
                    </div>
                    <IconButton label="Close console" size="sm" onClick={close}>
                      <IconClose size={14} />
                    </IconButton>
                  </div>

                  {compact && <div className="flex justify-center border-b border-line py-1.5" aria-hidden="true"><span className="block h-1 w-12 bg-line2" /></div>}

                  {/* Body */}
                  <motion.div initial="hidden" animate="show" className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
                    {/* Presets */}
                    {!editing && (
                      <motion.div variants={ITEM} className="border-b border-line px-3 py-3 md:px-4">
                        <span className="micro block text-faint">QUICK SOURCE</span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {PRESETS.map((p) => (
                            <button key={p.label} type="button" onClick={() => applyPreset(p)} className="micro border border-line2 px-2.5 py-1 text-dim transition-colors hover:border-acid hover:text-acidink">
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    <motion.section variants={ITEM} className="border-b border-line px-3 py-3 md:px-4">
                      <div className="grid gap-3">
                        <FieldShell label="DESCRIPTION" code="WHAT LANDED" htmlFor="income-title" error={titleError}>
                          <input id="income-title" className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="SALARY — ACME CORP" autoComplete="off" spellCheck={false} autoFocus aria-invalid={Boolean(titleError)} />
                        </FieldShell>
                        <FieldShell label="AMOUNT RECEIVED" code={form.currency} htmlFor="income-amount" error={amountError}>
                          <div className="flex items-center border border-line2 bg-bg2 transition-colors focus-within:border-acid">
                            <span className="pl-3 font-mono text-[18px] text-faint">{symbolOf(form.currency)}</span>
                            <input id="income-amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, '').slice(0, 12) })} inputMode="decimal" placeholder="0" className="w-full bg-transparent px-2 py-2.5 font-mono text-[24px] font-semibold tnum outline-none placeholder:text-faint" aria-invalid={Boolean(amountError)} />
                            <span className="micro pr-3 text-faint">{form.currency}</span>
                          </div>
                        </FieldShell>
                      </div>
                    </motion.section>

                    <motion.section variants={ITEM} className="border-b border-line px-3 py-3 md:px-4">
                      <FieldShell label="CATEGORY" code="CLASS">
                        <div className="mt-1 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                          {INCOME_CATEGORIES.map((c) => {
                            const active = form.category === c.id
                            return (
                              <button key={c.id} type="button" onClick={() => setForm({ ...form, category: c.id })} aria-pressed={active} className={cx('flex flex-col items-center gap-1 border px-1 py-2 text-center transition-colors', active ? 'border-acid bg-acidsoft text-acidink' : 'border-line2 bg-surface2 text-dim hover:border-linehard hover:text-fg')}>
                                <span className={cx('micro text-[10px] font-semibold', active ? 'text-acidink' : SIGNAL_TEXT[c.signal])}>{c.code}</span>
                                <span className="micro text-[8px] leading-tight opacity-70">{c.label.toUpperCase()}</span>
                              </button>
                            )
                          })}
                        </div>
                      </FieldShell>
                    </motion.section>

                    <motion.section variants={ITEM} className="px-3 py-3 md:px-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FieldShell label="METHOD" code="HOW" htmlFor="income-method">
                          <div id="income-method">
                            <CyberSelect ariaLabel="Method" value={form.method} onChange={(v) => setForm({ ...form, method: v as SpendMethod })} options={METHODS.map((m) => ({ value: m, label: SPEND_METHOD_LABEL[m] }))} />
                          </div>
                        </FieldShell>
                        <AccountField value={form.accountId} onChange={(id) => setForm({ ...form, accountId: id })} label="DEPOSIT TO" code="ACCOUNT" />
                        <FieldShell label="DATE RECEIVED" code="ISO DATE">
                          <CyberDatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} ariaLabel="Income date" />
                        </FieldShell>
                        <FieldShell label="CURRENCY" code="ISO-4217" htmlFor="income-currency">
                          <div id="income-currency">
                            <CyberSelect ariaLabel="Currency" value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.code}`, hint: c.name }))} />
                          </div>
                        </FieldShell>
                        <FieldShell label="NOTE" code="OPTIONAL" htmlFor="income-notes">
                          <input id="income-notes" className="field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value.slice(0, 120) })} placeholder="APRIL PAYSLIP" />
                        </FieldShell>
                      </div>
                    </motion.section>
                  </motion.div>

                  {/* Footer */}
                  <div className="border-t-2 border-linehard bg-bg2 px-3 py-2.5 md:px-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div className="flex items-end gap-3">
                        <span className="flex items-baseline gap-1">
                          <span className="numeral text-[24px] text-acidink">
                            <AnimatedNumber value={amount} format={(v) => formatMoney(v, form.currency)} stiffness={280} damping={28} />
                          </span>
                          <span className="micro pb-1 text-faint">LOGGED</span>
                        </span>
                        <span className="meta hidden text-faint sm:block">{formatMoney(convert(monthTotal, base, base), base)} IN {form.date.slice(0, 7)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {editing && !showDelete && (
                          <CyberButton variant="danger" size="sm" onClick={() => setShowDelete(true)}>
                            DELETE
                          </CyberButton>
                        )}
                        {editing && showDelete && (
                          <>
                            <span className="micro text-redink">CONFIRM ERASE?</span>
                            <CyberButton variant="ghost" size="sm" onClick={() => setShowDelete(false)}>
                              NO
                            </CyberButton>
                            <CyberButton variant="danger" size="sm" busy={busy} onClick={() => void handleDelete()}>
                              ERASE
                            </CyberButton>
                          </>
                        )}
                        {!showDelete && (
                          <>
                            <CyberButton variant="ghost" onClick={close} disabled={busy}>
                              CANCEL
                            </CyberButton>
                            <CyberButton variant="solid" busy={busy} busyLabel="LOGGING" onClick={() => void save()} leading={editing ? undefined : <IconPlus size={14} />}>
                              {editing ? 'SAVE CHANGES' : 'LOG INCOME'}
                            </CyberButton>
                          </>
                        )}
                      </div>
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
