# SPENDSTATE // FINANCIAL OPERATING SYSTEM `v0.0.1`

```
  ____  _   _ ____ _____ ____      _    ____ _  __
 / ___|| | | | __ )_   _|  _ \    / \  / ___| |/ /
 \___ \| | | |  _ \ | | | |_) |  / _ \| |   | ' / 
  ___) | |_| | |_) || | |  _ <  / ___ \ |___| . \ 
 |____/ \___/|____/ |_| |_| \_\/_/   \_\____|_|\_\
 // LOCAL-FIRST · OFFLINE-READY · FINANCIAL OPERATING SYSTEM
```

**SpendState is a deterministic, local-first Financial Operating System — a shell of independent financial engines, the first of which (Subscriptions) is fully live.**

The shell treats every financial engine as a domain with its own cockpit. Subscriptions — already live — treats each recurring service as an **active background process** running on your personal financial volume:
- **Subscriptions are Processes**: Each service is an active background process with an identity (`SUB-XXXXX`), status (`active`, `suspended`, `terminated`), and cycle interval.
- **Money is Resource Consumption**: Charges represent compute/resource cycles. SpendState normalizes all billing schedules into **Burn Rate** (daily, monthly, annual).
- **Renewals are Scheduled Events**: Future billing dates are derived deterministically as `anchor + k × interval` — no calendar day drift.
- **Your Device is the Host Volume**: Zero telemetry, zero cloud databases, zero accounts. 100% offline-first IndexedDB storage via Dexie.js. Credit Cards, Loans & EMIs, and Daily Spends are queued behind it.

---

## Quick Start

```bash
pnpm install          # or npm install
pnpm dev              # start development server (http://localhost:5173)
pnpm build            # strict TypeScript check + production bundle
pnpm preview          # preview production PWA locally
pnpm icons            # regenerate PWA vector icons and textures
```

> [!TIP]
> On first boot, SpendState automatically seeds a realistic dataset of 17 subscriptions (15 active, 1 suspended, 1 terminated) with a reconstructed transaction ledger so you can explore the analytics immediately.

---

## Financial OS Domains & Subsystems

The application is a **Financial Operating System shell** around independent domain engines. Each domain owns a cockpit (sub-navigation) rendered by the shell; the composition is data-driven in `src/app/nav.ts`, so adding an engine means one entry + one page.

| Domain | Route | Status | Purpose & Capabilities |
| :--- | :--- | :--- | :--- |
| **`CMD`** Master Command | `/` | **Live** | The OS cockpit: Total System Burn roll-up, per-engine burn tags, subsystem status matrix (LIVE/STANDBY), next critical outflow, and burn composition across live engines. |
| **`SUBS`** Subscriptions | `/subs` | **Live** | The SpendState engine — monthly burn hero, segmented load rail, spending signal, category breakdown, concentration gauges, 30-day incoming stream. |
| — Registry | `/subs/flow` | Live | Searchable subscription index with fuzzy query parsing and multi-density grid/list views. |
| — Process Diagnostic | `/subs/flow/:id` | Live | Per-process execution history, renewal projection, schedule controls, and termination console. |
| — Payment Matrix | `/subs/time` | Live | 6-week daily cashflow grid, 13-month calendar horizon rail, and day inspector. |
| — System Insights | `/subs/data` | Live | Category distribution, concentration gauges, dormant spend scanner, cycle telemetry. |
| **`CRD`** Credit Cards | `/cards` | Standby *(v0.2.0)* | Statement cut-off mapping, 45-day zero-interest grace tracker, aggregate limit utilisation gauges. |
| **`DEBT`** Loans & EMIs | `/loans` | Standby *(v0.3.0)* | Principal vs interest decay amortization, debt runway metrics, prepayment payoff simulators. |
| **`SPND`** Daily Spends | `/spends` | Standby *(v0.4.0)* | Micro-transaction ledger, discretionary burn velocity, weekly spending limiters. |
| **`SYS`** System Host | `/sys` | **Live** | Skin selector, base currency & static FX, JSON vault backup/import, CSV export, maintenance tools. |

Legacy routes `/flow`, `/time`, `/data` redirect into `/subs/*`; `/flow/:id` renders directly so deep links keep working.

---

## Key Features

- **Cyber-Brutalist Aesthetic**: Hardware-inspired interface featuring chamfered cut-corner panels, monospace telemetry, LED status signals, hard rules, and micro typography.
- **Dual Visual Skins**: High-contrast Night mode (reference OLED dark) and Daylight mode (crisp editorial paper reprint) with smooth 200ms skin transitions.
- **Command Palette (`Ctrl+K` / `⌘K`)**: Fast search across subscriptions, categories, statuses, price thresholds (`>500`), and quick-action shortcuts.
- **Spending Signal & Velocity**: Interactive SVG waveform comparing normalized run-rate vs. actual recorded cash spikes with 3-month predictive forecasting.
- **Deterministic Math**: Static FX currency conversion and anchor-based date derivations ensure reproducible arithmetic with zero timezone or month-boundary drift.
- **PWA & Offline Resilience**: Service Worker asset caching, self-hosted variable typography (`Space Grotesk`, `JetBrains Mono`), and local persistence.

