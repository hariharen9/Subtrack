/**
 * SUBTRACK // CYBER SHELL
 *
 * The frame everything runs inside: navigation rack, instrument header, the
 * in-domain chrome strip, content well, mobile console and the persistent
 * overlays (log, palette, authoring console, update notice). Pages only ever
 * render their own content well.
 */
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { usePayments, useSystem } from '@/hooks/useSystem'
import { useHotkeys } from '@/hooks/usePlatform'
import { useUI } from '@/store/ui'
import { DOMAINS } from '@/app/nav'
import { cx } from '@/lib/cx'
import { FieldOverlay } from './FieldOverlay'
import { SystemHeader } from './SystemHeader'
import { NavigationRail } from './NavigationRail'
import { DomainFrame } from './DomainFrame'
import { MobileNav } from './MobileNav'
import { SystemFooter } from './SystemFooter'
import { SystemToaster } from './SystemToaster'
import { CommandPalette } from './CommandPalette'
import { UpdatePrompt } from './UpdatePrompt'
import { SubscriptionComposer } from '@/components/subs/SubscriptionComposer'
import { SpendComposer } from '@/components/spends/SpendComposer'
import { CardComposer } from '@/components/cards/CardComposer'
import { LoanComposer } from '@/components/debt/LoanComposer'
import { TerminationConsole } from '@/components/subs/TerminationConsole'
import { BootScreen } from '@/components/ui/Skeleton'

function RouteStage() {
  const location = useLocation()
  const reduced = useReducedMotion()

  return (
    <>
      <DomainFrame />
      <div className="mt-1">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: reduced ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </div>
    </>
  )
}

export function CyberShell() {
  const { summary } = useSystem()
  const payments = usePayments()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const booted = useUI((s) => s.booted)
  const base = useUI((s) => s.baseCurrency)
  const field = useUI((s) => s.field)
  const togglePalette = useUI((s) => s.togglePalette)
  const setPaletteOpen = useUI((s) => s.setPaletteOpen)
  const openComposer = useUI((s) => s.openComposer)
  const openSpendComposer = useUI((s) => s.openSpendComposer)
  const openLoanComposer = useUI((s) => s.openLoanComposer)
  const openCardComposer = useUI((s) => s.openCardComposer)
  const toggleTheme = useUI((s) => s.toggleTheme)
  const uiMode = useUI((s) => s.uiMode)
  const toggleUiMode = useUI((s) => s.toggleUiMode)

  useHotkeys([
    { key: 'k', mod: true, handler: (event) => { event.preventDefault(); togglePalette() } },
    { key: '/', handler: (event) => { event.preventDefault(); setPaletteOpen(true) } },
    { key: 'n', handler: () => openComposer() },
    { key: 'x', handler: () => openSpendComposer() },
    { key: 'l', handler: () => openLoanComposer() },
    { key: 'c', handler: () => openCardComposer({ mode: 'txn' }) },
    { key: 't', handler: () => toggleTheme() },
    { key: 'm', handler: () => toggleUiMode() },
    ...DOMAINS.map((item) => ({
      key: item.key,
      handler: () => navigate(item.path),
    })),
  ])

  return (
    <div className={cx('relative min-h-dvh', (!field || uiMode === 'minimal') && 'field-off')}>
      <a
        href="#main"
        className="micro sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:border focus:border-acid focus:bg-surface focus:px-3 focus:py-2 focus:text-fg"
      >
        SKIP TO CONTENT
      </a>

      {field && uiMode !== 'minimal' && <FieldOverlay />}

      <NavigationRail activePath={pathname} processCount={summary.active.length} />

      <div className="flex min-h-dvh flex-col lg:pl-[88px]">
        <SystemHeader summary={summary} />

        <main id="main" className="relative z-10 flex-1 pb-[112px] lg:pb-0">
          {booted ? (
            <RouteStage />
          ) : (
            <div className="px-3 md:px-5">
              <BootScreen />
            </div>
          )}
          <div className="px-0">
            <SystemFooter summary={summary} payments={payments.length} base={base} />
          </div>
        </main>
      </div>

      <MobileNav
        activePath={pathname}
        views={summary.views}
        processCount={summary.active.length}
      />

      <SystemToaster />
      <CommandPalette />
      <SubscriptionComposer />
      <SpendComposer />
      <CardComposer />
      <LoanComposer />
      <TerminationConsole />
      <UpdatePrompt />
    </div>
  )
}