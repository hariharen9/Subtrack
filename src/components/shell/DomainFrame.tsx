/**
 * SUBTRACK // DOMAIN FRAME
 *
 * In-domain cockpit sub-navigation strip (e.g. CORE / FLOW / TIME / DATA).
 * Rendered cleanly when a domain declares sub-navigation modules.
 */
import { Link, useLocation } from 'react-router-dom'
import { domainFor, subNavItemFor } from '@/app/nav'
import { cx } from '@/lib/cx'

export function DomainFrame() {
  const { pathname } = useLocation()
  const domain = domainFor(pathname)
  const activeSub = subNavItemFor(domain, pathname)

  if (!domain.subnav) return null

  return (
    <div className="flex flex-col gap-1">
      {/* in-domain cockpit sub-navigation */}
      <div
        className="no-scrollbar flex items-center gap-1 overflow-x-auto border border-line2 bg-surface px-3 py-1.5 md:px-5"
        data-lenis-prevent
        role="navigation"
        aria-label={`${domain.label} cockpit`}
      >
        <span className="micro mr-1 shrink-0 text-faint sm:inline">MODULES:</span>
        {domain.subnav.map((sub) => {
          const active = activeSub?.path === sub.path
          const Icon = sub.icon
          return (
            <Link
              key={sub.path}
              to={sub.path}
              aria-current={active ? 'page' : undefined}
              title={`${sub.label} · ${sub.key}`}
              className={cx(
                'micro flex shrink-0 items-center gap-1.5 border px-2 py-1 transition-colors whitespace-nowrap',
                active
                  ? 'border-acid bg-acid text-black font-semibold'
                  : 'border-line bg-bg2 text-dim hover:border-linehard hover:text-fg',
              )}
            >
              <Icon size={13} className={active ? 'text-black' : 'text-faint'} />
              <span>{sub.code}</span>
              <span className={cx('opacity-70', active && 'font-normal')}>· {sub.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}