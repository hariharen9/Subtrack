/**
 * SUBTRACK // SMALL HOOKS
 * Clock ticks, media queries and a declarative hotkey binder. Kept deliberately
 * tiny: the console should never be busy rendering chrome.
 */
import { useEffect, useRef, useState } from 'react'

/** Live clock, aligned to the second so the header never flickers mid-tick. */
export function useClock(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timeout: number
    const schedule = () => {
      const delay = intervalMs - (Date.now() % intervalMs)
      timeout = window.setTimeout(() => {
        setNow(new Date())
        schedule()
      }, delay)
    }
    schedule()
    return () => window.clearTimeout(timeout)
  }, [intervalMs])
  return now
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )
  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}

export function useIsCompact(): boolean {
  return useMediaQuery('(max-width: 767px)')
}

/** Honest connectivity report for the status stack — the app works offline. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

export interface HotkeySpec {
  /** Lowercase key, e.g. 'k', '1', 'escape', 'ArrowDown'. */
  key: string
  mod?: boolean
  shift?: boolean
  alt?: boolean
  handler: (event: KeyboardEvent) => void
  /** Allow firing while a text field has focus (needed for Escape). */
  allowInInput?: boolean
  enabled?: boolean
}

function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox'
  )
}

export function useHotkeys(specs: HotkeySpec[]): void {
  const ref = useRef(specs)
  ref.current = specs

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      for (const spec of ref.current) {
        if (spec.enabled === false) continue
        if (spec.key.toLowerCase() !== event.key.toLowerCase()) continue
        if (Boolean(spec.mod) !== mod) continue
        if (Boolean(spec.shift) !== event.shiftKey) continue
        if (Boolean(spec.alt) !== event.altKey) continue
        if (!spec.allowInInput && isTextTarget(event.target)) continue
        spec.handler(event)
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

/** Focus trap primitive for dialogs and sheets (Tab cycles inside). */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return
    const previous = document.activeElement as HTMLElement | null

    const focusables = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement)

    const first = focusables()[0]
    ;(first ?? node).focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = focusables()
      if (!items.length) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    node.addEventListener('keydown', onKeyDown)
    return () => {
      node.removeEventListener('keydown', onKeyDown)
      previous?.focus?.({ preventScroll: true })
    }
  }, [active])

  return ref
}

/** Locks background scroll while a sheet or dialog owns the screen. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [active])
}
