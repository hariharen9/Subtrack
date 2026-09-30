/**
 * SUBTRACK // UI STATE
 *
 * Preferences are instant and synchronous (localStorage) so the console opens
 * with the right skin and currency already applied; financial data lives in
 * IndexedDB (see lib/db). Toasts are a console log, not notifications: they
 * speak in system verbs — INITIALIZED, UPDATED, TERMINATED.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BASE_CURRENCY } from '@/lib/money'

export type ToastKind = 'ok' | 'info' | 'warn' | 'alert' | 'busy'

export interface SystemToast {
  id: string
  kind: ToastKind
  /** Short system verb, e.g. PROCESS UPDATED */
  label: string
  /** Optional detail line, e.g. Netflix · ₹649 / month */
  text?: string
  /** Longer-lived messages (errors, update prompts) stay until dismissed. */
  sticky?: boolean
}

export interface ComposerState {
  open: boolean
  editId: string | null
  presetServiceId: string | null
}

export type TerminationMode = 'terminate' | 'purge'

export type CardComposerTxnType = 'purchase' | 'payment' | 'fee' | 'interest' | 'reward' | 'refund'

export interface SpendComposerState {
  open: boolean
  /** Prefill a spend being edited. */
  editId: string | null
  /** Preselect a category when opening from a category block. */
  presetCategory: string | null
}

export interface CardComposerState {
  open: boolean
  /** 'card' = add/edit a credit card; 'txn' = record a card transaction. */
  mode: 'card' | 'txn'
  /** Card being edited (card mode). */
  editCardId: string | null
  /** Card preselected for a transaction (txn mode). */
  presetCardId: string | null
  /** Transaction being edited (txn mode). */
  editTxnId: string | null
  /** Transaction type preselected (e.g. a quick PAY action). */
  presetType: CardComposerTxnType | null
  /** Amount prefilled (e.g. the statement due for a quick PAY action). */
  presetAmount: number | null
}

export interface LoanComposerState {
  open: boolean
  /** 'loan' = add/edit a loan; 'payment' = record an EMI payment. */
  mode: 'loan' | 'payment'
  /** Loan being edited (loan mode). */
  editLoanId: string | null
  /** Loan to record a payment against (payment mode). */
  paymentLoanId: string | null
}

export interface TerminationState {
  open: boolean
  subId: string | null
  mode: TerminationMode
}

export type ZenAccent = 'emerald' | 'indigo' | 'amber' | 'slate' | 'cyan'

interface UIState {
  theme: 'dark' | 'day'
  /** Interface personality: 'cyber' (Brutalist Terminal HUD) or 'minimal' (Calm, Soft Modern Zen / Claude style). */
  uiMode: 'cyber' | 'minimal'
  /** Curated accent color profile in Zen / Minimal mode. */
  zenAccent: ZenAccent
  /** Decorative grid + grain field. */
  field: boolean
  baseCurrency: string
  /** Days of incoming flow shown by the stream. */
  horizonDays: number
  toasts: SystemToast[]
  paletteOpen: boolean
  composer: ComposerState
  spendComposer: SpendComposerState
  cardComposer: CardComposerState
  loanComposer: LoanComposerState
  termination: TerminationState
  /** False until the local volume has been opened and seeded. */
  booted: boolean
  setBooted: (booted: boolean) => void
  setTheme: (theme: 'dark' | 'day') => void
  toggleTheme: () => void
  setUiMode: (mode: 'cyber' | 'minimal') => void
  toggleUiMode: () => void
  setZenAccent: (accent: ZenAccent) => void
  setField: (on: boolean) => void
  setBaseCurrency: (code: string) => void
  setHorizonDays: (days: number) => void
  pushToast: (toast: Omit<SystemToast, 'id'>) => string
  dismissToast: (id: string) => void
  clearToasts: () => void
  setPaletteOpen: (open: boolean) => void
  togglePalette: () => void
  openComposer: (options?: { editId?: string; presetServiceId?: string }) => void
  closeComposer: () => void
  openSpendComposer: (options?: { editId?: string; presetCategory?: string }) => void
  closeSpendComposer: () => void
  openCardComposer: (options?: {
    mode?: 'card' | 'txn'
    editCardId?: string
    presetCardId?: string
    editTxnId?: string
    presetType?: CardComposerTxnType
    presetAmount?: number
  }) => void
  closeCardComposer: () => void
  openLoanComposer: (options?: {
    mode?: 'loan' | 'payment'
    editLoanId?: string
    paymentLoanId?: string
  }) => void
  closeLoanComposer: () => void
  openTermination: (subId: string, mode: TerminationMode) => void
  closeTermination: () => void
}

