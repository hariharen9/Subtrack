<div align="center">

```
  ▄▄▄▄▄▄▄   ▄▄▄▄▄▄▄
 ██▀▀▀▀▀   ██▀▀▀▀▀     S P E N D S T A T E
 ▀██████▄  ▀██████▄    ───────────────────────────────
 ▄▄▄▄▄▄██  ▄▄▄▄▄▄██    F I N A N C I A L   O S
 ▀▀▀▀▀▀▀   ▀▀▀▀▀▀▀
```

**The personal-finance operating system that runs entirely on your device.**

![status](https://img.shields.io/badge/status-v0.0.1_·_feature--complete-1A1A1A?style=flat-square)
![local-first](https://img.shields.io/badge/local--first-100%25_offline-1A1A1A?style=flat-square)
![telemetry](https://img.shields.io/badge/telemetry-none-1A1A1A?style=flat-square)
![storage](https://img.shields.io/badge/storage-IndexedDB_·_Dexie_4-1A1A1A?style=flat-square)
![react](https://img.shields.io/badge/React-19-1A1A1A?style=flat-square&logo=react&logoColor=61DAFB)
![typescript](https://img.shields.io/badge/TypeScript-7_strict-1A1A1A?style=flat-square&logo=typescript&logoColor=3178C6)
![vite](https://img.shields.io/badge/Vite-8-1A1A1A?style=flat-square&logo=vite&logoColor=FFD62E)
![tailwind](https://img.shields.io/badge/Tailwind-4-1A1A1A?style=flat-square&logo=tailwindcss&logoColor=38BDF8)

</div>

> **Your subscriptions aren't line items on a spreadsheet. They're processes running on your money — and SpendState is the operating system that watches them.**

---

## ▍ The pitch

Every finance app asks you to trust a server. SpendState asks you to trust your browser.

It's a **Financial Operating System**: a set of independent financial *engines* — subscriptions, credit cards, loans, day-to-day spends, income, accounts — running on a single, deterministic ledger that lives in **your** IndexedDB. No cloud. No account. No sign-up. No telemetry. Turn off the Wi-Fi, unplug the router, open the tab — everything still works, because there was never anything to fetch.

It doesn't guess with "AI insights". Every number is arithmetic you could do on paper: burn rate is `price × cycle factor`, the next renewal is `anchor + k × interval`, and your net worth is a subtraction you can audit row by row.

And it looks like an instrument, not a form. SpendState is built in a **hardware cyber-brutalist** idiom — chamfered panels, monospace telemetry, signal LEDs, hard rules — because money is telemetry, and telemetry deserves a console.

> [!TIP]
> **First boot seeds a full, internally-consistent demo** — 17 subscriptions with reconstructed billing history, three weeks of daily spends, 3 credit cards, 5 amortising loans, an income ledger and 5 linked accounts. Everything is live and explorable in under a second. Reset it away whenever you like.

---

## ▍ What you get

| | |
| :-- | :-- |
| **🔒 Local-first, offline-only** | Every write lands in IndexedDB. The shell is precached by a service worker, so the whole OS boots with zero network. |
| **🧮 Deterministic arithmetic** | Static FX table, anchor-based cycle dates, UTC day math. The same inputs produce the same numbers, forever — no timezone drift, no month-boundary bugs. |
| **🖥️ Six live engines** | Subscriptions · Credit Cards · Loans & EMIs · Daily Spends · Income · Accounts. Not "coming soon" — shipped. |
| **🧭 Master Command** | One cockpit that rolls every engine into a single total burn, net cashflow and net worth. |
| **🪪 The account spine** | Balances are **derived, never stored** — computed from income, spends, subscription charges, EMIs, card settlements and transfers. |
| **⌨️ Keyboard-native** | `⌘K` command palette, `/` search, single-letter actions, `1–6` domain jumps. |
| **🎨 Two skins, two modes** | Night (OLED brutalism) and Daylight (editorial paper), plus a calm **Minimal / Zen** mode. |
| **📦 Portability** | One-click JSON snapshot export/import and CSV ledgers — your data leaves as easily as it arrives. |
| **📴 Installable PWA** | Install to desktop or phone; runs like a native app, updates on your command. |

---

## ▍ The mental model

SpendState borrows the language of operating systems because recurring money really does behave like one.

- **Subscriptions are processes.** Each one has an identity (`SUB-41207`), a state (`active` / `suspended` / `terminated`), a cycle schedule and a resource-consumption rate.
- **Money is resource consumption.** Every billing cadence — weekly, monthly, quarterly, yearly, custom — normalises into **Burn Rate**: currency consumed per month and per day.
- **Renewals are scheduled events.** A renewal is never a surprise. It's `anchor + k × interval`, computed deterministically, so a subscription anchored on the 31st keeps charging on the 31st.
- **Your device is the host volume.** There is no remote backend, no user account, no cloud database, no analytics pixel. The state is *here*.

> **Terminology:** user-facing copy always says **"Subscriptions"**. The word **"process"** appears only in the OS metaphor — identifiers, comments, internal semantics.

---

## ▍ The engines

The shell is data-driven: each engine is an entry in `src/app/nav.ts` with its own cockpit, sub-navigation and identity. Adding a seventh engine is one entry plus one page — nothing else in the OS changes.

| Domain | Route | State | What it does |
| :-- | :-- | :-- | :-- |
| **`CMD`** Master Command | `/` | `LIVE` | The OS cockpit — total system burn, net cashflow, net worth, per-engine burn tags, subsystem matrix, next critical outflow, burn composition. |
| **`SPND`** Daily Spends | `/spends` | `LIVE` | Variable-cash ledger — spent-today hero, 28-day velocity, weekly discretionary limiter, category mix, income log. |
| **`SUBS`** Subscriptions | `/subs` | `LIVE` | The founding engine — burn hero, segmented load rail, spending signal, incoming stream, diagnostic boards. |
| **`CRD`** Credit Cards | `/cards` | `LIVE` | Statement cycles, utilisation, minimum due, carry cost, rewards velocity, full transaction registry. |
| **`DEBT`** Loans & EMIs | `/loans` | `LIVE` | Amortisation schedules, principal/interest decay, debt-free projection, per-EMI history. |
| **`SYS`** System Host | `/sys` | `LIVE` | Skin, currency & FX reference, horizon, vault export/import, category taxonomy, danger zone. |

Each engine exposes up to four modules — `CORE` (overview) · `FLOW` (registry) · `DATA` (insights) · and engine-specific boards like `TIME` (payment matrix) or `PATTERNS` (forensics).

**Two things are not engines, by design:**
- **Income** is a low-volume *log* — logging your salary should feel as pleasant as logging a spend. It lives inside the Spends domain (`?log=income`) and surfaces as **net cashflow** on Master Command.
- **Accounts** are the *spine* — surfaced as a full balance-sheet section inside Master Command, not a route of their own.

---

## ▍ The spine: accounts & net worth

An account is a money-holding container — bank, savings, cash, wallet, investment or credit. Its balance is **never stored**: it's the signed sum of every movement posted into it.

```
   income        →  +        subscription charges →  −
   spend         →  −        loan EMIs            →  −
   cardsettlement→  −        transfers            →  − / +

   balance = openingBalance + Σ movements
   net worth = Σ assets − (Σ credit accounts + outstanding card balances)
```

That's the whole trick: one write path, one derived truth. Change any input — a charge, a payment, a transfer — and the balance sheet, net worth and every downstream analytic recompute themselves.

---

## ▍ How it's built

Strict, one-directional layering. Data flows down; nothing reaches back up.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  FINANCIAL OS SHELL  (the dumb shell)                                     │
│  NavigationRail · MobileNav · SystemHeader · DomainFrame · CommandPalette │
├──────────────────────────────────────────────────────────────────────────┤
│  DOMAIN ENGINES  (data-driven from src/app/nav.ts)                        │
│  CMD  │  SPND  │  SUBS  │  CRD  │  DEBT  │  SYS                           │
├──────────────────────────────────────────────────────────────────────────┤
│  REACTIVE LAYER      Zustand UI store · Dexie live queries · hooks        │
├──────────────────────────────────────────────────────────────────────────┤
│  PURE ENGINES        analytics · cards · debt · spends · income · accounts│
│                      cycle · date · money · catalog · fuzzy               │
├──────────────────────────────────────────────────────────────────────────┤
│  STORAGE             Dexie.js → IndexedDB  ("spendstate", schema v6)      │
│                      the single write seam — views never touch a table    │
└──────────────────────────────────────────────────────────────────────────┘
```

Rules the codebase never breaks:

1. **Views never touch Dexie.** Every write goes through a named mutator in `src/lib/db.ts`.
2. **Derive, don't store.** Balances, burn rates, statements and net worth are all computed.
3. **Pure engines stay pure.** `analytics`, `cards`, `debt`, `spends`, `income`, `accounts` are functions of data in, numbers out — no I/O, no randomness.

---

## ▍ The three guarantees

**1 · Offline forever.** The shell, fonts, icons and textures are precached. Nothing is fetched at runtime — not a font, not an FX rate, not an icon.

**2 · Deterministic money.** FX is a documented static table keyed to INR (9 currencies). Amounts are converted at read time with `Intl.NumberFormat`. No live feed, no floating drift in display.

**3 · Deterministic dates.** All dates are plain ISO calendar days on a UTC day engine — no timezone, no DST. Occurrences are computed, never stepped, so day-of-month never drifts.

> [!NOTE]
> The trade-off is the point: because there's no server, there's also no sync, no password reset, and no "we'll email you a link". Your data is only as durable as the device it's on — so **export a snapshot** from System Host periodically.

---

## ▍ Privacy, in one paragraph

By default there is no backend to leak: no analytics SDK, no tracking pixel, no remote fonts, no external API call. SpendState cannot phone home because it has no home to phone — delete the site data and it's as if you never used it. The optional cloud mirror is the one exception: it stays off until you sign in, and even then your records are isolated to your account by owner-only database rules — no other user, and no signed-out client, can read them. Note that it is **not** end-to-end encrypted (see "What the operator can see" below).

---

## ▍ Optional: cloud sync

SpendState runs entirely on your device by default. Sync is built in and needs **no setup** — there are no keys to paste and nothing to configure:

- **Just sign in.** Google or email/password; the mirror starts on your first sign-in.
- **Nothing to configure.** The app ships already connected to its own Firebase project.
- **Your data is mirrored, not moved.** Dexie stays the engine; the cloud is a two-way copy at `users/{uid}/{table}/{id}`, written in batches of ≤500 with merge, so re-running the migration only writes what changed.
- **Isolated per account.** Owner-only rules mean your subtree is readable only by your account; every other user and every signed-out client is denied. `pnpm test:rules` proves it with 9 assertions against the local emulator.
- **Turn it off and nothing is lost.** The opt-in flag is local; the mirror detaches and Dexie keeps every record.

No Firebase Analytics, ever — the SDK is a separate lazily-imported chunk that a default install never downloads and the service worker never precaches.

**What the operator can see.** The sync database lives in the app's own Firebase project. Owner-only rules stop *other users* from reading your data, but the project owner is the database administrator and can technically access it — as with any hosted service. It is TLS in transit and encrypted at rest by Google, but **not end-to-end encrypted**. If that matters to you, simply don't enable sync: the app is complete without it, and you can export a JSON snapshot from System Host instead.

---

## ▍ Tech stack

| Layer | Choice |
| :-- | :-- |
| **UI** | React 19 · React Router 7 · Motion 13 · Tailwind CSS 4 (token-driven via `@theme inline`) |
| **State** | Zustand 5 (persisted UI prefs) · Dexie React hooks (`useLiveQuery`) |
| **Storage** | IndexedDB via Dexie 4 — 11 tables, schema v6 |
| **Build** | Vite 8 (rolldown) · TypeScript 7 (strict) · `@tailwindcss/vite` |
| **PWA** | `vite-plugin-pwa` — precache + prompt-to-update (`registerType: 'prompt'`) |
| **Icons** | `react-icons` (Simple Icons / Font Awesome / Remix / Tabler) + hand-built brand marks |
| **Type** | Space Grotesk + JetBrains Mono — self-hosted variable WOFF2 |
| **Cloud (optional)** | Firebase Auth (Google + email/password) + Firestore — lazily imported, off by default, owner-only rules |
| **Icons & assets** | `scripts/generate-icons.mjs` — a zero-dependency PNG encoder that draws the icon set and grain tile |

---

## ▍ Getting started

Requires **Node 20+** and **pnpm** (npm works too).

```bash
# clone, then:
pnpm install      # install dependencies
pnpm dev          # start the dev server → http://localhost:5173
```

The demo dataset seeds itself on first boot. Explore, then wipe it from **System Host → Danger Zone → Reset to demo / Purge all data**.

### Scripts

| Script | Does |
| :-- | :-- |
| `pnpm dev` | Start the Vite dev server with HMR |
| `pnpm build` | Strict typecheck (`tsc --noEmit`) **then** production bundle + PWA |
| `pnpm preview` | Serve the built PWA locally (`:4173`) to test offline/install |
| `pnpm typecheck` | TypeScript, strict, no emit |
| `pnpm icons` | Regenerate PWA icons and the background noise tile |
| `pnpm test:rules` | Run the Firestore security-rule assertions against the local emulator |

---

## ▍ Project structure

```
src/
├── app/nav.ts              # DOMAINS model — the rack, sub-navs and statuses
├── components/
│   ├── accounts/           # AccountsSection (the spine, inside Master Command)
│   ├── brand/              # ServiceBadge · ServiceGlyph · Wordmark
│   ├── cards/  debt/  income/  spends/  subs/   # per-engine consoles & registries
│   ├── charts/             # BurnRail · CategoryBlock · SpendingSignal · DebtCurve
│   ├── settings/           # CategoryManager (custom taxonomy)
│   ├── shell/              # CyberShell · DomainFrame · Nav · Palette · Toaster · ErrorBoundary
│   └── ui/                 # CutPanel · CyberButton · Signal · Controls · Micro · Icons
├── hooks/                  # useSystem · useSpends · useCards · useDebt · useIncome · useAccounts
├── lib/
│   ├── db.ts               # Dexie schema + the ONLY write path
│   ├── analytics.ts        # summarize · series · streams · matrix · notes
│   ├── accounts.ts         # THE SPINE — derived balances & net worth
│   ├── cards.ts  debt.ts  spends.ts  income.ts   # per-engine analytics
│   ├── cycle.ts  date.ts  money.ts  fuzzy.ts  catalog.ts  id.ts  portability.ts
│   ├── *-seed.ts           # demo datasets (guarded, resettable)
│   └── types.ts            # domain types, categories, signal maps
├── pages/                  # one module per route (~24 routes)
├── store/ui.ts             # Zustand UI store
└── styles/                 # tokens · chamfer components · fonts · Minimal/Zen skin
```

---

## ▍ Data model

Eleven tables in the `spendstate` IndexedDB volume. Reference data is normalised; display fields are denormalised so history survives a purge.

```
subscriptions ──1:N──▶ payments          creditCards ──1:N──▶ cardTransactions
loans         ──1:N──▶ loanPayments      accounts    ──1:N──▶ transfers
spends · incomes · meta
```

- **`Subscription`** — `price · currency · billingCycle · nextBillingDate (the anchor) · status · cyclesExecuted`
- **`Payment`** — a concrete charge; `origin: 'derived' | 'confirmed'`
- **`Spend` / `Income`** — the variable-cash ledger and its inflow mirror (`accountId` links each to a container)
- **`CreditCard` / `CardTransaction`** — `purchase | payment | fee | interest | reward | refund`; balance always derived
- **`Loan` / `LoanPayment`** — EMI, principal/interest split, balance-after
- **`Account` / `Transfer`** — the spine and its money movements
- **`meta`** — seed markers and settings that aren't UI prefs

---

## ▍ Keyboard

The console is meant to be driven.

| Key | Action |
| :-- | :-- |
| `⌘K` / `Ctrl K` · `/` | Command palette / search |
| `N` `X` `L` `C` `I` `A` | New subscription · log spend · loan · card txn · income · account |
| `1` – `6` | Jump to Master Command · Spends · Subs · Cards · Loans · System |
| `T` · `M` | Toggle Night/Daylight · toggle Cyber/Zen mode |
| `ESC` | Close the active console, sheet or palette |

---

## ▍ Design language & modes

**Financial cybercore.** Chamfered cut-corner panels, monospace telemetry, signal LEDs, hard rules, micro labels — all subordinate to readability. Two skins share one token API:

- **`NIGHT`** — the reference: OLED black, acid-lime signal, high-contrast telemetry.
- **`DAYLIGHT`** — a white-brutalist reprint on warm paper, with text-safe ink variants of every signal colour.
- **`MINIMAL / ZEN`** — a calm, soft-modern profile (rounded pills, circular switches, 5 zen accents) for when you want the data without the console.

Switch any of them instantly with `T` and `M`.

---

## ▍ Roadmap

v0.0.1 is **feature-complete** — all six engines ship and the ledger is coherent. What's next is hardening, not headline features:

- [ ] **Automated backups** — scheduled snapshot export + import & restore flow.
- [ ] **Renewal reminders** — "Netflix hits in 3 days", delivered as PWA notifications.
- [ ] **Test suite** — unit coverage for the deterministic engines (`date`, `cycle`, `money`, `analytics`).
- [ ] **Distinct per-domain cockpits** — deeper visual differentiation between engine overviews.
- [ ] **End-to-end encryption for the cloud mirror** — the optional Firebase sync is owner-only and TLS in transit, but not end-to-end encrypted; a self-hosted encrypted vault remains the goal.

No item on this list will ever add telemetry, a cloud account or a remote dependency.

---

## ▍ Documentation

The full architectural manual — invariants, schema, engine contracts, extension protocol — lives in **[AGENTS.md](AGENTS.md)**. It is the single source of truth for the system and is kept in lock-step with the code.

---

<div align="center">

**SPENDSTATE** — *your money, as an operating system.*

Built by **Hariharen** · [hariharen.site](https://hariharen.site)

<sub>Local-first · Zero telemetry · 100% offline</sub>

</div>
