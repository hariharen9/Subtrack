/**
 * SUBTRACK // LENIS SMOOTH SCROLL
 *
 * Global smooth scroll controller powered by Lenis. Respects prefers-reduced-motion,
 * auto-resets on route transitions, and cooperates seamlessly with nested
 * data-lenis-prevent scroll containers.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import Lenis from 'lenis'

export function SmoothScroll() {
  const { pathname } = useLocation()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return

    const lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.8,
    })

    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    ;(window as unknown as { lenis?: Lenis }).lenis = lenis

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      delete (window as unknown as { lenis?: Lenis }).lenis
    }
  }, [reduced])

  useEffect(() => {
    const lenis = (window as unknown as { lenis?: Lenis }).lenis
    if (lenis) {
      lenis.scrollTo(0, { immediate: true })
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname])

  return null
}
