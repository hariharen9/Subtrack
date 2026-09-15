/**
 * SUBTRACK // MOBILE CONSOLE
 *
 * Mobile is not a shrunken desktop: it gets its own control console. Five cells
 * across the bottom, each with a code, an icon, a live count and its own status
 * plate — and a burn composition strip running along the top edge so the
 * persistent chrome is informative instead of decorative. The primary action is
 * a thumb-reachable chamfered key floating just above the console.
 */
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { NAV_ITEMS } from '@/app/nav'
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
  chargesThisMonth,
}: {
  activePath: string
  views: SubscriptionView[]
  processCount: number
  chargesThisMonth: number
}) {
  const openComposer = useUI((s) => s.openComposer)

  const isActive = (path: string) =>
    path === '/' ? activePath === '/' : activePath.startsWith(path)

  const counts: Record<string, number | undefined> = {
    FLOW: processCount,
    TIME: chargesThisMonth,
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-full flex justify-end px-3 pb-3">
        <motion.button
          type="button"
          onClick={() => openComposer()}
          whileTap={{ scale: 0.94, y: 2 }}
          transition={{ type: 'spring', stiffness: 620, damping: 34 }}
          className="clip-cut-tl pointer-events-auto grid h-14 w-14 place-items-center border-b-2 border-r-2 border-black bg-acid text-black focus-visible:outline-none"
          style={{ ['--_cut' as string]: '10px' }}
          aria-label="Add a subscription"
        >
          <IconPlus size={22} />
        </motion.button>
      </div>

      <BurnEdge views={views} />

      <nav
        aria-label="Primary"
        className="safe-b grid grid-cols-5 border-t-2 border-linehard bg-bg/95 backdrop-blur-[3px]"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path)
          const Icon = item.icon
          const count = counts[item.code]
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'relative flex min-h-[60px] flex-col items-center justify-center gap-1 border-r border-line transition-colors last:border-r-0',
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
                <Icon size={19} />
                {count !== undefined && count > 0 && (
                  <span
                    className={cx(
                      'absolute -right-2.5 -top-1.5 font-mono text-[8px] leading-none tracking-[0.06em]',
                      active ? 'text-black/70' : 'text-faint',
                    )}
                  >
                    {count}
                  </span>
                )}
              </span>
              <span className="micro">{item.code}</span>
              {!active && item.code === 'CORE' && (
                <span className="absolute right-1.5 top-1.5">
                  <Led signal="acid" size="sm" pulse />
                </span>
              )}
              <span className="sr-only">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
