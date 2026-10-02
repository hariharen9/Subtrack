/**
 * SPENDSTATE // CLOUD STORE
 *
 * UI state for the optional cloud backend. The opt-in flag lives in
 * localStorage (`spendstate.cloudSync`) — it is local, never synced, and turning
 * cloud sync off returns the app to Dexie without touching local data.
 *
 * It also owns the **first-link decision**. A fresh device has demo data; if the
 * account already holds real data, we must not merge the two — the user chooses
 * to restore from the cloud or to overwrite it.
 */
import { create } from 'zustand'
import * as cloud from '@/lib/repository/cloud'
import type { CloudUser, SyncIssue } from '@/lib/repository/cloud'

const FLAG = 'spendstate.cloudSync'
const LINK_KEY = 'spendstate.cloudLinkedUid'

export type CloudStatus =
  | 'off'
  | 'connecting'
  | 'checking'
  | 'choice'
  | 'syncing'
  | 'ready'
  | 'error'

interface CloudState {
  available: boolean
  enabled: boolean
  user: CloudUser | null
  status: CloudStatus
  message: string | null
  issues: SyncIssue[]
  lastSync: string | null
  progress: { done: number; total: number } | null
  /** True when the account already has data and a direction must be chosen. */
  needsChoice: boolean

  init: () => void
  enable: () => void
  disable: () => void
  google: () => Promise<void>
  emailSignUp: (email: string, password: string) => Promise<void>
  emailSignIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
  restoreFromCloud: () => Promise<void>
  uploadThisDevice: () => Promise<void>
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

function linkedUid(): string | null {
  try {
    return localStorage.getItem(LINK_KEY)
  } catch {
    return null
  }
}

function setLinked(uid: string | null): void {
  try {
    if (uid) localStorage.setItem(LINK_KEY, uid)
    else localStorage.removeItem(LINK_KEY)
  } catch {
    /* ignore */
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
  /**
   * Decide the sync direction for the signed-in account. A device that was
   * already linked to this account simply mirrors; a fresh device either pushes
   * (empty cloud) or asks the user which way the data should flow.
   */
  const decideDirection = async (uid: string) => {
    if (linkedUid() === uid) {
      await get().syncNow()
      return
    }
    set({ status: 'checking', message: null })
    try {
      if (await cloud.hasRemoteData()) {
        set({ status: 'choice', needsChoice: true })
        return
      }
      // Empty cloud — this device is the first. Push and link.
      await get().uploadThisDevice()
    } catch (error) {
      set({ status: 'error', message: describe(error) })
    }
  }

  /** Subscribe to auth state once, lazily. */
  const attach = () => {
    if (unsubscribeAuth) return
    unsubscribeAuth = cloud.onAuth((user) => {
      set({ user })
      if (!user) {
        set({ status: 'off', needsChoice: false })
        return
      }
      void decideDirection(user.uid)
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
    needsChoice: false,

    /** Called at boot: re-attach silently if the user previously opted in. */
    init: () => {
      if (!cloud.cloudAvailable() || !readFlag()) return
      set({ enabled: true, status: 'connecting' })
      attach()
    },

    enable: () => {
      writeFlag(true)
      set({ enabled: true, status: 'connecting', message: null })
      attach()
    },

    disable: () => {
      writeFlag(false)
      cloud.stopCloud()
      // Local data is never deleted — Dexie is the engine again.
      set({ enabled: false, user: null, status: 'off', message: null, progress: null, needsChoice: false })
    },

    google: async () => {
      attach()
      set({ status: 'connecting', message: null })
      try {
        await cloud.signInGoogle()
      } catch (error) {
        set({ status: 'error', message: describe(error) })
      }
    },

    emailSignUp: async (email, password) => {
      attach()
      set({ status: 'connecting', message: null })
      try {
        await cloud.signUpEmail(email, password)
      } catch (error) {
        set({ status: 'error', message: describe(error) })
      }
    },

    emailSignIn: async (email, password) => {
      attach()
      set({ status: 'connecting', message: null })
      try {
        await cloud.signInEmail(email, password)
      } catch (error) {
        set({ status: 'error', message: describe(error) })
      }
    },

    signOut: async () => {
      await cloud.signOutCloud()
      set({ user: null, status: 'off', message: null, needsChoice: false })
    },

    /** Normal mirror sync for an already-linked device (also the migration). */
    syncNow: async () => {
      const user = get().user
      if (!user) return
      set({ status: 'syncing', progress: { done: 0, total: 0 } })
      try {
        const report = await cloud.migrateToCloud((done, total) => set({ progress: { done, total } }))
        setLinked(user.uid)
        set({ status: 'ready', needsChoice: false, issues: report.issues, lastSync: new Date().toISOString(), progress: null })
      } catch (error) {
        set({ status: 'error', message: describe(error), progress: null })
      }
    },

    /** New device: replace this device's local volume with the cloud copy. */
    restoreFromCloud: async () => {
      const user = get().user
      if (!user) return
      set({ status: 'syncing', needsChoice: false, progress: { done: 0, total: 0 } })
      try {
        const report = await cloud.restoreThisDevice()
        setLinked(user.uid)
        set({ status: 'ready', issues: report.issues, lastSync: new Date().toISOString(), progress: null })
      } catch (error) {
        set({ status: 'error', message: describe(error), progress: null })
      }
    },

    /** First device: push this device's data up and take ownership of the cloud. */
    uploadThisDevice: async () => {
      const user = get().user
      if (!user) return
      set({ status: 'syncing', needsChoice: false, progress: { done: 0, total: 0 } })
      try {
        const report = await cloud.uploadThisDevice()
        setLinked(user.uid)
        set({ status: 'ready', issues: report.issues, lastSync: new Date().toISOString(), progress: null })
      } catch (error) {
        set({ status: 'error', message: describe(error), progress: null })
      }
    },
  }
})
