/**
 * SPENDSTATE // CLOUD SYNC PANEL
 *
 * The opt-in surface for the optional Firebase backend. Renders nothing at all
 * unless `VITE_FIREBASE_*` is configured, so the default build never shows — or
 * loads — anything cloud-related.
 *
 * Dexie remains the local engine throughout: enabling cloud sync adds a mirror,
 * disabling it removes the mirror, and local data is never deleted either way.
 * No analytics SDK is loaded, and nothing is uploaded until the user signs in.
 */
import { useState } from 'react'
import { FcGoogle } from 'react-icons/fc'
import {
  LuCloud,
  LuShieldCheck,
  LuLockKeyhole,
  LuEyeOff,
  LuCircleCheck,
  LuTriangleAlert,
  LuDatabase,
} from 'react-icons/lu'
import { useCloud } from '@/store/cloud'
import { CutPanel } from '@/components/ui/CutPanel'
import { CyberButton } from '@/components/ui/CyberButton'
import { Led } from '@/components/ui/Signal'
import { formatSignalDate } from '@/lib/date'
import { cx } from '@/lib/cx'

const STATUS_SIGNAL: Record<string, 'acid' | 'blue' | 'orange' | 'red'> = {
  off: 'blue',
  connecting: 'orange',
  syncing: 'orange',
  ready: 'acid',
  error: 'red',
}

const STATUS_LABEL: Record<string, string> = {
  off: 'LOCAL ONLY',
  connecting: 'CONNECTING',
  syncing: 'SYNCING',
  ready: 'IN SYNC',
  error: 'FAULT',
}

const ASSURANCES = [
  {
    icon: LuEyeOff,
    title: 'No analytics, ever',
    text: 'No Google Analytics, no tracking pixel, no fingerprinting. The Analytics SDK is never downloaded.',
  },
  {
    icon: LuShieldCheck,
    title: 'Owner-only rules',
    text: 'Firestore security rules tie every read and write to your user id. Any other account — and every signed-out client — is denied.',
  },
  {
    icon: LuLockKeyhole,
    title: 'Encrypted in transit',
    text: 'All traffic is HTTPS/TLS to the SpendState sync service. Nothing is sent anywhere else.',
  },
  {
    icon: LuCloud,
    title: 'Local is the source',
    text: 'Dexie stays the engine; the cloud is a copy. Turn sync off and not a single local record is deleted.',
  },
]

const SYNCED_TABLES = [
  'subscriptions',
  'payments',
  'spends',
  'loans',
  'loanPayments',
  'creditCards',
  'cardTransactions',
  'incomes',
  'accounts',
  'transfers',
]

