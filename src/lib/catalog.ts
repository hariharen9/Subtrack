/**
 * SUBTRACK // SERVICE CATALOG
 *
 * Known services, with realistic Indian pricing. Picking one from the console
 * pre-fills glyph, accent, category and the cycle people actually buy — so the
 * happy path is SERVICE → PRICE → DATE → INITIALIZE.
 *
 * Marks are drawn as monochrome geometric glyphs (see ServiceGlyph) rather than
 * pasted brand artwork: the accent lives on the container, so the grid stays a
 * system instead of a sticker album.
 */
import type { BillingCycle, Category } from './types'

export interface CatalogService {
  id: string
  name: string
  category: Category
  /** Typical Indian price for the default tier, in INR. */
  price: number
  cycle: BillingCycle
  /** Brand accent — used for the module's signal strip, never as a fill. */
  color: string
  /** Glyph key resolved by ServiceGlyph. */
  glyph: string
  /** Alternative tiers worth offering in the price rail. */
  tiers?: { label: string; price: number; cycle: BillingCycle }[]
  /** Extra search terms. */
  aliases?: string[]
}

export const SERVICE_CATALOG: CatalogService[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    category: 'entertainment',
    price: 649,
    cycle: 'monthly',
    color: '#E50914',
    glyph: 'netflix',
    tiers: [
      { label: 'Mobile', price: 149, cycle: 'monthly' },
      { label: 'Basic', price: 199, cycle: 'monthly' },
      { label: 'Standard', price: 649, cycle: 'monthly' },
      { label: 'Premium', price: 799, cycle: 'monthly' },
    ],
    aliases: ['streaming', 'movies', 'series'],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    category: 'music',
    price: 119,
    cycle: 'monthly',
    color: '#1DB954',
    glyph: 'spotify',
    tiers: [
      { label: 'Individual', price: 119, cycle: 'monthly' },
      { label: 'Duo', price: 149, cycle: 'monthly' },
      { label: 'Family', price: 179, cycle: 'monthly' },
      { label: 'Annual', price: 1189, cycle: 'yearly' },
    ],
    aliases: ['music', 'podcasts'],
  },
  {
    id: 'youtube-premium',
    name: 'YouTube Premium',
    category: 'entertainment',
    price: 149,
    cycle: 'monthly',
    color: '#FF0033',
    glyph: 'youtube',
    tiers: [
      { label: 'Individual', price: 149, cycle: 'monthly' },
      { label: 'Family', price: 299, cycle: 'monthly' },
      { label: 'Annual', price: 1490, cycle: 'yearly' },
    ],
    aliases: ['yt', 'video', 'music'],
  },
  {
    id: 'amazon-prime',
    name: 'Amazon Prime',
    category: 'shopping',
    price: 1499,
    cycle: 'yearly',
    color: '#FF9900',
    glyph: 'prime',
    tiers: [
      { label: 'Monthly', price: 299, cycle: 'monthly' },
      { label: 'Quarterly', price: 599, cycle: 'quarterly' },
      { label: 'Annual', price: 1499, cycle: 'yearly' },
    ],
    aliases: ['prime video', 'shopping', 'delivery'],
  },
  {
    id: 'disney-hotstar',
    name: 'Disney+ Hotstar',
    category: 'entertainment',
    price: 299,
    cycle: 'monthly',
    color: '#1F80E0',
    glyph: 'hotstar',
    tiers: [
      { label: 'Super', price: 299, cycle: 'monthly' },
      { label: 'Premium', price: 499, cycle: 'monthly' },
      { label: 'Annual', price: 1499, cycle: 'yearly' },
    ],
    aliases: ['hotstar', 'disney', 'sports', 'cricket'],
  },
  {
    id: 'apple-music',
    name: 'Apple Music',
    category: 'music',
    price: 99,
    cycle: 'monthly',
    color: '#FA243C',
    glyph: 'applemusic',
    tiers: [
      { label: 'Student', price: 59, cycle: 'monthly' },
      { label: 'Individual', price: 99, cycle: 'monthly' },
      { label: 'Family', price: 149, cycle: 'monthly' },
    ],
    aliases: ['music', 'apple'],
  },
  {
    id: 'icloud-plus',
    name: 'iCloud+',
    category: 'cloud',
    price: 75,
    cycle: 'monthly',
    color: '#3693F3',
    glyph: 'icloud',
    tiers: [
      { label: '50 GB', price: 75, cycle: 'monthly' },
      { label: '200 GB', price: 219, cycle: 'monthly' },
      { label: '2 TB', price: 749, cycle: 'monthly' },
    ],
    aliases: ['storage', 'apple', 'backup'],
  },
  {
    id: 'google-one',
    name: 'Google One',
    category: 'cloud',
    price: 130,
    cycle: 'monthly',
    color: '#4285F4',
    glyph: 'googleone',
    tiers: [
      { label: '100 GB', price: 130, cycle: 'monthly' },
      { label: '200 GB', price: 210, cycle: 'monthly' },
      { label: '2 TB', price: 650, cycle: 'monthly' },
    ],
    aliases: ['drive', 'storage', 'google'],
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'productivity',
    price: 330,
    cycle: 'monthly',
    color: '#8B949E',
    glyph: 'github',
    tiers: [
      { label: 'Pro', price: 330, cycle: 'monthly' },
      { label: 'Copilot', price: 850, cycle: 'monthly' },
      { label: 'Team', price: 340, cycle: 'monthly' },
    ],
    aliases: ['code', 'git', 'copilot', 'dev'],
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT Plus',
    category: 'productivity',
    price: 1999,
    cycle: 'monthly',
    color: '#10A37F',
    glyph: 'openai',
    tiers: [
      { label: 'Plus', price: 1999, cycle: 'monthly' },
      { label: 'Pro', price: 17200, cycle: 'monthly' },
    ],
    aliases: ['openai', 'ai', 'gpt', 'assistant'],
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'productivity',
    price: 830,
    cycle: 'monthly',
    color: '#E9E9E6',
    glyph: 'notion',
    tiers: [
      { label: 'Plus', price: 830, cycle: 'monthly' },
      { label: 'Plus (annual)', price: 8000, cycle: 'yearly' },
      { label: 'Business', price: 1250, cycle: 'monthly' },
    ],
    aliases: ['notes', 'docs', 'wiki'],
  },
  {
    id: 'adobe',
    name: 'Adobe Creative Cloud',
    category: 'productivity',
    price: 1675,
    cycle: 'monthly',
    color: '#FA0F00',
    glyph: 'adobe',
    tiers: [
      { label: 'Photography', price: 1675, cycle: 'monthly' },
      { label: 'Single App', price: 1950, cycle: 'monthly' },
      { label: 'All Apps', price: 4325, cycle: 'monthly' },
    ],
    aliases: ['photoshop', 'lightroom', 'design', 'creative'],
  },
  {
    id: 'canva',
    name: 'Canva Pro',
    category: 'productivity',
    price: 500,
    cycle: 'monthly',
    color: '#00C4CC',
    glyph: 'canva',
    tiers: [
      { label: 'Pro (monthly)', price: 500, cycle: 'monthly' },
      { label: 'Pro (annual)', price: 3999, cycle: 'yearly' },
      { label: 'Teams', price: 850, cycle: 'monthly' },
    ],
    aliases: ['design', 'graphics', 'templates'],
  },
  {
    id: 'figma',
    name: 'Figma',
    category: 'productivity',
    price: 1200,
    cycle: 'monthly',
    color: '#F24E1E',
    glyph: 'figma',
    tiers: [
      { label: 'Professional', price: 1200, cycle: 'monthly' },
      { label: 'Organization', price: 3800, cycle: 'monthly' },
    ],
    aliases: ['design', 'ui', 'prototype'],
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'cloud',
    price: 950,
    cycle: 'monthly',
    color: '#0061FF',
    glyph: 'dropbox',
    tiers: [
      { label: 'Plus', price: 950, cycle: 'monthly' },
      { label: 'Plus (annual)', price: 9600, cycle: 'yearly' },
      { label: 'Family', price: 1650, cycle: 'monthly' },
    ],
    aliases: ['storage', 'files', 'backup'],
  },
  {
    id: 'microsoft-365',
    name: 'Microsoft 365',
    category: 'productivity',
    price: 4899,
    cycle: 'yearly',
    color: '#0078D4',
    glyph: 'microsoft',
    tiers: [
      { label: 'Personal', price: 4899, cycle: 'yearly' },
      { label: 'Family', price: 6199, cycle: 'yearly' },
      { label: 'Business', price: 750, cycle: 'monthly' },
    ],
    aliases: ['office', 'word', 'excel', 'onedrive'],
  },
  {
    id: 'audible',
    name: 'Audible',
    category: 'entertainment',
    price: 199,
    cycle: 'monthly',
    color: '#F8991C',
    glyph: 'audible',
    aliases: ['audiobooks', 'books', 'amazon'],
  },
  {
    id: 'cult-fit',
    name: 'cult.fit',
    category: 'fitness',
    price: 1499,
    cycle: 'monthly',
    color: '#FF3366',
    glyph: 'cultfit',
    tiers: [
      { label: 'Live', price: 999, cycle: 'monthly' },
      { label: 'Gym', price: 1499, cycle: 'monthly' },
      { label: 'Annual', price: 14999, cycle: 'yearly' },
    ],
    aliases: ['gym', 'workout', 'fitness', 'curefit'],
  },
  {
    id: 'coursera-plus',
    name: 'Coursera Plus',
    category: 'education',
    price: 4000,
    cycle: 'monthly',
    color: '#0056D2',
    glyph: 'coursera',
    tiers: [
      { label: 'Monthly', price: 4000, cycle: 'monthly' },
      { label: 'Annual', price: 39000, cycle: 'yearly' },
    ],
    aliases: ['courses', 'learning', 'study'],
  },
]

