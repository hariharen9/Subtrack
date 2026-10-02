/**
 * SPENDSTATE // ACCOUNT COMPOSER
 *
 * Two consoles: a money-holding **account** (bank/cash/wallet/credit…), and a
 * **transfer** that moves money between two accounts. Accounts are the spine —
 * everything else posts into them.
 */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ACCOUNT_TYPES, type Account, type AccountType } from '@/lib/types'
import { CURRENCIES, symbolOf, formatMoney, convert } from '@/lib/money'
import { todayISO } from '@/lib/date'
import { createAccount, updateAccount, deleteAccount, createTransfer, type AccountDraft } from '@/lib/repository'
import { useAccounts, useAccountsSystem } from '@/hooks/useAccounts'
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

interface AccountForm {
  name: string
  type: AccountType
  institution: string
  currency: string
  openingBalance: string
  creditLimit: string
  color: string
  notes: string
}

function emptyForm(base: string): AccountForm {
  return { name: '', type: 'bank', institution: '', currency: base, openingBalance: '', creditLimit: '', color: '#10A37F', notes: '' }
}
function toForm(a: Account): AccountForm {
  return { name: a.name, type: a.type, institution: a.institution, currency: a.currency, openingBalance: String(a.openingBalance), creditLimit: String(a.creditLimit ?? ''), color: a.color, notes: a.notes }
}

