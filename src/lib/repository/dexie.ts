/**
 * SPENDSTATE // DEXIE REPOSITORY
 *
 * The default implementation of the repository contract: the local IndexedDB
 * volume. Every operation is a direct delegate to `src/lib/db.ts`, so behaviour
 * is byte-for-byte identical to the pre-cloud app.
 */
import * as dexie from '../db'
import type { Repository } from './types'

export const dexieRepository: Repository = {
  kind: 'dexie',
  ...dexie,
}
