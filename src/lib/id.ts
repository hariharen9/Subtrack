/**
 * SUBTRACK // IDENTIFIERS
 *
 * Records get real UUIDs, but the UI speaks in short deterministic process IDs
 * and hex traces: the same record always renders the same stamp, so screenshots
 * stay consistent and support can ask for "SUB-41207" and get one answer.
 */

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** FNV-1a, 32-bit. Stable across sessions and devices. */
export function hash32(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** 'SUB-41207' — the process stamp shown on every module and detail panel. */
export function pidOf(id: string): string {
  const n = hash32(id) % 100000
  return `SUB-${n.toString().padStart(5, '0')}`
}

/** '0x7F3A' — decorative trace stamp for rails and footer strips. */
export function traceOf(seed: string): string {
  return `0x${(hash32(seed) % 0xffff).toString(16).toUpperCase().padStart(4, '0')}`
}

/** 'A7' — two-character slot code used by the payment stream. */
export function slotOf(seed: string): string {
  const n = hash32(seed) % 256
  return n.toString(16).toUpperCase().padStart(2, '0')
}

/** 'TXN-20260919-41207' — a transaction reference for a recorded charge. */
export function txnRef(date: string, id: string): string {
  const compact = date.replace(/-/g, '')
  return `TXN-${compact}-${(hash32(id) % 100000).toString().padStart(5, '0')}`
}
