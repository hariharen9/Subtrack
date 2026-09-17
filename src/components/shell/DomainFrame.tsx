/**
 * SUBTRACK // DOMAIN FRAME
 *
 * The in-domain chrome strip. Each Financial OS domain owns a "cockpit" — a
 * contextual identity bar plus, when the domain declares one, a sub-navigation
 * of module tabs. Rendering the chrome here (mounted once in the shell, ahead of
 * the animated Outlet) keeps it static while page content transitions below it.
 * A domain brings its own sub-nav via its DOMAINS entry, so a future engine
 * (Cards, Loans, Spends) gets the same chrome for free without touching the shell.
 */
import { Link, useLocation } from 'react-router-dom'
import { domainFor, subNavItemFor } from '@/app/nav'
import { cx } from '@/lib/cx'
import { Led } from '@/components/ui/Signal'
import { useUI } from '@/store/ui'

export function DomainFrame() {
  const { pathname } = useLocation()
  const domain = domainFor(pathname)
  const activeSub = subNavItemFor(domain, pathname)
  const base = useUI((s) => s.baseCurrency)

  const isStandby = domain.status === 'standby'
  const pulse = !isStandby && domain.code !== 'SYS'

  return (
    <div className="flex flex-col gap-1">
      {/* identity bar — carries the status tag + manifest blurb. The domain
          name/code is established by the SystemHeader directly above, so it is
          not repeated here. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-line2 bg-bg2 px-3 py-1.5 md:px-5">
        <span
          className={cx(
            'micro flex items-center gap-1.5 border px-1.5 py-0.5',
            isStandby ? 'border-orange text-orangeink' : 'border-acid text-acidink',
          )}
        >
          <Led signal={isStandby ? 'orange' : 'acid'} size="sm" pulse={pulse} />
          {isStandby ? 'STANDBY' : domain.tag}
        </span>

        <span className="micro hidden min-w-0 flex-1 truncate text-faint md:inline">
          {domain.manifest}
        </span>

        <span className="micro hidden shrink-0 text-faint xl:inline">BASE · {base}</span>
      </div>

      {/* in-domain cockpit sub-navigation */}
      {domain.subnav && (
        <div
          className="no-scrollbar flex items-center gap-1 overflow-x-auto border border-line2 bg-surface px-3 py-1.5 md:px-5"
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
      )}
    </div>
  )
}