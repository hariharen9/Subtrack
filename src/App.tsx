/**
 * SUBTRACK // APP
 *
 * Router, skin synchronisation and boot sequencing. The calendar, analytics and
 * settings modules are code-split, then prefetched while the console is idle so
 * navigation still feels instant.
 */
import { lazy, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { CyberShell } from '@/components/shell/CyberShell'
import Overview from '@/pages/Overview'
import Flow from '@/pages/Flow'
import ProcessDetail from '@/pages/ProcessDetail'
import NotFound from '@/pages/NotFound'
import { ensureSeeded } from '@/lib/db'
import { useUI } from '@/store/ui'

const PaymentMatrix = lazy(() => import('@/pages/PaymentMatrix'))
const Insights = lazy(() => import('@/pages/Insights'))
const Settings = lazy(() => import('@/pages/Settings'))

/**
 * Applies the active skin to <html>, mirrors it where the pre-paint boot script
 * looks for it, and keeps the browser chrome colour in step. The offset block
 * behind every panel is pure CSS, so this is the only theming JavaScript.
 */
function ThemeSync() {
  const theme = useUI((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    delete root.dataset.boot
    try {
      localStorage.setItem('subtrack.theme', theme)
    } catch {
      /* private mode — the skin still applies for this session */
    }
    document.querySelectorAll('meta[name="theme-color"]').forEach((node) => {
      node.removeAttribute('media')
      node.setAttribute('content', theme === 'dark' ? '#050505' : '#F2F1EC')
    })
  }, [theme])

  return null
}

/** Opens the local volume, seeds the demo dataset on first run, then idles. */
function BootSequence() {
  const setBooted = useUI((s) => s.setBooted)
  const pushToast = useUI((s) => s.pushToast)

  useEffect(() => {
    let cancelled = false
    ensureSeeded()
      .catch((error: unknown) => {
        pushToast({
          kind: 'alert',
          sticky: true,
          label: 'LOCAL VOLUME UNAVAILABLE',
          text:
            error instanceof Error
              ? error.message
              : 'IndexedDB could not be opened — private browsing blocks it.',
        })
      })
      .finally(() => {
        if (!cancelled) setBooted(true)
      })
    return () => {
      cancelled = true
    }
  }, [setBooted, pushToast])

  useEffect(() => {
    // Prefetch the split routes once the shell is interactive.
    const schedule = (callback: () => void): number =>
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(callback, { timeout: 2500 })
        : window.setTimeout(callback, 1200)
    const cancel = (handle: number): void => {
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
    }
    const handle = schedule(() => {
      void import('@/pages/PaymentMatrix')
      void import('@/pages/Insights')
      void import('@/pages/Settings')
    })
    return () => cancel(handle)
  }, [])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <ThemeSync />
        <BootSequence />
        <Routes>
          <Route element={<CyberShell />}>
            <Route index element={<Overview />} />
            <Route path="flow" element={<Flow />} />
            <Route path="flow/:id" element={<ProcessDetail />} />
            <Route path="time" element={<PaymentMatrix />} />
            <Route path="data" element={<Insights />} />
            <Route path="sys" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </MotionConfig>
    </BrowserRouter>
  )
}
