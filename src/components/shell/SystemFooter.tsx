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
    <footer className="mt-10 border-t border-line bg-bg2/60 px-3 py-3 md:px-5">
      {/* Mobile layout */}
      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex items-center justify-between">
          <Wordmark compact />
          <span className="micro flex items-center gap-1.5 border border-line2 bg-surface px-2 py-0.5 text-faint">
            <Led signal="acid" size="sm" />
            LOCAL · OFFLINE
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-line/60 pt-2 text-[11px] font-mono text-dim">
          <div className="flex items-center gap-2">
            <span>
              <span className="text-fg font-medium">{summary.active.length}</span> SUBS
            </span>
            <span className="text-linehard">·</span>
            <span>
              <span className="text-fg font-medium">{payments}</span> LOGS
            </span>
            <span className="text-linehard">·</span>
            <span className="text-faint">{base}</span>
          </div>

          <a
            href="https://hariharen.site"
            target="_blank"
            rel="noreferrer"
            className="micro text-faint transition-colors hover:text-acidink"
          >
            BY HARIHAREN ↗
          </a>
        </div>
      </div>

      {/* Desktop / Tablet layout */}
      <div className="hidden sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Wordmark />
          <span className="h-3 w-[1px] bg-line" />
          <span className="micro flex items-center gap-1.5 text-faint">
            <Led signal="acid" size="sm" />
            LOCAL STORAGE · NO TELEMETRY
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-dim">
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
