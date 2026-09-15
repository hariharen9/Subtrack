/**
 * SUBTRACK // FIELD OVERLAY
 *
 * The exposed structure layer: viewfinder brackets, an edge coordinate scale
 * and a brand stamp. Deterministic, static, pointer-transparent — visual noise
 * that never competes with content and costs nothing to render.
 */
import { useIsDesktop } from '@/hooks/usePlatform'
import { traceOf } from '@/lib/id'
import { todayISO } from '@/lib/date'

const TICKS = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6', 'G7', 'H8']

export function FieldOverlay() {
  const desktop = useIsDesktop()
  const stamp = traceOf(todayISO())

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
      {desktop && (
        <>
          <span className="absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-acid/40" />
          <span className="absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-acid/40" />
          <span className="absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-acid/40" />
          <span className="absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-acid/40" />

          {/* left edge coordinate scale */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 space-y-8 pl-[3px]">
            {TICKS.map((tick, index) => (
              <div key={tick} className="flex items-center gap-1.5">
                <span className="block h-[1px] w-2.5 bg-line2" />
                <span className="font-mono text-[7px] tracking-[0.18em] text-faint">
                  {tick}
                  <span className="text-line2">·{String(index * 128).padStart(3, '0')}</span>
                </span>
              </div>
            ))}
          </div>

          {/* base stamp */}
          <div className="absolute bottom-4 right-6 flex items-center gap-2">
            <span className="block h-[2px] w-6 bg-acid/60" />
            <span className="font-mono text-[7px] tracking-[0.3em] text-faint">
              SUBTRACK // OS-1.0 // {stamp}
            </span>
          </div>
        </>
      )}

      {/* CRT band: a single slow sweep across the top chrome */}
      <div className="absolute inset-x-0 top-0 h-24 overflow-hidden opacity-[0.06]">
        <div className="animate-scan h-8 w-full bg-gradient-to-b from-transparent via-fg to-transparent" />
      </div>
    </div>
  )
}
