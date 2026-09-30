/**
 * SUBTRACK // ICON SYSTEM
 *
 * Built with Lucide vector icons (via react-icons/lu) for crisp, professional,
 * pixel-aligned geometry, consistent stroke weights, and hardware-aesthetic precision.
 */
import type { SVGProps, JSX } from 'react'
import type { IconType } from 'react-icons'
import {
  LuLayoutDashboard,
  LuRepeat,
  LuCalendarDays,
  LuChartColumnIncreasing,
  LuSlidersHorizontal,
  LuSearch,
  LuPlus,
  LuX,
  LuCheck,
  LuChevronRight,
  LuChevronLeft,
  LuChevronDown,
  LuPlay,
  LuPause,
  LuTrash2,
  LuSquarePen,
  LuDownload,
  LuUpload,
  LuSun,
  LuMoon,
  LuCommand,
  LuArrowRight,
  LuZap,
  LuInfo,
  LuTriangleAlert,
  LuLayoutGrid,
  LuList,
  LuLink,
  LuTerminal,
  LuCreditCard,
  LuLandmark,
  LuReceipt,
  LuLayers,
  LuCopy,
} from 'react-icons/lu'

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string
  className?: string
  strokeWidth?: number
}

function createIcon(IconComponent: IconType) {
  return function Icon({ size = 18, className, strokeWidth = 2, ...rest }: IconProps): JSX.Element {
    return (
      <IconComponent
        size={size}
        className={className}
        strokeWidth={strokeWidth}
        aria-hidden="true"
        focusable="false"
        {...rest}
      />
    )
  }
}

/** Core cockpit & overview */
export const IconCore = createIcon(LuLayoutDashboard)

/** Subscriptions registry & cycle flows */
export const IconFlow = createIcon(LuRepeat)

/** Matrix / Schedule / Time */
export const IconTime = createIcon(LuCalendarDays)

/** Insights & analytics */
export const IconData = createIcon(LuChartColumnIncreasing)

/** System host & settings */
export const IconSys = createIcon(LuSlidersHorizontal)

/** Search & query */
export const IconSearch = createIcon(LuSearch)

/** Standard actions */
export const IconPlus = createIcon(LuPlus)
export const IconClose = createIcon(LuX)
export const IconCheck = createIcon(LuCheck)
export const IconChevronRight = createIcon(LuChevronRight)
export const IconChevronLeft = createIcon(LuChevronLeft)
export const IconChevronDown = createIcon(LuChevronDown)
export const IconPlay = createIcon(LuPlay)
export const IconPause = createIcon(LuPause)
export const IconTerminate = createIcon(LuTrash2)
export const IconEdit = createIcon(LuSquarePen)
export const IconDownload = createIcon(LuDownload)
export const IconUpload = createIcon(LuUpload)
export const IconSun = createIcon(LuSun)
export const IconMoon = createIcon(LuMoon)
export const IconCommand = createIcon(LuCommand)
export const IconArrowRight = createIcon(LuArrowRight)
export const IconBolt = createIcon(LuZap)
export const IconZap = createIcon(LuZap)
export const IconInfo = createIcon(LuInfo)
export const IconWarning = createIcon(LuTriangleAlert)
export const IconGrid = createIcon(LuLayoutGrid)
export const IconList = createIcon(LuList)
export const IconLink = createIcon(LuLink)

/** Domain rack icons */
export const IconCommandCenter = createIcon(LuTerminal)
export const IconCreditCard = createIcon(LuCreditCard)
export const IconDebt = createIcon(LuLandmark)
export const IconSpends = createIcon(LuReceipt)

/** Sub-navigation & aliases */
export const IconSubsession = createIcon(LuLayers)
export const IconCalendar = createIcon(LuCalendarDays)
export const IconCopy = createIcon(LuCopy)
