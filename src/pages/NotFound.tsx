/**
 * SUBTRACK // NOT FOUND
 * An unknown route is a system state, and it says so in the same voice.
 */
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui/Skeleton'
import { CyberButton } from '@/components/ui/CyberButton'
import { traceOf } from '@/lib/id'
import { todayISO } from '@/lib/date'
import { IconArrowRight } from '@/components/ui/Icons'

export default function NotFound() {
  return (
    <div className="px-3 py-6 md:px-5">
      <EmptyState
        code="ROUTE // UNRESOLVED"
        title="404 — NO SUCH MODULE."
        description="This path is not part of the console. Nothing was lost: your data lives in the local volume, untouched by a bad link."
        secondary={
          <div className="flex flex-wrap items-center gap-3">
            <CyberButton variant="solid" to="/" trailing={<IconArrowRight size={14} />}>
              RETURN TO OVERVIEW
            </CyberButton>
            <span className="micro text-faint">TRACE {traceOf(todayISO())} · NOTHING WRITTEN</span>
          </div>
        }
      />
      <p className="micro mt-4 text-faint">
        KNOWN MODULES:{' '}
        {['/', '/flow', '/time', '/data', '/sys'].map((path, index) => (
          <span key={path}>
            {index > 0 && <span className="text-linehard"> · </span>}
            <Link to={path} className="text-dim transition-colors hover:text-acidink">
              {path}
            </Link>
          </span>
        ))}
      </p>
    </div>
  )
}
