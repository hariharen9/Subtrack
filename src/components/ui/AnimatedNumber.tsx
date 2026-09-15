/**
 * SUBTRACK // ANIMATED NUMBER
 *
 * Numbers in a financial console should feel like they are being metered, not
 * printed. The value springs toward its target and renders through a MotionValue
 * so a 60fps count-up never triggers a React re-render.
 */
import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { cx } from '@/lib/cx'

export interface AnimatedNumberProps {
  value: number
  /** Formats every intermediate frame, so the string shape stays stable. */
  format: (value: number) => string
  className?: string
  /** Spring tuning: snappier for small readouts, softer for the hero. */
  stiffness?: number
  damping?: number
}

export function AnimatedNumber({
  value,
  format,
  className,
  stiffness = 170,
  damping = 24,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion()
  const source = useMotionValue(value)
  const spring = useSpring(source, { stiffness, damping, mass: 0.7 })

  const formatRef = useRef(format)
  formatRef.current = format
  const text = useTransform(spring, (latest) => formatRef.current(latest))

  useEffect(() => {
    if (reduced) {
      spring.jump(value)
      return
    }
    source.set(value)
  }, [value, source, spring, reduced])

  useEffect(() => {
    // First paint should show the real number, not an animated path from zero.
    spring.jump(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.span className={cx('tnum', className)} aria-label={format(value)}>
      {reduced ? format(value) : text}
    </motion.span>
  )
}