---

## The Roadmap: Live Engines → Full Financial OS

The OS shell is live today with the Subscriptions engine running inside it. The remaining engines are already scaffolded as **standby decks** in the navigation (`/cards`, `/loans`, `/spends`) — visible as honest "core pending" telemetry shells until their arithmetic ships. The same deterministic math, static FX and local IndexedDB volume will power them:

```
+-----------------------------------------------------------------------------------+
|                        SPENDSTATE // FUTURE SYSTEM TOPOLOGY                         |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                           CORE CASHFLOW ENGINES                             |  |
|  |  +---------------+  +---------------+  +---------------+  +---------------+ |  |
|  |  | SUBSCRIPTIONS |  | DAILY SPENDS  |  | CREDIT CARDS  |  | LOANS & EMIS  | |  |
|  |  | (v0.0.1 Live) |  | (Transactions)|  | (Grace Period)|  | (Amortization) | |  |
|  |  +---------------+  +---------------+  +---------------+  +---------------+ |  |
|  +-----------------------------------------------------------------------------+  |
|                                        |                                          |
|  +-----------------------------------------------------------------------------+  |
|  |                     UNIFIED FINANCIAL TELEMETRY ENGINE                      |  |
|  |   True Burn Rate · Liquidity Runway · Net Cash Velocity · Exposure Risk   |  |
|  +-----------------------------------------------------------------------------+  |
|                                        |                                          |
|  +-----------------------------------------------------------------------------+  |
|  |                     LOCAL-FIRST ENCRYPTED STORAGE ENGINE                    |  |
|  |         Zero Telemetry · Private IndexedDB · Encrypted P2P Vault Sync       |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### Roadmap & Planned Modules

1. **Credit Cards & Statement Cycle Matrix** *(standby deck live at `/cards`)*
   - Statement generation dates, due date matrices, and grace period countdown timers.
   - Multi-card utilization tracking and optimal settlement order algorithms to eliminate interest charges.

2. **Loans, EMIs & Debt Amortization Engine** *(standby deck live at `/loans`)*
   - Principal vs. interest decay curves, fixed/floating rate tracking, and amortization schedules.
   - Prepayment impact simulators: see exact months shaved off debt per extra rupee paid.

3. **Daily Spends & Micro-Transaction Ledger** *(standby deck live at `/spends`)*
   - Real-time manual/file transaction ingestion with instant category auto-assignment.
   - Variable expenditure velocity metrics and weekly discretionary burn limits.

4. **Recurring Income & Net Capital Velocity**
   - Salary and recurring cash inflow scheduling balanced against system burn rate.
   - Real-time Net Runway calculation: exact days of financial independence at current burn.

5. **Encrypted Peer-to-Peer Backup & Multi-Device Sync**
   - End-to-end encrypted backup sync without central cloud accounts or third-party data collection.

---

## Repository Structure

```
src/
├── app/nav.ts                 # DOMAINS model: domain rack, sub-navs, status
├── components/
│   ├── brand/                 # Badges, Glyphs, Wordmarks
│   ├── charts/                # BurnRail, CategoryBlock, SpendingSignal
│   ├── shell/                 # CyberShell, DomainFrame, NavRail, Palette, Toaster
│   ├── subs/                  # ProcessCard, Composer, TerminateDialog, Stream
│   └── ui/                    # CutPanel, CyberButton, Signal, Controls, Micro
├── hooks/                     # useSystem (reactive pipeline), usePlatform, useElementWidth
├── lib/
│   ├── analytics.ts           # Financial analytics pipeline (summarize, viewOf)
│   ├── catalog.ts             # Service preset catalog
│   ├── cycle.ts               # Occurrence derivation & interval math
│   ├── date.ts                # ISO calendar date arithmetic
│   ├── db.ts                  # Dexie.js database schema & CRUD write engine
│   ├── money.ts               # Static FX table & Intl number formatting
│   └── types.ts               # Domain types, categories, signals
├── pages/
│   ├── MasterCommand.tsx      # "/" — the Financial OS cockpit
│   ├── Overview.tsx           # "/subs" — the Subscriptions engine overview
│   ├── Flow.tsx, ProcessDetail.tsx, PaymentMatrix.tsx, Insights.tsx
│   ├── standby/               # CardsDeck, LoansDeck, SpendsDeck + shared StandbyDeck
│   └── Settings.tsx, NotFound.tsx
├── store/ui.ts                # Zustand UI preference store
└── styles/                    # Tokens, CSS chamfers, fonts, base reset
```

---

## Technical Specifications & Integrity

- **Strict TypeScript**: 100% strict type safety (`npm run typecheck`).
- **Zero Remote Dependencies**: Self-hosted variable fonts, SVG glyphs, offline FX tables.
- **Living Architectural Manual**: See [AGENTS.md](file:///e:/Projects/SpendState/AGENTS.md) for full architectural documentation and invariant guidelines.

---

**SPENDSTATE** — *Take control of what drains your capital.*
