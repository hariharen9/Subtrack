/**
 * SUBTRACK // FINANCIAL OS NAVIGATION MODEL
 *
 * The Financial Operating System is a shell around independent domain engines.
 * The top-level rack holds the domains; each domain optionally declares its own
 * sub-navigation (the "cockpit" tabs). Everything a domain needs to render its
 * chrome lives in one place, so adding a future engine (Cards, Loans, Spends)
 * is a single entry in DOMAINS + one page — the shell stays dumb and agnostic.
 */
import type { ReactNode } from 'react'
import {
  IconCommandCenter,
  IconCreditCard,
  IconData,
  IconDebt,
  IconFlow,
  IconSpends,
  IconSys,
  IconTime,
  IconCore,
} from '@/components/ui/Icons'

export interface NavItem {
  code: string
  label: string
  path: string
  /** Single-key shortcut, printed in the rack. */
  key: string
  blurb: string
  status: 'live' | 'standby'
  icon: (props: { size?: number; className?: string }) => ReactNode
}

/** A sub-navigation tab inside a domain (e.g. SUBS → CORE / FLOW / TIME / DATA). */
export interface SubNavItem {
  code: string
  label: string
  path: string
  key: string
  icon: (props: { size?: number; className?: string }) => ReactNode
  /** Foreign legacy aliases that should highlight this tab. */
  aliases?: string[]
}

export interface Domain extends NavItem {
  /** Optional in-domain tabs; rendered by the shell when the domain is active. */
  subnav?: SubNavItem[]
  /** Identity blurb shown in the Master deck's subsystem matrix. */
  manifest: string
  /** Version tag, e.g. "ENGINE LIVE" / "v0.2.0". */
  tag: string
}

/** Canonical domain rack — the single source of truth for the shell. */
export const DOMAINS: Domain[] = [
  {
    code: 'CMD',
    label: 'Master Command',
    path: '/',
    key: '1',
    blurb: 'Global runway, aggregate burn and domain matrix',
    status: 'live',
    icon: IconCommandCenter,
    manifest:
      'The Financial OS cockpit. Rolls every engine up into one net burn, one runway, one next-critical-transaction readout.',
    tag: 'OS CORE',
  },
  {
    code: 'SUBS',
    label: 'Subscriptions',
    path: '/subs',
    key: '2',
    blurb: 'Recurring processes, cycles and burn normalisation',
    status: 'live',
    icon: IconFlow,
    manifest:
      'The Subtrack engine. Treats recurring services as deterministic background processes with anchor-based renewal cycles.',
    tag: 'ENGINE LIVE',
    subnav: [
      { code: 'CORE', label: 'Overview', path: '/subs', key: 'O', icon: IconCore },
      {
        code: 'FLOW',
        label: 'Registry',
        path: '/subs/flow',
        key: 'F',
        icon: IconFlow,
        aliases: ['/flow', '/flow/'],
      },
      {
        code: 'TIME',
        label: 'Matrix',
        path: '/subs/time',
        key: 'M',
        icon: IconTime,
        aliases: ['/time'],
      },
      {
        code: 'DATA',
        label: 'Insights',
        path: '/subs/data',
        key: 'I',
        icon: IconData,
        aliases: ['/data'],
      },
    ],
  },
  {
    code: 'CRD',
    label: 'Credit Cards',
    path: '/cards',
    key: '3',
    blurb: 'Statement cycles, utilisation and dues',
    status: 'live',
    icon: IconCreditCard,
    manifest:
      'Credit card vault: limits, statements, utilisation gauges, due-date countdowns, rewards tracking and full transaction registry.',
    tag: 'ENGINE LIVE',
    subnav: [
      { code: 'CORE', label: 'Overview', path: '/cards', key: 'O', icon: IconCore },
      {
        code: 'FLOW',
        label: 'Registry',
        path: '/cards/flow',
        key: 'F',
        icon: IconFlow,
      },
      {
        code: 'DATA',
        label: 'Insights',
        path: '/cards/data',
        key: 'I',
        icon: IconData,
      },
    ],
  },
  {
    code: 'DEBT',
    label: 'Loans & EMIs',
    path: '/loans',
    key: '4',
    blurb: 'Amortization schedules, outstanding debt and repayment progress',
    status: 'live',
    icon: IconDebt,
    manifest:
      'Loan and EMI tracker with amortization schedules, outstanding balance tracking, interest breakdown, and debt-free projections.',
    tag: 'ENGINE LIVE',
    subnav: [
      { code: 'CORE', label: 'Overview', path: '/loans', key: 'O', icon: IconCore },
      {
        code: 'FLOW',
        label: 'Registry',
        path: '/loans/flow',
        key: 'F',
        icon: IconFlow,
      },
      {
        code: 'DATA',
        label: 'Insights',
        path: '/loans/data',
        key: 'I',
        icon: IconData,
      },
    ],
  },
  {
    code: 'SPND',
    label: 'Daily Spends',
    path: '/spends',
    key: '5',
    blurb: 'Ingestion ledger, variable velocity and discretionary limits',
    status: 'live',
    icon: IconSpends,
    manifest:
      'A variable-cash ledger for day-to-day spends: category-tagged entries, daily/weekly velocity and a weekly discretionary limiter.',
    tag: 'ENGINE LIVE',
    subnav: [
      { code: 'CORE', label: 'Overview', path: '/spends', key: 'O', icon: IconCore },
      {
        code: 'FLOW',
        label: 'Ledger',
        path: '/spends/flow',
        key: 'F',
        icon: IconFlow,
        aliases: ['/spendsflow'],
      },
      {
        code: 'DATA',
        label: 'Insights',
        path: '/spends/data',
        key: 'I',
        icon: IconData,
        aliases: ['/spendsdata'],
      },
      {
        code: 'PAT',
        label: 'Patterns',
        path: '/spends/patterns',
        key: 'P',
        icon: IconTime,
        aliases: ['/spendspatterns'],
      },
    ],
  },
  {
    code: 'SYS',
    label: 'System Host',
    path: '/sys',
    key: '6',
    blurb: 'Vault, currency, skins, danger zone',
    status: 'live',
    icon: IconSys,
    manifest:
      'Host controls: skin, base currency and static FX, JSON vault backup/import, CSV ledger export and maintenance tools.',
    tag: 'HOST',
  },
]

