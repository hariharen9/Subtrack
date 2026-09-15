/**
 * SUBTRACK // SERVICE GLYPHS
 *
 * Every service gets a mark drawn as geometry in a 24×24 box, in single-colour
 * ink. No emoji, no pasted raster logos and no rainbow: the container carries
 * the brand accent (see ServiceBadge), so a wall of 15 processes still reads as
 * one designed system rather than a sticker album.
 *
 * Unknown services fall back to their initial, rendered in the same box.
 */
import type { CSSProperties, ReactNode } from 'react'

export interface GlyphProps {
  size?: number
  className?: string
  /** Glyph key, or free text whose initial is used as a fallback mark. */
  fallback?: string
  strokeWidth?: number
  style?: CSSProperties
}

const MARKS: Record<string, (sw: number) => ReactNode> = {
  netflix: () => <path d="M6 2h4v13.3L16.6 2H21v20h-4V8.7L10.4 22H6z" />,
  spotify: (sw) => (
    <>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth={sw * 1.3} />
      <path
        d="M6.9 9.4c3.4-1 7-.6 10 1.1M7.6 13.1c2.8-.8 5.8-.5 8.3.9M8.3 16.4c2.2-.6 4.5-.4 6.4.7"
        fill="none"
        stroke="currentColor"
        strokeWidth={sw * 1.2}
        strokeLinecap="round"
      />
    </>
  ),
  youtube: (sw) => (
    <>
      <rect
        x="1.6"
        y="4.6"
        width="20.8"
        height="14.8"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth={sw * 1.3}
      />
      <path d="M10.1 8.6 16.4 12l-6.3 3.4z" />
    </>
  ),
  prime: (sw) => (
    <>
      <rect
        x="3"
        y="3.6"
        width="18"
        height="12.4"
        fill="none"
        stroke="currentColor"
        strokeWidth={sw * 1.3}
      />
      <path d="M3 7.4h18M3 11.2h18M8.4 3.6v12.4M15.6 3.6v12.4" stroke="currentColor" strokeWidth={sw * 0.7} />
      <path
        d="M6.4 18.6c3.6 2.1 7.6 2.4 11.4.7"
        fill="none"
        stroke="currentColor"
        strokeWidth={sw * 1.4}
        strokeLinecap="round"
      />
    </>
  ),
  hotstar: () => <path d="M12 1.8l2.7 6.6 6.6.5-5.1 4.4 1.6 6.7L12 16.6 6.2 20l1.6-6.7L2.7 8.9l6.6-.5z" />,
  applemusic: (sw) => (
    <>
      <circle cx="7.4" cy="18" r="3.1" />
      <rect x="9.6" y="3.4" width="2.2" height="14.6" />
      <path d="M11.8 3.4c3.4.2 6.4 1.7 6.4 4.6 0-.9-2.6-2.1-6.4-2.3z" />
      <path
        d="M14 12.6c2 .3 3.6 1.2 3.6 3"
        fill="none"
        stroke="currentColor"
        strokeWidth={sw * 1.1}
        strokeLinecap="round"
      />
    </>
  ),
  icloud: () => (
    <path d="M6.8 19.4h10.4a4.3 4.3 0 0 0 .4-8.6 6 6 0 0 0-11.4 1.3A3.9 3.9 0 0 0 6.8 19.4z" />
  ),
  googleone: (sw) => (
    <>
      <circle cx="12" cy="12" r="9.4" fill="none" stroke="currentColor" strokeWidth={sw * 1.3} />
      <path d="M10.4 7.6 12.6 6v12M9.6 18h6.2" fill="none" stroke="currentColor" strokeWidth={sw * 1.5} strokeLinecap="square" />
    </>
  ),
  github: () => (
    <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.7.4-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.2-.4-1.2.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.4 4.8-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z" />
  ),
  openai: (sw) => (
    <>
      <path
        d="M12 2.4 20.3 7v10L12 21.6 3.7 17V7z"
        fill="none"
        stroke="currentColor"
        strokeWidth={sw * 1.2}
      />
      <path
        d="M12 2.4v19.2M3.7 7l16.6 10M20.3 7 3.7 17"
        fill="none"
        stroke="currentColor"
        strokeWidth={sw * 0.8}
      />
      <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth={sw * 1.2} />
    </>
  ),
  notion: (sw) => (
    <>
      <rect x="3.4" y="2.6" width="17.2" height="18.8" fill="none" stroke="currentColor" strokeWidth={sw * 1.3} />
      <path d="M8.2 17V7.2l7.6 9.8V7.2" fill="none" stroke="currentColor" strokeWidth={sw * 1.5} />
    </>
  ),
  adobe: () => (
    <path
      fillRule="evenodd"
      d="M11.1 2h1.9l8.6 20h-5.4l-1.7-4.4H9.4L7.7 22H2.4zM12 8.2 10.6 13h2.8z"
    />
  ),
  canva: (sw) => (
    <>
      <circle cx="12" cy="12" r="9.4" fill="none" stroke="currentColor" strokeWidth={sw * 1.3} />
      <path
        d="M15.6 8.6a4.6 4.6 0 1 0 0 6.8"
        fill="none"
        stroke="currentColor"
        strokeWidth={sw * 1.8}
        strokeLinecap="round"
      />
    </>
  ),
  figma: () => (
    <>
      <path d="M8.6 2h3.4v6.6H8.6a3.3 3.3 0 0 1 0-6.6z" />
      <path d="M12 2h3.4a3.3 3.3 0 0 1 0 6.6H12z" />
      <path d="M8.6 8.7H12v6.6H8.6a3.3 3.3 0 0 1 0-6.6z" />
      <circle cx="15.4" cy="12" r="3.3" />
      <path d="M8.6 15.4H12v3.3a3.3 3.3 0 1 1-3.4-3.3z" />
    </>
  ),
  dropbox: () => (
    <>
      <path d="M6.6 2.6 12 6.5 6.6 10.4 1.2 6.5z" />
      <path d="M17.4 2.6 22.8 6.5l-5.4 3.9-5.4-3.9z" />
      <path d="M6.6 11 12 14.9 6.6 18.8 1.2 14.9z" />
      <path d="M17.4 11l5.4 3.9-5.4 3.9-5.4-3.9z" />
      <path d="M6.6 19.9 12 16l5.4 3.9L12 23.8z" />
    </>
  ),
  microsoft: () => (
    <>
      <rect x="2.2" y="2.2" width="9.1" height="9.1" />
      <rect x="12.7" y="2.2" width="9.1" height="9.1" />
      <rect x="2.2" y="12.7" width="9.1" height="9.1" />
      <rect x="12.7" y="12.7" width="9.1" height="9.1" />
    </>
  ),
  audible: (sw) => (
    <>
      <path
        d="M2.6 10.6a11 11 0 0 1 18.8 0"
        fill="none"
        stroke="currentColor"
        strokeWidth={sw * 1.3}
        strokeLinecap="round"
      />
      <path
        d="M6.4 13.4a7 7 0 0 1 11.2 0"
        fill="none"
        stroke="currentColor"
        strokeWidth={sw * 1.2}
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.6" r="3" />
    </>
  ),
  cultfit: (sw) => (
    <>
      <path
        d="M20 7.4A9.2 9.2 0 1 0 20.6 15"
        fill="none"
        stroke="currentColor"
        strokeWidth={sw * 1.8}
        strokeLinecap="butt"
      />
      <path d="M13.4 8.2 19 12l-5.6 3.8z" />
    </>
  ),
  coursera: (sw) => (
    <>
      <circle cx="12" cy="12" r="9.4" fill="none" stroke="currentColor" strokeWidth={sw * 1.3} />
      <path d="M16.4 10.4H9.2v3.2h7.2" fill="none" stroke="currentColor" strokeWidth={sw * 1.6} />
    </>
  ),
  /** Generic process mark for a user-typed service. */
  process: (sw) => (
    <>
      <rect x="2.6" y="2.6" width="18.8" height="18.8" fill="none" stroke="currentColor" strokeWidth={sw * 1.2} />
      <path d="M2.6 12h18.8M12 2.6v18.8" stroke="currentColor" strokeWidth={sw * 0.7} />
      <rect x="7.4" y="7.4" width="9.2" height="9.2" />
    </>
  ),
}

export const GLYPH_KEYS = Object.keys(MARKS)

export function ServiceGlyph({ size = 20, className, fallback, strokeWidth = 1.4, style }: GlyphProps) {
  const key = fallback && MARKS[fallback] ? fallback : undefined
  const mark = key ? MARKS[key] : undefined
  const initial = fallback?.trim().charAt(0).toUpperCase()

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      {mark ? (
        mark(strokeWidth)
      ) : (
        <text
          x="12"
          y="12"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="15"
          fontWeight="700"
          fontFamily="var(--font-mono)"
          fill="currentColor"
        >
          {initial ?? '?'}
        </text>
      )}
    </svg>
  )
}
