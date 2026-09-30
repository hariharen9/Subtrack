/**
 * SPENDSTATE // SETTINGS (SYS)
 *
 * The control room: skin, currency, horizons, local volume operations, shortcut
 * reference and the destructive corner. Every switch explains itself, every
 * destructive action needs two deliberate presses, and nothing here talks to a
 * network.
 */
import { useState } from 'react'
import { usePayments, useSubscriptions, useSystem } from '@/hooks/useSystem'
import { useSpends } from '@/hooks/useSpends'
import { useUI, TOAST_VERBS } from '@/store/ui'
import { CURRENCIES, formatMoney, convert } from '@/lib/money'
import { downloadFile } from '@/lib/portability'
import { wipeAll, reconcileSchedules, DB_SCHEMA_VERSION } from '@/lib/db'
import { resetToSeed } from '@/lib/seed-reset'
import { exportJson, openImportDialog, toCsv } from '@/lib/portability'
import { pidOf, traceOf } from '@/lib/id'
import { todayISO } from '@/lib/date'
import { CutPanel } from '@/components/ui/CutPanel'
import { CyberButton } from '@/components/ui/CyberButton'
import { DataStrip } from '@/components/ui/DataStrip'
import { SectionHeader, KeyCap, HashRule } from '@/components/ui/Micro'
import { Led } from '@/components/ui/Signal'
import { ArmedButton, CyberSelect, SegmentedControl, ToggleSwitch } from '@/components/ui/Controls'
import { IconDownload, IconUpload, IconBolt, IconMoon, IconSun } from '@/components/ui/Icons'
import { CategoryManager } from '@/components/settings/CategoryManager'
import { cx } from '@/lib/cx'

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['⌘', 'K'], label: 'Open the command palette' },
  { keys: ['/'], label: 'Query financial OS from anywhere' },
  { keys: ['N'], label: 'Initialize a subscription' },
  { keys: ['X'], label: 'Log a daily spend' },
  { keys: ['1'], label: 'Master Command' },
  { keys: ['2'], label: 'Subscriptions' },
  { keys: ['3'], label: 'Credit Cards' },
  { keys: ['4'], label: 'Loans & EMIs' },
  { keys: ['5'], label: 'Daily Spends' },
  { keys: ['6'], label: 'System Host' },
  { keys: ['T'], label: 'Toggle night / daylight' },
  { keys: ['M'], label: 'Toggle Minimal Zen / Cyber OS mode' },
  { keys: ['ESC'], label: 'Close a console, sheet or palette' },
  { keys: ['↑', '↓'], label: 'Move through palette results' },
  { keys: ['←', '→'], label: 'Walk the spending signal / change month' },
]

