/**
 * SPENDSTATE // ACCOUNTS INSIGHTS
 *
 * Where the money sits — asset distribution, per-account balances, liquidity
 * and a statistics table. All derived from the same movement ledger.
 */
import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useAccountsSystem } from '@/hooks/useAccounts'
import { useUI } from '@/store/ui'
import { formatMoney, formatCompact } from '@/lib/money'
import { ACCOUNT_TYPE_META } from '@/lib/types'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader } from '@/components/ui/Micro'
import { DataStrip } from '@/components/ui/DataStrip'
import { EmptyState, BootScreen } from '@/components/ui/Skeleton'
import { Led, SIGNAL_HEX, SIGNAL_TEXT } from '@/components/ui/Signal'
import { CompositionStrip, RadialGauge } from '@/components/charts/CategoryBlock'
import { CyberButton } from '@/components/ui/CyberButton'
import { IconPlus } from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }
const RISE = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } } }

export default function AccountsInsights() {
  const { summary, ready } = useAccountsSystem()
  const base = useUI((s) => s.baseCurrency)
  const booted = useUI((s) => s.booted)
  const openAccountComposer = useUI((s) => s.openAccountComposer)

  const compSlices = useMemo(
    () =>
      summary.byType.map((t) => ({ category: t.type, label: t.label, code: t.code, signal: t.signal, monthly: t.total, annual: t.total * 12, count: t.count, share: t.share })),
    [summary.byType],
  )
  const maxBalance = useMemo(() => Math.max(1, ...summary.views.filter((v) => !v.liability).map((v) => Math.abs(v.balanceBase))), [summary.views])

  if (!booted) return <div className="px-3 py-6 md:px-5"><BootScreen label="LOADING ACCOUNT TELEMETRY" /></div>
  if (!ready)
    return (
      <div className="px-3 py-6 md:px-5">
        <EmptyState code="NO ACCOUNTS" title="NOTHING TO ANALYSE." description="Add an account to unlock net-worth telemetry." action={{ label: 'ADD ACCOUNT', onClick: () => openAccountComposer() }} />
      </div>
    )

  const liquidRatio = summary.totalAssets > 0 ? summary.liquid / summary.totalAssets : 0

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="px-3 py-4 md:px-5 md:py-5">
      <motion.div variants={RISE}>
        <DataStrip
          size="sm"
          scroll={false}
          items={[
            { label: 'NET WORTH', value: formatMoney(summary.netWorth, base), signal: summary.netWorth >= 0 ? 'acid' : 'red' },
            { label: 'ASSETS', value: formatMoney(summary.totalAssets, base) },
            { label: 'LIABILITIES', value: formatMoney(summary.totalLiabilities, base), signal: 'red' },
            { label: 'LIQUID', value: formatMoney(summary.liquid, base), signal: 'blue' },
            { label: 'ACCOUNTS', value: String(summary.active.length) },
          ]}
        />
      </motion.div>

      <div className="mt-3 grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-8">
          <motion.div variants={RISE}>
            <CutPanel cut="tl-br" cutSize={14} innerClassName="p-3">
              <SectionHeader code="DIST" title="Asset distribution" signal="magenta" className="border-b-0 px-0 pt-0" right={<span className="micro text-faint">{summary.byType.length} TYPES</span>} />
              {summary.byType.length ? (
                <>
                  <div className="mt-2">
                    <CompositionStrip slices={compSlices} height={22} />
                  </div>
                  <ul className="mt-3 divide-y divide-line">
                    {summary.byType.map((t) => (
                      <li key={t.type} className="flex items-center gap-3 py-2">
                        <span className="grid h-8 w-8 shrink-0 place-items-center border text-[10px] font-semibold" style={{ borderColor: SIGNAL_HEX[t.signal], color: SIGNAL_HEX[t.signal] }}>{t.code}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-[12.5px] font-medium text-fg">{t.label}</span>
                            <span className="numeral text-[12px] text-fg">{formatMoney(t.total, base)}</span>
                          </span>
                          <span className="mt-1 block h-1.5 w-full border border-line bg-surface2">
                            <span className="block h-full" style={{ width: `${Math.max(2, t.share * 100)}%`, background: SIGNAL_HEX[t.signal] }} />
                          </span>
                        </span>
                        <span className="micro w-16 shrink-0 text-right text-faint">{(t.share * 100).toFixed(0)}% · {t.count}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="meta px-1 py-4 text-faint">NO ASSET ACCOUNTS TO DISTRIBUTE</p>
              )}
            </CutPanel>
          </motion.div>

          <motion.div variants={RISE}>
            <CutPanel cut="br" cutSize={14} innerClassName="p-0">
              <SectionHeader code="BAL" title="Per-account balance" signal="blue" right={<span className="micro text-faint">{summary.views.length}</span>} />
              <ul className="divide-y divide-line">
                {summary.views.map((v) => (
                  <li key={v.account.id} className="flex items-center gap-3 px-3 py-2 md:px-4">
                    <span className={cx('micro w-8 shrink-0 font-semibold', SIGNAL_TEXT[ACCOUNT_TYPE_META[v.account.type].signal])}>{ACCOUNT_TYPE_META[v.account.type].code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] text-fg">{v.account.name}</span>
                      <span className="mt-1 block h-1.5 w-full border border-line bg-surface2">
                        <span className={cx('block h-full', v.liability ? 'bg-red' : 'bg-acid')} style={{ width: `${v.liability ? Math.max(2, (Math.abs(v.balanceBase) / Math.max(summary.totalLiabilities, maxBalance)) * 100) : Math.max(2, (Math.abs(v.balanceBase) / maxBalance) * 100)}%` }} />
                      </span>
                    </span>
                    <span className={cx('numeral shrink-0 text-[12px]', v.balance < 0 ? 'text-redink' : 'text-fg')}>{formatCompact(v.balance, v.account.currency)}</span>
                  </li>
                ))}
              </ul>
            </CutPanel>
          </motion.div>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-4">
          <motion.div variants={RISE}>
            <CutPanel cut="tl" cutSize={14} innerClassName="p-3">
              <SectionHeader code="INST" title="Liquidity" signal="orange" className="border-b-0 px-0 pt-0" />
              <div className="mt-2 flex items-center justify-around gap-3">
                <RadialGauge value={liquidRatio} label="LIQUID COVER" caption={`${formatCompact(summary.liquid, base)} MOVABLE`} signal={liquidRatio >= 0.5 ? 'acid' : 'blue'} size={110} />
              </div>
            </CutPanel>
          </motion.div>

          <motion.div variants={RISE}>
            <CutPanel cut="br" cutSize={14} innerClassName="p-3">
              <SectionHeader code="STAT" title="Statistics" signal="acid" className="border-b-0 px-0 pt-0" />
              <div className="mt-2 space-y-1.5">
                {(
                  [
                    ['NET WORTH', formatMoney(summary.netWorth, base)],
                    ['TOTAL ASSETS', formatMoney(summary.totalAssets, base)],
                    ['CREDIT LIABILITIES', formatMoney(summary.totalLiabilities, base)],
                    ['LIQUID COVER', formatMoney(summary.liquid, base)],
                    ['ACCOUNTS', String(summary.active.length)],
                    ['MOVEMENTS', String(summary.movementCount)],
                    ['AVG BALANCE', formatMoney(summary.active.length ? summary.totalAssets / Math.max(1, summary.active.filter((v) => !v.liability).length) : 0, base)],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="micro text-faint">{label}</span>
                    <span className="numeral truncate text-[12px] text-fg">{value}</span>
                  </div>
                ))}
              </div>
            </CutPanel>
          </motion.div>

          {summary.notes.length > 0 && (
            <motion.div variants={RISE}>
              <CutPanel cut="tr" cutSize={14} innerClassName="p-0">
                <SectionHeader code="SIG" title="System signals" signal="magenta" />
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
              </CutPanel>
            </motion.div>
          )}

          <motion.div variants={RISE}>
            <CyberButton variant="ghost" leading={<IconPlus size={13} />} onClick={() => openAccountComposer()} full>
              ADD ACCOUNT
            </CyberButton>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
