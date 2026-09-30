/**
 * SPENDSTATE // FINANCIAL OS NAVIGATION RAIL
 *
 * Desktop only. A compact vertical rack of the OS domains: tiny monospace code,
 * icon, keyboard shortcut, and an active plate that slides between cells with
 * spring physics. Standby domains render dimmed until they power on. The foot
 * of the rack reports OS health.
 */
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { DOMAINS, domainFor } from '@/app/nav'
import { cx } from '@/lib/cx'
import { useOnline } from '@/hooks/usePlatform'
import { useUI } from '@/store/ui'
import { Led } from '@/components/ui/Signal'
import { IconMoon, IconSparkles, IconSun, IconZap } from '@/components/ui/Icons'
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
  const uiMode = useUI((s) => s.uiMode)
  const toggleUiMode = useUI((s) => s.toggleUiMode)
  const activeDomain = domainFor(activePath)

  const isActive = (domain: (typeof DOMAINS)[number]) =>
    domain.path === '/' ? activePath === '/' : domainFor(activePath).code === domain.code

  return (
    <nav
      aria-label="Financial OS Primary Rack"
      className="fixed inset-y-0 left-0 z-40 hidden w-[88px] flex-col border-r-2 border-linehard bg-bg2 lg:flex"
    >
      <Link
        to="/"
        className="flex h-[68px] items-center justify-center border-b border-line transition-colors hover:bg-surface2"
        aria-label="SPENDSTATE Financial OS overview"
      >
        <Mark animated />
      </Link>

      <ul className="flex flex-1 flex-col gap-1 px-2 py-2.5">
        {DOMAINS.map((domain) => {
          const active = isActive(domain)
          const Icon = domain.icon
          const standby = domain.status === 'standby'
          return (
            <li key={domain.path}>
              <Link
                to={domain.path}
                aria-current={active ? 'page' : undefined}
                title={`${domain.label} — ${domain.blurb} (${domain.key})`}
                className={cx(
                  'group relative flex h-[58px] flex-col items-center justify-center gap-1 transition-opacity',
                  standby && !active && 'opacity-60 hover:opacity-100',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="rail-plate"
                    className="rail-plate absolute inset-0 rounded-xl bg-acid"
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                  />
                )}
                <span
                  aria-hidden="true"
                  className={cx(
                    'rail-pip absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 transition-colors',
                    active ? 'bg-fg' : 'bg-transparent group-hover:bg-line2',
                  )}
                />
                <span
                  className={cx(
                    'relative z-10 grid place-items-center transition-colors',
                    active ? 'text-black' : 'text-dim group-hover:text-fg',
                  )}
                >
                  <Icon size={18} />
                </span>
                <span
                  className={cx(
                    'micro relative z-10 text-[10px] tracking-wider transition-colors',
                    active ? 'text-black font-semibold' : 'text-faint group-hover:text-dim',
                  )}
                >
                  {domain.code}
                </span>
                <span
                  className={cx(
                    'micro absolute right-1.5 top-1 z-10 text-[8px] transition-colors',
                    active ? 'text-black/50' : 'text-faint/70',
                  )}
                >
                  {domain.key}
                </span>
                {/* standby tag */}
                {standby && !active && (
                  <span className="micro absolute -right-3 -top-0.5 z-10 text-[7px] text-orangeink">
                    ▴
                  </span>
                )}
                <span className="sr-only">{domain.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="space-y-2 border-t border-line p-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleUiMode}
            className={cx(
              'flex h-9 flex-1 items-center justify-center border text-xs transition-colors cursor-pointer',
              uiMode === 'minimal'
                ? 'border-acid/60 bg-acid/15 text-acid-ink rounded-lg'
                : 'border-line2 text-dim hover:border-linehard hover:text-fg'
            )}
            aria-label="Toggle Interface Style"
            title={uiMode === 'minimal' ? 'Switch to Cyber OS Mode (Key M)' : 'Switch to Minimal Zen Mode (Key M)'}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={uiMode}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="grid place-items-center"
              >
                {uiMode === 'minimal' ? <IconSparkles size={14} className="text-acid-ink" /> : <IconZap size={14} className="text-faint" />}
              </motion.span>
            </AnimatePresence>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 flex-1 items-center justify-center border border-line2 text-dim transition-colors hover:border-linehard hover:text-fg cursor-pointer"
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
                {theme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>

        <dl className="space-y-1 px-0.5 pt-0.5">
          <StatusRow label="OS" value={activeDomain.code} signal="acid" />
          <StatusRow label="SUB" value={String(processCount).padStart(2, '0')} signal="acid" />
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
    <div className="flex items-center justify-between text-[9px] font-mono">
      <span className="text-faint">{label}</span>
      <span className="flex items-center gap-1 text-dim">
        <Led signal={signal} size="sm" />
        {value}
      </span>
    </div>
  )
}