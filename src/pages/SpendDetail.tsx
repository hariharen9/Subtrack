/**
 * SPENDSTATE // SPEND DIAGNOSTIC
 *
 * Opening a spend should feel like inspecting a transaction record on a
 * diagnostic panel: identity, economics, merchant context, related transactions
 * and control actions, all on one board. The badge is shared with the ledger
 * row, so the transition reads as the row expanding rather than a page change.
 */
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useSpend, useSpends } from '@/hooks/useSpends'
import { useUI, TOAST_VERBS } from '@/store/ui'
import { createSpend, deleteSpend } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { formatSignalDate, diffDays, todayISO } from '@/lib/date'
import { SPEND_CATEGORY_META, SPEND_METHOD_LABEL } from '@/lib/types'
import { convert } from '@/lib/money'
import { CutPanel } from '@/components/ui/CutPanel'
import { CyberButton } from '@/components/ui/CyberButton'
import { DataStrip } from '@/components/ui/DataStrip'
import { SectionHeader } from '@/components/ui/Micro'
import { EmptyState } from '@/components/ui/Skeleton'
import { Led, SIGNAL_TEXT } from '@/components/ui/Signal'
import { SpendBadge } from '@/components/spends/SpendBadge'
import {
  IconArrowRight,
  IconCopy,
  IconEdit,
  IconTerminate,
  IconChevronLeft,
} from '@/components/ui/Icons'
import { cx } from '@/lib/cx'

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}
const RISE = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } },
}

function agoLabel(iso: string, today: string): string {
  const days = diffDays(today, iso)
  if (days <= 0) return 'TODAY'
  if (days === 1) return 'YESTERDAY'
  if (days < 60) return `${days} DAYS AGO`
  const months = Math.round(days / 30.4375)
  if (months < 24) return `${months} MONTH${months === 1 ? '' : 'S'} AGO`
  return `${(months / 12).toFixed(1)} YEARS AGO`
}

