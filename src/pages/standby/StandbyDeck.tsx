/**
 * SUBTRACK // STANDBY DECK
 *
 * The honest placeholder for a Financial OS engine that has not shipped yet.
 * Cards, Loans and Spends each mount this frame and declare the instruments
 * their eventual core will expose. It is a real telemetry deck, not a broken
 * page: it shows the domain's manifest, its planned instrument set as ghosted
 * cut-panels, the shared baseline numbers the engine will consume, and a clear
 * "core pending" status. When the engine ships, the page body swaps in.
 */
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { useSystem } from '@/hooks/useSystem'
import { useUI } from '@/store/ui'
import { formatMoney } from '@/lib/money'
import { CutPanel } from '@/components/ui/CutPanel'
import { SectionHeader, KeyCap } from '@/components/ui/Micro'
import { Led } from '@/components/ui/Signal'
import { DataStrip } from '@/components/ui/DataStrip'

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}
const RISE = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 34 } },
}

export interface StandbyInstrument {
  code: string
  title: string
  blurb: string
  icon?: ReactNode
}

export interface StandbyDeckProps {
  code: string
  label: string
  tag: string
  headline: string
  manifest: string
  instruments: StandbyInstrument[]
  roadmap: { code: string; label: string; note: string }[]
}

export function StandbyDeck(props: StandbyDeckProps) {
  const { summary } = useSystem()
  const base = useUI((s) => s.baseCurrency)

  return (
    <motion.div
      variants={STAGGER}
      initial="hidden"
      animate="show"
      className="px-3 py-4 md:px-5 md:py-5"
    >
      {/* ---------- status strip ---------- */}
      <motion.div variants={RISE}>
        <DataStrip
          size="sm"
          scroll={false}
          items={[
            { label: 'ENGINE', value: `${props.code} // ${props.tag}`, signal: 'orange' },
            { label: 'STATE', value: 'STANDBY — CORE PENDING', signal: 'orange' },
            { label: 'CURRENT BURN (SUBS)', value: formatMoney(summary.monthlyBurn, base), signal: 'acid' },
            { label: 'THIS MODULE CONTRIB', value: '—' },
          ]}
        />
      </motion.div>

      {/* ---------- hero: manifest ---------- */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tl-br" cutSize={18} innerClassName="relative overflow-hidden px-4 py-5 md:px-6 md:py-6" shadow="hard">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 dot-field opacity-[0.18]" />
          <div className="relative">
            <span className="micro flex items-center gap-2 text-orangeink">
              <Led signal="orange" size="sm" pulse />
              {props.code} // SUBSYSTEM MANIFEST
            </span>
            <h1 className="mt-1 text-[clamp(1.4rem,4vw,2.2rem)] font-semibold tracking-[-0.02em] text-fg">
              {props.headline}
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-dim">{props.manifest}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="micro inline-flex items-center gap-1.5 border border-orange px-2 py-1 text-orangeink">
                <Led signal="orange" size="sm" />
                ENGINE IN STANDBY · POWERED OFF
              </span>
              <span className="micro inline-flex items-center gap-1.5 border border-line2 px-2 py-1 text-dim">
                TARGET CORE · {props.tag}
              </span>
            </div>
          </div>
        </CutPanel>
      </motion.div>

      {/* ---------- planned instrument set (ghosted) ---------- */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="br" cutSize={14} innerClassName="p-2">
          <SectionHeader
            code="SPEC"
            title="Planned Instruments"
            signal="orange"
            right={<span className="micro text-faint">{props.instruments.length} MODULES</span>}
          />
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {props.instruments.map((instrument) => (
              <div key={instrument.code} className="group relative flex flex-col justify-between gap-3 border border-line2 bg-surface2/50 p-3 opacity-80">
                <span className="flex items-center justify-between">
                  <span className="micro flex items-center gap-2 text-faint">{instrument.code}</span>
                  {instrument.icon && <span aria-hidden="true" className="text-faint">{instrument.icon}</span>}
                </span>
                <span className="text-[13px] font-semibold text-dim">{instrument.title}</span>
                <span className="meta block text-faint">{instrument.blurb}</span>
                <span className="micro block w-full border-t border-line/60 pt-1 text-faint">
                  ⏱ AWAITING CORE
                </span>
              </div>
            ))}
          </div>
        </CutPanel>
      </motion.div>

      {/* ---------- roadmap ---------- */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="tl" cutSize={14} innerClassName="p-2">
          <SectionHeader code="ROAD" title="Arrival Sequence" signal="orange" right={<span className="micro text-faint">PLANNED</span>} />
          <ol className="space-y-1 px-3 py-2 md:px-4">
            {props.roadmap.map((step, index) => (
              <li key={step.code} className="flex items-center gap-3 py-1.5">
                <KeyCap>{String(index + 1).padStart(2, '0')}</KeyCap>
                <span className="micro shrink-0 w-12 text-orangeink">{step.code}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-medium text-dim">{step.label}</span>
                  <span className="meta block truncate text-faint">{step.note}</span>
                </span>
              </li>
            ))}
          </ol>
        </CutPanel>
      </motion.div>

      {/* ---------- baseline note ---------- */}
      <motion.div variants={RISE} className="mt-3">
        <CutPanel cut="none" cutSize={10} tone="well" innerClassName="px-3 py-3 md:px-4 md:py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="micro flex items-center gap-1.5 text-acidink">
              <Led signal="acid" size="sm" pulse />
              SHARED HOST ONLINE
            </span>
            <span className="micro text-faint">
              This engine will consume the same static FX, anchor-based date math and local IndexedDB volume as Subscriptions. Build order is queued behind the live engines.
            </span>
          </div>
        </CutPanel>
      </motion.div>
    </motion.div>
  )
}