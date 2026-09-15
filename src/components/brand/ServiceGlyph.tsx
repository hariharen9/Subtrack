/**
 * SUBTRACK // SERVICE GLYPHS
 *
 * Official real brand icons from react-icons (SimpleIcons, FontAwesome, RemixIcon,
 * Tabler Icons) with comprehensive brand resolution and sharp vector presentation.
 */
import type { CSSProperties, FC, ReactNode } from 'react'
import type { IconType } from 'react-icons'
import {
  SiNetflix,
  SiSpotify,
  SiYoutube,
  SiApplemusic,
  SiIcloud,
  SiGithub,
  SiNotion,
  SiFigma,
  SiDropbox,
  SiAudible,
  SiCoursera,
  SiDiscord,
  SiX,
  SiClaude,
  SiPerplexity,
  SiVercel,
  SiSupabase,
  SiLinear,
  SiJira,
  SiGitlab,
  SiDocker,
  SiKubernetes,
  SiDigitalocean,
  SiCloudflare,
  Si1Password,
  SiBitwarden,
  SiNordvpn,
  SiProtonmail,
  SiProtonvpn,
  SiStrava,
  SiDuolingo,
  SiUber,
  SiSwiggy,
  SiZomato,
  SiAirbnb,
  SiMedium,
  SiSubstack,
  SiPatreon,
  SiTwitch,
  SiSteam,
  SiPlaystation,
  SiZoom,
  SiMax,
  SiHbo,
  SiParamountplus,
  SiTidal,
  SiDeezer,
  SiSoundcloud,
  SiFitbit,
  SiPeloton,
  SiHeadspace,
  SiLastpass,
  SiExpressvpn,
  SiGoogledrive,
  SiAppletv,
  SiCrunchyroll,
  SiMiro,
  SiGooglegemini,
  SiGithubcopilot,
} from 'react-icons/si'
import {
  FaAmazon,
  FaApple,
  FaGoogle,
  FaMicrosoft,
  FaSlack,
  FaLinkedin,
  FaXbox,
  FaTelegram,
  FaWhatsapp,
  FaReddit,
  FaInstagram,
  FaTiktok,
  FaAws,
} from 'react-icons/fa6'
import { RiOpenaiFill } from 'react-icons/ri'
import { TbBrandAdobe, TbBrandDisney, TbBrandGoogleOne, TbDeviceNintendo } from 'react-icons/tb'

export interface GlyphProps {
  size?: number
  className?: string
  /** Glyph key or free-form service name. */
  fallback?: string
  strokeWidth?: number
  style?: CSSProperties
}