let toastSeq = 0

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      uiMode: 'cyber',
      zenAccent: 'emerald',
      field: true,
      baseCurrency: BASE_CURRENCY,
      horizonDays: 30,
      toasts: [],
      paletteOpen: false,
      composer: { open: false, editId: null, presetServiceId: null },
      spendComposer: { open: false, editId: null, presetCategory: null },
      cardComposer: { open: false, mode: 'card', editCardId: null, presetCardId: null, editTxnId: null, presetType: null, presetAmount: null },
      loanComposer: { open: false, mode: 'loan', editLoanId: null, paymentLoanId: null },
      termination: { open: false, subId: null, mode: 'terminate' },
      booted: false,
      setBooted: (booted) => set({ booted }),

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'day' : 'dark' }),
      setUiMode: (uiMode) => {
        set({ uiMode })
        if (typeof document !== 'undefined') {
          document.documentElement.dataset.ui = uiMode
        }
      },
      toggleUiMode: () => {
        const next = get().uiMode === 'cyber' ? 'minimal' : 'cyber'
        get().setUiMode(next)
      },
      setZenAccent: (zenAccent) => {
        set({ zenAccent })
        if (typeof document !== 'undefined') {
          document.documentElement.dataset.zenAccent = zenAccent
        }
      },
      setField: (field) => set({ field }),
      setBaseCurrency: (baseCurrency) => set({ baseCurrency }),
      setHorizonDays: (horizonDays) => set({ horizonDays }),

      pushToast: (toast) => {
        const id = `t${++toastSeq}-${Date.now().toString(36)}`
        set({ toasts: [...get().toasts, { ...toast, id }].slice(-4) })
        return id
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
      clearToasts: () => set({ toasts: [] }),

      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      togglePalette: () => set({ paletteOpen: !get().paletteOpen }),

      openComposer: (options) =>
        set({
          composer: {
            open: true,
            editId: options?.editId ?? null,
            presetServiceId: options?.presetServiceId ?? null,
          },
        }),
      closeComposer: () => set({ composer: { open: false, editId: null, presetServiceId: null } }),
      openSpendComposer: (options) =>
        set({
          spendComposer: {
            open: true,
            editId: options?.editId ?? null,
            presetCategory: options?.presetCategory ?? null,
          },
        }),
      closeSpendComposer: () =>
        set({ spendComposer: { open: false, editId: null, presetCategory: null } }),
      openCardComposer: (options) =>
        set({
          cardComposer: {
            open: true,
            mode: options?.mode ?? 'card',
            editCardId: options?.editCardId ?? null,
            presetCardId: options?.presetCardId ?? null,
            editTxnId: options?.editTxnId ?? null,
            presetType: options?.presetType ?? null,
            presetAmount: options?.presetAmount ?? null,
          },
        }),
      closeCardComposer: () =>
        set({
          cardComposer: {
            open: false,
            mode: 'card',
            editCardId: null,
            presetCardId: null,
            editTxnId: null,
            presetType: null,
            presetAmount: null,
          },
        }),
      openLoanComposer: (options) =>
        set({
          loanComposer: {
            open: true,
            mode: options?.mode ?? 'loan',
            editLoanId: options?.editLoanId ?? null,
            paymentLoanId: options?.paymentLoanId ?? null,
          },
        }),
      closeLoanComposer: () =>
        set({ loanComposer: { open: false, mode: 'loan', editLoanId: null, paymentLoanId: null } }),
      openTermination: (subId, mode) => set({ termination: { open: true, subId, mode } }),
      closeTermination: () =>
        set({ termination: { open: false, subId: null, mode: 'terminate' } }),
    }),
    {
      name: 'subtrack.ui',
      version: 1,
      partialize: (state) => ({
        theme: state.theme,
        uiMode: state.uiMode,
        zenAccent: state.zenAccent,
        field: state.field,
        baseCurrency: state.baseCurrency,
        horizonDays: state.horizonDays,
      }),
    },
  ),
)

/** Standalone helper for non-React call sites (db flows, hotkeys). */
export function announce(toast: Omit<SystemToast, 'id'>): string {
  return useUI.getState().pushToast(toast)
}

