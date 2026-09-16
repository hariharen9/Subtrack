# SUBTRACK // FINANCIAL OPERATING SYSTEM `v0.0.1`

```
  ____  _   _ ____ _____ ____      _    ____ _  __
 / ___|| | | | __ )_   _|  _ \    / \  / ___| |/ /
 \___ \| | | |  _ \ | | | |_) |  / _ \| |   | ' / 
  ___) | |_| | |_) || | |  _ <  / ___ \ |___| . \ 
 |____/ \___/|____/ |_| |_| \_\/_/   \_\____|_|\_\
 // LOCAL-FIRST · OFFLINE-READY · FINANCIAL OPERATING SYSTEM
```

**Subtrack is a deterministic, local-first Financial Operating System for recurring subscription management.**

Most financial tools treat recurring subscriptions as passive spreadsheet rows. Subtrack treats them as **active background processes** running on your personal financial volume:
- **Subscriptions are Processes**: Each service is an active background process with an identity (`SUB-XXXXX`), status (`active`, `suspended`, `terminated`), and cycle interval.
- **Money is Resource Consumption**: Charges represent compute/resource cycles. Subtrack normalizes all billing schedules into **Burn Rate** (daily, monthly, annual).
- **Renewals are Scheduled Events**: Future billing dates are derived deterministically as `anchor + k × interval` — no calendar day drift.
- **Your Device is the Host Volume**: Zero telemetry, zero cloud databases, zero accounts. 100% offline-first IndexedDB storage via Dexie.js.

---

## Quick Start

```bash
pnpm install          # or npm install
pnpm dev              # start development server (http://localhost:5173)
pnpm build            # strict TypeScript check + production bundle
pnpm preview          # preview production PWA locally
pnpm smoke            # headless runtime browser smoke test
pnpm icons            # regenerate PWA vector icons and textures
```

> [!TIP]
> On first boot, Subtrack automatically seeds a realistic dataset of 17 subscriptions (15 active, 1 suspended, 1 terminated) with a reconstructed transaction ledger so you can explore the analytics immediately.

---

## Application Modules

| Module | Route | Purpose & Capabilities |
| :--- | :--- | :--- |
| **CORE** Overview | `/` | Command center: Monthly Burn hero, Segmented Burn Rail, Spending Signal with live momentum telemetry, Category Breakdown, Concentration Exposure gauges, and 30-Day Incoming Stream. |
| **FLOW** Subscriptions | `/flow` | Complete subscription registry with query parsing, category & status filtering, multi-density views (grid/dense list), and lifecycle actions. |
| **—** Process Detail | `/flow/:id` | Deep diagnostic board for a single subscription: execution history, renewal projection, schedule rollback/forward, and termination console. |
| **TIME** Payment Matrix | `/time` | Interactive 6-week matrix mapping daily cash requirements, 13-month horizon rail, and day-by-day inspector. |
| **DATA** System Analytics | `/data` | Category distribution strip, concentration gauges, dormant spend detection, billing cycle mix, and lifetime ledger statistics. |
| **SYS** Settings | `/sys` | Skin selector (Night / Daylight), base currency, static FX table, JSON snapshot backup/import, CSV ledger export, and maintenance tools. |

---

## Key Features

- **Cyber-Brutalist Aesthetic**: Hardware-inspired interface featuring chamfered cut-corner panels, monospace telemetry, LED status signals, hard rules, and micro typography.
- **Dual Visual Skins**: High-contrast Night mode (reference OLED dark) and Daylight mode (crisp editorial paper reprint) with smooth 200ms skin transitions.
- **Command Palette (`Ctrl+K` / `⌘K`)**: Fast search across subscriptions, categories, statuses, price thresholds (`>500`), and quick-action shortcuts.
- **Spending Signal & Velocity**: Interactive SVG waveform comparing normalized run-rate vs. actual recorded cash spikes with 3-month predictive forecasting.
- **Deterministic Math**: Static FX currency conversion and anchor-based date derivations ensure reproducible arithmetic with zero timezone or month-boundary drift.
- **PWA & Offline Resilience**: Service Worker asset caching, self-hosted variable typography (`Space Grotesk`, `JetBrains Mono`), and local persistence.

---

## The Future: Beyond Subscriptions

Deep UI, hardware-grade aesthetics, and rigorous financial telemetry shouldn't stop at subscriptions. Subtrack's architecture is engineered as a foundational compute layer that will expand into a comprehensive **Personal Financial Operating System**:

```
+-----------------------------------------------------------------------------------+
|                        SUBTRACK // FUTURE SYSTEM TOPOLOGY                         |
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

1. **Daily Spends & Micro-Transaction Ledger**
   - Real-time manual/file transaction ingestion with instant category auto-assignment.
   - Variable expenditure velocity metrics and weekly discretionary burn limits.

2. **Credit Cards & Statement Cycle Matrix**
   - Statement generation dates, due date matrices, and grace period countdown timers.
   - Multi-card utilization tracking and optimal settlement order algorithms to eliminate interest charges.

3. **Loans, EMIs & Debt Amortization Engine**
   - Principal vs. interest decay curves, fixed/floating rate tracking, and amortization schedules.
   - Prepayment impact simulators: see exact months shaved off debt per extra dollar paid.

4. **Recurring Income & Net Capital Velocity**
   - Salary and recurring cash inflow scheduling balanced against system burn rate.
   - Real-time Net Runway calculation: exact days of financial independence at current burn.

5. **Encrypted Peer-to-Peer Backup & Multi-Device Sync**
   - End-to-end encrypted backup sync without central cloud accounts or third-party data collection.

---

## Repository Structure

```
src/
├── app/nav.ts                 # Navigation models, module codes, hotkeys
├── components/
│   ├── brand/                 # Badges, Glyphs, Wordmarks
│   ├── charts/                # BurnRail, CategoryBlock, SpendingSignal
│   ├── shell/                 # CyberShell, Header, NavRail, Palette, Toaster
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
├── pages/                     # Overview, Flow, ProcessDetail, PaymentMatrix, Insights, Settings
├── store/ui.ts                # Zustand UI preference store
└── styles/                    # Tokens, CSS chamfers, fonts, base reset
```

---

## Technical Specifications & Integrity

- **Strict TypeScript**: 100% strict type safety (`npm run typecheck`).
- **Zero Remote Dependencies**: Self-hosted variable fonts, SVG glyphs, offline FX tables.
- **Living Architectural Manual**: See [AGENTS.md](file:///e:/Projects/Subtrack/AGENTS.md) for full architectural documentation and invariant guidelines.

---

**SUBTRACK** — *Take control of what drains your capital.*