export function AccountComposer() {
  const state = useUI((s) => s.accountComposer)
  const close = useUI((s) => s.closeAccountComposer)
  const pushToast = useUI((s) => s.pushToast)
  const base = useUI((s) => s.baseCurrency)
  const compact = useIsCompact()
  const accounts = useAccounts()
  const { summary } = useAccountsSystem()

  const isTransfer = state.mode === 'transfer'
  const editing = accounts.find((a) => a.id === state.editId)

  const trapRef = useFocusTrap<HTMLDivElement>(state.open)
  useScrollLock(state.open)

  const [form, setForm] = useState<AccountForm>(() => emptyForm(base))
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [tAmount, setTAmount] = useState('')
  const [tDate, setTDate] = useState(todayISO())
  const [tNotes, setTNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    if (!state.open) return
    setShowErrors(false)
    setShowDelete(false)
    setBusy(false)
    if (state.mode === 'account') {
      setForm(editing ? toForm(editing) : emptyForm(base))
    } else {
      setFromId(state.presetFromId ?? accounts[0]?.id ?? '')
      setToId(accounts.find((a) => a.id !== (state.presetFromId ?? accounts[0]?.id))?.id ?? '')
      setTAmount('')
      setTDate(todayISO())
      setTNotes('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.mode, state.editId])

  const openingBalance = parseFloat(form.openingBalance) || 0
  const creditLimit = parseFloat(form.creditLimit) || 0
  const nameError = showErrors && !form.name.trim() ? 'NAME REQUIRED' : undefined
  const amount = parseFloat(tAmount) || 0

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.id, label: `${a.name} · ${a.institution}` })),
    [accounts],
  )

  const balanceById = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of summary.views) map.set(v.account.id, v.balance)
    return map
  }, [summary.views])

  const saveAccount = async () => {
    setShowErrors(true)
    if (!form.name.trim()) return
    setBusy(true)
    try {
      const draft: AccountDraft = {
        name: form.name,
        type: form.type,
        institution: form.institution,
        currency: form.currency,
        openingBalance,
        creditLimit: form.type === 'credit' ? creditLimit : undefined,
        color: form.color,
        notes: form.notes,
      }
      if (editing) {
        await updateAccount(editing.id, draft)
        pushToast(TOAST_VERBS.accountUpdated(form.name))
      } else {
        const created = await createAccount(draft)
        pushToast(TOAST_VERBS.accountAdded(created.name, `${formatMoney(created.openingBalance, created.currency)} opening`))
      }
      close()
    } catch (err) {
      pushToast(TOAST_VERBS.error('WRITE FAILED', err instanceof Error ? err.message : 'Local store rejected'))
    } finally {
      setBusy(false)
    }
  }

  const saveTransfer = async () => {
    setShowErrors(true)
    if (!fromId || !toId || fromId === toId || amount <= 0) return
    setBusy(true)
    try {
      await createTransfer({ fromAccountId: fromId, toAccountId: toId, amount, currency: base, date: tDate, notes: tNotes })
      const from = accounts.find((a) => a.id === fromId)
      const to = accounts.find((a) => a.id === toId)
      pushToast(TOAST_VERBS.transferLogged(`${formatMoney(amount, base)} · ${from?.name ?? '—'} → ${to?.name ?? '—'}`))
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
      await deleteAccount(editing.id)
      pushToast(TOAST_VERBS.accountDeleted(editing.name))
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
            aria-labelledby="account-composer-title"
            className={cx('relative flex w-full flex-col', compact ? 'h-[92dvh]' : 'max-h-[88dvh] max-w-[680px]')}
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
                if (isTransfer) void saveTransfer()
                else void saveAccount()
              }
            }}
          >
            <div className="cp flex min-h-0 flex-1 flex-col">
              <span aria-hidden="true" className={cx('cp-shadow', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')} />
              <div className={cx('cp-frame flex min-h-0 flex-1 flex-col bg-line2', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')}>
                <div className={cx('cp-in flex min-h-0 flex-1 flex-col bg-surface', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')}>
                  <div className="flex items-center justify-between gap-3 border-b-2 border-linehard px-3 py-2.5 md:px-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="micro flex items-center gap-1.5 border border-line2 px-1.5 py-0.5 text-acidink">
                        <Led signal="acid" size="sm" pulse />
                        {isTransfer ? 'MOVE // TRANSFER' : editing ? 'ACCT // EDIT' : 'NEW ACCOUNT'}
                      </span>
                      <span id="account-composer-title" className="truncate text-[13px] font-semibold text-fg">
                        {isTransfer ? 'Move money between accounts' : editing ? editing.name : 'Initialize account'}
                      </span>
                    </div>
                    <IconButton label="Close console" size="sm" onClick={close}>
                      <IconClose size={14} />
                    </IconButton>
                  </div>

                  {compact && <div className="flex justify-center border-b border-line py-1.5" aria-hidden="true"><span className="block h-1 w-12 bg-line2" /></div>}

                  <motion.div initial="hidden" animate="show" className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
                    {isTransfer ? (
                      <>
                        <motion.section variants={ITEM} className="border-b border-line px-3 py-3 md:px-4">
                          <div className="grid gap-3">
                            <FieldShell label="FROM ACCOUNT" code="SOURCE" htmlFor="tx-from">
                              <div id="tx-from">
                                <CyberSelect ariaLabel="From account" value={fromId} onChange={setFromId} options={accountOptions} />
                              </div>
                            </FieldShell>
                            <FieldShell label="TO ACCOUNT" code="DESTINATION" htmlFor="tx-to">
                              <div id="tx-to">
                                <CyberSelect ariaLabel="To account" value={toId} onChange={setToId} options={accountOptions.filter((o) => o.value !== fromId)} />
                              </div>
                            </FieldShell>
                          </div>
                        </motion.section>
                        <motion.section variants={ITEM} className="px-3 py-3 md:px-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <FieldShell label="AMOUNT" code={base}>
                              <div className="flex items-center border border-line2 bg-bg2 focus-within:border-acid">
                                <span className="pl-3 font-mono text-[16px] text-faint">{symbolOf(base)}</span>
                                <input value={tAmount} onChange={(e) => setTAmount(e.target.value.replace(/[^\d.]/g, '').slice(0, 12))} inputMode="decimal" placeholder="0" className="w-full bg-transparent px-2 py-2.5 font-mono text-[20px] font-semibold tnum outline-none placeholder:text-faint" aria-label="Transfer amount" />
                              </div>
                            </FieldShell>
                            <FieldShell label="DATE" code="ISO DATE">
                              <CyberDatePicker value={tDate} onChange={setTDate} ariaLabel="Transfer date" />
                            </FieldShell>
                          </div>
                          <div className="mt-3">
                            <FieldShell label="NOTE" code="OPTIONAL" htmlFor="tx-notes">
                              <input id="tx-notes" className="field" value={tNotes} onChange={(e) => setTNotes(e.target.value.slice(0, 120))} placeholder="TOP-UP WALLET" />
                            </FieldShell>
                          </div>
                        </motion.section>
                      </>
                    ) : (
                      <>
                        <motion.section variants={ITEM} className="border-b border-line px-3 py-3 md:px-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <FieldShell label="ACCOUNT NAME" code="STRING" htmlFor="acct-name" error={nameError}>
                              <input id="acct-name" className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="HDFC SAVINGS" autoComplete="off" spellCheck={false} autoFocus aria-invalid={Boolean(nameError)} />
                            </FieldShell>
                            <FieldShell label="INSTITUTION" code="PROVIDER" htmlFor="acct-inst">
                              <input id="acct-inst" className="field" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="HDFC BANK" autoComplete="off" spellCheck={false} />
                            </FieldShell>
                          </div>
                          <div className="mt-3">
                            <FieldShell label="TYPE" code="CLASS">
                              <div className="mt-1 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                                {ACCOUNT_TYPES.map((t) => {
                                  const active = form.type === t.id
                                  return (
                                    <button key={t.id} type="button" onClick={() => setForm({ ...form, type: t.id })} aria-pressed={active} className={cx('flex flex-col items-center gap-1 border px-1 py-2 text-center transition-colors', active ? 'border-acid bg-acidsoft text-acidink' : 'border-line2 bg-surface2 text-dim hover:border-linehard hover:text-fg')}>
                                      <span className={cx('micro text-[10px] font-semibold', active ? 'text-acidink' : SIGNAL_TEXT[t.signal])}>{t.code}</span>
                                      <span className="micro text-[8px] leading-tight opacity-70">{t.label.toUpperCase()}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </FieldShell>
                          </div>
                        </motion.section>

                        <motion.section variants={ITEM} className="px-3 py-3 md:px-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <FieldShell label="OPENING BALANCE" code="START" htmlFor="acct-open">
                              <div className="flex items-center border border-line2 bg-bg2 focus-within:border-acid">
                                <span className="pl-3 font-mono text-[16px] text-faint">{symbolOf(form.currency)}</span>
                                <input id="acct-open" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value.replace(/[^\d.-]/g, '').slice(0, 12) })} inputMode="decimal" placeholder="0" className="w-full bg-transparent px-2 py-2.5 font-mono text-[20px] font-semibold tnum outline-none placeholder:text-faint" />
                              </div>
                            </FieldShell>
                            <FieldShell label="CURRENCY" code="ISO-4217" htmlFor="acct-ccy">
                              <div id="acct-ccy">
                                <CyberSelect ariaLabel="Currency" value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.code}`, hint: c.name }))} />
                              </div>
                            </FieldShell>
                          </div>
                          {form.type === 'credit' && (
                            <div className="mt-3 sm:max-w-[240px]">
                              <FieldShell label="CREDIT LIMIT" code="CEILING" htmlFor="acct-limit">
                                <input id="acct-limit" className="field" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value.replace(/[^\d.]/g, '').slice(0, 12) })} inputMode="decimal" placeholder="200000" />
                              </FieldShell>
                            </div>
                          )}
                          <div className="mt-3">
                            <FieldShell label="NOTE" code="OPTIONAL" htmlFor="acct-notes">
                              <input id="acct-notes" className="field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value.slice(0, 120) })} placeholder="SALARY ACCOUNT · JOINT" />
                            </FieldShell>
                          </div>
                        </motion.section>
                      </>
                    )}
                  </motion.div>

                  {/* Footer */}
                  <div className="border-t-2 border-linehard bg-bg2 px-3 py-2.5 md:px-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div className="flex items-end gap-3">
                        {isTransfer ? (
                          <span className="numeral text-[22px] text-acidink">
                            <AnimatedNumber value={amount} format={(v) => formatMoney(v, base)} stiffness={280} damping={28} />
                          </span>
                        ) : (
                          <span className="flex items-baseline gap-1">
                            <span className="numeral text-[22px] text-acidink">
                              <AnimatedNumber value={editing ? convert(balanceById.get(editing.id) ?? 0, editing.currency, base) : openingBalance} format={(v) => formatMoney(v, base)} stiffness={260} damping={28} />
                            </span>
                            <span className="micro pb-1 text-faint">{editing ? 'CURRENT BALANCE' : 'OPENING'}</span>
                          </span>
                        )}
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
                            <CyberButton variant="ghost" size="sm" onClick={() => setShowDelete(false)}>NO</CyberButton>
                            <CyberButton variant="danger" size="sm" busy={busy} onClick={() => void handleDelete()}>ERASE</CyberButton>
                          </>
                        )}
                        {!showDelete && (
                          <>
                            <CyberButton variant="ghost" onClick={close} disabled={busy}>CANCEL</CyberButton>
                            <CyberButton variant="solid" busy={busy} busyLabel="SAVING" onClick={() => (isTransfer ? void saveTransfer() : void saveAccount())} leading={editing || isTransfer ? undefined : <IconPlus size={14} />}>
                              {isTransfer ? 'RECORD TRANSFER' : editing ? 'SAVE CHANGES' : 'INITIALIZE ACCOUNT'}
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