export const TOAST_VERBS = {
  initialized: (name: string, detail: string) => ({
    kind: 'ok' as ToastKind,
    label: 'SUBSCRIPTION INITIALIZED',
    text: `${name} · ${detail}`,
  }),
  updated: (name: string) => ({
    kind: 'ok' as ToastKind,
    label: 'SUBSCRIPTION UPDATED',
    text: `${name} · configuration written`,
  }),
  suspended: (name: string) => ({
    kind: 'warn' as ToastKind,
    label: 'SUBSCRIPTION SUSPENDED',
    text: `${name} · no longer counted in monthly burn`,
  }),
  resumed: (name: string) => ({
    kind: 'ok' as ToastKind,
    label: 'SUBSCRIPTION RESUMED',
    text: `${name} · back in the burn`,
  }),
  terminating: (name: string) => ({
    kind: 'busy' as ToastKind,
    label: 'TERMINATING SUBSCRIPTION...',
    text: `${name} · flushing scheduled events`,
  }),
  terminated: (name: string) => ({
    kind: 'alert' as ToastKind,
    label: 'SUBSCRIPTION TERMINATED',
    text: `${name} · history retained in the archive`,
  }),
  purged: (name: string) => ({
    kind: 'alert' as ToastKind,
    label: 'SUBSCRIPTION PURGED',
    text: `${name} and its payment history were erased`,
  }),
  cycle: (name: string, detail: string) => ({
    kind: 'ok' as ToastKind,
    label: 'CYCLE EXECUTED ✓',
    text: `${name} · ${detail}`,
  }),
  loanAdded: (name: string, detail: string) => ({
    kind: 'ok' as ToastKind,
    label: 'LOAN INITIALIZED',
    text: `${name} · ${detail}`,
  }),
  loanUpdated: (name: string) => ({
    kind: 'ok' as ToastKind,
    label: 'LOAN UPDATED',
    text: `${name} · record written`,
  }),
  loanPaidOff: (name: string) => ({
    kind: 'ok' as ToastKind,
    label: 'LOAN PAID OFF ✓',
    text: `${name} · marked as closed`,
  }),
  loanDeleted: (name: string) => ({
    kind: 'alert' as ToastKind,
    label: 'LOAN DELETED',
    text: `${name} and its payment history erased`,
  }),
  emiLogged: (name: string, detail: string) => ({
    kind: 'ok' as ToastKind,
    label: 'EMI RECORDED ✓',
    text: `${name} · ${detail}`,
  }),
  cardAdded: (name: string, detail: string) => ({
    kind: 'ok' as ToastKind,
    label: 'CARD INITIALIZED',
    text: `${name} · ${detail}`,
  }),
  cardUpdated: (name: string) => ({
    kind: 'ok' as ToastKind,
    label: 'CARD UPDATED',
    text: `${name} · record written`,
  }),
  cardDeleted: (name: string) => ({
    kind: 'alert' as ToastKind,
    label: 'CARD PURGED',
    text: `${name} and its transaction history erased`,
  }),
  cardTxnLogged: (title: string, detail: string) => ({
    kind: 'ok' as ToastKind,
    label: 'TXN RECORDED ✓',
    text: `${title} · ${detail}`,
  }),
  cardTxnUpdated: (title: string) => ({
    kind: 'ok' as ToastKind,
    label: 'TXN UPDATED',
    text: `${title} · record written`,
  }),
  cardTxnDeleted: (title: string) => ({
    kind: 'alert' as ToastKind,
    label: 'TXN REMOVED',
    text: `${title} · entry erased`,
  }),
  info: (label: string, text?: string) => ({ kind: 'info' as ToastKind, label, text }),
  spendLogged: (title: string, detail: string) => ({
    kind: 'ok' as ToastKind,
    label: 'SPEND LOGGED ✓',
    text: `${title} · ${detail}`,
  }),
  spendUpdated: (title: string) => ({
    kind: 'ok' as ToastKind,
    label: 'SPEND UPDATED',
    text: `${title} · entry written`,
  }),
  spendDeleted: (title: string) => ({
    kind: 'alert' as ToastKind,
    label: 'SPEND REMOVED',
    text: `${title} · entry erased`,
  }),
  warn: (label: string, text?: string) => ({ kind: 'warn' as ToastKind, label, text }),
  error: (label: string, text?: string) => ({
    kind: 'alert' as ToastKind,
    label,
    text,
    sticky: true,
  }),
}
