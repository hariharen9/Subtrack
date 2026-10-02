/**
 * SPENDSTATE // FIRESTORE IMPLEMENTATION  (dynamically imported — never in the default bundle)
 *
 * The optional cloud backend. This module is the ONLY place the Firebase SDK is
 * touched, and it is only ever reached through `await import()` when the user has
 * both opted in and supplied a `VITE_FIREBASE_*` config.
 *
 * Auth: Google popup + email/password.
 * Data: `users/{uid}/{table}/{id}` — the existing Dexie ids become document ids.
 * Cache: Firestore persistent local cache with a multi-tab manager.
 * Sync: a two-way mirror. Local writes push up (batched `setDoc` with merge), and
 * `onSnapshot` pulls remote documents back into Dexie, which stays the app's
 * local read cache so offline behaviour is unchanged.
 *
 * No Firebase Analytics is imported anywhere, by design.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  onSnapshot,
  type DocumentData,
  type Firestore,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db as dexie, clearSyncedTables } from '../db'
import { SYNC_TABLES, type SyncTable } from './types'
import type { FirebaseConfig } from './env'

export interface CloudUser {
  uid: string
  email: string | null
  displayName: string | null
}

export interface SyncIssue {
  table: string
  id: string
  reason: string
}

export interface SyncReport {
  written: number
  deleted: number
  skipped: number
  issues: SyncIssue[]
}

/** Structural view of a Dexie table so we can address them by name. */
interface AnyTable {
  toArray(): Promise<Record<string, unknown>[]>
  bulkPut(items: Record<string, unknown>[]): Promise<unknown>
  bulkDelete(keys: string[]): Promise<unknown>
}

const FIRESTORE_DOC_LIMIT = 1_048_576 // 1 MiB
const BATCH_LIMIT = 450 // ≤ 500 per the Firestore cap, with headroom

/**
 * A small marker document written on the first successful push. Its presence is
 * how a second device knows the account already holds data — and must therefore
 * choose between restoring from the cloud or overwriting it, never silently
 * merging a fresh demo dataset into a real ledger.
 */
const MARKER_COLLECTION = '_sync'
const MARKER_DOC = 'state'

function tableOf(name: SyncTable): AnyTable {
  return (dexie as unknown as Record<string, AnyTable>)[name]
}

function hasBlob(value: unknown): boolean {
  if (typeof Blob !== 'undefined' && value instanceof Blob) return true
  if (Array.isArray(value)) return value.some(hasBlob)
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasBlob)
  }
  return false
}

/** Recursively makes a value Firestore-safe: drops undefined, dates → ISO. */
function clean(value: unknown): unknown {
  if (value === null) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number' && !Number.isFinite(value)) return 0
  if (Array.isArray(value)) return value.map(clean)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (inner === undefined) continue
      out[key] = clean(inner)
    }
    return out
  }
  return value
}

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length
}

/** True when a Firestore value is a server Timestamp we should store as ISO. */
function isTimestamp(value: unknown): value is { toDate(): Date } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  )
}

function fromFirestore(value: unknown): unknown {
  if (isTimestamp(value)) return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(fromFirestore)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = fromFirestore(inner)
    }
    return out
  }
  return value
}

/**
 * Prepares one local row for Firestore. Returns an issue instead of `data` when
 * the row cannot be represented — a Blob/File, or a document over 1 MiB — so the
 * caller can surface it rather than silently dropping it.
 */
function prepareDoc(
  table: SyncTable,
  row: Record<string, unknown>,
): { data: DocumentData; issue?: undefined } | { data?: undefined; issue: SyncIssue } {
  const id = String(row.id ?? '')
  if (!id) return { issue: { table, id: '(none)', reason: 'row has no id' } }
  if (hasBlob(row)) {
    return { issue: { table, id, reason: 'contains a Blob/File — kept local only' } }
  }
  const data = clean(row) as DocumentData
  const size = byteLength(data)
  if (size > FIRESTORE_DOC_LIMIT) {
    return {
      issue: { table, id, reason: `document is ${(size / 1_048_576).toFixed(2)} MiB (limit 1 MiB)` },
    }
  }
  return { data }
}

/**
 * Two-way mirror between the local Dexie volume and `users/{uid}/…`.
 * `push()` is the migration: it is idempotent (merge writes, hash-checked) so it
 * can run as many times as you like.
 */
