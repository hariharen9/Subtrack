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

export interface TerminationState {
  open: boolean
  subId: string | null
  mode: TerminationMode
}

interface UIState {
  theme: 'dark' | 'day'
  /** Decorative grid + grain field. */
  field: boolean
  /** Extra restraint on top of the OS reduced-motion setting. */
  calmMode: boolean
  baseCurrency: string
  /** Days of incoming flow shown by the stream. */
  horizonDays: number
  toasts: SystemToast[]
  paletteOpen: boolean
  composer: ComposerState
  termination: TerminationState
  /** False until the local volume has been opened and seeded. */
  booted: boolean
  setBooted: (booted: boolean) => void
  setTheme: (theme: 'dark' | 'day') => void
  toggleTheme: () => void
  setField: (on: boolean) => void
  setCalmMode: (on: boolean) => void
  setBaseCurrency: (code: string) => void
  setHorizonDays: (days: number) => void
  pushToast: (toast: Omit<SystemToast, 'id'>) => string
  dismissToast: (id: string) => void
  clearToasts: () => void
  setPaletteOpen: (open: boolean) => void
  togglePalette: () => void
  openComposer: (options?: { editId?: string; presetServiceId?: string }) => void
  closeComposer: () => void
  openTermination: (subId: string, mode: TerminationMode) => void
  closeTermination: () => void
}

let toastSeq = 0

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      field: true,
      calmMode: false,
      baseCurrency: BASE_CURRENCY,
      horizonDays: 30,
      toasts: [],
      paletteOpen: false,
      composer: { open: false, editId: null, presetServiceId: null },
      termination: { open: false, subId: null, mode: 'terminate' },
      booted: false,
      setBooted: (booted) => set({ booted }),

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'day' : 'dark' }),
      setField: (field) => set({ field }),
      setCalmMode: (calmMode) => set({ calmMode }),
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
      openTermination: (subId, mode) => set({ termination: { open: true, subId, mode } }),
      closeTermination: () =>
        set({ termination: { open: false, subId: null, mode: 'terminate' } }),
    }),
    {
      name: 'subtrack.ui',
      version: 1,
      partialize: (state) => ({
        theme: state.theme,
        field: state.field,
        calmMode: state.calmMode,
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
    label: 'PROCESS INITIALIZED',
    text: `${name} · ${detail}`,
  }),
  updated: (name: string) => ({
    kind: 'ok' as ToastKind,
    label: 'PROCESS UPDATED',
    text: `${name} · configuration written`,
  }),
  suspended: (name: string) => ({
    kind: 'warn' as ToastKind,
    label: 'PROCESS SUSPENDED',
    text: `${name} · no longer counted in monthly burn`,
  }),
  resumed: (name: string) => ({
    kind: 'ok' as ToastKind,
    label: 'PROCESS RESUMED',
    text: `${name} · back in the burn`,
  }),
  terminating: (name: string) => ({
    kind: 'busy' as ToastKind,
    label: 'TERMINATING PROCESS...',
    text: `${name} · flushing scheduled events`,
  }),
  terminated: (name: string) => ({
    kind: 'alert' as ToastKind,
    label: 'PROCESS TERMINATED',
    text: `${name} · history retained in the archive`,
  }),
  purged: (name: string) => ({
    kind: 'alert' as ToastKind,
    label: 'PROCESS PURGED',
    text: `${name} and its payment history were erased`,
  }),
  cycle: (name: string, detail: string) => ({
    kind: 'ok' as ToastKind,
    label: 'CYCLE EXECUTED ✓',
    text: `${name} · ${detail}`,
  }),
  info: (label: string, text?: string) => ({ kind: 'info' as ToastKind, label, text }),
  warn: (label: string, text?: string) => ({ kind: 'warn' as ToastKind, label, text }),
  error: (label: string, text?: string) => ({
    kind: 'alert' as ToastKind,
    label,
    text,
    sticky: true,
  }),
}
