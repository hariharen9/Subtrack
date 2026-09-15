# SUBTRACK // FINANCIAL OPERATING SYSTEM

A subscription tracker. That is the entire product.

It answers one question — **where is my money going every month?** — and it treats
each subscription as a **process** consuming a resource. Monthly spend is
**system burn**, renewals are **scheduled events**, cancellation is **process
termination**.

Everything is local: IndexedDB on your device, no account, no backend, no
telemetry. It installs as a PWA and works with the network off.

---

## Run it

```bash
pnpm install          # or npm install
pnpm dev              # http://localhost:5173
pnpm build            # typecheck + production build into dist/
pnpm preview          # serve the built PWA
pnpm smoke            # headless runtime test (needs Chrome/Edge installed)
pnpm icons            # regenerate app icons + grain texture
```

First run seeds seventeen realistic Indian subscriptions (15 active, 1 suspended,
1 terminated) with a reconstructed payment ledger, so the console looks alive
immediately. Reset or purge it any time from **SYS → Destructive operations**.

---

## What is in the box

| Module | Route | What it does |
| --- | --- | --- |
| **CORE** Overview | `/` | Burn hero, load distribution rail, spending signal, incoming stream, process grid, system notes |
| **FLOW** Subscriptions | `/flow` | Query bar, status/category/sort filters, grid and dense list densities, archive |
| **—** Process panel | `/flow/:id` | Identity, economics, schedule, ledger, per-process signal, edit / suspend / execute cycle / terminate |
| **TIME** Payment matrix | `/time` | Six-week matrix with per-day charges and category composition, thirteen-month rail, day panel |
| **DATA** System analytics | `/data` | Headline readouts, composition strip, category blocks, radial instruments, statistics table, cycle mix |
| **SYS** Settings | `/sys` | Skin, field, calm mode, base currency + static FX table, horizon, volume export/import, shortcuts, danger zone |

**Command palette:** `⌘K` / `Ctrl+K` — commands plus a live query over the
process index. The query language accepts names, categories, statuses, cycles,
months and amounts (`netflix`, `productivity`, `>500`, `monthly`, `sep`,
`2026-09`, `active`). The parsed intent is printed back so the syntax teaches
itself.

**Shortcuts:** `1`–`5` modules · `N` initialize · `/` query · `T` theme ·
`↑ ↓` palette results · `← →` signal cursor · `Esc` close.

---

## Architecture

```
src/
  app/nav.ts                 module model (codes, labels, hotkeys)
  lib/                       the domain, framework-free and unit-testable
    types.ts                 Subscription, Payment, categories, signals
    catalog.ts               19 known services with realistic INR pricing
    date.ts                  ISO calendar-day engine (no timezone drift)
    cycle.ts                 billing intervals, occurrence generation
    money.ts                 Intl formatting, static FX conversion
    analytics.ts             burn, load, series, streams, system notes
    fuzzy.ts                 query parser + fuzzy matcher
    db.ts                    Dexie store, CRUD, snapshots (no table access outside)
    seed.ts                  internally consistent demo dataset
    portability.ts           JSON/CSV export, import, clipboard readouts
  store/ui.ts                preferences, toasts, overlay state (zustand)
  hooks/                     live queries, derived system data, platform hooks
  components/
    shell/                   CyberShell, SystemHeader, NavigationRail, MobileNav,
                             FieldOverlay, SystemFooter, CommandPalette,
                             SystemToaster, UpdatePrompt
    ui/                      CutPanel, CyberButton, Signal, DataStrip, Micro,
                             Controls, CyberDatePicker, AnimatedNumber, Icons, Skeleton
    brand/                   Wordmark, ServiceGlyph (20 hand-built marks), ServiceBadge
    subs/                    ProcessCard, SubscriptionComposer, TerminateDialog,
                             TerminationConsole, IncomingStream, SystemNotes
    charts/                  BurnRail, SpendingSignal, CategoryBlock/RadialGauge
  pages/                     Overview, Flow, ProcessDetail, PaymentMatrix, Insights,
                             Settings, NotFound
```

Every write goes through `lib/db.ts`; no view touches a table directly, so a sync
engine could be attached later without changing a screen. Views never recompute
analytics — `useSystem()` derives everything once, memoised.

### Design system

**FINANCIAL CYBERCORE.** The identity is carried by CSS custom properties in
`src/styles/tokens.css`: two skins (night = reference, daylight = white
brutalist reprint) share one token API. Any surface can be forced back to the
dark skin with `data-skin="dark"`, which is how black chips stay black inside the
daylight theme.

- **Geometry** — one scale for corners, edges and offsets. Chamfered crops
  (`clip-cut*`) are real two-layer panels, because `clip-path` also clips
  `box-shadow`; offset blocks are elements, not shadows.
- **Signals** — acid (running/primary), blue (informational), orange
  (upcoming/suspended), red (terminated/attention), magenta (emphasis). The
  `BurnRail` segments are coloured by **category signal**, not brand colour, so
  the rail doubles as a composition chart and the grid never becomes a rainbow.
- **Type** — Space Grotesk for display, JetBrains Mono for every stamp, date,
  ID and number. Both self-hosted (latin + latin-ext, 96 KB total, SIL OFL).
- **Motion** — springs and 140–250 ms transitions; `MotionConfig
  reducedMotion="user"` plus a calm-mode switch; the only glitch in the product
  is a one-shot chromatic sweep on route change.

### Data model

`Subscription` carries name, price, currency, billing cycle (weekly / monthly /
quarterly / yearly / custom days), `nextBillingDate` as the cycle **anchor**,
category, glyph, accent, notes, status, `createdAt`, `updatedAt`, plus
`cyclesExecuted`, `lastUsedAt` and `statusChangedAt`.

Occurrences are always computed as `anchor + k × interval`, never stepped, so a
subscription anchored on the 31st keeps charging on the 31st. History is real
rows in a `payments` table, reconstructed from the anchor at seed time and
appended when a cycle is confirmed. Currency conversion uses a documented static
table — no live rate, the same number every time.

### Accessibility

Semantic landmarks, a skip link, real `role="dialog"` / `role="alertdialog"`
overlays with focus traps and scroll locks, `aria-pressed` / `aria-checked` /
`role="switch"` on custom controls, 44 px minimum touch targets, visible focus
rings on the darkest and lightest surfaces, keyboard operation for the palette,
the calendar, the date picker, the burn rail and the signal chart, and a
visually hidden data table behind every chart (a picture of money is not data).

### Performance

Local-first queries, one derived pass per render, `MotionValue` number
animations that never re-render React, GPU-friendly animation only (transform and
opacity), ResizeObserver-sized SVG charts drawn at exact pixel width, and
route-level code splitting with idle prefetch. Production payload: ~59 KB CSS and
a ~670 KB JS total across four chunks, precached for offline use.

---

## Verification

- `pnpm typecheck` — strict TypeScript across the whole tree.
- `pnpm smoke` — serves `dist/` and drives the real console in headless Chrome:
  boot + seed, hero value, every route, palette query parsing, the authoring
  console end to end, termination, both skins, 390 px and 320 px overflow, and
  service-worker registration. Fails on any console error or page exception.
- `node scripts/generate-icons.mjs` — the icon set and grain texture are drawn by
  a ~40-line PNG encoder, so there are no binary assets checked in by hand.

## Known gaps

- FX rates are static by design; there is no live feed (and no network calls at all).
- Multi-currency sums are converted into the base currency with that static table.
- No repeat of a *price change* history: editing a price rebuilds the ledger for
  that process rather than recording a revision.
- Cloud sync is deliberately absent; `lib/db.ts` is the single seam where it would go.
