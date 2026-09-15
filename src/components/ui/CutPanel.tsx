/**
 * SUBTRACK // CUT PANEL
 *
 * The signature container: a hard-edged surface with an asymmetric chamfer and,
 * optionally, a solid offset block behind it. clip-path also clips box-shadow,
 * which is why the offset block is a real element rather than a shadow —
 * it keeps the brutalist offset crisp on both skins.
 */
import type { CSSProperties, ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type CutCorner = 'tl-br' | 'tr' | 'br' | 'tl' | 'none'
export type PanelTone = 'surface' | 'well' | 'flat' | 'ink'

const CUT_CLASS: Record<CutCorner, string> = {
  'tl-br': 'clip-cut',
  tr: 'clip-cut-tr',
  br: 'clip-cut-br',
  tl: 'clip-cut-tl',
  none: '',
}

export interface CutPanelProps {
  children: ReactNode
  /** Which corner is cropped. The default crop reads as the SUBTRACK mark. */
  cut?: CutCorner
  /** Crop depth in px. */
  cutSize?: number
  tone?: PanelTone
  /** Solid offset block behind the panel. */
  shadow?: 'none' | 'hard' | 'acid'
  shadowSize?: 'full' | 'thin'
  /** Lift toward the offset block on hover. */
  hover?: boolean
  className?: string
  innerClassName?: string
  style?: CSSProperties
  as?: 'div' | 'section' | 'article' | 'li' | 'aside' | 'header' | 'footer'
  ariaLabel?: string
}

export function CutPanel({
  children,
  cut = 'tl-br',
  cutSize = 12,
  tone = 'surface',
  shadow = 'none',
  shadowSize = 'full',
  hover = false,
  className,
  innerClassName,
  style,
  as: Tag = 'div',
  ariaLabel,
}: CutPanelProps) {
  const cutClass = CUT_CLASS[cut]
  const toneClass =
    tone === 'flat'
      ? 'bg-surface'
      : tone === 'well'
        ? 'bg-bg2'
        : tone === 'ink'
          ? 'bg-linehard'
          : 'bg-surface'

  return (
    <Tag
      aria-label={ariaLabel}
      className={cx('cp', hover && 'cp-hover cp-press', className)}
      style={{ ['--_cut' as string]: `${cutSize}px`, ...style }}
    >
      {shadow !== 'none' && (
        <span
          aria-hidden="true"
          className={cx(
            'cp-shadow',
            cutClass,
            shadow === 'acid' && 'cp-shadow-acid',
            shadowSize === 'thin' && 'cp-shadow-thin',
          )}
        />
      )}
      <div
        className={cx(
          'cp-frame',
          cutClass,
          tone === 'ink' ? 'bg-linehard' : tone === 'flat' ? '' : 'bg-line',
        )}
      >
        <div className={cx('cp-in', cutClass, toneClass, innerClassName)}>{children}</div>
      </div>
    </Tag>
  )
}

/**
 * A lighter-weight bordered block for dense lists. Square corners by default;
 * pass a corner to crop one edge only, so a column of blocks reads as a stack
 * rather than a rack of identical cards.
 */
export function Block({
  children,
  className,
  corner,
  tone = 'surface',
}: {
  children: ReactNode
  className?: string
  corner?: 'tl' | 'br' | 'tr' | 'bl'
  tone?: PanelTone
}) {
  const cornerClass = corner
    ? { tl: 'clip-cut-tl', br: 'clip-cut-br', tr: 'clip-cut-tr', bl: 'clip-cut-bl' }[corner]
    : ''
  return (
    <div
      className={cx(
        'relative border border-line',
        tone === 'well' ? 'bg-bg2' : tone === 'ink' ? 'bg-linehard text-bg' : 'bg-surface',
        cornerClass,
        className,
      )}
      style={{ ['--_cut' as string]: '8px' }}
    >
      {children}
    </div>
  )
}