class CloudSync {
  private readonly hashes = new Map<SyncTable, Map<string, string>>()
  private readonly known = new Map<SyncTable, Set<string>>()
  private readonly unsubs: Unsubscribe[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private applyingRemote = false
  private primed = false
  private started = false

  constructor(
    private readonly db: Firestore,
    private readonly uid: string,
  ) {}

  private col(table: SyncTable) {
    return collection(this.db, 'users', this.uid, table)
  }

  /** Push every changed/deleted local row up. Idempotent. */
  async push(onProgress?: (done: number, total: number) => void): Promise<SyncReport> {
    const report: SyncReport = { written: 0, deleted: 0, skipped: 0, issues: [] }
    let total = 0
    let done = 0

    for (const table of SYNC_TABLES) {
      const rows = await tableOf(table).toArray()
      const hashes = this.hashes.get(table) ?? new Map<string, string>()
      const writes: { id: string; data: DocumentData; hash: string }[] = []
      const currentIds = new Set<string>()

      for (const row of rows) {
        const id = String(row.id ?? '')
        if (!id) continue
        currentIds.add(id)
        const prepared = prepareDoc(table, row)
        if (prepared.issue) {
          report.issues.push(prepared.issue)
          report.skipped++
          continue
        }
        const json = JSON.stringify(prepared.data)
        if (hashes.get(id) === json) continue
        writes.push({ id, data: prepared.data, hash: json })
      }

      const previous = this.known.get(table) ?? new Set<string>()
      const deletes = [...previous].filter((id) => !currentIds.has(id))
      total += writes.length + deletes.length

      for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
        const chunk = writes.slice(i, i + BATCH_LIMIT)
        const batch = writeBatch(this.db)
        for (const w of chunk) batch.set(doc(this.col(table), w.id), w.data, { merge: true })
        await batch.commit()
        // Hash only after the batch commits, so a failed write is retried later.
        for (const w of chunk) hashes.set(w.id, w.hash)
        report.written += chunk.length
        done += chunk.length
        onProgress?.(done, total)
      }

      for (let i = 0; i < deletes.length; i += BATCH_LIMIT) {
        const chunk = deletes.slice(i, i + BATCH_LIMIT)
        const batch = writeBatch(this.db)
        for (const id of chunk) batch.delete(doc(this.col(table), id))
        await batch.commit()
        report.deleted += chunk.length
        done += chunk.length
        onProgress?.(done, total)
      }

      this.hashes.set(table, hashes)
      this.known.set(table, currentIds)
    }

    // Mark the cloud as initialised so other devices can detect existing data.
    await setDoc(
      doc(this.db, 'users', this.uid, MARKER_COLLECTION, MARKER_DOC),
      { initialisedAt: new Date().toISOString(), tables: SYNC_TABLES.length },
      { merge: true },
    )

    this.primed = true
    return report
  }

  /** True when this account already holds data from another device. */
  async hasRemoteData(): Promise<boolean> {
    const snap = await getDoc(doc(this.db, 'users', this.uid, MARKER_COLLECTION, MARKER_DOC))
    return snap.exists()
  }

  /**
   * Replace the local volume with what is in the cloud. Clears the local synced
   * tables (marking seeds so the demo cannot return), pulls every document, then
   * primes the change-tracking maps so nothing is echoed back up.
   */
  async restore(): Promise<SyncReport> {
    await clearSyncedTables()
    let pulled = 0
    for (const table of SYNC_TABLES) {
      const snap = await getDocs(this.col(table))
      const rows: Record<string, unknown>[] = []
      snap.forEach((d) => {
        rows.push({ ...(fromFirestore(d.data()) as Record<string, unknown>), id: d.id })
      })
      const hashes = new Map<string, string>()
      for (const row of rows) hashes.set(String(row.id), JSON.stringify(clean(row)))
      this.hashes.set(table, hashes)
      this.known.set(table, new Set(snap.docs.map((d) => d.id)))
      if (rows.length) {
        await tableOf(table).bulkPut(rows)
        pulled += rows.length
      }
    }
    this.primed = true
    return { written: pulled, deleted: 0, skipped: 0, issues: [] }
  }

