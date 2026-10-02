/**
 * SPENDSTATE // LOAN COMPOSER
 *
 * Two consoles in one panel — matching the SubscriptionComposer design language:
 *   LOAN mode    — add or edit a loan, auto-computes EMI, live interest preview
 *   PAYMENT mode — record an EMI payment (auto-split from amortization schedule)
 *
 * Layout mirrors the subscription console: numbered Section headers with dotted
 * rules, scrollable flex body, sticky live-readout footer, spring animations.
 */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LOAN_TYPES, type LoanType, type LoanStatus } from '@/lib/types'
import { CURRENCIES, symbolOf, formatMoney, convert } from '@/lib/money'
import { todayISO } from '@/lib/date'
import { calcEMI, totalInterest, amortize } from '@/lib/debt'
import { createLoan, updateLoan, deleteLoan, setLoanStatus, recordLoanPayment, type LoanDraft } from '@/lib/db'
import { AccountField } from '@/components/accounts/AccountField'
import { useLoans, useLoanPayments } from '@/hooks/useDebt'
import { TOAST_VERBS, useUI } from '@/store/ui'
import { useFocusTrap, useIsCompact, useScrollLock } from '@/hooks/usePlatform'
import { cx } from '@/lib/cx'
import { CyberButton, IconButton } from '@/components/ui/CyberButton'
import { FieldShell, CyberSelect } from '@/components/ui/Controls'
import { CyberDatePicker } from '@/components/ui/CyberDatePicker'
import { IconClose, IconPlus } from '@/components/ui/Icons'
import { Led } from '@/components/ui/Signal'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.022, delayChildren: 0.03 } } }
const ITEM = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 460, damping: 34 } } }

const LOAN_TYPE_SIGNAL: Record<string, string> = {
  home: 'text-blueink', vehicle: 'text-acidink', personal: 'text-orangeink',
  education: 'text-magentaink', gold: 'text-orangeink', credit_card: 'text-redink', other: 'text-dim',
}

const STATUS_OPTIONS: { value: LoanStatus; label: string }[] = [
  { value: 'active', label: 'ACTIVE' },
  { value: 'paid_off', label: 'PAID OFF' },
  { value: 'defaulted', label: 'DEFAULTED' },
]

interface LoanForm {
  name: string; lender: string; loanType: LoanType; status: LoanStatus
  principal: string; interestRate: string; tenureMonths: string
  emi: string; emiOverride: boolean; currency: string; accountId?: string; startDate: string; notes: string
}
interface PaymentForm {
  date: string; emiNumber: number; amount: string
  principalComponent: string; interestComponent: string; balanceAfter: string
}

