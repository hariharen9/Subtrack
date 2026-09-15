/**
 * SUBTRACK // SYSTEM HEADER
 *
 * The persistent instrument bar. On desktop it prints the whole system state in
 * one line — page, status, last update, link — with the query field and the
 * primary action on the right. On mobile it keeps the same vocabulary in two
 * compact rows instead of shrinking the desktop bar into illegibility.
 */
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useClock, useOnline } from '@/hooks/usePlatform'
import { formatClock } from '@/lib/date'
import { navItemFor } from '@/app/nav'
import { useUI } from '@/store/ui'
import { CyberButton, IconButton } from '@/components/ui/CyberButton'
import { IconMoon, IconPlus, IconSearch, IconSun } from '@/components/ui/Icons'
import { KeyCap } from '@/components/ui/Micro'
import { Led } from '@/components/ui/Signal'
import { Wordmark } from '@/components/brand/Wordmark'
import { cx } from '@/lib/cx'
import type { SystemSummary } from '@/lib/analytics'

function statusOf(summary: SystemSummary): {
  label: string
  signal: 'acid' | 'orange' | 'blue'
} {
  if (summary.overdue.length) return { label: 'ATTENTION', signal: 'orange' }
  if (summary.activeCount === 0) return { label: 'IDLE', signal: 'blue' }
  return { label: 'OPERATIONAL', signal: 'acid' }
}

export function SystemHeader({ summary }: { summary: SystemSummary }) {
  const { pathname } = useLocation()
  const now = useClock(1000)
  const online = useOnline()
  const item = navItemFor(pathname)
  const theme = useUI((s) => s.theme)
  const toggleTheme = useUI((s) => s.toggleTheme)
  const setPaletteOpen = useUI((s) => s.setPaletteOpen)
  const openComposer = useUI((s) => s.openComposer)
  const status = statusOf(summary)

  const meta = (
    <>
      <span className="micro whitespace-nowrap text-faint">
        SYSTEM // <span className="text-fg">{item.code}</span>
        <span className="text-linehard"> · </span>
        <span className="hidden text-dim sm:inline">{item.label.toUpperCase()}</span>
      </span>
      <span
        className={cx(
          'micro flex items-center gap-1.5 whitespace-nowrap',
          status.signal === 'acid'
            ? 'text-acidink'
            : status.signal === 'orange'
              ? 'text-orangeink'
              : 'text-blueink',
        )}
      >
        <Led signal={status.signal} size="sm" pulse={status.signal !== 'blue'} />
        STATUS // {status.label}
      </span>
      <span className="micro whitespace-nowrap text-faint">
        UPDATED // <span className="tnum text-dim">{formatClock(now)}</span>
      </span>
      <span className="micro hidden whitespace-nowrap text-faint xl:inline">
        LINK // <span className={online ? 'text-dim' : 'text-orangeink'}>{online ? 'ONLINE' : 'OFFLINE'}</span>
      </span>
      <span className="micro hidden whitespace-nowrap text-faint 2xl:inline">
        VOLUME // <span className="text-dim">LOCAL · INDEXEDDB</span>
      </span>
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b-2 border-linehard bg-bg/90 backdrop-blur-[3px]">
      <div className="safe-t" />
      <div className="flex items-center gap-3 px-3 py-2 md:px-5">
        <Link to="/" className="shrink-0 lg:hidden" aria-label="SUBTRACK overview">
          <Wordmark compact />
        </Link>

        <div className="hidden min-w-0 flex-1 items-center gap-4 lg:flex">{meta}</div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="group hidden h-11 w-[240px] items-center gap-2 border border-line2 bg-bg2 px-3 text-left transition-colors hover:border-linehard xl:flex 2xl:w-[320px]"
            aria-label="Open command palette"
          >
            <IconSearch size={14} className="shrink-0 text-faint" />
            <span className="micro flex-1 truncate text-faint group-hover:text-dim">
              QUERY ACTIVE PROCESSES...
            </span>
            <KeyCap>⌘K</KeyCap>
          </button>

          <IconButton
            label="Open command palette"
            className="xl:hidden"
            onClick={() => setPaletteOpen(true)}
          >
            <IconSearch size={16} />
          </IconButton>

          <IconButton
            label={theme === 'dark' ? 'Switch to daylight mode' : 'Switch to night mode'}
            onClick={toggleTheme}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.16, ease: [0.2, 0.9, 0.1, 1] }}
                className="grid place-items-center"
              >
                {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
              </motion.span>
            </AnimatePresence>
          </IconButton>

          <CyberButton
            variant="solid"
            size="md"
            className="hidden md:inline-flex"
            leading={<IconPlus size={14} />}
            onClick={() => openComposer()}
            kbd="N"
          >
            <span className="hidden xl:inline">INITIALIZE SUBSCRIPTION</span>
            <span className="xl:hidden">INITIALIZE</span>
          </CyberButton>
        </div>
      </div>

      <div className="no-scrollbar flex items-center gap-3 overflow-x-auto border-t border-line px-3 py-1 lg:hidden">
        {meta}
      </div>
    </header>
  )
}
