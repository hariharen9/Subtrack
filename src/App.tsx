/**
 * SPENDSTATE // FINANCIAL OPERATING SYSTEM APP
 *
 * Router, skin synchronisation and boot sequencing for the Financial OS Shell.
 * All domain and module pages are loaded directly for zero-latency 0ms navigation,
 * full offline reliability on mobile PWAs, and zero route-transition blanking.
 */
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { CyberShell } from '@/components/shell/CyberShell'
import MasterCommand from '@/pages/MasterCommand'
import Overview from '@/pages/Overview'
import Flow from '@/pages/Flow'
import ProcessDetail from '@/pages/ProcessDetail'
import PaymentMatrix from '@/pages/PaymentMatrix'
import Insights from '@/pages/Insights'
import Settings from '@/pages/Settings'
import CardsOverview from '@/pages/CardsOverview'
import CardsFlow from '@/pages/CardsFlow'
import CardDetail from '@/pages/CardDetail'
import CardsInsights from '@/pages/CardsInsights'
import Spends from '@/pages/Spends'
import SpendFlow from '@/pages/SpendFlow'
import SpendInsights from '@/pages/SpendInsights'
import SpendDetail from '@/pages/SpendDetail'
import SpendPatterns from '@/pages/SpendPatterns'
import DebtOverview from '@/pages/DebtOverview'
import DebtFlow from '@/pages/DebtFlow'
import LoanDetail from '@/pages/LoanDetail'
import DebtInsights from '@/pages/DebtInsights'
import NotFound from '@/pages/NotFound'
import { ensureSeeded, ensureSpendsSeeded } from '@/lib/repository'
import { ensureDebtSeeded } from '@/lib/debt-seed'
import { ensureCardsSeeded } from '@/lib/card-seed'
import { ensureIncomeSeeded } from '@/lib/income-seed'
import { ensureAccountsSeeded } from '@/lib/account-seed'
import { useUI } from '@/store/ui'
import { useCloud } from '@/store/cloud'
import { SmoothScroll } from '@/components/shell/SmoothScroll'
import { ErrorBoundary } from '@/components/shell/ErrorBoundary'

/**
 * Applies the active skin to <html>, mirrors it where the pre-paint boot script
 * looks for it, and keeps the browser chrome colour in step. The offset block
 * behind every panel is pure CSS, so this is the only theming JavaScript.
 */
function ThemeSync() {
  const theme = useUI((s) => s.theme)
  const uiMode = useUI((s) => s.uiMode)
  const zenAccent = useUI((s) => s.zenAccent)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.ui = uiMode
    root.dataset.zenAccent = zenAccent
    delete root.dataset.boot
    try {
      localStorage.setItem('spendstate.theme', theme)
      localStorage.setItem('spendstate.uiMode', uiMode)
      localStorage.setItem('spendstate.zenAccent', zenAccent)
    } catch {
      /* private mode — the skin still applies for this session */
    }
    document.querySelectorAll('meta[name="theme-color"]').forEach((node) => {
      node.removeAttribute('media')
      const darkColor = uiMode === 'minimal' ? '#131315' : '#050505'
      const lightColor = uiMode === 'minimal' ? '#FAF9F5' : '#F2F1EC'
      node.setAttribute('content', theme === 'dark' ? darkColor : lightColor)
    })
  }, [theme, uiMode, zenAccent])

  return null
}

/**
 * Legacy alias redirect that keeps the query string, so a deep link such as
 * `/flow?action=init` still reaches its canonical route with the flag intact.
 */
function LegacyRedirect({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={`${to}${search}`} replace />
}

/** Opens the local volume, seeds the demo dataset on first run, then idles. */
function BootSequence() {
  const setBooted = useUI((s) => s.setBooted)
  const pushToast = useUI((s) => s.pushToast)

  useEffect(() => {
    let cancelled = false
    // Re-attach the optional cloud mirror if the user previously opted in.
    useCloud.getState().init()
    Promise.all([ensureSeeded(), ensureSpendsSeeded(), ensureDebtSeeded(), ensureCardsSeeded(), ensureIncomeSeeded(), ensureAccountsSeeded()])
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
        <ErrorBoundary>
          <Routes>
          <Route element={<CyberShell />}>
            {/* [01] Master Command — the OS cockpit */}
            <Route index element={<MasterCommand />} />

            {/* [02] Subscriptions subsystem (SpendState engine) */}
            <Route path="subs" element={<Overview />} />
            <Route path="subs/flow" element={<Flow />} />
            <Route path="subs/flow/:id" element={<ProcessDetail />} />
            <Route path="subs/time" element={<PaymentMatrix />} />
            <Route path="subs/data" element={<Insights />} />

            {/* Legacy subscription aliases. flow/:id renders directly so the id
                is preserved; parameterless routes redirect to canonical /subs/* */}
            <Route path="flow" element={<LegacyRedirect to="/subs/flow" />} />
            <Route path="flow/:id" element={<ProcessDetail />} />
            <Route path="time" element={<LegacyRedirect to="/subs/time" />} />
            <Route path="data" element={<LegacyRedirect to="/subs/data" />} />

            {/* [03] Credit Cards engine */}
            <Route path="cards" element={<CardsOverview />} />
            <Route path="cards/flow" element={<CardsFlow />} />
            <Route path="cards/flow/:id" element={<CardDetail />} />
            <Route path="cards/data" element={<CardsInsights />} />

            {/* [04] Loans & EMIs engine */}
            <Route path="loans" element={<DebtOverview />} />
            <Route path="loans/flow" element={<DebtFlow />} />
            <Route path="loans/flow/:id" element={<LoanDetail />} />
            <Route path="loans/data" element={<DebtInsights />} />

            {/* [05] Daily Spends engine */}
            <Route path="spends" element={<Spends />} />
            <Route path="spends/flow" element={<SpendFlow />} />
            <Route path="spends/flow/:id" element={<SpendDetail />} />
            <Route path="spends/data" element={<SpendInsights />} />
            <Route path="spends/patterns" element={<SpendPatterns />} />

            {/* [06] System Host */}
            <Route path="sys" element={<Settings />} />

            {/* 404 catch-all */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        </ErrorBoundary>
      </MotionConfig>
    </BrowserRouter>
  )
}