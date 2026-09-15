/**
 * SUBTRACK // SYSTEM NOTES
 *
 * Automatic observations derived from the ledger — concentration, category
 * momentum, dormancy, load clusters, new processes, overdue cycles. They are
 * arithmetic, and the panel says so: no assistant, no generated prose, no
 * pretend intelligence.
 */
import type { SystemNote } from '@/lib/analytics'
import { SIGNAL_HEX, SIGNAL_TEXT, Led, type Signal } from '@/components/ui/Signal'
import { cx } from '@/lib/cx'

export function SystemNotes({
  notes,
  className,
  compact = false,
}: {
  notes: SystemNote[]
  className?: string
  compact?: boolean
}) {
  if (!notes.length) {
    return (
      <div className={cx('px-3 py-6 md:px-4', className)}>
        <span className="micro block text-dim">NO ANOMALIES DETECTED</span>
        <span className="meta mt-1.5 block text-faint">
          Concentration, dormancy and category drift are all inside normal range.
        </span>
      </div>
    )
  }

  return (
    <ul className={cx('divide-y divide-line', className)}>
      {notes.slice(0, compact ? 3 : notes.length).map((note) => (
        <li key={note.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-[3px]"
            style={{ background: SIGNAL_HEX[note.signal as Signal] }}
          />
          <div className="px-3 py-3 pl-4 md:px-4 md:pl-5">
            <div className="flex items-center gap-2">
              <Led signal={note.signal as Signal} size="sm" pulse={note.signal === 'red'} />
              <span className={cx('micro', SIGNAL_TEXT[note.signal as Signal])}>{note.label}</span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg">{note.text}</p>
          </div>
        </li>
      ))}
      <li className="px-3 py-2 md:px-4">
        <span className="micro text-faint">
          DERIVED FROM YOUR LEDGER · ARITHMETIC, NOT GENERATED TEXT
        </span>
      </li>
    </ul>
  )
}
