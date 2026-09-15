/**
 * SUBTRACK // NAVIGATION MODEL
 * Five systems, one purpose. The codes are printed in the rail and the mobile
 * console; the numbers are the keyboard shortcuts that jump straight there.
 */
import type { ReactNode } from 'react'
import { IconCore, IconData, IconFlow, IconSys, IconTime } from '@/components/ui/Icons'

export interface NavItem {
  code: string
  label: string
  path: string
  /** Single-key shortcut, printed in the rail. */
  key: string
  blurb: string
  icon: (props: { size?: number; className?: string }) => ReactNode
}

export const NAV_ITEMS: NavItem[] = [
  {
    code: 'CORE',
    label: 'Overview',
    path: '/',
    key: '1',
    blurb: 'Burn, load and incoming flow',
    icon: IconCore,
  },
  {
    code: 'FLOW',
    label: 'Subscriptions',
    path: '/flow',
    key: '2',
    blurb: 'Every process you are running',
    icon: IconFlow,
  },
  {
    code: 'TIME',
    label: 'Calendar',
    path: '/time',
    key: '3',
    blurb: 'Payment matrix for the cycle',
    icon: IconTime,
  },
  {
    code: 'DATA',
    label: 'Insights',
    path: '/data',
    key: '4',
    blurb: 'Distribution, concentration, drift',
    icon: IconData,
  },
  {
    code: 'SYS',
    label: 'Settings',
    path: '/sys',
    key: '5',
    blurb: 'Currency, theme, data volume',
    icon: IconSys,
  },
]

export function navItemFor(pathname: string): NavItem {
  if (pathname.startsWith('/flow')) return NAV_ITEMS[1]
  if (pathname.startsWith('/time')) return NAV_ITEMS[2]
  if (pathname.startsWith('/data')) return NAV_ITEMS[3]
  if (pathname.startsWith('/sys')) return NAV_ITEMS[4]
  return NAV_ITEMS[0]
}