  /** Pull remote changes into Dexie — Dexie remains the app's read layer. */
  private applyRemote(table: SyncTable, snap: QuerySnapshot): void {
    if (this.applyingRemote) return
    this.applyingRemote = true
    void (async () => {
      try {
        const remoteIds = new Set<string>()
        const rows: Record<string, unknown>[] = []
        snap.forEach((d) => {
          remoteIds.add(d.id)
          rows.push({ ...(fromFirestore(d.data()) as Record<string, unknown>), id: d.id })
        })

        const previous = this.known.get(table) ?? new Set<string>()
        if (rows.length) await tableOf(table).bulkPut(rows)

        // Only propagate genuine server-side deletions, and only for ids we have
        // previously synced — never on a cold snapshot, never from cache.
        if (this.primed && !snap.metadata.fromCache) {
          const gone = [...previous].filter((id) => !remoteIds.has(id))
          if (gone.length) await tableOf(table).bulkDelete(gone)
        }

        this.known.set(table, remoteIds)
      } catch (error) {
        console.warn('[spendstate] cloud apply failed', table, error)
      } finally {
        this.applyingRemote = false
      }
    })()
  }

  start(): void {
    if (this.started) return
    this.started = true
    for (const table of SYNC_TABLES) {
      this.unsubs.push(
        onSnapshot(
          this.col(table),
          (snap) => this.applyRemote(table, snap),
          (error) => console.warn('[spendstate] cloud listen failed', table, error),
        ),
      )
    }
    // Safety net: a periodic + focus-triggered sweep covers any write that did
    // not originate from the repository facade.
    this.timer = setInterval(() => {
      void this.push().catch((error) => console.warn('[spendstate] cloud sweep failed', error))
    }, 20_000)
    window.addEventListener('focus', this.onFocus)
  }

  private onFocus = () => {
    void this.push().catch(() => undefined)
  }

  stop(): void {
    this.unsubs.splice(0).forEach((unsub) => unsub())
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.started = false
    window.removeEventListener('focus', this.onFocus)
  }
}

export interface CloudHandle {
  readonly user: CloudUser | null
  signInGoogle(): Promise<void>
  signUpEmail(email: string, password: string): Promise<void>
  signInEmail(email: string, password: string): Promise<void>
  signOutUser(): Promise<void>
  onAuth(cb: (user: CloudUser | null) => void): () => void
  /** Begin mirroring. Only called once the sync direction has been decided. */
  start(): void
  stop(): void
  /** True when this account already holds data from another device. */
  hasRemoteData(): Promise<boolean>
  /** Replace the local volume with the cloud copy. */
  restore(): Promise<SyncReport>
  /** Push local changes up (the migration when run against an empty cloud). */
  syncNow(onProgress?: (done: number, total: number) => void): Promise<SyncReport>
}

const EMPTY_REPORT: SyncReport = { written: 0, deleted: 0, skipped: 0, issues: [] }

function toCloudUser(user: User | null): CloudUser | null {
  if (!user) return null
  return { uid: user.uid, email: user.email, displayName: user.displayName }
}

/** Boots the SDK and returns a handle. Called once, lazily, on opt-in. */
export function createCloudHandle(config: FirebaseConfig): CloudHandle {
  const app: FirebaseApp = initializeApp(config)
  const db: Firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  const auth: Auth = getAuth(app)
  const provider = new GoogleAuthProvider()

  let sync: CloudSync | null = null

  /**
   * Create the engine for the current user *without* starting it. Listeners stay
   * off until the sync direction is known, so a fresh device never pulls cloud
   * data into its demo volume (or pushes demo data into a real ledger) before
   * the user has chosen.
   */
  const ensureSync = (): CloudSync | null => {
    const uid = auth.currentUser?.uid
    if (!uid) return null
    if (!sync) sync = new CloudSync(db, uid)
    return sync
  }

  return {
    get user() {
      return toCloudUser(auth.currentUser)
    },
    signInGoogle: () => signInWithPopup(auth, provider).then(() => undefined),
    signUpEmail: (email, password) =>
      createUserWithEmailAndPassword(auth, email, password).then(() => undefined),
    signInEmail: (email, password) =>
      signInWithEmailAndPassword(auth, email, password).then(() => undefined),
    signOutUser: async () => {
      sync?.stop()
      sync = null
      await firebaseSignOut(auth)
    },
    onAuth: (cb) => onAuthStateChanged(auth, (user) => cb(toCloudUser(user))),
    start: () => ensureSync()?.start(),
    stop: () => {
      sync?.stop()
      sync = null
    },
    hasRemoteData: () => {
      const active = ensureSync()
      return active ? active.hasRemoteData() : Promise.resolve(false)
    },
    restore: () => {
      const active = ensureSync()
      return active ? active.restore() : Promise.resolve(EMPTY_REPORT)
    },
    syncNow: (onProgress) => {
      const active = ensureSync()
      return active ? active.push(onProgress) : Promise.resolve(EMPTY_REPORT)
    },
  }
}
