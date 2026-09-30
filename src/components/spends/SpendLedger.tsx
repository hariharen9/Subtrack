/**
 * SPENDSTATE // SPEND LEDGER
 *
 * The raw day-to-day record: reverse-chronological day groups, each row showing
 * the merchant line with real brand / semantic hardware icons, payment method,
 * and amount. Rows are editable, duplicate-clonable to today with 1 tap, and
 * deletable with a two-step armed confirmation.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Spend } from '@/lib/types'
import {
  SPEND_CATEGORY_META,
  SPEND_METHOD_LABEL,
} from '@/lib/types'
import { formatMoney, convert } from '@/lib/money'
import { formatSignalDate, todayISO } from '@/lib/date'
import { createSpend, deleteSpend } from '@/lib/db'
import { TOAST_VERBS, useUI } from '@/store/ui'
import { cx } from '@/lib/cx'
import { SIGNAL_TEXT } from '@/components/ui/Signal'
import { IconButton } from '@/components/ui/CyberButton'
import { IconCopy, IconEdit, IconTerminate } from '@/components/ui/Icons'
import { SpendBadge } from '@/components/spends/SpendBadge'

export function SpendRow({ spend }: { spend: Spend }) {
  const openSpendComposer = useUI((s) => s.openSpendComposer)
  const pushToast = useUI((s) => s.pushToast)
  const [armed, setArmed] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const meta = SPEND_CATEGORY_META[spend.category] ?? SPEND_CATEGORY_META.other

  const armTimer = () => {
    if (armed) {
      void (async () => {
        try {
          await deleteSpend(spend.id)
          pushToast(TOAST_VERBS.spendDeleted(spend.title))
        } catch (error) {
          pushToast(
            TOAST_VERBS.error(
              'DELETE FAILED',
              error instanceof Error ? error.message : 'Local store rejected the delete',
            ),
          )
        }
      })()
      setArmed(false)
      return
    }
    setArmed(true)
    window.setTimeout(() => setArmed(false), 4000)
  }

  const duplicateSpend = async () => {
    if (duplicating) return
    setDuplicating(true)
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
        TOAST_VERBS.spendLogged(
          spend.title,
          `Cloned to today · ${formatMoney(spend.amount, spend.currency)}`,
        ),
      )
    } catch (error) {
      pushToast(
        TOAST_VERBS.error(
          'CLONE FAILED',
          error instanceof Error ? error.message : 'Local store rejected the record',
        ),
      )
    } finally {
      setDuplicating(false)
    }
  }

  return (
    <Link
      to={`/spends/flow/${spend.id}`}
      className="group flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-surface2 md:px-4"
    >
      {/* Visual Identity Badge: Real Brand or Category Vector */}
      <SpendBadge category={spend.category} title={spend.title} size="sm" />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-fg">{spend.title}</span>
        <span className="micro block truncate text-faint">
          <span className="text-dim font-medium">{SPEND_METHOD_LABEL[spend.method] ?? spend.method.toUpperCase()}</span>
          {' · '}
          {formatSignalDate(spend.date)}
          {spend.notes ? ` · ${spend.notes}` : ''}
        </span>
      </span>

      <span className={cx('micro hidden shrink-0 sm:inline font-semibold', SIGNAL_TEXT[meta.signal])}>
        {meta.discretionary ? 'WANT' : 'NEED'}
      </span>

      <span className="numeral shrink-0 text-[15px] font-semibold text-fg">
        {formatMoney(spend.amount, spend.currency)}
      </span>

      <div className="flex shrink-0 items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity" onClick={(e) => e.preventDefault()}>
        <IconButton
          label="Duplicate to today"
          size="sm"
          disabled={duplicating}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); void duplicateSpend() }}
          title="Clone this transaction for today"
        >
          <IconCopy size={13} />
        </IconButton>
        <IconButton
          label="Edit spend"
          size="sm"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); openSpendComposer({ editId: spend.id }) }}
          title="Edit transaction"
        >
          <IconEdit size={13} />
        </IconButton>
        <IconButton
          label={armed ? 'Confirm delete' : 'Delete spend'}
          size="sm"
          className={cx(armed && 'border-red text-redink bg-redsoft')}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); armTimer() }}
          title={armed ? 'Click again to permanently delete' : 'Delete'}
        >
          <IconTerminate size={13} />
        </IconButton>
      </div>
    </Link>
  )
}

export function SpendLedger({
  groups,
  base,
}: {
  groups: { date: string; spends: Spend[] }[]
  base: string
}) {
  return (
    <div className="divide-y divide-line">
      {groups.map((group) => {
        const dayTotal = group.spends.reduce((sum, spend) => sum + convert(spend.amount, spend.currency, base), 0)
        return (
          <section key={group.date}>
            <div className="flex items-center justify-between gap-3 border-b border-line bg-bg2 px-3 py-1.5 md:px-4">
              <span className="micro font-semibold text-faint">{formatSignalDate(group.date)}</span>
              <span className="micro font-mono text-dim">
                {group.spends.length} TXN · {formatMoney(dayTotal, base)}
              </span>
            </div>
            {group.spends.map((spend) => (
              <SpendRow key={spend.id} spend={spend} />
            ))}
          </section>
        )
      })}
    </div>
  )
}