/** Official Canva Script Vector */
const CanvaIcon: FC<{ size?: number; className?: string; style?: CSSProperties }> = ({
  size = 20,
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={style}
    aria-hidden="true"
  >
    <path d="M12.984 10.42c-.22-.387-.514-.712-.876-.967-.363-.255-.783-.385-1.25-.385-.59 0-1.077.202-1.45.602-.371.4-.56.966-.56 1.688 0 .736.19 1.309.566 1.708.377.4.873.604 1.477.604.453 0 .862-.125 1.218-.37.356-.245.644-.564.858-.948l1.452.924c-.397.644-.925 1.154-1.572 1.517-.648.363-1.385.548-2.196.548-1.127 0-2.036-.367-2.712-1.096-.677-.73-1.02-1.706-1.02-2.912 0-1.22.348-2.203 1.036-2.934.688-.73 1.61-1.1 2.753-1.1.79 0 1.513.185 2.155.55.642.365 1.155.877 1.528 1.527l-1.39.988zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
)

/** Official cult.fit / curefit Geometric Mark */
const CultfitIcon: FC<{ size?: number; className?: string; style?: CSSProperties }> = ({
  size = 20,
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={style}
    aria-hidden="true"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.8 13.8a6.5 6.5 0 1 1 0-7.6l2.1-2.1a9.5 9.5 0 1 0 0 11.8l-2.1-2.1z" />
  </svg>
)

/** Official Cursor AI Isometric Cube */
const CursorIcon: FC<{ size?: number; className?: string; style?: CSSProperties }> = ({
  size = 20,
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    className={className}
    style={style}
    aria-hidden="true"
  >
    <path d="M12 2.5 3.5 7.4v9.8L12 22.1l8.5-4.9V7.4L12 2.5z" />
    <path d="M12 2.5v19.6M3.5 7.4l17 9.8M20.5 7.4l-17 9.8" strokeWidth={1.2} />
  </svg>
)

/** DeepSeek AI Neural Vector */
const DeepSeekIcon: FC<{ size?: number; className?: string; style?: CSSProperties }> = ({
  size = 20,
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={style}
    aria-hidden="true"
  >
    <path d="M12 2c5.52 0 10 4.48 10 10 0 4.28-2.69 7.93-6.5 9.35l-1.5-2.6c2.83-1.04 4.8-3.77 4.8-6.75 0-4.08-3.32-7.4-7.4-7.4-4.08 0-7.4 3.32-7.4 7.4 0 2.98 1.97 5.71 4.8 6.75l-1.5 2.6C3.49 19.93.8 16.28.8 12 .8 6.48 5.28 2 10.8 2h1.2zM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
  </svg>
)

/** OpenRouter Node / Router Vector */
const OpenRouterIcon: FC<{ size?: number; className?: string; style?: CSSProperties }> = ({
  size = 20,
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    className={className}
    style={style}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <circle cx="4" cy="12" r="2" />
    <circle cx="20" cy="12" r="2" />
    <circle cx="12" cy="4" r="2" />
    <circle cx="12" cy="20" r="2" />
    <path d="M6 12h3M15 12h3M12 6v3M12 15v3" />
  </svg>
)

/** Midjourney Sailboat Vector */
const MidjourneyIcon: FC<{ size?: number; className?: string; style?: CSSProperties }> = ({
  size = 20,
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={style}
    aria-hidden="true"
  >
    <path d="M12.5 3c-.5 0-.9.4-.9.9v10.2L5.8 18.2c-.6.4-.3 1.4.4 1.4h11.6c.7 0 1-.9.4-1.4L13.4 14.1V3.9c0-.5-.4-.9-.9-.9zm-2.2 4.4L6 14.1h4.3V7.4zm4.4 0v6.7h4.3L14.7 7.4z" />
  </svg>
)

/** Generic process mark for non-catalog custom services. */
const ProcessIcon: FC<{ size?: number; className?: string; style?: CSSProperties }> = ({
  size = 20,
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className={className}
    style={style}
    aria-hidden="true"
  >
    <rect x="2.6" y="2.6" width="18.8" height="18.8" />
    <path d="M2.6 12h18.8M12 2.6v18.8" strokeWidth={0.8} />
    <rect x="7.4" y="7.4" width="9.2" height="9.2" fill="currentColor" />
  </svg>
)

type IconRenderer = IconType | FC<{ size?: number; className?: string; style?: CSSProperties }>

const OFFICIAL_ICONS: Record<string, IconRenderer> = {
  netflix: SiNetflix,
  spotify: SiSpotify,
  youtube: SiYoutube,
  prime: FaAmazon,
  amazon: FaAmazon,
  hotstar: TbBrandDisney,
  disney: TbBrandDisney,
  applemusic: SiApplemusic,
  appletv: SiAppletv,
  crunchyroll: SiCrunchyroll,
  miro: SiMiro,
  apple: FaApple,
  icloud: SiIcloud,
  googleone: TbBrandGoogleOne,
  gemini: SiGooglegemini,
  google: FaGoogle,
  googledrive: SiGoogledrive,
  github: SiGithub,
  copilot: SiGithubcopilot,
  openai: RiOpenaiFill,
  chatgpt: RiOpenaiFill,
  claude: SiClaude,
  anthropic: SiClaude,
  perplexity: SiPerplexity,
  cursor: CursorIcon,
  deepseek: DeepSeekIcon,
  openrouter: OpenRouterIcon,
  midjourney: MidjourneyIcon,
  notion: SiNotion,
  adobe: TbBrandAdobe,
  canva: CanvaIcon,
  figma: SiFigma,
  dropbox: SiDropbox,
  microsoft: FaMicrosoft,
  audible: SiAudible,
  cultfit: CultfitIcon,
  coursera: SiCoursera,
  discord: SiDiscord,
  slack: FaSlack,
  x: SiX,
  twitter: SiX,
  vercel: SiVercel,
  supabase: SiSupabase,
  linear: SiLinear,
  jira: SiJira,
  gitlab: SiGitlab,
  docker: SiDocker,
  kubernetes: SiKubernetes,
  aws: FaAws,
  digitalocean: SiDigitalocean,
  cloudflare: SiCloudflare,
  onepassword: Si1Password,
  bitwarden: SiBitwarden,
  nordvpn: SiNordvpn,
  proton: SiProtonmail,
  protonmail: SiProtonmail,
  protonvpn: SiProtonvpn,
  strava: SiStrava,
  duolingo: SiDuolingo,
  uber: SiUber,
  swiggy: SiSwiggy,
  zomato: SiZomato,
  airbnb: SiAirbnb,
  medium: SiMedium,
  substack: SiSubstack,
  patreon: SiPatreon,
  linkedin: FaLinkedin,
  twitch: SiTwitch,
  steam: SiSteam,
  playstation: SiPlaystation,
  xbox: FaXbox,
  nintendo: TbDeviceNintendo,
  zoom: SiZoom,
  telegram: FaTelegram,
  whatsapp: FaWhatsapp,
  reddit: FaReddit,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  max: SiMax,
  hbo: SiHbo,
  paramount: SiParamountplus,
  tidal: SiTidal,
  deezer: SiDeezer,
  soundcloud: SiSoundcloud,
  fitbit: SiFitbit,
  peloton: SiPeloton,
  headspace: SiHeadspace,
  lastpass: SiLastpass,
  expressvpn: SiExpressvpn,
  process: ProcessIcon,
}

export const GLYPH_KEYS = Object.keys(OFFICIAL_ICONS)

/** Resolves any typed name or key into the matching official icon renderer. */
function resolveIcon(input?: string): IconRenderer | undefined {
  if (!input) return undefined
  const raw = input.trim().toLowerCase()
  if (OFFICIAL_ICONS[raw]) return OFFICIAL_ICONS[raw]

  // Clean common suffixes and separators
  const clean = raw.replace(/[-_.\s+]/g, '')
  if (OFFICIAL_ICONS[clean]) return OFFICIAL_ICONS[clean]

  // Fuzzy prefix and keyword resolution
  if (clean.includes('netflix')) return SiNetflix
  if (clean.includes('spotify')) return SiSpotify
  if (clean.includes('youtube') || clean.startsWith('yt')) return SiYoutube
  if (clean.includes('prime') || clean.includes('amazon')) return FaAmazon
  if (clean.includes('hotstar') || clean.includes('disney')) return TbBrandDisney
  if (clean.includes('applemusic')) return SiApplemusic
  if (clean.includes('icloud')) return SiIcloud
  if (clean.includes('apple')) return FaApple
  if (clean.includes('gemini')) return SiGooglegemini
  if (clean.includes('googleone')) return TbBrandGoogleOne
  if (clean.includes('googledrive') || clean.includes('gdrive')) return SiGoogledrive
  if (clean.includes('google')) return FaGoogle
  if (clean.includes('copilot')) return SiGithubcopilot
  if (clean.includes('github')) return SiGithub
  if (clean.includes('chatgpt') || clean.includes('openai') || clean.includes('gpt')) return RiOpenaiFill
  if (clean.includes('claude') || clean.includes('anthropic')) return SiClaude
  if (clean.includes('perplexity')) return SiPerplexity
  if (clean.includes('cursor')) return CursorIcon
  if (clean.includes('deepseek')) return DeepSeekIcon
  if (clean.includes('openrouter')) return OpenRouterIcon
  if (clean.includes('midjourney')) return MidjourneyIcon
  if (clean.includes('notion')) return SiNotion
  if (clean.includes('adobe') || clean.includes('photoshop') || clean.includes('illustrator')) return TbBrandAdobe
  if (clean.includes('canva')) return CanvaIcon
  if (clean.includes('figma')) return SiFigma
  if (clean.includes('dropbox')) return SiDropbox
  if (clean.includes('microsoft') || clean.includes('office') || clean.includes('365') || clean.includes('onedrive')) return FaMicrosoft
  if (clean.includes('audible')) return SiAudible
  if (clean.includes('cult') || clean.includes('curefit')) return CultfitIcon
  if (clean.includes('coursera')) return SiCoursera
  if (clean.includes('discord')) return SiDiscord
  if (clean.includes('slack')) return FaSlack
  if (clean.includes('twitter') || clean === 'x') return SiX
  if (clean.includes('claude') || clean.includes('anthropic')) return SiClaude
  if (clean.includes('perplexity')) return SiPerplexity
  if (clean.includes('vercel')) return SiVercel
  if (clean.includes('supabase')) return SiSupabase
  if (clean.includes('linear')) return SiLinear
  if (clean.includes('jira') || clean.includes('atlassian')) return SiJira
  if (clean.includes('gitlab')) return SiGitlab
  if (clean.includes('docker')) return SiDocker
  if (clean.includes('kubernetes') || clean.includes('k8s')) return SiKubernetes
  if (clean.includes('aws')) return FaAws
  if (clean.includes('digitalocean')) return SiDigitalocean
  if (clean.includes('cloudflare')) return SiCloudflare
  if (clean.includes('1password') || clean.includes('onepassword')) return Si1Password
  if (clean.includes('bitwarden')) return SiBitwarden
  if (clean.includes('nordvpn') || clean.includes('nord')) return SiNordvpn
  if (clean.includes('proton')) return SiProtonmail
  if (clean.includes('strava')) return SiStrava
  if (clean.includes('duolingo')) return SiDuolingo
  if (clean.includes('uber')) return SiUber
  if (clean.includes('swiggy')) return SiSwiggy
  if (clean.includes('zomato')) return SiZomato
  if (clean.includes('airbnb')) return SiAirbnb
  if (clean.includes('medium')) return SiMedium
  if (clean.includes('substack')) return SiSubstack
  if (clean.includes('patreon')) return SiPatreon
  if (clean.includes('linkedin')) return FaLinkedin
  if (clean.includes('twitch')) return SiTwitch
  if (clean.includes('steam')) return SiSteam
  if (clean.includes('playstation') || clean.includes('psplus')) return SiPlaystation
  if (clean.includes('xbox') || clean.includes('gamepass')) return FaXbox
  if (clean.includes('nintendo')) return TbDeviceNintendo
  if (clean.includes('zoom')) return SiZoom
  if (clean.includes('telegram')) return FaTelegram
  if (clean.includes('whatsapp')) return FaWhatsapp
  if (clean.includes('reddit')) return FaReddit
  if (clean.includes('instagram')) return FaInstagram
  if (clean.includes('tiktok')) return FaTiktok
  if (clean.includes('hbo') || clean.includes('max')) return SiMax
  if (clean.includes('paramount')) return SiParamountplus
  if (clean.includes('tidal')) return SiTidal
  if (clean.includes('deezer')) return SiDeezer
  if (clean.includes('soundcloud')) return SiSoundcloud
  if (clean.includes('fitbit')) return SiFitbit
  if (clean.includes('peloton')) return SiPeloton
  if (clean.includes('headspace')) return SiHeadspace
  if (clean.includes('lastpass')) return SiLastpass
  if (clean.includes('expressvpn')) return SiExpressvpn

  return undefined
}

export function ServiceGlyph({
  size = 20,
  className,
  fallback,
  style,
}: GlyphProps): ReactNode {
  const IconComponent = resolveIcon(fallback)

  if (IconComponent) {
    return <IconComponent size={size} className={className} style={style} />
  }

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
    </svg>
  )
}
