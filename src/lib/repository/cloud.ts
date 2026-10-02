/**
 * SPENDSTATE // CLOUD ORCHESTRATION
 *
 * The only module that decides whether Firebase is ever loaded. Everything here
 * is lazy: `./firestore` (and therefore the entire Firebase SDK) is reached via
 * `await import()` and only when the user has opted in *and* the env config
 * exists. Until then, this file imports no Firebase code.
 */
import {
  firebaseConfig,
  getRepository,
  isCloudConfigured,
  onMutation,
  resetRepository,
  setRepository,
} from '.'
import { dexieRepository } from './dexie'
import type { CloudHandle, CloudUser, SyncIssue, SyncReport } from './firestore'

export type { CloudUser, SyncIssue, SyncReport }

let handle: CloudHandle | null = null
let unsubscribeMutation: (() => void) | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null

/** True when the env config is present — otherwise the cloud UI is hidden. */
export function cloudAvailable(): boolean {
  return isCloudConfigured
}

/** True when the cloud implementation is the active repository. */
export function cloudActive(): boolean {
  return getRepository().kind === 'firestore'
}

async function ensureHandle(): Promise<CloudHandle> {
  if (handle) return handle
  // The dynamic boundary. Above this line, zero Firebase bytes.
  const mod = await import('./firestore')
  handle = mod.createCloudHandle(firebaseConfig)
  return handle
}

/** Debounced mirror of a local write up to Firestore. */
function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    void handle?.syncNow().catch((error) => console.warn('[spendstate] cloud push failed', error))
  }, 1200)
}

/** Attach cloud sync: mark the repository kind and mirror every local write. */
export async function startCloud(): Promise<void> {
  const active = await ensureHandle()
  setRepository({ ...dexieRepository, kind: 'firestore' })
  unsubscribeMutation?.()
  unsubscribeMutation = onMutation(schedulePush)
  active.start()
}

/** Detach cloud sync. Local data is untouched; Dexie becomes the engine again. */
export function stopCloud(): void {
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  unsubscribeMutation?.()
  unsubscribeMutation = null
  handle?.stop()
  resetRepository()
}

export function currentUser(): CloudUser | null {
  return handle?.user ?? null
}

export function onAuth(cb: (user: CloudUser | null) => void): () => void {
  let unsubscribe: (() => void) | null = null
  let cancelled = false
  void ensureHandle().then((active) => {
    if (cancelled) return
    unsubscribe = active.onAuth(cb)
  })
  return () => {
    cancelled = true
    unsubscribe?.()
  }
}

export async function signInGoogle(): Promise<void> {
  const active = await ensureHandle()
  await active.signInGoogle()
  await startCloud()
}

export async function signUpEmail(email: string, password: string): Promise<void> {
  const active = await ensureHandle()
  await active.signUpEmail(email, password)
  await startCloud()
}

export async function signInEmail(email: string, password: string): Promise<void> {
  const active = await ensureHandle()
  await active.signInEmail(email, password)
  await startCloud()
}

export async function signOutCloud(): Promise<void> {
  await handle?.signOutUser()
  stopCloud()
}

/** The one-time Dexie → Firestore migration. Idempotent — safe to re-run. */
export async function migrateToCloud(
  onProgress?: (done: number, total: number) => void,
): Promise<SyncReport> {
  await startCloud()
  const active = await ensureHandle()
  return active.syncNow(onProgress)
}
