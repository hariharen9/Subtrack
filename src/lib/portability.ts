/**
 * SUBTRACK // PORTABILITY
 *
 * Export and import are first-class because the data is yours and lives only
 * here. JSON is the canonical snapshot; CSV is offered for spreadsheets.
 */
import { exportSnapshot, importSnapshot, type Snapshot } from './db'
import { useUI, TOAST_VERBS } from '@/store/ui'
import { useSubscriptions } from '@/hooks/useSystem'
import type { Payment } from './types'
import { formatMoney } from './money'

export function downloadFile(filename: string, contents: string, type: string): void {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Give the browser a beat to start the download before revoking.
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export async function exportJson(): Promise<void> {
  const settings = useUI.getState()
  const snapshot = await exportSnapshot({
    baseCurrency: settings.baseCurrency,
    theme: settings.theme,
    field: settings.field,
    calmMode: settings.calmMode,
    horizonDays: settings.horizonDays,
  })
  const stamp = new Date().toISOString().slice(0, 10)
  downloadFile(`subtrack-snapshot-${stamp}.json`, JSON.stringify(snapshot, null, 2), 'application/json')
  useUI.getState().pushToast(TOAST_VERBS.info('EXPORT COMPLETE', `${snapshot.subscriptions.length} subscriptions written to file`))
}

function escapeCsv(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(payments: Payment[], subscriptionsById: Map<string, string>): string {
  const header = [
    'date',
    'service',
    'subscription_id',
    'amount',
    'currency',
    'category',
    'origin',
  ].join(',')
  const rows = payments
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((payment) =>
      [
        payment.date,
        payment.name,
        subscriptionsById.get(payment.subId) ?? payment.subId,
        payment.amount,
        payment.currency,
        payment.category,
        payment.origin,
      ]
        .map(escapeCsv)
        .join(','),
    )
  return [header, ...rows].join('\n')
}

export function openImportDialog(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json,.json'
  input.style.display = 'none'
  document.body.appendChild(input)
  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    input.remove()
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Snapshot
      const report = await importSnapshot(parsed, 'replace')
      if (parsed.settings) {
        const ui = useUI.getState()
        ui.setBaseCurrency(parsed.settings.baseCurrency)
        ui.setTheme(parsed.settings.theme)
        ui.setHorizonDays(parsed.settings.horizonDays)
      }
      useUI
        .getState()
        .pushToast(
          TOAST_VERBS.info(
            'SNAPSHOT RESTORED',
            `${report.subscriptions} subscriptions · ${report.payments} recorded charges`,
          ),
        )
    } catch (error) {
      useUI
        .getState()
        .pushToast(
          TOAST_VERBS.error('IMPORT FAILED', error instanceof Error ? error.message : 'Unreadable file'),
        )
    }
  })
  input.click()
}

/** Copy a plain-text readout — useful for pasting into a chat or a note. */
export function copyText(text: string, label = 'READOUT COPIED'): void {
  const done = () => useUI.getState().pushToast(TOAST_VERBS.info(label, 'Written to clipboard'))
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
    return
  }
  fallbackCopy(text, done)
}

function fallbackCopy(text: string, done: () => void): void {
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  try {
    document.execCommand('copy')
    done()
  } catch {
    useUI.getState().pushToast(TOAST_VERBS.error('CLIPBOARD BLOCKED', 'Copy is unavailable here'))
  }
  area.remove()
}

export function burnReadout(
  monthly: number,
  annual: number,
  base: string,
  count: number,
): string {
  return [
    'SUBTRACK // MONTHLY BURN READOUT',
    `MONTHLY BURN   ${formatMoney(monthly, base)}`,
    `PROJECTED LOAD ${formatMoney(annual, base)}`,
    `ACTIVE         ${count} SUBSCRIPTIONS`,
  ].join('\n')
}

/** Convenience for components that already have the hook data. */
export function useProcessNameMap(): Map<string, string> {
  const subs = useSubscriptions()
  return new Map(subs.map((sub) => [sub.id, sub.name]))
}
