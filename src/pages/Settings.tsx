/**
 * SUBTRACK // SETTINGS (SYS)
 *
 * The control room: skin, currency, horizons, local volume operations, shortcut
 * reference and the destructive corner. Every switch explains itself, every
 * destructive action needs two deliberate presses, and nothing here talks to a
 * network.
 */
import { useState } from 'react'
import { usePayments, useSubscriptions, useSystem } from '@/hooks/useSystem'
import { useUI, TOAST_VERBS } from '@/store/ui'
import { CURRENCIES, formatMoney, convert } from '@/lib/money'
import { resetToSeed, wipeAll, reconcileSchedules } from '@/lib/db'
import { exportJson, openImportDialog, toCsv, downloadFile } from '@/lib/portability'
import { pidOf, traceOf } from '@/lib/id'
import { todayISO } from '@/lib/date'
import { CutPanel } from '@/components/ui/CutPanel'
import { CyberButton } from '@/components/ui/CyberButton'
import { DataStrip } from '@/components/ui/DataStrip'
import { SectionHeader, KeyCap, HashRule } from '@/components/ui/Micro'
import { Led } from '@/components/ui/Signal'
import { ArmedButton, CyberSelect, SegmentedControl, ToggleSwitch } from '@/components/ui/Controls'
import { IconDownload, IconUpload, IconBolt, IconMoon, IconSun } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['⌘', 'K'], label: 'Open the command palette' },
  { keys: ['/'], label: 'Query subscriptions from anywhere' },
  { keys: ['N'], label: 'Initialize a subscription' },
  { keys: ['1'], label: 'Overview' },
  { keys: ['2'], label: 'Subscriptions' },
  { keys: ['3'], label: 'Payment matrix' },
  { keys: ['4'], label: 'System analytics' },
  { keys: ['5'], label: 'Settings' },
  { keys: ['T'], label: 'Toggle night / daylight' },
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
  const field = useUI((s) => s.field)
  const setField = useUI((s) => s.setField)
  const calmMode = useUI((s) => s.calmMode)
  const setCalmMode = useUI((s) => s.setCalmMode)
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
    downloadFile(`subtrack-ledger-${todayISO()}.csv`, csv, 'text/csv')
    pushToast(TOAST_VERBS.info('LEDGER EXPORTED', `${payments.length} rows written as CSV`))
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

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* appearance */}
        <div className="lg:col-span-6">
          <CutPanel cut="tl-br" cutSize={14} innerClassName="p-0">
            <SectionHeader code="UI" title="Appearance" signal="acid" right={<span className="micro text-faint">SKIN</span>} />
            <div className="border-b border-line px-3 py-3 md:px-4">
              <span className="tech-label">THEME</span>
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
                label="Background field"
                code="GRID+GRAIN"
                description="Instrument grid and film grain behind the content well. Purely decorative."
                checked={field}
                onChange={setField}
              />
              <ToggleSwitch
                label="Calm mode"
                code="MOTION"
                description="Suppresses the route glitch sweep and decorative motion on top of your system's reduced-motion setting."
                checked={calmMode}
                onChange={setCalmMode}
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
        </div>

        {/* aggregation */}
        <div className="lg:col-span-6">
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
            <div className="max-h-[220px] overflow-y-auto">
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
        </div>

        {/* horizon */}
        <div className="lg:col-span-5">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-0" className="h-full">
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
                {summary.incoming30.length} scheduled events inside {horizonDays} days.
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

        {/* data volume */}
        <div className="lg:col-span-7">
          <CutPanel cut="br" cutSize={14} innerClassName="p-0" className="h-full">
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
                { label: 'Oldest record', value: oldest ?? '—' },
                { label: 'Schema', value: 'V1' },
                { label: 'Trace', value: traceOf(todayISO()) },
              ]}
            />
            <div className="flex flex-wrap gap-2 border-t border-line px-3 py-3 md:px-4">
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
                leading={<IconUpload size={14} />}
                onClick={() => openImportDialog()}
              >
                IMPORT SNAPSHOT
              </CyberButton>
            </div>
            <div className="border-t border-line px-3 py-3 md:px-4">
              <p className="meta text-faint">
                A snapshot contains every subscription, every recorded charge and your display settings.
                Import replaces the local volume after a confirmation — export first if you are unsure.
              </p>
            </div>
          </CutPanel>
        </div>

        {/* shortcuts */}
        <div className="lg:col-span-6">
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
        </div>

        {/* danger zone */}
        <div className="lg:col-span-6">
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
                      pushToast(TOAST_VERBS.info('DATASET RESET', 'Seventeen demo subscriptions restored'))
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

        {/* about */}
        <div className="lg:col-span-12">
          <CutPanel cut="tl-br" cutSize={14} innerClassName="p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <div className="flex items-center gap-2">
                  <Led signal="acid" size="sm" pulse />
                  <span className="micro text-acidink">ABOUT THIS SYSTEM</span>
                </div>
                <h2 className="numeral mt-2.5 text-[clamp(1.4rem,4vw,2rem)] text-fg">
                  SUBTRACK // FINANCIAL OS 1.0
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
                  ['Schema', 'V1'],
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
    </div>
  )
}
