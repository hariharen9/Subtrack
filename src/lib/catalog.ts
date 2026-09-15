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
  // --- ENTERTAINMENT & STREAMING ---
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
      { label: 'Super (Annual)', price: 899, cycle: 'yearly' },
      { label: 'Premium (Monthly)', price: 299, cycle: 'monthly' },
      { label: 'Premium (Annual)', price: 1499, cycle: 'yearly' },
    ],
    aliases: ['hotstar', 'disney', 'sports', 'cricket'],
  },
  {
    id: 'apple-tv',
    name: 'Apple TV+',
    category: 'entertainment',
    price: 99,
    cycle: 'monthly',
    color: '#FFFFFF',
    glyph: 'appletv',
    tiers: [
      { label: 'Monthly', price: 99, cycle: 'monthly' },
      { label: 'Apple One', price: 195, cycle: 'monthly' },
    ],
    aliases: ['apple', 'tv', 'movies', 'ted lasso'],
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    category: 'entertainment',
    price: 99,
    cycle: 'monthly',
    color: '#FF6B00',
    glyph: 'crunchyroll',
    tiers: [
      { label: 'Fan', price: 79, cycle: 'monthly' },
      { label: 'Mega Fan', price: 99, cycle: 'monthly' },
      { label: 'Annual Mega Fan', price: 999, cycle: 'yearly' },
    ],
    aliases: ['anime', 'manga', 'streaming'],
  },
  {
    id: 'max',
    name: 'Max / HBO Max',
    category: 'entertainment',
    price: 850,
    cycle: 'monthly',
    color: '#002BE7',
    glyph: 'max',
    tiers: [
      { label: 'Standard', price: 850, cycle: 'monthly' },
      { label: 'Ultimate 4K', price: 1250, cycle: 'monthly' },
    ],
    aliases: ['hbo', 'warner', 'streaming'],
  },

  // --- MUSIC & AUDIO ---
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
    id: 'audible',
    name: 'Audible',
    category: 'entertainment',
    price: 199,
    cycle: 'monthly',
    color: '#F8991C',
    glyph: 'audible',
    tiers: [
      { label: 'Monthly', price: 199, cycle: 'monthly' },
      { label: 'Annual', price: 1999, cycle: 'yearly' },
    ],
    aliases: ['audiobooks', 'books', 'amazon'],
  },
  {
    id: 'tidal',
    name: 'Tidal',
    category: 'music',
    price: 299,
    cycle: 'monthly',
    color: '#00FFFF',
    glyph: 'tidal',
    tiers: [
      { label: 'HiFi', price: 299, cycle: 'monthly' },
      { label: 'Family', price: 449, cycle: 'monthly' },
    ],
    aliases: ['lossless', 'hifi', 'music'],
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud Go+',
    category: 'music',
    price: 199,
    cycle: 'monthly',
    color: '#FF5500',
    glyph: 'soundcloud',
    aliases: ['tracks', 'indie', 'audio'],
  },

  // --- AI & INTELLIGENCE ---
  {
    id: 'chatgpt',
    name: 'ChatGPT Plus',
    category: 'ai',
    price: 1999,
    cycle: 'monthly',
    color: '#10A37F',
    glyph: 'openai',
    tiers: [
      { label: 'Plus', price: 1999, cycle: 'monthly' },
      { label: 'Team', price: 2500, cycle: 'monthly' },
      { label: 'Pro', price: 17200, cycle: 'monthly' },
    ],
    aliases: ['openai', 'ai', 'gpt', 'gpt-4o', 'o1', 'assistant'],
  },
  {
    id: 'claude',
    name: 'Claude Pro',
    category: 'ai',
    price: 1999,
    cycle: 'monthly',
    color: '#D97706',
    glyph: 'claude',
    tiers: [
      { label: 'Pro', price: 1999, cycle: 'monthly' },
      { label: 'Team', price: 2500, cycle: 'monthly' },
    ],
    aliases: ['anthropic', 'sonnet', 'opus', 'ai', 'assistant'],
  },
  {
    id: 'gemini',
    name: 'Google Gemini Advanced',
    category: 'ai',
    price: 1950,
    cycle: 'monthly',
    color: '#1BA1E2',
    glyph: 'gemini',
    tiers: [
      { label: 'Advanced (2 TB)', price: 1950, cycle: 'monthly' },
    ],
    aliases: ['google', 'ai', 'bard', 'gemini 1.5', 'ultra'],
  },
  {
    id: 'cursor',
    name: 'Cursor Pro',
    category: 'ai',
    price: 1650,
    cycle: 'monthly',
    color: '#00FFE0',
    glyph: 'cursor',
    tiers: [
      { label: 'Pro', price: 1650, cycle: 'monthly' },
      { label: 'Business', price: 3300, cycle: 'monthly' },
    ],
    aliases: ['ide', 'editor', 'code', 'copilot', 'ai', 'anysphere'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek API / Chat',
    category: 'ai',
    price: 500,
    cycle: 'monthly',
    color: '#0066FF',
    glyph: 'deepseek',
    tiers: [
      { label: 'Base Reserve', price: 500, cycle: 'monthly' },
      { label: 'Pro Reserve', price: 1500, cycle: 'monthly' },
    ],
    aliases: ['deepseek-v3', 'r1', 'reasoning', 'ai', 'china'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter Credit',
    category: 'ai',
    price: 850,
    cycle: 'monthly',
    color: '#6366F1',
    glyph: 'openrouter',
    tiers: [
      { label: 'Monthly Credit', price: 850, cycle: 'monthly' },
      { label: 'High Volume', price: 2500, cycle: 'monthly' },
    ],
    aliases: ['llm', 'api', 'router', 'models', 'claude', 'gpt'],
  },
  {
    id: 'perplexity',
    name: 'Perplexity Pro',
    category: 'ai',
    price: 1999,
    cycle: 'monthly',
    color: '#20B2AA',
    glyph: 'perplexity',
    tiers: [
      { label: 'Pro Monthly', price: 1999, cycle: 'monthly' },
      { label: 'Pro Annual', price: 16500, cycle: 'yearly' },
    ],
    aliases: ['search', 'ai', 'research', 'citations', 'sonar'],
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    category: 'ai',
    price: 850,
    cycle: 'monthly',
    color: '#FFFFFF',
    glyph: 'midjourney',
    tiers: [
      { label: 'Basic', price: 850, cycle: 'monthly' },
      { label: 'Standard', price: 2500, cycle: 'monthly' },
      { label: 'Pro', price: 5000, cycle: 'monthly' },
    ],
    aliases: ['image', 'art', 'generation', 'diffusion', 'ai'],
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    category: 'ai',
    price: 850,
    cycle: 'monthly',
    color: '#8B949E',
    glyph: 'copilot',
    tiers: [
      { label: 'Individual', price: 850, cycle: 'monthly' },
      { label: 'Business', price: 1650, cycle: 'monthly' },
    ],
    aliases: ['code', 'github', 'ai', 'developer'],
  },

  // --- PRODUCTIVITY & DESIGN ---
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
    id: 'microsoft-365',
    name: 'Microsoft 365',
    category: 'productivity',
    price: 4899,
    cycle: 'yearly',
    color: '#0078D4',
    glyph: 'microsoft',
    tiers: [
      { label: 'Personal (Annual)', price: 4899, cycle: 'yearly' },
      { label: 'Family (Annual)', price: 6199, cycle: 'yearly' },
      { label: 'Business Basic', price: 135, cycle: 'monthly' },
      { label: 'Business Standard', price: 750, cycle: 'monthly' },
    ],
    aliases: ['office', 'word', 'excel', 'onedrive'],
  },
  {
    id: 'linear',
    name: 'Linear',
    category: 'productivity',
    price: 850,
    cycle: 'monthly',
    color: '#5E6AD2',
    glyph: 'linear',
    tiers: [
      { label: 'Standard', price: 850, cycle: 'monthly' },
      { label: 'Plus', price: 1250, cycle: 'monthly' },
    ],
    aliases: ['issues', 'pm', 'agile', 'dev'],
  },
  {
    id: 'slack',
    name: 'Slack Pro',
    category: 'productivity',
    price: 650,
    cycle: 'monthly',
    color: '#4A154B',
    glyph: 'slack',
    tiers: [
      { label: 'Pro', price: 650, cycle: 'monthly' },
      { label: 'Business+', price: 1100, cycle: 'monthly' },
    ],
    aliases: ['chat', 'team', 'messages'],
  },
  {
    id: 'jira',
    name: 'Jira Software',
    category: 'productivity',
    price: 650,
    cycle: 'monthly',
    color: '#0052CC',
    glyph: 'jira',
    aliases: ['atlassian', 'issues', 'scrum'],
  },
  {
    id: 'miro',
    name: 'Miro',
    category: 'productivity',
    price: 650,
    cycle: 'monthly',
    color: '#FFD02F',
    glyph: 'miro',
    aliases: ['whiteboard', 'brainstorm', 'diagram'],
  },

  // --- DEVELOPER & CLOUD INFRASTRUCTURE ---
  {
    id: 'github',
    name: 'GitHub Pro',
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
    id: 'gitlab',
    name: 'GitLab Premium',
    category: 'productivity',
    price: 2400,
    cycle: 'monthly',
    color: '#FC6D26',
    glyph: 'gitlab',
    aliases: ['ci', 'git', 'devops'],
  },
  {
    id: 'vercel',
    name: 'Vercel Pro',
    category: 'cloud',
    price: 1650,
    cycle: 'monthly',
    color: '#FFFFFF',
    glyph: 'vercel',
    tiers: [
      { label: 'Pro', price: 1650, cycle: 'monthly' },
    ],
    aliases: ['nextjs', 'deploy', 'hosting', 'frontend'],
  },
  {
    id: 'supabase',
    name: 'Supabase Pro',
    category: 'cloud',
    price: 2100,
    cycle: 'monthly',
    color: '#3ECF8E',
    glyph: 'supabase',
    tiers: [
      { label: 'Pro', price: 2100, cycle: 'monthly' },
    ],
    aliases: ['postgres', 'database', 'backend', 'auth'],
  },
  {
    id: 'docker',
    name: 'Docker Pro',
    category: 'productivity',
    price: 450,
    cycle: 'monthly',
    color: '#2496ED',
    glyph: 'docker',
    aliases: ['containers', 'dev', 'kubernetes'],
  },
  {
    id: 'aws',
    name: 'Amazon Web Services',
    category: 'cloud',
    price: 2500,
    cycle: 'monthly',
    color: '#FF9900',
    glyph: 'aws',
    aliases: ['ec2', 's3', 'cloud', 'hosting'],
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean',
    category: 'cloud',
    price: 500,
    cycle: 'monthly',
    color: '#0080FF',
    glyph: 'digitalocean',
    aliases: ['droplet', 'vps', 'cloud'],
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Pro',
    category: 'cloud',
    price: 1650,
    cycle: 'monthly',
    color: '#F38020',
    glyph: 'cloudflare',
    aliases: ['dns', 'cdn', 'security', 'workers'],
  },

  // --- CLOUD STORAGE & SECURITY ---
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
      { label: '2 TB AI Premium', price: 1950, cycle: 'monthly' },
    ],
    aliases: ['drive', 'storage', 'google', 'gemini'],
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
    id: '1password',
    name: '1Password',
    category: 'other',
    price: 299,
    cycle: 'monthly',
    color: '#0A85EA',
    glyph: 'onepassword',
    tiers: [
      { label: 'Individual', price: 299, cycle: 'monthly' },
      { label: 'Families', price: 499, cycle: 'monthly' },
    ],
    aliases: ['passwords', 'security', 'vault'],
  },
  {
    id: 'bitwarden',
    name: 'Bitwarden Premium',
    category: 'other',
    price: 90,
    cycle: 'monthly',
    color: '#175DDC',
    glyph: 'bitwarden',
    tiers: [
      { label: 'Premium (Annual)', price: 990, cycle: 'yearly' },
      { label: 'Families (Annual)', price: 3300, cycle: 'yearly' },
    ],
    aliases: ['passwords', 'open source', 'security'],
  },
  {
    id: 'nordvpn',
    name: 'NordVPN',
    category: 'other',
    price: 399,
    cycle: 'monthly',
    color: '#4687FF',
    glyph: 'nordvpn',
    tiers: [
      { label: 'Monthly', price: 999, cycle: 'monthly' },
      { label: '1-Year Plan', price: 399, cycle: 'monthly' },
      { label: '2-Year Plan', price: 289, cycle: 'monthly' },
    ],
    aliases: ['vpn', 'privacy', 'security'],
  },
  {
    id: 'proton',
    name: 'Proton Unlimited',
    category: 'other',
    price: 850,
    cycle: 'monthly',
    color: '#6D4AFF',
    glyph: 'proton',
    tiers: [
      { label: 'Mail Plus', price: 350, cycle: 'monthly' },
      { label: 'Unlimited', price: 850, cycle: 'monthly' },
      { label: 'VPN Plus', price: 450, cycle: 'monthly' },
    ],
    aliases: ['mail', 'vpn', 'encrypted', 'privacy'],
  },

  // --- FITNESS & HEALTH ---
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
      { label: 'Gym (Monthly)', price: 1499, cycle: 'monthly' },
      { label: 'Elite (Annual)', price: 14999, cycle: 'yearly' },
    ],
    aliases: ['gym', 'workout', 'fitness', 'curefit'],
  },
  {
    id: 'strava',
    name: 'Strava Subscription',
    category: 'fitness',
    price: 299,
    cycle: 'monthly',
    color: '#FC4C02',
    glyph: 'strava',
    tiers: [
      { label: 'Monthly', price: 299, cycle: 'monthly' },
      { label: 'Annual', price: 2499, cycle: 'yearly' },
    ],
    aliases: ['running', 'cycling', 'gps', 'workout'],
  },
  {
    id: 'fitbit',
    name: 'Fitbit Premium',
    category: 'fitness',
    price: 99,
    cycle: 'monthly',
    color: '#00B0B9',
    glyph: 'fitbit',
    aliases: ['health', 'sleep', 'steps'],
  },
  {
    id: 'headspace',
    name: 'Headspace',
    category: 'fitness',
    price: 299,
    cycle: 'monthly',
    color: '#F47D31',
    glyph: 'headspace',
    tiers: [
      { label: 'Monthly', price: 299, cycle: 'monthly' },
      { label: 'Annual', price: 1499, cycle: 'yearly' },
    ],
    aliases: ['meditation', 'sleep', 'mental health'],
  },

  // --- LEARNING & READING ---
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
    aliases: ['courses', 'learning', 'study', 'certifications'],
  },
  {
    id: 'duolingo',
    name: 'Duolingo Super',
    category: 'education',
    price: 149,
    cycle: 'monthly',
    color: '#58CC02',
    glyph: 'duolingo',
    tiers: [
      { label: 'Individual (Monthly)', price: 149, cycle: 'monthly' },
      { label: 'Family (Annual)', price: 2499, cycle: 'yearly' },
    ],
    aliases: ['languages', 'spanish', 'french', 'learning'],
  },
  {
    id: 'medium',
    name: 'Medium Membership',
    category: 'education',
    price: 415,
    cycle: 'monthly',
    color: '#FFFFFF',
    glyph: 'medium',
    tiers: [
      { label: 'Monthly', price: 415, cycle: 'monthly' },
      { label: 'Annual', price: 4150, cycle: 'yearly' },
    ],
    aliases: ['articles', 'reading', 'blogs', 'tech'],
  },
  {
    id: 'substack',
    name: 'Substack Newsletter',
    category: 'education',
    price: 500,
    cycle: 'monthly',
    color: '#FF6719',
    glyph: 'substack',
    aliases: ['newsletter', 'writers', 'read'],
  },

  // --- GAMING & LIFESTYLE ---
  {
    id: 'playstation-plus',
    name: 'PlayStation Plus',
    category: 'entertainment',
    price: 499,
    cycle: 'monthly',
    color: '#003791',
    glyph: 'playstation',
    tiers: [
      { label: 'Essential', price: 499, cycle: 'monthly' },
      { label: 'Extra', price: 749, cycle: 'monthly' },
      { label: 'Deluxe', price: 849, cycle: 'monthly' },
      { label: 'Deluxe Annual', price: 7599, cycle: 'yearly' },
    ],
    aliases: ['ps5', 'ps4', 'sony', 'games'],
  },
  {
    id: 'xbox-gamepass',
    name: 'Xbox Game Pass',
    category: 'entertainment',
    price: 549,
    cycle: 'monthly',
    color: '#107C10',
    glyph: 'xbox',
    tiers: [
      { label: 'Core', price: 349, cycle: 'monthly' },
      { label: 'PC', price: 349, cycle: 'monthly' },
      { label: 'Ultimate', price: 549, cycle: 'monthly' },
    ],
    aliases: ['microsoft', 'gaming', 'pc games'],
  },
  {
    id: 'nintendo-online',
    name: 'Nintendo Switch Online',
    category: 'entertainment',
    price: 320,
    cycle: 'monthly',
    color: '#E60012',
    glyph: 'nintendo',
    tiers: [
      { label: 'Individual (Annual)', price: 1650, cycle: 'yearly' },
      { label: 'Expansion Pack', price: 4100, cycle: 'yearly' },
    ],
    aliases: ['switch', 'mario', 'zelda'],
  },
  {
    id: 'discord-nitro',
    name: 'Discord Nitro',
    category: 'entertainment',
    price: 299,
    cycle: 'monthly',
    color: '#5865F2',
    glyph: 'discord',
    tiers: [
      { label: 'Basic', price: 99, cycle: 'monthly' },
      { label: 'Nitro', price: 299, cycle: 'monthly' },
      { label: 'Nitro Annual', price: 2999, cycle: 'yearly' },
    ],
    aliases: ['chat', 'voice', 'gaming', 'emojis'],
  },
  {
    id: 'x-premium',
    name: 'X Premium',
    category: 'productivity',
    price: 650,
    cycle: 'monthly',
    color: '#FFFFFF',
    glyph: 'x',
    tiers: [
      { label: 'Basic', price: 245, cycle: 'monthly' },
      { label: 'Premium', price: 650, cycle: 'monthly' },
      { label: 'Premium+', price: 1300, cycle: 'monthly' },
    ],
    aliases: ['twitter', 'blue', 'social'],
  },
  {
    id: 'linkedin-premium',
    name: 'LinkedIn Premium',
    category: 'productivity',
    price: 1799,
    cycle: 'monthly',
    color: '#0A66C2',
    glyph: 'linkedin',
    tiers: [
      { label: 'Career', price: 1799, cycle: 'monthly' },
      { label: 'Business', price: 2999, cycle: 'monthly' },
    ],
    aliases: ['jobs', 'networking', 'inmail'],
  },
  {
    id: 'swiggy-one',
    name: 'Swiggy One',
    category: 'shopping',
    price: 149,
    cycle: 'quarterly',
    color: '#FC8019',
    glyph: 'swiggy',
    tiers: [
      { label: 'Quarterly', price: 149, cycle: 'quarterly' },
      { label: 'Annual', price: 499, cycle: 'yearly' },
    ],
    aliases: ['food', 'instamart', 'delivery', 'dining'],
  },
  {
    id: 'zomato-gold',
    name: 'Zomato Gold',
    category: 'shopping',
    price: 99,
    cycle: 'quarterly',
    color: '#E23744',
    glyph: 'zomato',
    tiers: [
      { label: '3 Months', price: 99, cycle: 'quarterly' },
      { label: 'Annual', price: 349, cycle: 'yearly' },
    ],
    aliases: ['food', 'dining', 'delivery', 'blinkit'],
  },
  {
    id: 'uber-one',
    name: 'Uber One',
    category: 'shopping',
    price: 149,
    cycle: 'monthly',
    color: '#000000',
    glyph: 'uber',
    aliases: ['cabs', 'rides', 'travel', 'delivery'],
  },
]

export const CATALOG_BY_ID = new Map(SERVICE_CATALOG.map((s) => [s.id, s]))

export function searchCatalog(query: string, limit = 60): CatalogService[] {
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

