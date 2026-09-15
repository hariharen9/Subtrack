/**
 * SUBTRACK // ICON SET
 *
 * Drawn to match the material language: 1.6px strokes, square caps, no rounded
 * flourishes. Icons are 24-box geometry so they hold up from 14px to 28px.
 */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 18, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconCore = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3h18v18H3z" />
    <path d="M7.5 7.5h9v9h-9z" />
    <path d="M11 11h2v2h-2z" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconFlow = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 5h13M3 12h18M3 19h9" />
    <path d="M19 3v4M19 17v4" />
    <path d="M17 5h4M17 19h4" />
  </Svg>
)

export const IconTime = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 5h18v16H3z" />
    <path d="M3 9.5h18M7.5 3v4M16.5 3v4" />
    <path d="M7 13h3v3H7z" fill="currentColor" stroke="none" />
    <path d="M14 16h3" />
  </Svg>
)

export const IconData = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 21h18" />
    <path d="M5 21V13h3.5v8M10.5 21V7H14v14M15 21v-6h3.5v6" />
  </Svg>
)

export const IconSys = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7h18M3 17h18" />
    <path d="M8 7v-3M8 7v3" />
    <path d="M15 17v-3M15 17v3" />
    <path d="M6.5 7h3M13.5 17h3" strokeWidth={2.4} />
  </Svg>
)

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z" />
    <path d="M16 16l5 5" />
  </Svg>
)

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v16M4 12h16" strokeWidth={2} />
  </Svg>
)

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 5l14 14M19 5L5 19" />
  </Svg>
)

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12.5 9.5 18 20 6" strokeWidth={2} />
  </Svg>
)

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
)

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
)

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 9l7 7 7-7" />
  </Svg>
)

export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4l12 8-12 8z" />
  </Svg>
)

export const IconPause = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconTerminate = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3h18v18H3z" />
    <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" strokeWidth={2} />
  </Svg>
)

export const IconEdit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4l12-12-4-4L4 16z" />
    <path d="M14 6l4 4" />
  </Svg>
)

export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v12M7 11l5 5 5-5" />
    <path d="M4 20h16" />
  </Svg>
)

export const IconUpload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21V9M7 13l5-5 5 5" />
    <path d="M4 4h16" />
  </Svg>
)

export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
  </Svg>
)

export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </Svg>
)

export const IconCommand = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 3H6.5a3.5 3.5 0 0 0 0 7H9zM9 10H6.5a3.5 3.5 0 0 0 0 7H9zM15 21h2.5a3.5 3.5 0 0 0 0-7H15zM15 14h2.5a3.5 3.5 0 0 0 0-7H15z" />
    <path d="M9 3h6v18H9z" />
  </Svg>
)

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Svg>
)

export const IconBolt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
  </Svg>
)

export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
    <path d="M12 11v6M12 7.5v1" />
  </Svg>
)

export const IconWarning = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 2 20h20z" />
    <path d="M12 9v5M12 16.5v1" />
  </Svg>
)

export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
  </Svg>
)

export const IconList = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 5h18M3 12h18M3 19h18" />
  </Svg>
)

export const IconLink = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 15l6-6" />
    <path d="M11 5.5 13 3.5a4 4 0 0 1 6 6l-2 2" />
    <path d="M13 18.5l-2 2a4 4 0 0 1-6-6l2-2" />
  </Svg>
)

export const IconCalendar = IconTime
