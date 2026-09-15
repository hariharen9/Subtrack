/**
 * SUBTRACK // SYSTEM FOOTER
 *
 * The bottom rail of the machine: what this build is, where the data lives and
 * how much of it there is. Technical annotations only — the kind of thing you
 * read once and then just like having there.
 */
import { Wordmark } from '@/components/brand/Wordmark'
import { DataStrip } from '@/components/ui/DataStrip'
import { traceOf } from '@/lib/id'
import { todayISO } from '@/lib/date'
import type { SystemSummary } from '@/lib/analytics'

export function SystemFooter({
  summary,
  payments,
  base,
}: {
  summary: SystemSummary
  payments: number
  base: string
}) {
  return (
    <footer className="mt-12 border-t-2 border-linehard bg-bg2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2.5 md:px-5">
        <Wordmark />
        <span className="micro text-faint">
          LOCAL-FIRST · NO ACCOUNT · WORKS OFFLINE
        </span>
      </div>

      <div className="no-scrollbar overflow-x-auto">
        <DataStrip
          size="sm"
          items={[
            { label: 'Processes', value: String(summary.active.length).padStart(2, '0'), signal: 'acid' },
            { label: 'Suspended', value: String(summary.suspended.length).padStart(2, '0') },
            { label: 'Terminated', value: String(summary.terminated.length).padStart(2, '0') },
            { label: 'Recorded charges', value: String(payments) },
            { label: 'Base currency', value: base, signal: 'blue' },
            { label: 'Store', value: 'INDEXEDDB · DEXIE' },
            { label: 'Schema', value: 'V1' },
            { label: 'Build', value: '1.0.0' },
            { label: 'Trace', value: traceOf(todayISO()) },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 md:px-5">
        <span className="micro text-faint">
          SUBTRACK // FINANCIAL OPERATING SYSTEM
        </span>
        <span className="ticks hidden w-40 md:block" aria-hidden="true" />
        <span className="micro text-faint">
          CURRENCY AGGREGATION USES A STATIC FX TABLE — EDIT NOTHING, TRUST THE LOCAL VOLUME
        </span>
      </div>
    </footer>
  )
}