function emptyLoan(base: string): LoanForm {
  return { name: '', lender: '', loanType: 'personal', status: 'active', principal: '', interestRate: '', tenureMonths: '', emi: '', emiOverride: false, currency: base, accountId: '', startDate: todayISO(), notes: '' }
}
function emptyPayment(): PaymentForm {
  return { date: todayISO(), emiNumber: 1, amount: '', principalComponent: '', interestComponent: '', balanceAfter: '' }
}
function loanToForm(l: { name: string; lender: string; loanType: LoanType; status: LoanStatus; principal: number; interestRate: number; tenureMonths: number; emi: number; currency: string; accountId?: string; startDate: string; notes: string }): LoanForm {
  return { name: l.name, lender: l.lender, loanType: l.loanType, status: l.status, principal: String(l.principal), interestRate: String(l.interestRate), tenureMonths: String(l.tenureMonths), emi: String(Math.round(l.emi * 100) / 100), emiOverride: true, currency: l.currency, accountId: l.accountId ?? '', startDate: l.startDate, notes: l.notes }
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

export function LoanComposer() {
  const state = useUI((s) => s.loanComposer)
  const close = useUI((s) => s.closeLoanComposer)
  const pushToast = useUI((s) => s.pushToast)
  const base = useUI((s) => s.baseCurrency)
  const compact = useIsCompact()
  const loans = useLoans()

  const isLoan = state.mode === 'loan'
  const editingLoan = loans.find((l) => l.id === state.editLoanId)
  const paymentTarget = loans.find((l) => l.id === (state.paymentLoanId ?? state.editLoanId))

  const trapRef = useFocusTrap<HTMLDivElement>(state.open)
  useScrollLock(state.open)

  const [form, setForm] = useState<LoanForm>(() => emptyLoan(base))
  const [busy, setBusy] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const existingPayments = useLoanPayments(paymentTarget?.id)
  const [payForm, setPayForm] = useState<PaymentForm>(() => emptyPayment())
  const [payBusy, setPayBusy] = useState(false)

  const principal = parseFloat(form.principal) || 0
  const rate = parseFloat(form.interestRate) || 0
  const tenure = parseInt(form.tenureMonths) || 0
  const emiValue = parseFloat(form.emi) || 0

  const computedEMI = useMemo(() => (principal > 0 && rate >= 0 && tenure > 0 ? calcEMI(principal, rate, tenure) : 0), [principal, rate, tenure])
  const interestTotal = useMemo(() => (principal > 0 && emiValue > 0 && tenure > 0 ? totalInterest(principal, emiValue, tenure) : 0), [principal, emiValue, tenure])
  const emiInBase = convert(emiValue, form.currency, base)

  useEffect(() => {
    if (!form.emiOverride && computedEMI > 0) setForm((f) => ({ ...f, emi: String(Math.round(computedEMI * 100) / 100) }))
  }, [computedEMI, form.emiOverride])

  useEffect(() => {
    if (!state.open || !paymentTarget) return
    const schedule = amortize(paymentTarget)
    const nextEmi = existingPayments.length + 1
    const row = schedule.find((r) => r.emiNumber === nextEmi) ?? schedule[nextEmi - 1]
    if (row) setPayForm({ date: todayISO(), emiNumber: row.emiNumber, amount: String(Math.round(row.emi * 100) / 100), principalComponent: String(Math.round(row.principal * 100) / 100), interestComponent: String(Math.round(row.interest * 100) / 100), balanceAfter: String(Math.round(row.balance * 100) / 100) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.mode, paymentTarget?.id, existingPayments.length])

  useEffect(() => {
    if (!state.open) return
    setShowErrors(false); setShowDelete(false); setBusy(false)
    if (isLoan) setForm(editingLoan ? loanToForm(editingLoan) : emptyLoan(base))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.mode, state.editLoanId])

  const nameError = showErrors && !form.name.trim() ? 'LOAN NAME REQUIRED' : undefined
  const principalError = showErrors && principal <= 0 ? 'ENTER A PRINCIPAL ABOVE ZERO' : undefined
  const emiError = showErrors && emiValue <= 0 ? 'EMI MUST BE ABOVE ZERO' : undefined
  const tenureError = showErrors && tenure <= 0 ? 'TENURE REQUIRED' : undefined

  const saveLoan = async () => {
    setShowErrors(true)
    if (!form.name.trim() || principal <= 0 || emiValue <= 0 || tenure <= 0) return
    setBusy(true)
    try {
      const draft: LoanDraft = { name: form.name, lender: form.lender, loanType: form.loanType, principal, interestRate: rate, tenureMonths: tenure, emi: emiValue, currency: form.currency, accountId: form.accountId || undefined, startDate: form.startDate, notes: form.notes }
      if (editingLoan) {
        await updateLoan(editingLoan.id, draft)
        if (form.status !== editingLoan.status) await setLoanStatus(editingLoan.id, form.status)
        pushToast(TOAST_VERBS.loanUpdated(form.name))
      } else {
        const created = await createLoan(draft)
        pushToast(TOAST_VERBS.loanAdded(created.name, `${formatMoney(created.emi, created.currency)}/MO · ${created.tenureMonths} EMIs`))
      }
      close()
    } catch (err) {
      pushToast(TOAST_VERBS.error('WRITE FAILED', err instanceof Error ? err.message : 'Local store rejected'))
    } finally { setBusy(false) }
  }

  const handleDelete = async () => {
    if (!editingLoan) return
    setBusy(true)
    try { await deleteLoan(editingLoan.id); pushToast(TOAST_VERBS.loanDeleted(editingLoan.name)); close() }
    catch (err) { pushToast(TOAST_VERBS.error('DELETE FAILED', err instanceof Error ? err.message : 'Could not remove')) }
    finally { setBusy(false) }
  }

  const savePayment = async () => {
    if (!paymentTarget) return
    const amount = parseFloat(payForm.amount)
    if (amount <= 0 || !payForm.date) return
    setPayBusy(true)
    try {
      await recordLoanPayment(paymentTarget.id, payForm.date, amount, parseFloat(payForm.principalComponent), parseFloat(payForm.interestComponent), parseFloat(payForm.balanceAfter), payForm.emiNumber, paymentTarget.currency)
      const isFinal = payForm.emiNumber >= paymentTarget.tenureMonths || parseFloat(payForm.balanceAfter) <= 0.01
      if (isFinal) { await setLoanStatus(paymentTarget.id, 'paid_off', payForm.date); pushToast(TOAST_VERBS.loanPaidOff(paymentTarget.name)) }
      else pushToast(TOAST_VERBS.emiLogged(paymentTarget.name, `EMI #${payForm.emiNumber} · ${formatMoney(amount, paymentTarget.currency)}`))
      close()
    } catch (err) { pushToast(TOAST_VERBS.error('WRITE FAILED', err instanceof Error ? err.message : 'Could not record')) }
    finally { setPayBusy(false) }
  }

  const cut = compact ? 'tl' : 'tl-br'

  return (
    <AnimatePresence>
      {state.open && (
        <div className={cx('fixed inset-0 z-[80] flex', compact ? 'items-end' : 'items-center justify-center p-4')}>
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={close} aria-hidden="true" />
          <motion.div
            ref={trapRef}
            role="dialog" aria-modal="true" aria-labelledby="loan-composer-title"
            className={cx('relative flex w-full flex-col', compact ? 'h-[92dvh]' : 'max-h-[88dvh] max-w-[720px]')}
            initial={compact ? { y: '102%' } : { opacity: 0, scale: 0.975, y: 14 }}
            animate={compact ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={compact ? { y: '102%' } : { opacity: 0, scale: 0.985, y: 10 }}
            transition={compact ? { type: 'spring', stiffness: 420, damping: 40 } : { type: 'spring', stiffness: 440, damping: 36 }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.preventDefault(); close() }
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); if (isLoan) void saveLoan(); else void savePayment() }
            }}
          >
            <div className="cp flex min-h-0 flex-1 flex-col">
              <span aria-hidden="true" className={cx('cp-shadow', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')} />
              <div className={cx('cp-frame flex min-h-0 flex-1 flex-col bg-line2', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')}>
                <div className={cx('cp-in flex min-h-0 flex-1 flex-col bg-surface', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')}>

                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 border-b-2 border-linehard px-3 py-2.5 md:px-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={cx('micro flex items-center gap-1.5 border px-1.5 py-0.5', isLoan ? 'border-line2 text-blueink' : 'border-line2 text-acidink')}>
                        <Led signal={isLoan ? 'blue' : 'acid'} size="sm" pulse />
                        {isLoan ? (editingLoan ? 'DEBT // EDIT LOAN' : 'NEW LOAN') : 'DEBT // RECORD EMI'}
                      </span>
                      <span id="loan-composer-title" className="truncate text-[13px] font-semibold text-fg">
                        {isLoan ? (editingLoan ? editingLoan.name : 'Initialize loan') : `${paymentTarget?.name ?? 'EMI'} — Payment #${payForm.emiNumber}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tech-label hidden md:inline">100% OFFLINE</span>
                      <IconButton label="Close console" size="sm" onClick={close}><IconClose size={14} /></IconButton>
                    </div>
                  </div>

                  {compact && <div className="flex justify-center border-b border-line py-1.5" aria-hidden="true"><span className="block h-1 w-12 bg-line2" /></div>}

                  {/* Body */}
                  {isLoan ? (
                    <motion.div key="loan" variants={STAGGER} initial="hidden" animate="show" className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
                      {/* 01 IDENTITY */}
                      <Section code="01" title="IDENTITY">
                        <div className="grid gap-3 md:grid-cols-2">
                          <FieldShell label="LOAN NAME" code="STRING" htmlFor="loan-name" error={nameError}>
                            <input id="loan-name" className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="HOME LOAN — HDFC" autoComplete="off" spellCheck={false} aria-invalid={Boolean(nameError)} autoFocus />
                          </FieldShell>
                          <FieldShell label="LENDER" code="INSTITUTION" htmlFor="loan-lender">
                            <input id="loan-lender" className="field" value={form.lender} onChange={(e) => setForm({ ...form, lender: e.target.value })} placeholder="HDFC BANK" autoComplete="off" spellCheck={false} />
                          </FieldShell>
                        </div>
                        <div className="mt-3">
                          <FieldShell label="LOAN TYPE" code="CATEGORY">
                            <div className="mt-1 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                              {LOAN_TYPES.map((t) => {
                                const active = form.loanType === t.id
                                return (
                                  <button key={t.id} type="button" onClick={() => setForm({ ...form, loanType: t.id as LoanType })} aria-pressed={active} className={cx('flex flex-col items-center gap-1 border px-2 py-2 text-center transition-colors', active ? 'border-acid bg-acidsoft text-acidink' : 'border-line2 bg-surface2 text-dim hover:border-linehard hover:text-fg')}>
                                    <span className={cx('micro text-[9px] font-semibold', active ? 'text-acidink' : (LOAN_TYPE_SIGNAL[t.id] ?? 'text-dim'))}>{t.code}</span>
                                    <span className="micro text-[8px] leading-tight opacity-70">{t.label.toUpperCase()}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </FieldShell>
                        </div>
                      </Section>

                      {/* 02 ECONOMICS */}
                      <Section code="02" title="ECONOMICS">
                        <FieldShell label="PRINCIPAL" code="AMOUNT" htmlFor="loan-principal" error={principalError}>
                          <div className="flex items-center border border-line2 bg-bg2 transition-colors focus-within:border-acid">
                            <span className="pl-3 font-mono text-[18px] text-faint">{symbolOf(form.currency)}</span>
                            <input id="loan-principal" value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value.replace(/[^\d.]/g, '').slice(0, 12), emiOverride: false })} inputMode="decimal" placeholder="0" aria-invalid={Boolean(principalError)} className="w-full bg-transparent px-2 py-2.5 font-mono text-[22px] font-semibold tnum outline-none placeholder:text-faint" />
                            <span className="micro pr-3 text-faint">{form.currency}</span>
                          </div>
                        </FieldShell>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <FieldShell label="RATE" code="% PA" htmlFor="loan-rate">
                            <input id="loan-rate" className="field" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value.replace(/[^\d.]/g, '').slice(0, 5), emiOverride: false })} placeholder="8.5" inputMode="decimal" aria-label="Annual interest rate" />
                          </FieldShell>
                          <FieldShell label="TENURE" code="MONTHS" htmlFor="loan-tenure" error={tenureError}>
                            <input id="loan-tenure" className="field" value={form.tenureMonths} onChange={(e) => setForm({ ...form, tenureMonths: e.target.value.replace(/\D/g, '').slice(0, 4), emiOverride: false })} placeholder="240" inputMode="numeric" aria-label="Tenure in months" aria-invalid={Boolean(tenureError)} />
                          </FieldShell>
                          <AccountField value={form.accountId} onChange={(id) => setForm({ ...form, accountId: id })} label="EMI FROM" code="ACCOUNT" />
                          <FieldShell label="CURRENCY" code="ISO-4217" htmlFor="loan-currency">
                            <div id="loan-currency">
                              <CyberSelect ariaLabel="Currency" value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.code}`, hint: c.name }))} />
                            </div>
                          </FieldShell>
                        </div>
                        <div className="mt-3">
                          <FieldShell label="EMI / MONTH" code={!form.emiOverride && computedEMI > 0 ? 'AUTO-COMPUTED' : 'FIXED'} htmlFor="loan-emi" error={emiError} hint={!form.emiOverride && computedEMI > 0 ? 'Derived from principal · rate · tenure — edit to override' : form.emiOverride && computedEMI > 0 ? 'Manually set — click AUTO to restore computed value' : 'Fill principal, rate and tenure to auto-compute'}>
                            <div className="flex items-center border border-line2 bg-bg2 transition-colors focus-within:border-acid">
                              <span className="pl-3 font-mono text-[18px] text-faint">{symbolOf(form.currency)}</span>
                              <input id="loan-emi" value={form.emi} onChange={(e) => setForm({ ...form, emi: e.target.value.replace(/[^\d.]/g, '').slice(0, 12), emiOverride: true })} inputMode="decimal" placeholder="0" aria-invalid={Boolean(emiError)} className="w-full bg-transparent px-2 py-2.5 font-mono text-[22px] font-semibold tnum outline-none placeholder:text-faint" />
                              {form.emiOverride && computedEMI > 0
                                ? <button type="button" onClick={() => setForm((f) => ({ ...f, emi: String(Math.round(computedEMI * 100) / 100), emiOverride: false }))} className="micro mr-3 border border-line2 px-2 py-1 text-dim transition-colors hover:border-acid hover:text-acidink">AUTO</button>
                                : <span className="micro pr-3 text-faint">{form.currency}</span>}
                            </div>
                          </FieldShell>
                        </div>
                      </Section>

                      {/* 03 SCHEDULE */}
                      <Section code="03" title="SCHEDULE">
                        <div className="grid gap-3 md:grid-cols-2">
                          <FieldShell label="START DATE" code="FIRST EMI" hint="Anchor for all renewal projections — typically the date of the first EMI.">
                            <CyberDatePicker value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} ariaLabel="Loan start date" />
                          </FieldShell>
                          {editingLoan && (
                            <FieldShell label="STATUS" code="STATE" hint="Paid off loans are archived and excluded from active EMI burden.">
                              <CyberSelect ariaLabel="Loan status" value={form.status} onChange={(v) => setForm({ ...form, status: v as LoanStatus })} options={STATUS_OPTIONS} />
                            </FieldShell>
                          )}
                        </div>
                      </Section>

                      {/* 04 NOTES */}
                      <Section code="04" title="NOTES" last>
                        <FieldShell label="ANNOTATION" code="FREETEXT" htmlFor="loan-notes" hint="Lender branch, account number, guarantor, anything worth knowing.">
                          <textarea id="loan-notes" className="field min-h-16 resize-y" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value.slice(0, 300) })} placeholder="ACCOUNT NO. XXXXXXXX · HDFC SAKET BRANCH" />
                        </FieldShell>
                      </Section>
                    </motion.div>
                  ) : (
                    <motion.div key="payment" variants={STAGGER} initial="hidden" animate="show" className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
                      {paymentTarget && (
                        <motion.div variants={ITEM} className="mx-3 mt-3 flex items-center justify-between border border-line bg-bg2 px-3 py-2 md:mx-4">
                          <div>
                            <span className="block text-[12px] font-semibold text-fg">{paymentTarget.name}</span>
                            <span className="micro text-faint">{paymentTarget.lender} · {paymentTarget.interestRate}% PA · {paymentTarget.tenureMonths} MO TENURE</span>
                          </div>
                          <div className="text-right">
                            <span className="micro block text-acidink">EMI #{payForm.emiNumber}</span>
                            <span className="micro text-faint">of {paymentTarget.tenureMonths}</span>
                          </div>
                        </motion.div>
                      )}
                      {/* 01 PAYMENT */}
                      <Section code="01" title="PAYMENT">
                        <FieldShell label="PAYMENT DATE" code="ISO DATE" hint="The date this EMI was actually paid.">
                          <CyberDatePicker value={payForm.date} onChange={(v) => setPayForm({ ...payForm, date: v })} ariaLabel="EMI payment date" />
                        </FieldShell>
                        <div className="mt-3">
                          <FieldShell label="EMI AMOUNT" code={symbolOf(paymentTarget?.currency ?? base)} hint="From amortization schedule — edit if your actual EMI differs">
                            <div className="flex items-center border border-line2 bg-bg2 transition-colors focus-within:border-acid">
                              <span className="pl-3 font-mono text-[18px] text-faint">{symbolOf(paymentTarget?.currency ?? base)}</span>
                              <input value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value.replace(/[^\d.]/g, '').slice(0, 12) })} inputMode="decimal" placeholder="0" autoFocus className="w-full bg-transparent px-2 py-2.5 font-mono text-[22px] font-semibold tnum outline-none placeholder:text-faint" />
                              <span className="micro pr-3 text-faint">{paymentTarget?.currency ?? base}</span>
                            </div>
                          </FieldShell>
                        </div>
                      </Section>
                      {/* 02 BREAKDOWN */}
                      <Section code="02" title="BREAKDOWN" last>
                        <div className="grid gap-3 md:grid-cols-2">
                          <FieldShell label="PRINCIPAL COMPONENT" code="CAPITAL" hint="Toward repaying the principal balance">
                            <div className="flex items-center border border-line2 bg-bg2 focus-within:border-acid">
                              <input value={payForm.principalComponent} onChange={(e) => setPayForm({ ...payForm, principalComponent: e.target.value.replace(/[^\d.]/g, '').slice(0, 12) })} inputMode="decimal" className="w-full bg-transparent px-3 py-2 font-mono text-[15px] font-semibold text-acidink tnum outline-none" aria-label="Principal component" />
                            </div>
                          </FieldShell>
                          <FieldShell label="INTEREST COMPONENT" code="COST" hint="Consumed by interest charges">
                            <div className="flex items-center border border-line2 bg-bg2 focus-within:border-acid">
                              <input value={payForm.interestComponent} onChange={(e) => setPayForm({ ...payForm, interestComponent: e.target.value.replace(/[^\d.]/g, '').slice(0, 12) })} inputMode="decimal" className="w-full bg-transparent px-3 py-2 font-mono text-[15px] font-semibold text-orangeink tnum outline-none" aria-label="Interest component" />
                            </div>
                          </FieldShell>
                        </div>
                        <div className="mt-3">
                          <FieldShell label="BALANCE AFTER" code="OUTSTANDING" hint="Principal remaining after this EMI clears">
                            <div className="flex items-center border border-line2 bg-bg2 focus-within:border-acid">
                              <input value={payForm.balanceAfter} onChange={(e) => setPayForm({ ...payForm, balanceAfter: e.target.value.replace(/[^\d.]/g, '').slice(0, 12) })} inputMode="decimal" className="w-full bg-transparent px-3 py-2 font-mono text-[15px] font-semibold text-dim tnum outline-none" aria-label="Balance after payment" />
                            </div>
                          </FieldShell>
                        </div>
                        {payForm.emiNumber >= (paymentTarget?.tenureMonths ?? Infinity) && (
                          <div className="mt-3 flex items-center gap-2 border border-acid bg-acidsoft px-3 py-2">
                            <Led signal="acid" size="sm" pulse />
                            <span className="micro text-acidink">FINAL EMI — LOAN WILL BE MARKED PAID OFF AUTOMATICALLY</span>
                          </div>
                        )}
                      </Section>
                    </motion.div>
                  )}

                  {/* Footer */}
                  {isLoan ? (
                    <div className="border-t-2 border-linehard bg-bg2 px-3 py-2.5 md:px-4">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="flex items-end gap-3">
                          <span className="flex items-baseline gap-1">
                            <span className="numeral text-[26px] text-fg">
                              <AnimatedNumber value={emiInBase} format={(v) => formatMoney(v, base)} stiffness={260} damping={28} />
                            </span>
                            <span className="micro pb-1 text-faint">/ MONTH</span>
                          </span>
                          {interestTotal > 0 && <span className="meta hidden text-orangeink sm:block">{formatMoney(interestTotal, form.currency)} TOTAL INTEREST</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {editingLoan && !showDelete && <CyberButton variant="danger" size="sm" onClick={() => setShowDelete(true)}>DELETE</CyberButton>}
                          {editingLoan && showDelete && <>
                            <span className="micro text-redink">CONFIRM ERASE?</span>
                            <CyberButton variant="ghost" size="sm" onClick={() => setShowDelete(false)}>NO</CyberButton>
                            <CyberButton variant="danger" size="sm" busy={busy} onClick={() => void handleDelete()}>ERASE</CyberButton>
                          </>}
                          {!showDelete && <>
                            <CyberButton variant="ghost" onClick={close} disabled={busy}>CANCEL</CyberButton>
                            <CyberButton variant="solid" busy={busy} busyLabel="SAVING" onClick={() => void saveLoan()} leading={editingLoan ? undefined : <IconPlus size={14} />}>
                              {editingLoan ? 'SAVE CHANGES' : 'INITIALIZE LOAN'}
                            </CyberButton>
                          </>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t-2 border-linehard bg-bg2 px-3 py-2.5 md:px-4">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="flex items-end gap-3">
                          <span className="flex items-baseline gap-1">
                            <span className="numeral text-[26px] text-fg">
                              <AnimatedNumber value={parseFloat(payForm.amount) || 0} format={(v) => formatMoney(v, paymentTarget?.currency ?? base)} stiffness={260} damping={28} />
                            </span>
                            <span className="micro pb-1 text-faint">EMI #{payForm.emiNumber}</span>
                          </span>
                          <span className="meta hidden sm:block">
                            <span className="text-acidink">{formatMoney(parseFloat(payForm.principalComponent) || 0, paymentTarget?.currency ?? base)} PRINCIPAL</span>
                            <span className="text-linehard"> · </span>
                            <span className="text-orangeink">{formatMoney(parseFloat(payForm.interestComponent) || 0, paymentTarget?.currency ?? base)} INTEREST</span>
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <CyberButton variant="ghost" onClick={close} disabled={payBusy}>CANCEL</CyberButton>
                          <CyberButton variant="solid" busy={payBusy} busyLabel="RECORDING" onClick={() => void savePayment()}>RECORD EMI</CyberButton>
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
