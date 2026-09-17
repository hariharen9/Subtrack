/**
 * SUBTRACK // FINANCIAL OS MOBILE CONSOLE
 *
 * Mobile is not a shrunken desktop: it gets its own control console. Six domain
 * cells across the bottom, each with a code, an icon and a status light — live
 * domains glow acid, standby domains sit orange until they power on. The burn
 * composition strip runs along the top edge so the chrome stays informative.
 */
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { DOMAINS, domainFor } from '@/app/nav'
import { cx } from '@/lib/cx'
import { useUI } from '@/store/ui'
import { Led } from '@/components/ui/Signal'
import { IconPlus } from '@/components/ui/Icons'
import { BurnEdge } from '@/components/charts/BurnRail'
import type { SubscriptionView } from '@/lib/analytics'

export function MobileNav({
  activePath,
  views,
  processCount,
}: {
  activePath: string
  views: SubscriptionView[]
  processCount: number
  chargesThisMonth?: number
}) {
  const openComposer = useUI((s) => s.openComposer)

  const isActive = (path: string) =>
    path === '/' ? activePath === '/' : domainFor(activePath).code === domainFor(path).code

  const counts: Record<string, number | undefined> = {
    SUBS: processCount,
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-full flex justify-end px-3 pb-3">
        <motion.button
          type="button"
          onClick={() => openComposer()}
          whileTap={{ scale: 0.94, y: 2 }}
          transition={{ type: 'spring', stiffness: 620, damping: 34 }}
          className="clip-cut-tl pointer-events-auto grid h-12 w-12 place-items-center border-b-2 border-r-2 border-black bg-acid text-black focus-visible:outline-none"
          style={{ ['--_cut' as string]: '10px' }}
          aria-label="Add a subscription"
        >
          <IconPlus size={19} />
        </motion.button>
      </div>

      <BurnEdge views={views} />

      <nav
        aria-label="Financial OS Primary Console"
        className="safe-b grid grid-cols-6 border-t-2 border-linehard bg-bg/95 backdrop-blur-[3px]"
      >
        {DOMAINS.map((domain) => {
          const active = isActive(domain.path)
          const Icon = domain.icon
          const count = counts[domain.code]
          const standby = domain.status === 'standby'
          return (
            <Link
              key={domain.path}
              to={domain.path}
              aria-current={active ? 'page' : undefined}
              title={domain.label}
              className={cx(
                'relative flex min-h-[54px] flex-col items-center justify-center gap-0.5 border-r border-line transition-colors last:border-r-0',
                active ? 'bg-acid text-black' : 'text-dim active:bg-surface2',
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-plate"
                  className="absolute inset-x-0 top-0 h-[3px] bg-fg"
                  transition={{ type: 'spring', stiffness: 560, damping: 40 }}
                />
              )}
              <span className="relative">
                <Icon size={17} />
                {count !== undefined && count > 0 && (
                  <span
                    className={cx(
                      'absolute -right-2.5 -top-1 font-mono text-[7.5px] leading-none tracking-[0.06em]',
                      active ? 'text-black/70' : 'text-faint',
                    )}
                  >
                    {count}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <span className={cx('micro text-[9px] font-mono', standby && !active && 'text-orangeink')}>
                  {domain.code}
                </span>
                {standby && !active && <Led signal="orange" size="sm" hollow />}
              </span>
              <span className="sr-only">{domain.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}