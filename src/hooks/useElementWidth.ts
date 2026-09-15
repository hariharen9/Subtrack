/** Measures an element's width so charts can render at exact pixel size. */
import { useEffect, useRef, useState } from 'react'

export function useElementWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setWidth(Math.round(entry.contentRect.width))
    })
    observer.observe(node)
    setWidth(node.getBoundingClientRect().width || fallback)
    return () => observer.disconnect()
  }, [fallback])

  return { ref, width }
}
