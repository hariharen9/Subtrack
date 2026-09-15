/**
 * SUBTRACK // SYSTEM FOOTER
 *
 * Streamlined system footer: clear local-first status, essential metrics,
 * and minimalist build reference without visual clutter.
 */
import { Wordmark } from '@/components/brand/Wordmark'
import { Led } from '@/components/ui/Signal'
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
    <footer className="mt-12 border-t border-line bg-bg2/50 px-3 py-3.5 md:px-5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Wordmark />
          <span className="hidden h-3 w-[1px] bg-line md:block" />
          <span className="micro flex items-center gap-1.5 text-faint">
            <Led signal="acid" size="sm" />
            LOCAL STORAGE · NO TELEMETRY
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-dim">
          <span>
            <span className="text-fg">{summary.active.length}</span> ACTIVE SUBS
          </span>
          <span className="text-linehard">·</span>
          <span>
            <span className="text-fg">{payments}</span> CHARGES
          </span>
          <span className="text-linehard">·</span>
          <span>{base}</span>
          <span className="text-linehard">·</span>
          <a
            href="https://hariharen.site"
            target="_blank"
            rel="noreferrer"
            className="text-faint transition-colors hover:text-acidink"
          >
            BY HARIHAREN
          </a>
        </div>
      </div>
    </footer>
  )
}
