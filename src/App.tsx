/**
 * SUBTRACK // FINANCIAL OPERATING SYSTEM APP
 *
 * Router, skin synchronisation and boot sequencing for the Financial OS Shell.
 * All domain and module pages are loaded directly for zero-latency 0ms navigation,
 * full offline reliability on mobile PWAs, and zero route-transition blanking.
 */
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { CyberShell } from '@/components/shell/CyberShell'
import MasterCommand from '@/pages/MasterCommand'
import Overview from '@/pages/Overview'
import Flow from '@/pages/Flow'
import ProcessDetail from '@/pages/ProcessDetail'
import PaymentMatrix from '@/pages/PaymentMatrix'
import Insights from '@/pages/Insights'
import Settings from '@/pages/Settings'
import CardsDeck from '@/pages/standby/CardsDeck'
import LoansDeck from '@/pages/standby/LoansDeck'
import SpendsDeck from '@/pages/standby/SpendsDeck'
import NotFound from '@/pages/NotFound'
import { ensureSeeded } from '@/lib/db'
import { useUI } from '@/store/ui'
import { SmoothScroll } from '@/components/shell/SmoothScroll'

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

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <SmoothScroll />
      <MotionConfig reducedMotion="user">
        <ThemeSync />
        <BootSequence />
        <Routes>
          <Route element={<CyberShell />}>
            {/* [01] Master Command — the OS cockpit */}
            <Route index element={<MasterCommand />} />

            {/* [02] Subscriptions subsystem (Subtrack engine) */}
            <Route path="subs" element={<Overview />} />
            <Route path="subs/flow" element={<Flow />} />
            <Route path="subs/flow/:id" element={<ProcessDetail />} />
            <Route path="subs/time" element={<PaymentMatrix />} />
            <Route path="subs/data" element={<Insights />} />

            {/* Legacy subscription aliases. flow/:id renders directly so the id
                is preserved; parameterless routes redirect to canonical /subs/* */}
            <Route path="flow" element={<Navigate to="/subs/flow" replace />} />
            <Route path="flow/:id" element={<ProcessDetail />} />
            <Route path="time" element={<Navigate to="/subs/time" replace />} />
            <Route path="data" element={<Navigate to="/subs/data" replace />} />

            {/* [03][04][05] Standby engines */}
            <Route path="cards" element={<CardsDeck />} />
            <Route path="loans" element={<LoansDeck />} />
            <Route path="spends" element={<SpendsDeck />} />

            {/* [06] System Host */}
            <Route path="sys" element={<Settings />} />

            {/* 404 catch-all */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </MotionConfig>
    </BrowserRouter>
  )
}