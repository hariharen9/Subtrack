/**
 * SPENDSTATE // ACCOUNTS SECTION
 *
 * The spine, embedded — a self-contained balance sheet for Master Command:
 * a net-worth statement (assets vs liabilities), the account ledger grouped
 * Assets / Liabilities, the transfer rail, the movement stream and signals.
 * No route of its own; account rows open the composer to edit.
 */
import { useMemo } from 'react'
import { useAccountsSystem, useTransfers } from '@/hooks/useAccounts'
import { deleteTransfer } from '@/lib/db'
import { useUI, TOAST_VERBS } from '@/store/ui'
import { formatMoney, formatCompact, splitMoney } from '@/lib/money'
import { formatSignalDate } from '@/lib/date'
import { ACCOUNT_TYPE_META } from '@/lib/types'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { Led, SIGNAL_TEXT } from '@/components/ui/Signal'
import { CyberButton, IconButton } from '@/components/ui/CyberButton'
import { IconPlus, IconTerminate } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

const KIND_SIGNAL: Record<string, 'acid' | 'blue' | 'magenta' | 'orange' | 'red'> = {
  income: 'acid',
  spend: 'orange',
  subscription: 'magenta',
  loan: 'blue',
  card: 'red',
  transfer: 'blue',
}

export function AccountsSection() {
  const { summary, ready } = useAccountsSystem()
  const transfers = useTransfers()
  const base = useUI((s) => s.baseCurrency)
  const openAccountComposer = useUI((s) => s.openAccountComposer)
  const pushToast = useUI((s) => s.pushToast)

  const hero = useMemo(() => splitMoney(summary.netWorth, base), [summary.netWorth, base])

  const ledger = useMemo(() => {
    const assets = summary.active.filter((v) => !v.liability).sort((a, b) => b.balanceBase - a.balanceBase)
    const liabilities = summary.active
      .filter((v) => v.liability)
      .sort((a, b) => Math.abs(b.balanceBase) - Math.abs(a.balanceBase))
    const assetTotal = assets.reduce((s, v) => s + Math.max(0, v.balanceBase), 0)
    const liabTotal = liabilities.reduce((s, v) => s + Math.abs(v.balanceBase), 0)
    return { assets, liabilities, assetTotal, liabTotal }
  }, [summary.active])

  const splitTotal = ledger.assetTotal + ledger.liabTotal
  const assetPct = splitTotal > 0 ? ledger.assetTotal / splitTotal : 0
  const liabPct = splitTotal > 0 ? ledger.liabTotal / splitTotal : 0
  const liquidPct = ledger.assetTotal > 0 ? summary.liquid / ledger.assetTotal : 0

  const accountName = (id: string) => summary.views.find((v) => v.account.id === id)?.account.name ?? '—'
  const recentTransfers = useMemo(
    () => [...transfers].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 8),
    [transfers],
  )

  const ledgerRow = (v: (typeof summary.views)[number], groupTotal: number) => {
    const meta = ACCOUNT_TYPE_META[v.account.type]
    const share = groupTotal > 0 ? Math.min(1, Math.abs(v.balanceBase) / groupTotal) : 0
    return (
      <li key={v.account.id}>
        <button
          type="button"
          onClick={() => openAccountComposer({ editId: v.account.id })}
          className="group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface2 md:px-4"
        >
          <span
            className="grid h-9 w-9 shrink-0 place-items-center border font-mono text-[10px] font-semibold"
            style={{ borderColor: v.account.color, color: v.account.color, background: `${v.account.color}14` }}
          >
            {meta.code}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-[13px] font-semibold text-fg">{v.account.name}</span>
              <span className="micro truncate text-faint">{v.account.institution || meta.label}</span>
            </span>
            <span className="mt-1.5 flex items-center gap-2">
              <span className="flex h-1.5 min-w-0 flex-1 overflow-hidden border border-line bg-surface2">
                <span
                  className={cx('block h-full', v.liability ? 'bg-orange' : v.balance < 0 ? 'bg-red' : 'bg-acid')}
                  style={{ width: `${Math.max(2, share * 100)}%` }}
                />
              </span>
              <span className="micro w-10 shrink-0 text-right text-faint">{(share * 100).toFixed(0)}%</span>
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className={cx('numeral block text-[15px] font-bold', v.balance < 0 ? 'text-redink' : 'text-fg')}>
              {v.liability && v.balance >= 0 ? '−' : ''}{formatMoney(v.balance, v.account.currency)}
            </span>
            <span className={cx('micro block', v.monthNet >= 0 ? 'text-acidink' : 'text-orangeink')}>
              {v.monthNet >= 0 ? '+' : '−'}{formatCompact(Math.abs(v.monthNet), base)} THIS MO
            </span>
          </span>
        </button>
      </li>
    )
  }

  if (!ready)
    return (
      <CutPanel cut="tl-br" cutSize={16} innerClassName="p-4">
        <SectionHeader code="SPINE" title="Accounts" signal="blue" className="border-b-0 px-0 pt-0" />
        <p className="meta mt-2 text-dim">
          No accounts yet — accounts are the spine. Every income, spend, subscription, EMI and card settlement posts into one.
        </p>
        <div className="mt-3">
          <CyberButton variant="solid" size="sm" leading={<IconPlus size={12} />} onClick={() => openAccountComposer()}>
            ADD ACCOUNT
          </CyberButton>
        </div>
      </CutPanel>
    )

  return (
    <div>
      <SectionHeader
        code="SPINE"
        title="Accounts"
        signal="acid"
        right={
          <span className="flex items-center gap-2">
            <span className="micro hidden text-faint sm:inline">{summary.active.length} ACTIVE · {summary.movementCount} MOVEMENTS</span>
            <CyberButton variant="ghost" size="sm" leading={<IconPlus size={12} />} onClick={() => openAccountComposer({ mode: 'transfer' })}>
              TRANSFER
            </CyberButton>
            <CyberButton variant="solid" size="sm" leading={<IconPlus size={12} />} onClick={() => openAccountComposer()}>
              ADD ACCOUNT
            </CyberButton>
          </span>
        }
      />

      {/* Balance-sheet statement */}
      <div className="mt-3">
        <CutPanel cut="tl-br" cutSize={16} innerClassName="relative p-4 md:p-5" shadow="hard">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden dot-field opacity-[0.14]" />
          <div className="relative grid gap-5 lg:grid-cols-[1.25fr_1fr] lg:items-end">
            <div>
              <span className="micro text-acidink">NET WORTH</span>
              <h2 className="mt-1 flex items-start gap-1">
                <span className="numeral mt-1 text-[clamp(1.5rem,4vw,2.4rem)] text-dim">{hero.symbol}</span>
                <span className="numeral text-hero text-fg">
                  <AnimatedNumber value={summary.netWorth} format={(v) => splitMoney(v, base).value} stiffness={120} damping={26} />
                </span>
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="micro text-acidink">ASSETS {formatCompact(ledger.assetTotal, base)}</span>
                <span className="micro text-orangeink">LIABILITIES {formatCompact(ledger.liabTotal, base)}</span>
              </div>
              <div className="flex h-4 w-full overflow-hidden border border-line bg-surface2">
                <span className="h-full bg-acid transition-all" style={{ width: `${Math.max(1, assetPct * 100)}%` }} />
                <span className="h-full bg-orange transition-all" style={{ width: `${ledger.liabTotal > 0 ? Math.max(1, liabPct * 100) : 0}%` }} />
              </div>
              <span className="micro text-faint">
                {(assetPct * 100).toFixed(0)}% assets · {(liabPct * 100).toFixed(0)}% liabilities · liquid {formatCompact(summary.liquid, base)} ({(liquidPct * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        </CutPanel>
      </div>

      <div className="mt-3 grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        {/* Ledger */}
        <div className="lg:col-span-8">
          <CutPanel cut="br" cutSize={14} innerClassName="p-0">
            <SectionHeader code="LEDG" title="Account ledger" signal="acid" right={<span className="micro text-faint">{ledger.assets.length} ASSETS · {ledger.liabilities.length} LIABILITIES</span>} />
            <div className="flex items-center justify-between border-y border-line bg-bg2 px-3 py-1.5 md:px-4">
              <span className="micro flex items-center gap-1.5 text-acidink">
                <Led signal="acid" size="sm" /> ASSETS
              </span>
              <span className="numeral text-[12px] font-semibold text-acidink">{formatMoney(ledger.assetTotal, base)}</span>
            </div>
            {ledger.assets.length ? (
              <ul className="divide-y divide-line">{ledger.assets.map((v) => ledgerRow(v, ledger.assetTotal))}</ul>
            ) : (
              <p className="meta px-3 py-3 text-faint">NO ASSET ACCOUNTS — ADD A BANK, WALLET OR CASH CONTAINER.</p>
            )}
            {ledger.liabilities.length > 0 && (
              <>
                <div className="flex items-center justify-between border-y border-line bg-bg2 px-3 py-1.5 md:px-4">
                  <span className="micro flex items-center gap-1.5 text-orangeink">
                    <Led signal="orange" size="sm" /> LIABILITIES
                  </span>
                  <span className="numeral text-[12px] font-semibold text-orangeink">{formatMoney(ledger.liabTotal, base)}</span>
                </div>
                <ul className="divide-y divide-line">{ledger.liabilities.map((v) => ledgerRow(v, ledger.liabTotal))}</ul>
              </>
            )}
          </CutPanel>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3 lg:col-span-4">
          <CutPanel cut="br" cutSize={14} innerClassName="p-0">
            <SectionHeader code="TX" title="Transfers" signal="magenta" right={<span className="micro text-faint">{transfers.length} MOVES</span>} />
            {recentTransfers.length ? (
              <div className="divide-y divide-line">
                {recentTransfers.map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5 px-3 py-2 md:px-4">
                    <Led signal="blue" size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-fg">
                        {accountName(t.fromAccountId)} → {accountName(t.toAccountId)}
                      </span>
                      <span className="micro block text-faint">{formatSignalDate(t.date)}{t.notes ? ` · ${t.notes}` : ''}</span>
                    </span>
                    <span className="numeral shrink-0 text-[12px] text-fg">{formatMoney(t.amount, t.currency)}</span>
                    <IconButton
                      label="Remove transfer"
                      size="sm"
                      className="text-faint hover:text-redink"
                      onClick={async () => {
                        await deleteTransfer(t.id)
                        pushToast(TOAST_VERBS.info('TRANSFER REMOVED', 'Movement reversed'))
                      }}
                    >
                      <IconTerminate size={12} />
                    </IconButton>
                  </div>
                ))}
              </div>
            ) : (
              <p className="meta px-3 py-4 text-faint">NO TRANSFERS — MOVE MONEY BETWEEN ACCOUNTS.</p>
            )}
          </CutPanel>

          <CutPanel cut="br" cutSize={14} innerClassName="p-0">
            <SectionHeader code="FLOW" title="Recent movements" signal="blue" right={<span className="micro text-faint">{summary.movementCount} TOTAL</span>} />
            {summary.recent.length ? (
              <div className="max-h-[320px] divide-y divide-line overflow-y-auto" data-lenis-prevent>
                {summary.recent.map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5 px-3 py-2 md:px-4">
                    <Led signal={KIND_SIGNAL[m.kind] ?? 'blue'} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-fg">{m.label}</span>
                      <span className="micro block truncate text-faint">{m.account.name} · {formatSignalDate(m.date)}</span>
                    </span>
                    <span className={cx('numeral shrink-0 text-[12px] font-semibold', m.amount >= 0 ? 'text-acidink' : 'text-fg')}>
                      {m.amount >= 0 ? '+' : '−'}{formatMoney(Math.abs(m.amount), m.account.currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="meta px-3 py-4 text-faint">NO MOVEMENTS YET.</p>
            )}
          </CutPanel>

          <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
            <SectionHeader code="SIG" title="Account signals" signal="magenta" />
            {summary.notes.length ? (
              <ul className="divide-y divide-line">
                {summary.notes.map((n) => (
                  <li key={n.id} className="flex items-start gap-2 px-3 py-2 md:px-4">
                    <Led signal={n.signal} size="sm" />
                    <span className="min-w-0">
                      <span className={cx('micro block font-semibold', SIGNAL_TEXT[n.signal])}>{n.label}</span>
                      <span className="meta block text-dim">{n.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="meta px-3 py-4 text-faint">NO SIGNALS</p>
            )}
          </CutPanel>
        </div>
      </div>
    </div>
  )
}
