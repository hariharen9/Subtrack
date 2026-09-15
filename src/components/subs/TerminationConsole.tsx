/**
 * SUBTRACK // TERMINATION CONSOLE (GLOBAL)
 *
 * Lives beside the authoring console as a shell-level overlay, so a termination
 * can be armed from anywhere — the process panel, the archive rail or the
 * command palette — and survives a navigation. All consequences are written out
 * before anything happens, and the confirm is always a second deliberate press.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { purgeSubscription, setProcessStatus } from '@/lib/db'
import { useSubscriptions } from '@/hooks/useSystem'
import { TOAST_VERBS, useUI } from '@/store/ui'
import { TerminateDialog } from './TerminateDialog'

export function TerminationConsole() {
  const termination = useUI((s) => s.termination)
  const closeTermination = useUI((s) => s.closeTermination)
  const pushToast = useUI((s) => s.pushToast)
  const subscriptions = useSubscriptions()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const sub = termination.subId
    ? subscriptions.find((candidate) => candidate.id === termination.subId)
    : undefined

  const confirm = async () => {
    if (!sub) return
    setBusy(true)
    if (termination.mode === 'purge') {
      await purgeSubscription(sub.id)
      pushToast(TOAST_VERBS.purged(sub.name))
      setBusy(false)
      closeTermination()
      navigate('/flow')
      return
    }
    pushToast(TOAST_VERBS.terminating(sub.name))
    await setProcessStatus(sub.id, 'terminated')
    setBusy(false)
    closeTermination()
    // The confirmation beat: the system reports what it did, in two steps.
    window.setTimeout(() => pushToast(TOAST_VERBS.terminated(sub.name)), 520)
  }

  return (
    <TerminateDialog
      open={termination.open && Boolean(sub)}
      sub={sub}
      mode={termination.mode}
      busy={busy}
      onCancel={closeTermination}
      onConfirm={() => void confirm()}
    />
  )
}