export function CloudSyncPanel() {
  const available = useCloud((s) => s.available)
  const enabled = useCloud((s) => s.enabled)
  const user = useCloud((s) => s.user)
  const status = useCloud((s) => s.status)
  const message = useCloud((s) => s.message)
  const issues = useCloud((s) => s.issues)
  const lastSync = useCloud((s) => s.lastSync)
  const progress = useCloud((s) => s.progress)

  const enable = useCloud((s) => s.enable)
  const disable = useCloud((s) => s.disable)
  const google = useCloud((s) => s.google)
  const emailSignUp = useCloud((s) => s.emailSignUp)
  const emailSignIn = useCloud((s) => s.emailSignIn)
  const signOut = useCloud((s) => s.signOut)
  const syncNow = useCloud((s) => s.syncNow)

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (!available) return null

  const submitEmail = async () => {
    if (!email || !password) return
    setBusy(true)
    try {
      if (mode === 'signup') await emailSignUp(email, password)
      else await emailSignIn(email, password)
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  const pct = progress && progress.total > 0 ? Math.min(100, (progress.done / progress.total) * 100) : null
  const initial = (user?.displayName ?? user?.email ?? '?').slice(0, 1).toUpperCase()

  return (
    <CutPanel cut="tl-br" cutSize={16} innerClassName="p-0">
      {/* ── Identity bar ─────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-between gap-3 overflow-hidden border-b-2 border-linehard px-3 py-2.5 md:px-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bluesoft via-transparent to-transparent"
        />
        <span className="relative flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center border border-blue bg-bluesoft text-blueink">
            <LuCloud size={16} />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold leading-tight text-fg">Cloud sync</span>
            <span className="micro block text-faint">OPTIONAL · CLOUD MIRROR</span>
          </span>
        </span>
        <span className="relative micro flex shrink-0 items-center gap-1.5">
          <Led signal={STATUS_SIGNAL[status] ?? 'blue'} size="sm" pulse={status === 'syncing'} />
          <span className="text-faint">{STATUS_LABEL[status] ?? status}</span>
        </span>
      </div>

      {/* ── OFF ──────────────────────────────────────────────────────────── */}
      {!enabled && (
        <div className="px-3 py-3.5 md:px-4">
          <p className="text-[12px] leading-relaxed text-fg">
            Sign in to mirror your ledger to the SpendState sync service, so the same data opens on
            your other devices. There is nothing to configure — SpendState is already connected. It
            stays off until you sign in, and the app works perfectly without it.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CyberButton variant="solid" size="sm" onClick={enable}>
              ENABLE CLOUD SYNC
            </CyberButton>
            <span className="micro text-faint">NOTHING LEAVES THIS DEVICE UNTIL YOU SIGN IN</span>
          </div>
        </div>
      )}

      {/* ── ENABLED · SIGNED OUT ─────────────────────────────────────────── */}
      {enabled && !user && (
        <div className="px-3 py-3.5 md:px-4">
          <span className="tech-label">SIGN IN TO START THE MIRROR</span>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void google().finally(() => setBusy(false))
            }}
            className="mt-2.5 flex h-10 w-full items-center justify-center gap-3 rounded-[4px] border border-[#dadce0] bg-white px-4 text-[13px] font-medium tracking-[0.01em] text-[#3c4043] shadow-sm transition-colors hover:bg-[#f8f9fa] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            <FcGoogle size={19} />
            CONTINUE WITH GOOGLE
          </button>

          <div className="my-3 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="micro text-faint">OR USE EMAIL</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={cx(
                'micro cursor-pointer border-b-2 pb-0.5 transition-colors',
                mode === 'signin' ? 'border-acid text-acidink' : 'border-transparent text-faint hover:text-dim',
              )}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={cx(
                'micro cursor-pointer border-b-2 pb-0.5 transition-colors',
                mode === 'signup' ? 'border-acid text-acidink' : 'border-transparent text-faint hover:text-dim',
              )}
            >
              CREATE ACCOUNT
            </button>
          </div>

          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-label="Email"
              className="field h-9 flex-1 text-[12px]"
            />
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? 'Create a password' : 'Password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-label="Password"
              className="field h-9 flex-1 text-[12px]"
            />
            <CyberButton variant="solid" size="sm" busy={busy} onClick={() => void submitEmail()}>
              {mode === 'signup' ? 'CREATE' : 'SIGN IN'}
            </CyberButton>
          </div>

          <p className="meta mt-2 text-faint">
            {mode === 'signup'
              ? 'A new Firebase account on your project. Nothing is written until the first sync.'
              : 'Existing Firebase account for this project.'}
          </p>

          <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
            <span className="micro text-faint">TURNING OFF LEAVES LOCAL DATA UNTOUCHED</span>
            <CyberButton variant="ghost" size="sm" onClick={disable}>
              TURN OFF
            </CyberButton>
          </div>
        </div>
      )}

      {/* ── ENABLED · SIGNED IN ──────────────────────────────────────────── */}
      {enabled && user && (
        <div className="px-3 py-3.5 md:px-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center border border-acid bg-acidsoft text-[14px] font-bold text-acidink">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-semibold text-fg">
                {user.displayName ?? user.email ?? 'Signed in'}
              </span>
              <span className="micro block truncate text-faint">
                {user.email ? `${user.email} · ` : ''}UID {user.uid.slice(0, 8)}…
              </span>
            </span>
            <span className="micro shrink-0 text-faint">
              {lastSync ? `SYNCED ${formatSignalDate(lastSync.slice(0, 10))}` : 'AWAITING FIRST SYNC'}
            </span>
          </div>

          {pct !== null && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden border border-line bg-surface2">
                <div className="h-full bg-acid transition-all" style={{ width: `${Math.max(2, pct)}%` }} />
              </div>
              <span className="micro mt-1 block text-faint">
                MIGRATING {progress?.done ?? 0} / {progress?.total ?? 0} RECORDS
              </span>
            </div>
          )}

          {message && status === 'error' && (
            <p className="mt-2 flex items-start gap-2 border border-red/40 bg-redsoft px-2 py-1.5 text-[11px] text-redink">
              <LuTriangleAlert size={13} className="mt-0.5 shrink-0" />
              <span>{message.toUpperCase()}</span>
            </p>
          )}

          {issues.length > 0 && (
            <div className="mt-2 border border-orange/40 bg-orangesoft px-2 py-1.5">
              <span className="micro flex items-center gap-1.5 text-orangeink">
                <LuTriangleAlert size={12} /> {issues.length} ITEMS NOT UPLOADED
              </span>
              <ul className="meta mt-1 space-y-0.5 text-dim">
                {issues.slice(0, 4).map((issue) => (
                  <li key={`${issue.table}-${issue.id}`}>
                    {issue.table}/{issue.id}: {issue.reason}
                  </li>
                ))}
                {issues.length > 4 && <li>…and {issues.length - 4} more</li>}
              </ul>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CyberButton variant="solid" size="sm" busy={status === 'syncing'} onClick={() => void syncNow()}>
              SYNC NOW
            </CyberButton>
            <CyberButton variant="ghost" size="sm" onClick={() => void signOut()}>
              SIGN OUT
            </CyberButton>
            <CyberButton variant="danger" size="sm" onClick={disable}>
              TURN OFF CLOUD SYNC
            </CyberButton>
          </div>
        </div>
      )}

      {/* ── How this stays private ───────────────────────────────────────── */}
      <div className="border-t border-line bg-surface2/40 px-3 py-3 md:px-4">
        <span className="tech-label flex items-center gap-1.5">
          <LuShieldCheck size={12} className="text-acidink" />
          HOW THIS STAYS PRIVATE
        </span>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {ASSURANCES.map((item) => (
            <li key={item.title} className="flex items-start gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center border border-line2 text-acidink">
                <item.icon size={12} />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-fg">{item.title}</span>
                <span className="meta block text-dim">{item.text}</span>
              </span>
            </li>
          ))}
        </ul>

        <details className="mt-2.5 border-t border-line pt-2">
          <summary className="micro cursor-pointer text-faint transition-colors hover:text-dim">
            WHAT GETS UPLOADED — AND WHAT NEVER DOES
          </summary>
          <div className="mt-2 flex flex-wrap gap-1">
            {SYNCED_TABLES.map((table) => (
              <span key={table} className="micro border border-line px-1.5 py-0.5 text-dim">
                {table}
              </span>
            ))}
          </div>
          <ul className="meta mt-2 space-y-0.5 text-faint">
            <li className="flex items-start gap-1.5">
              <LuCircleCheck size={11} className="mt-0.5 shrink-0 text-acidink" />
              Only the ten ledger tables above, under <code>users/{'{uid}'}/{'{table}'}/{'{id}'}</code> in
              the SpendState sync project — reachable only by your account.
            </li>
            <li className="flex items-start gap-1.5">
              <LuDatabase size={11} className="mt-0.5 shrink-0 text-dim" />
              Device-local settings (weekly limit, seed markers) are never synced.
            </li>
            <li className="flex items-start gap-1.5">
              <LuEyeOff size={11} className="mt-0.5 shrink-0 text-dim" />
              No analytics, no usage data, no device identifiers are transmitted.
            </li>
          </ul>
        </details>
      </div>
    </CutPanel>
  )
}