export default function Settings() {
  const { summary } = useSystem()
  const subscriptions = useSubscriptions()
  const payments = usePayments()
  const theme = useUI((s) => s.theme)
  const setTheme = useUI((s) => s.setTheme)
  const uiMode = useUI((s) => s.uiMode)
  const setUiMode = useUI((s) => s.setUiMode)
  const zenAccent = useUI((s) => s.zenAccent)
  const setZenAccent = useUI((s) => s.setZenAccent)
  const field = useUI((s) => s.field)
  const setField = useUI((s) => s.setField)
  const base = useUI((s) => s.baseCurrency)
  const setBaseCurrency = useUI((s) => s.setBaseCurrency)
  const horizonDays = useUI((s) => s.horizonDays)
  const setHorizonDays = useUI((s) => s.setHorizonDays)
  const pushToast = useUI((s) => s.pushToast)
  const [busy, setBusy] = useState(false)

  const nameById = new Map(subscriptions.map((sub) => [sub.id, pidOf(sub.id)]))
  const oldest = subscriptions.reduce<string | undefined>(
    (min, sub) => (!min || sub.createdAt < min ? sub.createdAt : min),
    undefined,
  )

  const doExportCsv = () => {
    const csv = toCsv(payments, nameById)
    downloadFile(`spendstate-ledger-${todayISO()}.csv`, csv, 'text/csv')
    pushToast(TOAST_VERBS.info('LEDGER EXPORTED', `${payments.length} rows written as CSV`))
  }
  const spends = useSpends()
  const doExportSpendsCsv = () => {
    const header = ['date', 'title', 'amount', 'currency', 'category', 'method', 'notes'].join(',')
    const esc = (value: string | number) => {
      const text = String(value)
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    }
    const rows = spends
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((spend) =>
        [spend.date, spend.title, spend.amount, spend.currency, spend.category, spend.method, spend.notes]
          .map(esc)
          .join(','),
      )
    downloadFile(`spendstate-spends-${todayISO()}.csv`, [header, ...rows].join('\n'), 'text/csv')
    pushToast(TOAST_VERBS.info('SPENDS EXPORTED', `${spends.length} rows written as CSV`))
  }

  return (
    <div className="px-3 py-4 md:px-5 md:py-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-linehard pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="micro border border-line2 px-1.5 py-0.5 text-dim">SYS</span>
          <h1 className="text-[15px] font-semibold">SETTINGS</h1>
        </div>
        <span className="micro flex items-center gap-2 text-faint">
          <Led signal="blue" size="sm" />
          CONFIGURATION WRITES LOCALLY · NO ACCOUNT
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 items-start">
        {/* Left Column: UI Personality, Incoming Horizon, Shortcuts */}
        <div className="flex flex-col gap-3">
          {/* appearance */}
          <CutPanel cut="tl-br" cutSize={14} innerClassName="p-0">
            <SectionHeader code="UI" title="Appearance" signal="acid" right={<span className="micro text-faint">SKIN</span>} />
            <div className="border-b border-line px-3 py-3 md:px-4">
              <div className="flex items-center justify-between">
                <span className="tech-label">INTERFACE PERSONALITY</span>
                <span className="micro text-acidink">TOGGLE: KEY 'M'</span>
              </div>
              <div className="mt-2">
                <SegmentedControl
                  ariaLabel="Interface Style"
                  value={uiMode}
                  onChange={(value) => setUiMode(value as 'cyber' | 'minimal')}
                  options={[
                    { value: 'cyber', label: '⚡ CYBER OPERATING SYSTEM' },
                    { value: 'minimal', label: '🍃 MINIMAL ZEN // CLAUDE' },
                  ]}
                />
              </div>
              <p className="meta mt-2 text-faint">
                {uiMode === 'minimal'
                  ? 'Minimal Zen: Soft modern cards, human typography, serene tones, and zero visual clutter.'
                  : 'Cyber OS: Hardware brutalism, monospace telemetry, chamfered cuts, scanlines, and dense industrial instruments.'}
              </p>
            </div>
            {uiMode === 'minimal' && (
              <div className="border-b border-line px-3 py-3 md:px-4 bg-surface-2/30">
                <div className="flex items-center justify-between">
                  <span className="tech-label">ZEN ACCENT COLOR</span>
                  <span className="micro text-acidink">ACTIVE: {zenAccent.toUpperCase()}</span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'emerald', label: 'Emerald', color: '#10b981', desc: 'Calm Sage' },
                    { id: 'indigo', label: 'Indigo', color: '#6366f1', desc: 'Linear Tech' },
                    { id: 'amber', label: 'Amber', color: '#f59e0b', desc: 'Warm Honey' },
                    { id: 'slate', label: 'Slate', color: '#e4e4e7', desc: 'Monochrome' },
                    { id: 'cyan', label: 'Cyan', color: '#06b6d4', desc: 'Cool Mint' },
                  ].map((acc) => {
                    const active = zenAccent === acc.id
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setZenAccent(acc.id as any)}
                        className={cx(
                          'flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer',
                          active
                            ? 'border-acid bg-acid/15 shadow-sm'
                            : 'border-line bg-surface hover:border-linehard hover:bg-surface-2'
                        )}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: acc.color }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-fg leading-none truncate">{acc.label}</div>
                          <div className="text-[10px] text-faint leading-none mt-1 truncate">{acc.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <p className="meta mt-2 text-faint">
                  Personalize the accent hue across badges, indicators, and buttons in Zen mode.
                </p>
              </div>
            )}
            <div className="border-b border-line px-3 py-3 md:px-4">
              <span className="tech-label">COLOR SKIN</span>
              <div className="mt-2">
                <SegmentedControl
                  ariaLabel="Theme"
                  value={theme}
                  onChange={(value) => setTheme(value as 'dark' | 'day')}
                  options={[
                    { value: 'dark', label: 'NIGHT // PRIMARY' },
                    { value: 'day', label: 'DAYLIGHT // BRUTALIST' },
                  ]}
                />
              </div>
              <p className="meta mt-2 text-faint">
                Night is the reference skin. Daylight is a white paper reprint of the same system:
                same grid, same signals, no glow.
              </p>
            </div>
            <div className="divide-y divide-line">
              <ToggleSwitch
                label="Background grid"
                code="BG GRID"
                description="Instrument grid, scanlines and CRT dot-matrix overlay behind the content well. Purely decorative."
                checked={field}
                onChange={setField}
              />
            </div>
            <div className="flex items-center gap-2 border-t border-line px-3 py-3 md:px-4">
              <CyberButton
                variant="ghost"
                size="sm"
                leading={theme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}
                onClick={() => setTheme(theme === 'dark' ? 'day' : 'dark')}
              >
                SWITCH TO {theme === 'dark' ? 'DAYLIGHT' : 'NIGHT'}
              </CyberButton>
              <span className="micro text-faint">ANIMATED, ~200MS</span>
            </div>
          </CutPanel>

          {/* Custom Taxonomy & Categories Manager */}
          <CategoryManager />

          {/* horizon */}
          <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
            <SectionHeader code="HOR" title="Incoming horizon" signal="orange" />
            <div className="px-3 py-3 md:px-4">
              <SegmentedControl
                ariaLabel="Incoming horizon in days"
                value={String(horizonDays)}
                onChange={(value) => setHorizonDays(Number(value))}
                options={[
                  { value: '7', label: '7 DAYS' },
                  { value: '14', label: '14 DAYS' },
                  { value: '30', label: '30 DAYS' },
                  { value: '60', label: '60 DAYS' },
                  { value: '90', label: '90 DAYS' },
                ]}
                size="sm"
              />
              <p className="meta mt-2.5 text-faint">
                Controls the incoming stream on the overview. Currently showing{' '}
                {summary.incomingWindow.length} scheduled events inside {horizonDays} days.
              </p>

              <HashRule label="SCHEDULE REPAIR" className="my-3" />
              <CyberButton
                variant="ghost"
                size="sm"
                leading={<IconBolt size={14} />}
                onClick={async () => {
                  const repaired = await reconcileSchedules()
                  pushToast(
                    repaired
                      ? TOAST_VERBS.info('SCHEDULE RECONCILED', `${repaired} anchors rolled forward`)
                      : TOAST_VERBS.info('SCHEDULE CLEAN', 'Every active anchor is in the future'),
                  )
                }}
              >
                RECONCILE SCHEDULES
              </CyberButton>
              <p className="micro mt-2 text-faint">
                ROLLS ANY OVERDUE ANCHOR FORWARD, PRESERVING THE ORIGINAL DAY OF MONTH.
              </p>
            </div>
          </CutPanel>
        </div>

        {/* Right Column: FX Currency, Local Volume, Keyboard, Danger Zone */}
        <div className="flex flex-col gap-3">
          {/* aggregation */}
          <CutPanel cut="br" cutSize={14} innerClassName="p-0">
            <SectionHeader
              code="FX"
              title="Aggregation currency"
              signal="blue"
              right={<span className="micro text-faint">STATIC TABLE</span>}
            />
            <div className="border-b border-line px-3 py-3 md:px-4">
              <span className="tech-label">BASE CURRENCY</span>
              <div className="mt-2">
                <CyberSelect
                  ariaLabel="Base currency"
                  value={base}
                  onChange={(value) => {
                    setBaseCurrency(value)
                    pushToast(TOAST_VERBS.info('BASE CURRENCY SET', `All totals now report in ${value}`))
                  }}
                  options={CURRENCIES.map((currency) => ({
                    value: currency.code,
                    label: `${currency.symbol} ${currency.code}`,
                    hint: currency.name,
                  }))}
                />
              </div>
              <p className="meta mt-2 text-faint">
                Foreign charges are converted with a fixed reference table — no network call, no
                live rate, and the same number every time you open the console.
              </p>
            </div>
            <div className="max-h-[220px] overflow-y-auto" data-lenis-prevent>
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-surface">
                  <tr className="border-b border-line">
                    <th className="tech-label px-3 py-1.5 text-left font-normal md:px-4">Code</th>
                    <th className="tech-label px-2 py-1.5 text-left font-normal">Per 1 {base}</th>
                    <th className="tech-label px-3 py-1.5 text-right font-normal md:px-4">1 unit =</th>
                  </tr>
                </thead>
                <tbody>
                  {CURRENCIES.map((currency) => (
                    <tr
                      key={currency.code}
                      className={cx(
                        'border-b border-line last:border-b-0',
                        currency.code === base ? 'bg-acidsoft' : '',
                      )}
                    >
                      <td className="px-3 py-1.5 md:px-4">
                        <span className="meta text-fg">{currency.symbol} {currency.code}</span>
                        <span className="micro ml-2 text-faint">{currency.name}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="meta text-dim">{convert(1, base, currency.code).toFixed(4)}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right md:px-4">
                        <span className="meta text-dim">{formatMoney(convert(1, currency.code, base), base)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CutPanel>

          {/* data volume */}
          <CutPanel cut="br" cutSize={14} innerClassName="p-0">
            <SectionHeader
              code="VOL"
              title="Local volume"
              signal="acid"
              right={<span className="micro text-faint">INDEXEDDB · DEXIE</span>}
            />
            <DataStrip
              size="sm"
              items={[
                { label: 'Subscriptions', value: String(subscriptions.length) },
                { label: 'Archived', value: String(summary.suspended.length + summary.terminated.length) },
                { label: 'Charges', value: String(payments.length) },
                { label: 'Spends', value: String(spends.length) },
                { label: 'Oldest record', value: oldest ?? '—' },
                { label: 'Schema', value: `V${DB_SCHEMA_VERSION}` },
                { label: 'Trace', value: traceOf(todayISO()) },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-3 md:px-4">
              <CyberButton
                variant="ghost"
                size="sm"
                leading={<IconDownload size={14} />}
                onClick={() => void exportJson()}
              >
                EXPORT SNAPSHOT (JSON)
              </CyberButton>
              <CyberButton
                variant="ghost"
                size="sm"
                leading={<IconDownload size={14} />}
                onClick={doExportCsv}
              >
                EXPORT LEDGER (CSV)
              </CyberButton>
              <CyberButton
                variant="ghost"
                size="sm"
                leading={<IconDownload size={14} />}
                onClick={doExportSpendsCsv}
              >
                EXPORT SPENDS (CSV)
              </CyberButton>
              <CyberButton
                variant="ghost"
                size="sm"
                leading={<IconUpload size={14} />}
                onClick={() => openImportDialog()}
              >
                IMPORT SNAPSHOT
              </CyberButton>
            </div>
            <div className="border-t border-line px-3 py-3 md:px-4">
              <p className="meta text-faint">
                A snapshot contains every subscription, every recorded charge, every daily spend and your display settings.
                Import replaces the local volume after a confirmation — export first if you are unsure.
              </p>
            </div>
          </CutPanel>

          {/* shortcuts */}
          <CutPanel cut="none" cutSize={0} innerClassName="p-0">
            <SectionHeader code="KEY" title="Keyboard" signal="blue" />
            <ul className="divide-y divide-line">
              {SHORTCUTS.map((entry) => (
                <li
                  key={entry.label}
                  className="flex items-center justify-between gap-4 px-3 py-2 md:px-4"
                >
                  <span className="text-[12.5px] text-dim">{entry.label}</span>
                  <span className="flex shrink-0 gap-1">
                    {entry.keys.map((key) => (
                      <KeyCap key={key}>{key}</KeyCap>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </CutPanel>

          {/* danger zone */}
          <CutPanel cut="br" cutSize={14} innerClassName="p-0">
            <SectionHeader code="DMG" title="Destructive operations" signal="red" />
            <div className="border-b border-line px-3 py-3 md:px-4">
              <div className="flex items-center gap-2">
                <Led signal="red" size="sm" pulse />
                <span className="micro text-redink">TWO PRESSES REQUIRED</span>
              </div>
              <p className="meta mt-2 text-dim">
                These actions rewrite the local volume immediately. If you want a way back, export a
                snapshot first.
              </p>
            </div>
            <div className="space-y-3 px-3 py-3 md:px-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <ArmedButton
                    tone="warn"
                    label="RESET TO DEMO DATASET"
                    armedLabel="CONFIRM RESET — ERASES CURRENT DATA"
                    disabled={busy}
                    onConfirm={async () => {
                      setBusy(true)
                      await resetToSeed()
                      setBusy(false)
                      pushToast(TOAST_VERBS.info('DATASET RESET', 'Seventeen demo subscriptions and sample spends restored'))
                    }}
                  />
                </div>
                <p className="micro mt-1.5 text-faint">
                  REPLACES EVERYTHING WITH THE REALISTIC INDIAN DEMO SET (15 ACTIVE, 1 SUSPENDED, 1 TERMINATED).
                </p>
              </div>
              <div>
                <ArmedButton
                  label="PURGE ALL DATA"
                  armedLabel="CONFIRM PURGE — NOTHING WILL REMAIN"
                  disabled={busy}
                  onConfirm={async () => {
                    setBusy(true)
                    await wipeAll()
                    setBusy(false)
                    pushToast(TOAST_VERBS.error('VOLUME EMPTY', 'All subscriptions and charges were erased'))
                  }}
                />
                <p className="micro mt-1.5 text-faint">
                  LEAVES AN EMPTY SYSTEM. THE CONSOLE WILL ASK YOU TO INITIALIZE A SUBSCRIPTION.
                </p>
              </div>
            </div>
          </CutPanel>
        </div>
      </div>

      {/* about */}
      <div className="mt-3">
        <CutPanel cut="tl-br" cutSize={14} innerClassName="p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <div className="flex items-center gap-2">
                  <Led signal="acid" size="sm" pulse />
                  <span className="micro text-acidink">ABOUT THIS SYSTEM</span>
                </div>
                <h2 className="numeral mt-2.5 text-[clamp(1.4rem,4vw,2rem)] text-fg">
                  SPENDSTATE // FINANCIAL OS 1.0
                </h2>
                <p className="mt-3 text-[13px] leading-relaxed text-dim">
                  A subscription tracker with one job: show where the money goes every month. It
                  stores everything on this device, works with no network and no account, and treats
                  each subscription as a process consuming a resource. No analytics, no telemetry,
                  no cloud, no assistant.
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
                {[
                  ['Creator', <a key="creator" href="https://hariharen.site" target="_blank" rel="noreferrer" className="underline decoration-linehard underline-offset-2 transition-colors hover:text-acidink">Hariharen</a>],
                  ['Build', '1.0.0'],
                  ['Schema', `V${DB_SCHEMA_VERSION}`],
                  ['Storage', 'IndexedDB'],
                  ['Runtime', 'Offline PWA'],
                  ['Display', 'Space Grotesk'],
                  ['Data text', 'JetBrains Mono'],
                  ['Currencies', `${CURRENCIES.length} static rates`],
                ].map(([label, value]) => (
                  <div key={typeof label === 'string' ? label : 'row'}>
                    <dt className="tech-label">{label}</dt>
                    <dd className="meta text-fg">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </CutPanel>
        </div>
      </div>
    )
  }
