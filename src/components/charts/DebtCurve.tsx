/**
 * SUBTRACK // DEBT CURVE
 *
 * The amortization curve — an SVG trace showing balance decay over time with
 * gradient fill, principal/interest split area, and interactive crosshair.
 * Draws itself on entry with a pathLength animation.
 */
import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { Loan, LoanPayment } from '@/lib/types'
import { formatMoney, formatCompact } from '@/lib/money'
import { formatSignalDate } from '@/lib/date'
import { useElementWidth } from '@/hooks/useElementWidth'
import { amortize } from '@/lib/debt'

const PAD = { l: 6, r: 6, t: 16, b: 28 }

export function AmortizationCurve({
  loan,
  payments,
  base,
  height = 200,
}: {
  loan: Loan
  payments: LoanPayment[]
  base: string
  height?: number
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>(600)
  const reduced = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const schedule = useMemo(() => amortize(loan), [loan])
  const paidSet = useMemo(() => new Set(payments.map((p) => p.emiNumber)), [payments])

  const geometry = useMemo(() => {
    const w = Math.max(width, 280)
    const innerW = w - PAD.l - PAD.r
    const innerH = height - PAD.t - PAD.b
    const max = loan.principal * 1.05
    const step = schedule.length > 1 ? innerW / (schedule.length - 1) : 0
    const x = (i: number) => PAD.l + i * step
    const yBal = (v: number) => PAD.t + (1 - v / max) * innerH
    const yInt = (v: number) => PAD.t + (1 - v / (loan.emi * 1.1)) * innerH

    // Balance line
    const balCoords = schedule.map((r, i) => ({ x: x(i), y: yBal(r.balance) }))
    const balLine = balCoords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
    const balArea = `${balLine} L${balCoords[balCoords.length - 1]?.x.toFixed(1) ?? 0} ${(PAD.t + innerH).toFixed(1)} L${balCoords[0]?.x.toFixed(1) ?? 0} ${(PAD.t + innerH).toFixed(1)} Z`

    // Principal vs Interest stacked area
    const maxComponent = Math.max(...schedule.map((r) => r.principal + r.interest), 1)
    const yP = (v: number) => PAD.t + (1 - v / (maxComponent * 1.1)) * innerH
    const principalLine = schedule.map((r, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${yP(r.principal).toFixed(1)}`).join(' ')
    const totalLine = [...schedule].reverse().map((r, ri) => {
      const i = schedule.length - 1 - ri
      return `${ri === 0 ? 'L' : 'L'}${x(i).toFixed(1)} ${yP(r.principal + r.interest).toFixed(1)}`
    }).join(' ')
    const stackedArea = `${principalLine} ${totalLine} Z`

    // Grid
    const gridLines: { y: number; label: string }[] = []
    for (let i = 0; i <= 4; i++) {
      const val = (max / 4) * i
      gridLines.push({ y: yBal(val), label: formatCompact(val, base) })
    }

    // Paid/actual boundary
    const paidCount = payments.length
    const paidX = paidCount > 0 ? x(Math.min(paidCount - 1, schedule.length - 1)) : PAD.l

    return { w, innerW, innerH, step, x, yBal, yInt, yP, balLine, balArea, principalLine, stackedArea, gridLines, paidX, max, balCoords, schedule }
  }, [schedule, payments, loan, width, height, base])

  const active = activeIndex !== null ? schedule[activeIndex] : null
  const activeCoord = activeIndex !== null ? geometry.balCoords[activeIndex] : null

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setActiveIndex(null)}>
      <svg viewBox={`0 0 ${geometry.w} ${height}`} width="100%" height={height} className="select-none" aria-hidden="true">
        {/* Grid */}
        {geometry.gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={g.y} x2={geometry.w - PAD.r} y2={g.y} stroke="var(--c-line)" strokeWidth={0.5} strokeDasharray="2 3" />
          </g>
        ))}

        {/* Paid region background */}
        <rect x={PAD.l} y={PAD.t} width={geometry.paidX - PAD.l} height={geometry.innerH} fill="var(--c-acid)" opacity={0.04} />

        {/* Stacked area: principal (blue) + interest (orange) */}
        <motion.path
          d={geometry.stackedArea}
          fill="var(--c-orange)"
          opacity={0.12}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.12 }}
          transition={{ duration: 0.6 }}
        />
        <motion.path
          d={geometry.principalLine}
          fill="none"
          stroke="var(--c-blue)"
          strokeWidth={1.5}
          opacity={0.5}
          initial={reduced ? {} : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduced ? 0 : 1, delay: 0.2 }}
        />

        {/* Balance curve */}
        <motion.path
          d={geometry.balLine}
          fill="none"
          stroke="var(--c-acid)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduced ? {} : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduced ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Balance fill */}
        <motion.path
          d={geometry.balArea}
          fill="var(--c-acid)"
          opacity={0.06}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.06 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        />

        {/* Paid/actual boundary line */}
        <line x1={geometry.paidX} y1={PAD.t} x2={geometry.paidX} y2={PAD.t + geometry.innerH} stroke="var(--c-fg)" strokeWidth={0.8} strokeDasharray="3 3" opacity={0.3} />
        <text x={geometry.paidX + 4} y={PAD.t + 12} fill="var(--c-fg-dim)" fontSize={8} fontFamily="var(--font-mono)">PAID</text>
        <text x={geometry.paidX + 4} y={PAD.t + 22} fill="var(--c-fg-faint)" fontSize={8} fontFamily="var(--font-mono)">PROJECTED</text>

        {/* Hover zones */}
        {geometry.balCoords.map((c, i) => (
          <rect key={i} x={c.x - geometry.step / 2} y={PAD.t} width={geometry.step} height={geometry.innerH} fill="transparent" className="cursor-pointer" onMouseEnter={() => setActiveIndex(i)} />
        ))}

        {/* Data points on balance curve */}
        {geometry.balCoords.map((c, i) => {
          const isPaid = paidSet.has(i + 1)
          const isActive = activeIndex === i
          const show = i === 0 || i === schedule.length - 1 || i === payments.length || isActive || (schedule.length <= 24 ? true : i % 3 === 0)
          if (!show) return null
          return (
            <rect key={i} x={c.x - (isActive ? 4 : 3)} y={c.y - (isActive ? 4 : 3)} width={isActive ? 8 : 6} height={isActive ? 8 : 6} fill={isPaid ? 'var(--c-acid)' : 'var(--c-blue)'} opacity={isActive ? 1 : 0.7} />
          )
        })}

        {/* Crosshair */}
        {activeCoord && active && (
          <>
            <line x1={activeCoord.x} y1={PAD.t} x2={activeCoord.x} y2={PAD.t + geometry.innerH} stroke="var(--c-fg)" strokeWidth={0.5} strokeDasharray="2 2" opacity={0.3} />
            <line x1={PAD.l} y1={activeCoord.y} x2={geometry.w - PAD.r} y2={activeCoord.y} stroke="var(--c-fg)" strokeWidth={0.5} strokeDasharray="2 2" opacity={0.3} />
            {/* Badge */}
            <rect x={Math.min(activeCoord.x + 8, geometry.w - 130)} y={Math.max(activeCoord.y - 34, PAD.t)} width={120} height={30} fill="var(--c-surface)" stroke="var(--c-line-hard)" strokeWidth={1} />
            <text x={Math.min(activeCoord.x + 14, geometry.w - 124)} y={Math.max(activeCoord.y - 18, PAD.t + 15)} fill="var(--c-fg)" fontSize={10} fontFamily="var(--font-mono)" fontWeight="600">
              BAL: {formatCompact(active.balance, base)}
            </text>
            <text x={Math.min(activeCoord.x + 14, geometry.w - 124)} y={Math.max(activeCoord.y - 7, PAD.t + 26)} fill="var(--c-fg-dim)" fontSize={9} fontFamily="var(--font-mono)">
              P:{formatMoney(active.principal, base)} I:{formatMoney(active.interest, base)}
            </text>
          </>
        )}

        {/* X-axis labels */}
        {schedule.map((r, i) => {
          const show = i === 0 || i === schedule.length - 1 || i === payments.length || (schedule.length <= 12 ? true : schedule.length <= 36 ? i % 6 === 0 : i % 12 === 0)
          if (!show) return null
          return (
            <text key={i} x={geometry.balCoords[i]?.x} y={PAD.t + geometry.innerH + 14} fill="var(--c-fg-dim)" fontSize={8} fontFamily="var(--font-mono)" textAnchor="middle">
              {r.emiNumber}
            </text>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="mt-1 flex items-center justify-between px-1">
        <span className="micro text-faint">
          {active ? (
            <span className="text-fg font-medium">
              EMI #{active.emiNumber} · {formatSignalDate(active.date)} · BAL {formatCompact(active.balance, base)}
              <span className="text-blueink ml-1.5">P:{formatMoney(active.principal, base)}</span>
              <span className="text-orangeink ml-1">I:{formatMoney(active.interest, base)}</span>
            </span>
          ) : (
            'HOVER TO INSPECT AMORTIZATION'
          )}
        </span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="block h-[2px] w-3 bg-acid" /><span className="micro text-faint">BALANCE</span></span>
          <span className="flex items-center gap-1"><span className="block h-[2px] w-3 bg-blue opacity-50" /><span className="micro text-faint">PRINCIPAL</span></span>
          <span className="flex items-center gap-1"><span className="block h-2 w-3 bg-orange opacity-30" /><span className="micro text-faint">INTEREST</span></span>
        </span>
      </div>

      {/* A11y table */}
      <table className="sr-only">
        <caption>Amortization schedule for {loan.name}</caption>
        <thead><tr><th>EMI #</th><th>Date</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>
        <tbody>
          {schedule.map((r) => (
            <tr key={r.emiNumber}><td>{r.emiNumber}</td><td>{r.date}</td><td>{formatMoney(r.principal, base)}</td><td>{formatMoney(r.interest, base)}</td><td>{formatMoney(r.balance, base)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── EMI Split Donut ──────────────────────────────────────────────────── */

export function EMISplitDonut({
  principal,
  interest,
  base,
  size = 140,
}: {
  principal: number
  interest: number
  base: string
  size?: number
}) {
  const total = principal + interest
  const pRatio = total > 0 ? principal / total : 0.5
  const iRatio = 1 - pRatio
  const r = 42
  const c = 2 * Math.PI * r
  const pLen = pRatio * c
  const iLen = iRatio * c

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--c-orange)" strokeWidth="10" strokeDasharray={`${iLen} ${c}`} opacity={0.4} />
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--c-blue)" strokeWidth="10" strokeDasharray={`${pLen} ${c}`} strokeDashoffset={`${-iLen}`} opacity={0.8} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="numeral text-[16px] font-bold text-fg">{(pRatio * 100).toFixed(0)}%</span>
        <span className="micro text-faint">PRINCIPAL</span>
      </div>
      <div className="mt-2 flex flex-col items-center gap-1">
        <span className="flex items-center gap-1.5">
          <span className="block h-2.5 w-2.5 bg-blue opacity-80" />
          <span className="micro text-dim">PRINCIPAL {formatMoney(principal, base)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="block h-2.5 w-2.5 bg-orange opacity-40" />
          <span className="micro text-dim">INTEREST {formatMoney(interest, base)}</span>
        </span>
      </div>
    </div>
  )
}

/* ── Debt Composition Rail ─────────────────────────────────────────────── */

export function DebtCompositionRail({
  views,
  base,
  height = 48,
}: {
  views: { loan: Loan; outstanding: number; share: number }[]
  base: string
  height?: number
}) {
  const colors: Record<string, string> = {
    home: 'var(--c-blue)',
    vehicle: 'var(--c-acid)',
    personal: 'var(--c-orange)',
    education: 'var(--c-magenta)',
    gold: 'var(--c-orange)',
    credit_card: 'var(--c-red)',
    other: 'var(--c-blue)',
  }

  return (
    <div className="flex w-full overflow-hidden border border-line" style={{ height }}>
      {views.map((v) => (
        <div
          key={v.loan.id}
          className="relative flex items-center justify-center transition-opacity hover:opacity-80"
          style={{
            width: `${Math.max(2, v.share * 100)}%`,
            background: colors[v.loan.loanType] ?? 'var(--c-blue)',
            opacity: 0.65,
          }}
          title={`${v.loan.name}: ${formatMoney(v.outstanding, base)} (${(v.share * 100).toFixed(0)}%)`}
        >
          {v.share >= 0.12 && (
            <span className="micro truncate px-1 font-semibold text-black/80">
              {(v.share * 100).toFixed(0)}%
            </span>
          )}
        </div>
      ))}
    </div>
  )
}