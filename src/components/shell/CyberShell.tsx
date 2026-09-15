/**
 * SUBTRACK // CYBER SHELL
 *
 * The frame everything runs inside: navigation rack, instrument header, content
 * well, mobile console and the persistent overlays (log, palette, authoring
 * console, update notice). Pages only ever render their own content well.
 */
import { Suspense, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { usePayments, useSystem } from '@/hooks/useSystem'
import { useHotkeys } from '@/hooks/usePlatform'
import { useUI } from '@/store/ui'
import { NAV_ITEMS } from '@/app/nav'
import { cx } from '@/lib/cx'
import { FieldOverlay } from './FieldOverlay'
import { SystemHeader } from './SystemHeader'
import { NavigationRail } from './NavigationRail'
import { MobileNav } from './MobileNav'
import { SystemFooter } from './SystemFooter'
import { SystemToaster } from './SystemToaster'
import { CommandPalette } from './CommandPalette'
import { UpdatePrompt } from './UpdatePrompt'
import { SubscriptionComposer } from '@/components/subs/SubscriptionComposer'
import { TerminationConsole } from '@/components/subs/TerminationConsole'
import { BootScreen } from '@/components/ui/Skeleton'

/**
 * Route transition: a 200ms lift plus a one-shot chromatic sweep. The sweep is
 * the only glitch in the product, and it lasts exactly one route change.
 */
function RouteStage() {
  const location = useLocation()
  const reduced = useReducedMotion()
  // const calm = useUI((s) => s.calmMode)

  useEffect(() => {
    if (location.hash) return
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname, location.hash])

  return (
    <>
      {/* Lemon/acid chromatic sweep overlay on route change (commented out per user request):
      {!reduced && !calm && (
        <span
          key={location.pathname}
          aria-hidden="true"
          className="glitch-sweep pointer-events-none fixed inset-0 z-[45] bg-acid/10 mix-blend-screen"
        />
      )}
      */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: reduced ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -6 }}
          transition={{ duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Suspense fallback={<BootScreen label="LOADING MODULE" />}>
            <Outlet />
          </Suspense>
        </motion.div>
      </AnimatePresence>
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
    ...NAV_ITEMS.map((item) => ({
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

        <main id="main" className="relative z-10 pb-[104px] lg:pb-0">
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
