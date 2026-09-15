/** Tiny class joiner. No dependency needed for `a b c`. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  let out = ''
  for (const part of parts) {
    if (!part) continue
    out = out ? `${out} ${part}` : part
  }
  return out
}
