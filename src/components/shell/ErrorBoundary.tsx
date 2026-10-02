/**
 * SPENDSTATE // ERROR BOUNDARY
 *
 * The console's last line of defence. An uncaught render fault anywhere below
 * this point is caught and replaced with a recovery station instead of a blank
 * screen. The local volume is never touched by a render crash — data lives in
 * IndexedDB and is written only through `db.ts` — so recovery is always safe.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  stack: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: '' }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ stack: info.componentStack ?? '' })
    // Local-only diagnostics — never sent anywhere.
    console.error('[SPENDSTATE] uncaught render fault', error, info)
  }

  private retry = () => this.setState({ error: null, stack: '' })

  render() {
    const { error, stack } = this.state
    if (!error) return this.props.children

    return (
      <div className="grid min-h-screen place-items-center bg-bg p-6">
        <div className="w-full max-w-[560px] border border-linehard bg-surface">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3">
            <span className="h-2 w-2 shrink-0 bg-red" />
            <span className="micro tracking-[0.2em] text-redink">SYSTEM FAULT</span>
          </div>
          <div className="px-5 py-5">
            <h1 className="text-[clamp(1.15rem,3vw,1.5rem)] font-semibold text-fg">
              THE CONSOLE HIT AN UNCAUGHT ERROR
            </h1>
            <p className="meta mt-2 text-dim">
              Your data is safe — it lives in the local IndexedDB volume and a render fault never writes to it. Reload the console, or return to Master Command and try again.
            </p>
            <pre className="mt-4 max-h-[180px] overflow-auto border border-line bg-bg2 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-dim">
              {error.name}: {error.message}
              {stack ? `\n${stack}` : ''}
            </pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => window.location.reload()} className="btn-core btn-solid">
                RELOAD CONSOLE
              </button>
              <button type="button" onClick={() => window.location.assign('/')} className="btn-core btn-ghost">
                RETURN TO COMMAND
              </button>
              <button type="button" onClick={this.retry} className="btn-core btn-ghost">
                TRY AGAIN
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