export default function SpendDetail() {
  const { id } = useParams<{ id: string }>()
  const spend = useSpend(id)
  const allSpends = useSpends()
  const base = useUI((s) => s.baseCurrency)
  const openSpendComposer = useUI((s) => s.openSpendComposer)
  const pushToast = useUI((s) => s.pushToast)
  const [busy, setBusy] = useState(false)
  const [armed, setArmed] = useState(false)
  const today = todayISO()

  const meta = spend ? SPEND_CATEGORY_META[spend.category] ?? SPEND_CATEGORY_META.other : null

  // Related spends: same merchant (case-insensitive) or same category, excluding self
  const related = useMemo(() => {
    if (!spend) return []
    const norm = spend.title.trim().toLowerCase()
    return allSpends
      .filter((s) => s.id !== spend.id && s.title.trim().toLowerCase() === norm)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 10)
  }, [spend, allSpends])

  // Merchant stats
  const merchantStats = useMemo(() => {
    if (!spend) return null
    const norm = spend.title.trim().toLowerCase()
    const matches = allSpends.filter((s) => s.title.trim().toLowerCase() === norm)
    const totalAmount = matches.reduce((sum, s) => sum + convert(s.amount, s.currency, base), 0)
    const avgAmount = matches.length > 0 ? totalAmount / matches.length : 0
    const dates = matches.map((s) => s.date).sort()
    return {
      count: matches.length,
      totalAmount,
      avgAmount,
      firstDate: dates[0] ?? spend.date,
      lastDate: dates[dates.length - 1] ?? spend.date,
    }
  }, [spend, allSpends, base])

  // Category peers: same category, last 5
  const categoryPeers = useMemo(() => {
    if (!spend) return []
    return allSpends
      .filter((s) => s.id !== spend.id && s.category === spend.category)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5)
  }, [spend, allSpends])

  if (!spend || !meta) {
    return (
      <div className="px-3 py-6 md:px-5">
        <EmptyState
          code="TRANSACTION NOT FOUND"
          title="NO RECORD ON THIS VOLUME."
          description="This spend does not exist in the local store. It may have been deleted, or the identifier is from another device."
          action={{ label: 'BACK TO LEDGER', onClick: () => history.back() }}
        />
      </div>
    )
  }

  const amountBase = convert(spend.amount, spend.currency, base)
  const age = agoLabel(spend.date, today)

  const armTimer = () => {
    if (armed) {
      void (async () => {
        setBusy(true)
        try {
          await deleteSpend(spend.id)
          pushToast(TOAST_VERBS.spendDeleted(spend.title))
          history.back()
        } catch (error) {
          pushToast(
            TOAST_VERBS.error(
              'DELETE FAILED',
              error instanceof Error ? error.message : 'Local store rejected the delete',
            ),
          )
        } finally {
          setBusy(false)
          setArmed(false)
        }
      })()
      return
    }
    setArmed(true)
    window.setTimeout(() => setArmed(false), 4000)
  }

  const duplicateToToday = async () => {
    setBusy(true)
    try {
      await createSpend({
        title: spend.title,
        amount: spend.amount,
        currency: spend.currency,
        category: spend.category,
        method: spend.method,
        date: todayISO(),
        notes: spend.notes ? `Cloned: ${spend.notes}` : '',
      })
      pushToast(
        TOAST_VERBS.spendLogged(spend.title, `Cloned to today · ${formatMoney(spend.amount, spend.currency)}`),
      )
    } catch (error) {
      pushToast(
        TOAST_VERBS.error(
          'CLONE FAILED',
          error instanceof Error ? error.message : 'Local store rejected the record',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      variants={STAGGER}
      initial="hidden"
      animate="show"
      className="px-3 py-4 md:px-5 md:py-5"
    >
      {/* Back navigation */}
      <motion.div variants={RISE}>
        <Link
          to="/spends/flow"
          className="micro inline-flex items-center gap-1 text-dim transition-colors hover:text-acidink"
        >
          <IconChevronLeft size={12} /> BACK TO LEDGER
        </Link>
      </motion.div>

      {/* Identity & Economics Header */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tl-br" cutSize={18} innerClassName="relative overflow-hidden p-4 md:p-6" shadow="hard">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 dot-field opacity-[0.16]" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <SpendBadge category={spend.category} title={spend.title} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="micro text-acidink">{meta.code}</span>
                    <span className={cx('micro flex items-center gap-1', SIGNAL_TEXT[meta.signal])}>
                      <Led signal={meta.signal} size="sm" />
                      {meta.discretionary ? 'WANT' : 'NEED'}
                    </span>
                    <span className="micro text-faint">
                      {SPEND_METHOD_LABEL[spend.method]?.toUpperCase() ?? spend.method.toUpperCase()}
                    </span>
                  </div>
                  <h1 className="mt-1 text-[clamp(1.4rem,4vw,2.2rem)] font-semibold tracking-[-0.02em] text-fg">
                    {spend.title}
                  </h1>
                  <span className="micro mt-1 block text-faint">
                    {formatSignalDate(spend.date)} · {age}
                  </span>
                </div>
              </div>

              {/* Control Rail */}
              <div className="flex flex-wrap items-center gap-2">
                <CyberButton
                  variant="ghost"
                  size="sm"
                  leading={<IconEdit size={13} />}
                  onClick={() => openSpendComposer({ editId: spend.id })}
                  disabled={busy}
                >
                  EDIT
                </CyberButton>
                <CyberButton
                  variant="ghost"
                  size="sm"
                  leading={<IconCopy size={13} />}
                  onClick={() => void duplicateToToday()}
                  disabled={busy}
                >
                  CLONE TO TODAY
                </CyberButton>
                <CyberButton
                  variant={armed ? 'danger' : 'ghost'}
                  size="sm"
                  leading={<IconTerminate size={13} />}
                  onClick={armTimer}
                  disabled={busy}
                >
                  {armed ? 'CONFIRM DELETE' : 'DELETE'}
                </CyberButton>
              </div>
            </div>

            {/* Amount Hero */}
            <div className="mt-4">
              <span className="micro text-faint">AMOUNT</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="numeral text-hero text-fg">
                  {formatMoney(spend.amount, spend.currency)}
                </span>
                {spend.currency !== base && (
                  <span className="numeral text-[16px] text-dim">
                    ≈ {formatMoney(amountBase, base)}
                  </span>
                )}
              </div>
            </div>

            {/* Readout Strip */}
            <div className="mt-4 border-y border-line">
              <DataStrip
                items={[
                  { label: 'Category', value: meta.label, signal: meta.signal },
                  { label: 'Type', value: meta.discretionary ? 'DISCRETIONARY' : 'ESSENTIAL', signal: meta.discretionary ? 'orange' : 'blue' },
                  { label: 'Payment', value: SPEND_METHOD_LABEL[spend.method]?.toUpperCase() ?? spend.method.toUpperCase() },
                  { label: 'Currency', value: spend.currency },
                  { label: 'Date', value: formatSignalDate(spend.date) },
                  { label: 'Age', value: age },
                ]}
              />
            </div>
          </div>
        </CutPanel>
      </motion.div>

      {/* Metadata Register + Notes */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <motion.div variants={RISE} className="lg:col-span-6">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
            <SectionHeader code="META" title="Transaction Metadata" signal="blue" />
            <div className="divide-y divide-line">
              {(
                [
                  ['TITLE', spend.title],
                  ['CATEGORY', `${meta.label} (${meta.code})`],
                  ['TYPE', meta.discretionary ? 'DISCRETIONARY (WANT)' : 'ESSENTIAL (NEED)'],
                  ['METHOD', SPEND_METHOD_LABEL[spend.method] ?? spend.method],
                  ['DATE', formatSignalDate(spend.date)],
                  ['CURRENCY', spend.currency],
                  ['AMOUNT (NATIVE)', formatMoney(spend.amount, spend.currency)],
                  ...(base !== spend.currency ? [['AMOUNT (BASE)', formatMoney(amountBase, base)] as const] : []),
                  ['CREATED', spend.createdAt ? formatSignalDate(spend.createdAt) : '—'],
                  ['UPDATED', spend.updatedAt ? formatSignalDate(spend.updatedAt) : '—'],
                  ['NOTES', spend.notes || '—'],
                ] as readonly [string, string][]
              ).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 px-3 py-2 md:px-4">
                    <span className="tech-label">{label}</span>
                    <span className="meta max-w-[60%] truncate text-right text-fg">{value}</span>
                  </div>
                ))}
            </div>
          </CutPanel>
        </motion.div>

        {/* Merchant Intelligence */}
        <motion.div variants={RISE} className="lg:col-span-6">
          <CutPanel cut="tr" cutSize={14} innerClassName="p-0">
            <SectionHeader
              code="MRCH"
              title="Merchant Intelligence"
              signal="magenta"
              right={merchantStats ? <span className="micro text-faint">{merchantStats.count} TXN ON RECORD</span> : undefined}
            />
            {merchantStats && merchantStats.count > 1 ? (
              <div className="divide-y divide-line">
                {[
                  ['TOTAL SPENT', formatMoney(merchantStats.totalAmount, base)],
                  ['TRANSACTIONS', String(merchantStats.count)],
                  ['AVG PER VISIT', formatMoney(merchantStats.avgAmount, base)],
                  ['FIRST SEEN', formatSignalDate(merchantStats.firstDate)],
                  ['LAST SEEN', formatSignalDate(merchantStats.lastDate)],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-4 px-3 py-2 md:px-4">
                    <span className="tech-label">{String(label)}</span>
                    <span className="numeral text-[13px] text-fg">{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="meta px-3 py-5 text-faint">
                FIRST TRANSACTION AT THIS MERCHANT — NO HISTORY YET.
              </p>
            )}
          </CutPanel>
        </motion.div>
      </div>

      {/* Related Transactions from Same Merchant */}
      {related.length > 0 && (
        <motion.div variants={RISE} className="mt-3">
          <CutPanel cut="br" cutSize={14} innerClassName="p-0">
            <SectionHeader
              code="HIST"
              title={`Merchant History — ${spend.title}`}
              signal="acid"
              right={<span className="micro text-faint">{related.length} PREVIOUS</span>}
            />
            <div className="divide-y divide-line">
              {related.map((tx) => {
                const txMeta = SPEND_CATEGORY_META[tx.category] ?? SPEND_CATEGORY_META.other
                return (
                  <Link
                    key={tx.id}
                    to={`/spends/flow/${tx.id}`}
                    className="group flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-surface2 md:px-4"
                  >
                    <SpendBadge category={tx.category} title={tx.title} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-fg">{tx.title}</span>
                      <span className="micro block truncate text-faint">
                        {SPEND_METHOD_LABEL[tx.method]} · {formatSignalDate(tx.date)}
                        {tx.notes ? ` · ${tx.notes}` : ''}
                      </span>
                    </span>
                    <span className={cx('micro hidden shrink-0 sm:inline font-semibold', SIGNAL_TEXT[txMeta.signal])}>
                      {txMeta.discretionary ? 'WANT' : 'NEED'}
                    </span>
                    <span className="numeral shrink-0 text-[14px] font-semibold text-fg">
                      {formatMoney(tx.amount, tx.currency)}
                    </span>
                    <IconArrowRight size={12} className="shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                )
              })}
            </div>
          </CutPanel>
        </motion.div>
      )}

      {/* Category Peers */}
      {categoryPeers.length > 0 && (
        <motion.div variants={RISE} className="mt-3">
          <CutPanel cut="tl" cutSize={14} innerClassName="p-0">
            <SectionHeader
              code="PEERS"
              title={`Recent ${meta.label} Transactions`}
              signal={meta.signal}
              right={<span className="micro text-faint">{categoryPeers.length} RECENT</span>}
            />
            <div className="divide-y divide-line">
              {categoryPeers.map((tx) => (
                <Link
                  key={tx.id}
                  to={`/spends/flow/${tx.id}`}
                  className="group flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-surface2 md:px-4"
                >
                  <SpendBadge category={tx.category} title={tx.title} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-fg">{tx.title}</span>
                    <span className="micro block truncate text-faint">
                      {SPEND_METHOD_LABEL[tx.method]} · {formatSignalDate(tx.date)}
                    </span>
                  </span>
                  <span className="numeral shrink-0 text-[14px] font-semibold text-fg">
                    {formatMoney(tx.amount, tx.currency)}
                  </span>
                  <IconArrowRight size={12} className="shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </CutPanel>
        </motion.div>
      )}

      {/* Bottom Actions */}
      <motion.div variants={RISE} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-linehard pt-3">
        <Link
          to="/spends/flow"
          className="micro inline-flex items-center gap-1 text-dim transition-colors hover:text-acidink"
        >
          <IconChevronLeft size={12} /> BACK TO FULL LEDGER
        </Link>
        <div className="flex items-center gap-2">
          <CyberButton
            variant="ghost"
            size="sm"
            leading={<IconCopy size={13} />}
            onClick={() => void duplicateToToday()}
            disabled={busy}
          >
            CLONE
          </CyberButton>
          <CyberButton
            variant="solid"
            size="sm"
            leading={<IconEdit size={13} />}
            onClick={() => openSpendComposer({ editId: spend.id })}
            disabled={busy}
          >
            EDIT TRANSACTION
          </CyberButton>
        </div>
      </motion.div>
    </motion.div>
  )
}
