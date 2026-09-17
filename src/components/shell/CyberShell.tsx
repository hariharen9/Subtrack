/**
 * SUBTRACK // CYBER SHELL
 *
 * The frame everything runs inside: navigation rack, instrument header, the
 * in-domain chrome strip, content well, mobile console and the persistent
 * overlays (log, palette, authoring console, update notice). Pages only ever
 * render their own content well.
 */
import { Suspense, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
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
import { TerminationConsole } from '@/components/subs/TerminationConsole'
import { BootScreen } from '@/components/ui/Skeleton'

/**
 * Route transition: lifts the content well while the domain chrome stays put.
 * The one-shot chromatic sweep is reserved for real route changes; the content
 * well is the only thing that moves.
 */
function RouteStage() {
  const location = useLocation()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (location.hash) return
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }, [location.pathname, location.hash, reduced])

  return (
    <>
      <DomainFrame />
      <div className="mt-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -4 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<BootScreen label="LOADING MODULE" />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </AnimatePresence>
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
  const toggleTheme = useUI((s) => s.toggleTheme)

  useHotkeys([
    { key: 'k', mod: true, handler: (event) => { event.preventDefault(); togglePalette() } },
    { key: '/', handler: (event) => { event.preventDefault(); setPaletteOpen(true) } },
    { key: 'n', handler: () => openComposer() },
    { key: 't', handler: () => toggleTheme() },
    ...DOMAINS.map((item) => ({
      key: item.key,
      handler: () => navigate(item.path),
    })),
  ])

  return (
    <div className={cx('relative min-h-dvh', !field && 'field-off')}>
      <a
        href="#main"
        className="micro sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:border focus:border-acid focus:bg-surface focus:px-3 focus:py-2 focus:text-fg"
      >
        SKIP TO CONTENT
      </a>

      {field && <FieldOverlay />}

      <NavigationRail activePath={pathname} processCount={summary.active.length} />

      <div className="lg:pl-[88px]">
        <SystemHeader summary={summary} />

        <main id="main" className="relative z-10 pb-[112px] lg:pb-0">
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
        chargesThisMonth={summary.incoming30.length}
      />

      <SystemToaster />
      <CommandPalette />
      <SubscriptionComposer />
      <TerminationConsole />
      <UpdatePrompt />
    </div>
  )
}