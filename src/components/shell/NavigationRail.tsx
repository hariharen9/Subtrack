/**
 * SUBTRACK // NAVIGATION RAIL
 *
 * Desktop only. A compact vertical rack of five systems: tiny monospace code,
 * icon, keyboard shortcut, and an active plate that slides between cells with
 * spring physics. The foot of the rack reports subsystem health.
 */
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { NAV_ITEMS } from '@/app/nav'
import { cx } from '@/lib/cx'
import { useOnline } from '@/hooks/usePlatform'
import { useUI } from '@/store/ui'
import { Led } from '@/components/ui/Signal'
import { IconMoon, IconSun } from '@/components/ui/Icons'
import { Mark } from '@/components/brand/Wordmark'
import { AnimatePresence } from 'motion/react'

export function NavigationRail({
  activePath,
  processCount,
}: {
  activePath: string
  processCount: number
}) {
  const online = useOnline()
  const theme = useUI((s) => s.theme)
  const toggleTheme = useUI((s) => s.toggleTheme)

  const isActive = (path: string) =>
    path === '/' ? activePath === '/' : activePath.startsWith(path)

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-40 hidden w-[88px] flex-col border-r-2 border-linehard bg-bg2 lg:flex"
    >
      <Link
        to="/"
        className="flex h-[68px] items-center justify-center border-b border-line transition-colors hover:bg-surface2"
        aria-label="SUBTRACK overview"
      >
        <Mark animated />
      </Link>

      <ul className="flex flex-1 flex-col gap-1 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path)
          const Icon = item.icon
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                aria-current={active ? 'page' : undefined}
                title={`${item.label} — ${item.blurb} (${item.key})`}
                className="group relative flex h-[62px] flex-col items-center justify-center gap-1.5"
              >
                {active && (
                  <motion.span
                    layoutId="rail-plate"
                    className="absolute inset-0 bg-acid"
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                  />
                )}
                <span
                  aria-hidden="true"
                  className={cx(
                    'absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 transition-colors',
                    active ? 'bg-fg' : 'bg-transparent group-hover:bg-line2',
                  )}
                />
                <span
                  className={cx(
                    'relative z-10 grid place-items-center transition-colors',
                    active ? 'text-black' : 'text-dim group-hover:text-fg',
                  )}
                >
                  <Icon size={20} />
                </span>
                <span
                  className={cx(
                    'micro relative z-10 transition-colors',
                    active ? 'text-black' : 'text-faint group-hover:text-dim',
                  )}
                >
                  {item.code}
                </span>
                <span
                  className={cx(
                    'micro absolute right-1.5 top-1 z-10 text-[8px] transition-colors',
                    active ? 'text-black/50' : 'text-faint/70',
                  )}
                >
                  {item.key}
                </span>
                <span className="sr-only">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="space-y-2 border-t border-line p-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-11 w-full items-center justify-center border border-line2 text-dim transition-colors hover:border-linehard hover:text-fg"
          aria-label={theme === 'dark' ? 'Switch to daylight mode' : 'Switch to night mode'}
          title={theme === 'dark' ? 'DAYLIGHT MODE' : 'NIGHT MODE'}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid place-items-center"
            >
              {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
            </motion.span>
          </AnimatePresence>
        </button>

        <dl className="space-y-1.5 px-0.5 pt-1">
          <StatusRow label="SYS" value="OK" signal="acid" />
          <StatusRow label="SUB" value={String(processCount).padStart(2, '0')} signal="acid" />
          <StatusRow label="DB" value="LOCAL" signal="blue" />
          <StatusRow label="NET" value={online ? 'LINK' : 'OFF'} signal={online ? 'acid' : 'orange'} />
        </dl>
      </div>
    </nav>
  )
}

function StatusRow({
  label,
  value,
  signal,
}: {
  label: string
  value: string
  signal: 'acid' | 'blue' | 'orange'
}) {
  return (
    <div className="flex items-center justify-between gap-1 px-0.5">
      <dt className="font-mono text-[8px] tracking-[0.16em] text-faint">{label}</dt>
      <dd className="flex items-center gap-1">
        <span className="font-mono text-[8px] tracking-[0.1em] text-dim">{value}</span>
        <Led signal={signal} size="sm" />
      </dd>
    </div>
  )
}
