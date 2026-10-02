/**
 * SPENDSTATE // CLOUD STORE
 *
 * UI state for the optional cloud backend. The opt-in flag lives in
 * localStorage (`spendstate.cloudSync`) — it is local, never synced, and turning
 * cloud sync off returns the app to Dexie without touching local data.
 */
import { create } from 'zustand'
import * as cloud from '@/lib/repository/cloud'
import type { CloudUser, SyncIssue } from '@/lib/repository/cloud'

const FLAG = 'spendstate.cloudSync'

export type CloudStatus = 'off' | 'connecting' | 'syncing' | 'ready' | 'error'

interface CloudState {
  available: boolean
  enabled: boolean
  user: CloudUser | null
  status: CloudStatus
  message: string | null
  issues: SyncIssue[]
  lastSync: string | null
  progress: { done: number; total: number } | null

  init: () => void
  enable: () => void
  disable: () => void
  google: () => Promise<void>
  emailSignUp: (email: string, password: string) => Promise<void>
  emailSignIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
}

let unsubscribeAuth: (() => void) | null = null

function readFlag(): boolean {
  try {
    return localStorage.getItem(FLAG) === '1'
  } catch {
    return false
  }
}

function writeFlag(on: boolean): void {
  try {
    if (on) localStorage.setItem(FLAG, '1')
    else localStorage.removeItem(FLAG)
  } catch {
    /* private mode — the in-memory flag still applies for this session */
  }
}

function describe(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: unknown }).code)
    return code.replace('auth/', '').replace(/-/g, ' ')
  }
  return error instanceof Error ? error.message : 'Unknown error'
}

export const useCloud = create<CloudState>()((set, get) => {
  /** Subscribe to auth state once, lazily. */
  const attach = () => {
    if (unsubscribeAuth) return
    unsubscribeAuth = cloud.onAuth((user) => {
      set({ user })
      if (user) void get().syncNow()
      else set({ status: 'off' })
    })
  }

  return {
    available: cloud.cloudAvailable(),
    enabled: readFlag(),
    user: null,
    status: 'off',
    message: null,
    issues: [],
    lastSync: null,
    progress: null,

    /** Called at boot: re-attach silently if the user previously opted in. */
    init: () => {
      if (!cloud.cloudAvailable() || !readFlag()) return
      attach()
      set({ enabled: true, status: 'connecting' })
      void cloud
        .startCloud()
        .then(() => set({ status: 'ready' }))
        .catch((error) => set({ status: 'error', message: describe(error) }))
    },

    enable: () => {
      writeFlag(true)
      set({ enabled: true, status: 'connecting', message: null })
      attach()
      void cloud
        .startCloud()
        .then(() => set({ status: 'ready' }))
        .catch((error) => set({ status: 'error', message: describe(error) }))
    },

    disable: () => {
      writeFlag(false)
      cloud.stopCloud()
      // Local data is never deleted — Dexie is the engine again.
      set({ enabled: false, user: null, status: 'off', message: null, progress: null })
    },

    google: async () => {
      attach()
      set({ status: 'connecting', message: null })
      try {
        await cloud.signInGoogle()
        await get().syncNow()
      } catch (error) {
        set({ status: 'error', message: describe(error) })
      }
    },

    emailSignUp: async (email, password) => {
      attach()
      set({ status: 'connecting', message: null })
      try {
        await cloud.signUpEmail(email, password)
        await get().syncNow()
      } catch (error) {
        set({ status: 'error', message: describe(error) })
      }
    },

    emailSignIn: async (email, password) => {
      attach()
      set({ status: 'connecting', message: null })
      try {
        await cloud.signInEmail(email, password)
        await get().syncNow()
      } catch (error) {
        set({ status: 'error', message: describe(error) })
      }
    },

    signOut: async () => {
      await cloud.signOutCloud()
      set({ user: null, status: 'off', message: null })
    },

    /** The one-time (idempotent) Dexie → Firestore migration. */
    syncNow: async () => {
      if (!get().user && !cloud.currentUser()) return
      set({ status: 'syncing', progress: { done: 0, total: 0 } })
      try {
        const report = await cloud.migrateToCloud((done, total) => set({ progress: { done, total } }))
        set({
          status: 'ready',
          issues: report.issues,
          lastSync: new Date().toISOString(),
          progress: null,
        })
      } catch (error) {
        set({ status: 'error', message: describe(error), progress: null })
      }
    },
  }
})