export const CATALOG_BY_ID = new Map(SERVICE_CATALOG.map((s) => [s.id, s]))

export function searchCatalog(query: string, limit = 6): CatalogService[] {
  const q = query.trim().toLowerCase()
  if (!q) return SERVICE_CATALOG.slice(0, limit)
  const scored = SERVICE_CATALOG.map((service) => {
    const name = service.name.toLowerCase()
    let score = 0
    if (name === q) score = 100
    else if (name.startsWith(q)) score = 80
    else if (name.includes(q)) score = 60
    else if (service.aliases?.some((a) => a.includes(q))) score = 40
    else if (service.category.includes(q)) score = 20
    return { service, score }
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.service)
}

/**
 * Best-effort match of a free-typed name onto a catalog service, so a manual
 * "netflix standard" entry still gets the Netflix mark.
 */
export function matchCatalog(name: string): CatalogService | undefined {
  const q = name.trim().toLowerCase()
  if (!q) return undefined
  return (
    CATALOG_BY_ID.get(q) ??
    SERVICE_CATALOG.find((s) => s.name.toLowerCase() === q) ??
    SERVICE_CATALOG.find((s) => q.startsWith(s.name.toLowerCase())) ??
    SERVICE_CATALOG.find((s) => q.includes(s.id)) ??
    SERVICE_CATALOG.find((s) => s.aliases?.some((a) => q === a)) ??
    SERVICE_CATALOG.find((s) => s.name.toLowerCase().includes(q) && q.length > 3)
  )
}