/** Legacy top-level entries removed — DOMAINS is the single rack now. */
export const NAV_ITEMS: Domain[] = DOMAINS

/** Resolve the domain that owns a path (canonical or legacy). */
export function domainFor(pathname: string): Domain {
  if (pathname === '/' || pathname === '') return DOMAINS[0]
  // Subscriptions owns /subs and the legacy /flow, /time, /data aliases.
  if (
    pathname.startsWith('/subs') ||
    pathname === '/flow' ||
    pathname.startsWith('/flow/') ||
    pathname === '/time' ||
    pathname === '/data'
  ) {
    return DOMAINS[1]
  }
  // Everything else matches by prefix, skipping the root.
  const match = DOMAINS.find((item) => item.path !== '/' && pathname.startsWith(item.path))
  return match ?? DOMAINS[0]
}

/**
 * The canonical path for a pathname. Legacy subscription routes resolve into
 * their /subs/* equivalent so there is exactly one source of truth for the
 * active sub-nav highlight.
 */
export function canonicalOf(pathname: string): string {
  const domain = domainFor(pathname)
  if (domain.code === 'SUBS') {
    const sub = domain.subnav?.find((item) =>
      item.aliases?.some((alias) =>
        alias.endsWith('/')
          ? pathname.startsWith(alias)
          : pathname === alias || pathname.startsWith(alias + '/'),
      ),
    )
    if (sub) return sub.path
    if (pathname.startsWith('/subs')) return pathname
    return '/subs'
  }
  return pathname === '/' ? '/' : domain.path
}

/** Resolve the active sub-nav tab for a pathname inside a domain. */
export function subNavItemFor(domain: Domain, pathname: string): SubNavItem | undefined {
  if (!domain.subnav) return undefined
  if (pathname === '/') return domain.subnav[0]

  const matches = (item: SubNavItem): boolean =>
    pathname === item.path ||
    pathname.startsWith(item.path + '/') ||
    Boolean(
      item.aliases?.some((alias) =>
        alias.endsWith('/')
          ? pathname.startsWith(alias)
          : pathname === alias || pathname.startsWith(alias + '/'),
      ),
    )

  const hits = domain.subnav.filter(matches)
  if (hits.length === 0) return undefined
  // Exact/canonical hit wins outright; otherwise prefer the longest matching
  // ancestor so /subs/flow/:id keys FLOW over the shorter CORE (/subs) prefix.
  return hits.sort(
    (a, b) =>
      (pathname === b.path ? 1 : 0) - (pathname === a.path ? 1 : 0) ||
      b.path.length - a.path.length,
  )[0]
}

/** Keyboard shortcuts that jump straight to a canonical domain. */
export function domainByKey(key: string): Domain | undefined {
  return DOMAINS.find((item) => item.key === key)
}