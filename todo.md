**Tier 1 — turns it into a real "OS" (highest leverage)**
- **Income engine** — salary/recurring inflows, one-off income. Your whole thesis is burn *rate*; without inflow there's no net, no savings rate. New `INC` domain + `Income` model + a net-cashflow hero on Master Command. *(high effort, highest impact)*
- **Accounts + net worth** — bank/wallet/asset balances over time. Right now there are no balances at all, so "net worth" is impossible. Add a `balances` table + a net-worth trajectory. *(medium/high)*
- **Cross-engine cashflow calendar** — you have the 6-week Payment Matrix for subs; generalise it to show subs + card dues + EMIs + recurring spends + income on one calendar. *(low effort — the `matrixFor` primitive already exists)*
- **Reminders / notifications** — the app *is* scheduled events, but nothing pings you. Use the Notification API + your existing service worker (`registerType: 'prompt'` already polls) to fire **due-date, renewal, and free-trial-ending** alerts locally, with no backend. *(low/medium — pure win, fully offline)*

**Tier 2 — signature local-first intelligence**
- **Recurring-charge detection** — scan the spends + card-transaction ledger and *find* subscriptions/EMIs you didn't enter ("this looks like ₹649 every month — track it?"). This is the killer differentiator vs a manual tracker, and you already have the data. *(medium)*
- **Rules engine** — "merchant contains Swiggy → Food", auto-categorise, auto-tag on import. *(medium)*
- **Health score** — one 0–100 composite across the four engines (sub concentration, card utilisation, debt ratio, spend discipline) with a breakdown. You already compute every input. *(low/medium)*
- **"What-if" simulator** — "cancel these 3 subs → save ₹X/yr"; "prepay this loan → debt-free Y months sooner". Uses existing analytics. *(low)*
- **Anomaly alerts everywhere** — you have z-score detection in `SpendPatterns`; extend the same signal to cards (unusual purchase), subs (price hike), loans (missed EMI). *(low/medium)*

**Tier 3 — trust, power, real-world ingest**
- **Passcode lock + encryption at rest** (Web Crypto AES-GCM) — for a local-first *finance* app, "your data is encrypted, even from someone with your laptop" is a real differentiator. *(medium)*
- **Bank/CSV statement import + reconciliation** — map columns, dedupe, then reconcile against scheduled events. This is how people actually adopt it. *(medium/high)*
- **Soft-delete + undo** — replace hard deletes with a trash + "UNDO" toast (you already have the toast and armed-delete patterns). *(low)*
- **Tags, notes, and receipt attachments** — store images as IndexedDB blobs; fully offline. *(medium)*
