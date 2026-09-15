/**
 * SUBTRACK // PROCESS AUTHORING CONSOLE
 *
 * The INITIALIZE SUBSCRIPTION flow. Selecting a service pre-fills glyph, accent,
 * category and the cycle people actually buy, so the happy path stays
 * SERVICE → PRICE → DATE → INITIALIZE. On a phone it arrives as a console sheet
 * from the bottom; on desktop it expands as a centred panel.
 *
 * The footer always shows the live consequence of the draft: what this process
 * costs per month, per year and as a share of total burn.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  CATEGORIES,
  type BillingCycle,
  type Category,
} from '@/lib/types'
import { SERVICE_CATALOG, CATALOG_BY_ID, matchCatalog, type CatalogService } from '@/lib/catalog'
import { CURRENCIES, formatMoney, symbolOf } from '@/lib/money'
import { annualCost, cycleNoun, monthlyCost } from '@/lib/cycle'
import { convert } from '@/lib/money'
import { todayISO } from '@/lib/date'
import { createSubscription, updateSubscription } from '@/lib/db'
import { useSubscriptions, useSystem } from '@/hooks/useSystem'
import { TOAST_VERBS, useUI } from '@/store/ui'
import { useFocusTrap, useIsCompact, useScrollLock } from '@/hooks/usePlatform'
import { cx } from '@/lib/cx'
import { CyberButton, IconButton } from '@/components/ui/CyberButton'
import { FieldShell, SegmentedControl, CyberSelect } from '@/components/ui/Controls'
import { CyberDatePicker } from '@/components/ui/CyberDatePicker'
import { ServiceBadge } from '@/components/brand/ServiceBadge'
import { IconClose, IconPlus } from '@/components/ui/Icons'
import { Led } from '@/components/ui/Signal'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'

type CycleChoice = BillingCycle

const CYCLE_OPTIONS: { value: CycleChoice; label: string; hint: string }[] = [
  { value: 'weekly', label: 'WEEKLY', hint: 'Every 7 days' },
  { value: 'monthly', label: 'MONTHLY', hint: 'Same day each month' },
  { value: 'quarterly', label: 'QUARTERLY', hint: 'Every 3 months' },
  { value: 'yearly', label: 'YEARLY', hint: 'Once a year' },
  { value: 'custom', label: 'CUSTOM', hint: 'Set an interval in days' },
]

const ACCENTS = ['#B7FF00', '#00C8FF', '#FF2BD6', '#FF7A00', '#FF304F', '#8B949E']

interface Draft {
  name: string
  serviceId: string | null
  price: string
  /** False once the user edits the amount, so catalog defaults stop overwriting it. */
  priceAuto: boolean
  currency: string
  billingCycle: CycleChoice
  customDays: string
  nextBillingDate: string
  category: Category
  icon: string
  color: string
  notes: string
}

function emptyDraft(currency: string): Draft {
  return {
    name: '',
    serviceId: null,
    price: '',
    priceAuto: true,
    currency,
    billingCycle: 'monthly',
    customDays: '30',
    nextBillingDate: todayISO(),
    category: 'other',
    icon: 'process',
    color: '#B7FF00',
    notes: '',
  }
}

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.022, delayChildren: 0.03 } },
}
const ITEM = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 460, damping: 34 } },
}

export function SubscriptionComposer() {
  const composer = useUI((s) => s.composer)
  const closeComposer = useUI((s) => s.closeComposer)
  const pushToast = useUI((s) => s.pushToast)
  const base = useUI((s) => s.baseCurrency)
  const compact = useIsCompact()
  const navigate = useNavigate()
  const subscriptions = useSubscriptions()
  const { summary } = useSystem()

  const editing = composer.editId
    ? subscriptions.find((sub) => sub.id === composer.editId)
    : undefined

  const [draft, setDraft] = useState<Draft>(() => emptyDraft(base))
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)
  const priceRef = useRef<HTMLInputElement>(null)
  const trapRef = useFocusTrap<HTMLDivElement>(composer.open)
  useScrollLock(composer.open)

  // Reset the console every time it opens.
  useEffect(() => {
    if (!composer.open) return
    setShowErrors(false)
    setBusy(false)
    if (editing) {
      setDraft({
        name: editing.name,
        serviceId: editing.serviceId,
        price: String(editing.price),
        priceAuto: false,
        currency: editing.currency,
        billingCycle: editing.billingCycle,
        customDays: String(editing.customIntervalDays ?? 30),
        nextBillingDate: editing.nextBillingDate,
        category: editing.category,
        icon: editing.icon,
        color: editing.color,
        notes: editing.notes,
      })
      return
    }
    const preset = composer.presetServiceId ? CATALOG_BY_ID.get(composer.presetServiceId) : undefined
    setDraft(() => {
      const next = emptyDraft(base)
      if (!preset) return next
      return {
        ...next,
        name: preset.name,
        serviceId: preset.id,
        price: String(preset.price),
        billingCycle: preset.cycle,
        category: preset.category,
        icon: preset.glyph,
        color: preset.color,
      }
    })
  }, [composer.open, composer.editId, composer.presetServiceId, editing, base])

  const price = Number.parseFloat(draft.price.replace(/,/g, '')) || 0
  const monthly = monthlyCost(
    price,
    draft.billingCycle,
    draft.billingCycle === 'custom' ? Number.parseInt(draft.customDays, 10) || 30 : undefined,
  )
  const annual = annualCost(
    price,
    draft.billingCycle,
    draft.billingCycle === 'custom' ? Number.parseInt(draft.customDays, 10) || 30 : undefined,
  )
  const monthlyInBase = convert(monthly, draft.currency, base)
  const existing = editing ? summary.monthlyBurn - convert(monthlyCost(editing.price, editing.billingCycle, editing.customIntervalDays), editing.currency, base) : summary.monthlyBurn
  const shareOfBurn = existing + monthlyInBase > 0 ? monthlyInBase / (existing + monthlyInBase) : 0

  const nameError = showErrors && !draft.name.trim() ? 'SERVICE NAME REQUIRED' : undefined
  const priceError =
    showErrors && (!Number.isFinite(price) || price <= 0) ? 'ENTER A BILLING AMOUNT ABOVE ZERO' : undefined
  const customError =
    showErrors && draft.billingCycle === 'custom' && !(Number.parseInt(draft.customDays, 10) > 0)
      ? 'INTERVAL MUST BE AT LEAST 1 DAY'
      : undefined

  const [presetCategory, setPresetCategory] = useState<string>('all')

  const filteredCatalog = useMemo(() => {
    const query = draft.name.trim().toLowerCase()
    let list = SERVICE_CATALOG
    if (presetCategory !== 'all') {
      list = list.filter((s) => s.category === presetCategory)
    }
    if (!query) return list
    const matches = list.filter(
      (service) =>
        service.name.toLowerCase().includes(query) ||
        service.category.includes(query) ||
        service.aliases?.some((alias) => alias.includes(query)),
    )
    return matches.length ? matches : list
  }, [draft.name, presetCategory])

  const activeService = draft.serviceId ? CATALOG_BY_ID.get(draft.serviceId) : undefined
  const tiers = activeService?.tiers ?? []

  const applyService = (service: CatalogService) => {
    setDraft((current) => ({
      ...current,
      name: service.name,
      serviceId: service.id,
      price: String(service.price),
      priceAuto: true,
      billingCycle: service.cycle,
      category: service.category,
      icon: service.glyph,
      color: service.color,
    }))
    window.setTimeout(() => priceRef.current?.focus(), 30)
  }

  /**
   * Typing a recognised service name pre-fills the rest — glyph, accent, category,
   * cycle and the typical Indian price — until the user edits the amount
   * themselves. That keeps SERVICE → PRICE → DATE fast without fighting the user.
   */
  const onNameChange = (value: string) => {
    setDraft((current) => {
      const match = matchCatalog(value)
      if (!match) {
        return { ...current, name: value, serviceId: null }
      }
      return {
        ...current,
        name: value,
        serviceId: match.id,
        icon: match.glyph,
        color: match.color,
        category: current.serviceId ? current.category : match.category,
        price: current.priceAuto ? String(match.price) : current.price,
        billingCycle: current.priceAuto ? match.cycle : current.billingCycle,
      }
    })
  }

  const submit = async () => {
    setShowErrors(true)
    if (!draft.name.trim() || price <= 0 || customError) return
    setBusy(true)
    const payload = {
      name: draft.name,
      serviceId: draft.serviceId,
      price,
      currency: draft.currency,
      billingCycle: draft.billingCycle,
      customIntervalDays:
        draft.billingCycle === 'custom' ? Number.parseInt(draft.customDays, 10) || 30 : undefined,
      nextBillingDate: draft.nextBillingDate,
      category: draft.category,
      icon: draft.icon,
      color: draft.color,
      notes: draft.notes,
    }
    try {
      if (editing) {
        await updateSubscription(editing.id, payload)
        pushToast(TOAST_VERBS.updated(draft.name.trim()))
        setBusy(false)
        closeComposer()
      } else {
        const created = await createSubscription(payload)
        pushToast(
          TOAST_VERBS.initialized(
            draft.name.trim(),
            `${formatMoney(price, draft.currency)} ${cycleNoun(
              draft.billingCycle,
              payload.customIntervalDays,
            ).toLowerCase()} · next ${draft.nextBillingDate}`,
          ),
        )
        setBusy(false)
        closeComposer()
        navigate(`/flow/${created.id}`)
      }
    } catch (error) {
      setBusy(false)
      pushToast(
        TOAST_VERBS.error(
          'WRITE FAILED',
          error instanceof Error ? error.message : 'Local store rejected the record',
        ),
      )
    }
  }

  const cut = compact ? 'tl' : 'tl-br'

  return (
    <AnimatePresence>
      {composer.open && (
        <div
          className={cx(
            'fixed inset-0 z-[80] flex',
            compact ? 'items-end' : 'items-center justify-center p-4',
          )}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeComposer}
            aria-hidden="true"
          />

          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="composer-title"
            className={cx(
              'relative flex w-full flex-col',
              compact ? 'h-[92dvh]' : 'max-h-[88dvh] max-w-[820px]',
            )}
            initial={compact ? { y: '102%' } : { opacity: 0, scale: 0.975, y: 14 }}
            animate={compact ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={compact ? { y: '102%' } : { opacity: 0, scale: 0.985, y: 10 }}
            transition={
              compact
                ? { type: 'spring', stiffness: 420, damping: 40 }
                : { type: 'spring', stiffness: 440, damping: 36 }
            }
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                closeComposer()
              }
            }}
          >
            <div className="cp flex min-h-0 flex-1 flex-col">
              <span aria-hidden="true" className={cx('cp-shadow', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')} />
              <div className={cx('cp-frame flex min-h-0 flex-1 flex-col bg-line2', cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br')}>
                <div
                  className={cx(
                    'cp-in flex min-h-0 flex-1 flex-col bg-surface',
                    cut === 'tl' ? 'clip-cut-tl' : 'clip-cut-br',
                  )}
                >
                  {/* header */}
                  <div className="flex items-center justify-between gap-3 border-b-2 border-linehard px-3 py-2.5 md:px-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="micro flex items-center gap-1.5 border border-line2 px-1.5 py-0.5 text-acidink">
                        <Led signal="acid" size="sm" pulse />
                        {editing ? 'SUBSCRIPTION // EDIT' : 'NEW SUBSCRIPTION'}
                      </span>
                      <span id="composer-title" className="truncate text-[13px] font-semibold text-fg">
                        {editing ? editing.name : 'Add subscription'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tech-label hidden md:inline">
                        100% OFFLINE
                      </span>
                      <IconButton label="Close console" size="sm" onClick={closeComposer}>
                        <IconClose size={14} />
                      </IconButton>
                    </div>
                  </div>

                  {compact && (
                    <div className="flex justify-center border-b border-line py-1.5" aria-hidden="true">
                      <span className="block h-1 w-12 bg-line2" />
                    </div>
                  )}

                  {/* body */}
                  <motion.div
                    variants={STAGGER}
                    initial="hidden"
                    animate="show"
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                  >
                    {/* 01 SERVICE */}
                    <Section code="01" title="SERVICE">
                      <FieldShell
                        label="SERVICE NAME"
                        code="STRING"
                        htmlFor="composer-name"
                        error={nameError}
                        hint="Type any service, or pick one below to pre-fill the rest."
                      >
                        <input
                          id="composer-name"
                          className="field"
                          value={draft.name}
                          onChange={(event) => onNameChange(event.target.value)}
                          placeholder="NETFLIX / SPOTIFY / ..."
                          autoComplete="off"
                          spellCheck={false}
                          aria-invalid={Boolean(nameError)}
                        />
                      </FieldShell>

                      {/* Category quick tabs */}
                      <div className="no-scrollbar mt-2.5 flex items-center gap-1 overflow-x-auto pb-0.5">
                        <button
                          type="button"
                          onClick={() => setPresetCategory('all')}
                          className={cx(
                            'micro border px-2 py-1 transition-colors',
                            presetCategory === 'all'
                              ? 'border-acid bg-acid text-black font-semibold'
                              : 'border-line2 text-dim hover:border-linehard hover:text-fg',
                          )}
                        >
                          ALL ({SERVICE_CATALOG.length})
                        </button>
                        {CATEGORIES.map((cat) => {
                          const count = SERVICE_CATALOG.filter((s) => s.category === cat.id).length
                          if (count === 0) return null
                          const isCatActive = presetCategory === cat.id
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setPresetCategory(cat.id)}
                              className={cx(
                                'micro whitespace-nowrap border px-2 py-1 transition-colors',
                                isCatActive
                                  ? 'border-acid bg-acid text-black font-semibold'
                                  : 'border-line2 text-dim hover:border-linehard hover:text-fg',
                              )}
                            >
                              {cat.code} ({count})
                            </button>
                          )
                        })}
                      </div>

                      {/* Preset Grid */}
                      <div className="no-scrollbar mt-2 max-h-[220px] overflow-y-auto overscroll-contain pr-0.5 md:max-h-[240px]">
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                          {filteredCatalog.map((service) => {
                            const selected = draft.serviceId === service.id
                            return (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => applyService(service)}
                                aria-pressed={selected}
                                className={cx(
                                  'flex items-center gap-2.5 border p-2 text-left transition-colors',
                                  selected
                                    ? 'border-acid bg-acidsoft'
                                    : 'border-line2 bg-surface2 hover:border-linehard',
                                )}
                              >
                                <ServiceBadge
                                  icon={service.glyph}
                                  color={service.color}
                                  size="sm"
                                  tone={selected ? 'brand' : 'ink'}
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[11.5px] font-medium text-fg">
                                    {service.name}
                                  </span>
                                  <span className="micro block truncate text-faint">
                                    {formatMoney(service.price, 'INR')}
                                    {service.cycle === 'yearly' ? '/YR' : '/MO'}
                                  </span>
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </Section>

                    {/* 02 PRICE + CURRENCY */}
                    <Section code="02" title="BILLING">
                      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
                        <FieldShell
                          label="PRICE"
                          code="DECIMAL"
                          htmlFor="composer-price"
                          error={priceError}
                        >
                          <div className="flex items-center border border-line2 bg-bg2 transition-colors focus-within:border-acid">
                            <span className="pl-3 font-mono text-[18px] text-faint">
                              {symbolOf(draft.currency)}
                            </span>
                            <input
                              id="composer-price"
                              ref={priceRef}
                              value={draft.price}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...current,
                                  price: event.target.value.replace(/[^\d.]/g, '').slice(0, 12),
                                  priceAuto: false,
                                }))
                              }
                              inputMode="decimal"
                              placeholder="0"
                              aria-invalid={Boolean(priceError)}
                              className="w-full bg-transparent px-2 py-2.5 font-mono text-[22px] font-semibold tnum outline-none placeholder:text-faint"
                            />
                            <span className="micro pr-3 text-faint">
                              {draft.currency}
                            </span>
                          </div>
                          {tiers.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {tiers.map((tier) => (
                                <button
                                  key={`${tier.label}-${tier.price}`}
                                  type="button"
                                  onClick={() =>
                                    setDraft((current) => ({
                                      ...current,
                                      price: String(tier.price),
                                      priceAuto: true,
                                      billingCycle: tier.cycle,
                                    }))
                                  }
                                  className={cx(
                                    'micro border px-1.5 py-1 transition-colors',
                                    Number(draft.price) === tier.price
                                      ? 'border-acid text-acidink'
                                      : 'border-line2 text-faint hover:border-linehard hover:text-dim',
                                  )}
                                >
                                  {tier.label} · {formatMoney(tier.price, 'INR')}
                                </button>
                              ))}
                            </div>
                          )}
                        </FieldShell>

                        <FieldShell label="CURRENCY" code="ISO-4217" htmlFor="composer-currency">
                          <div id="composer-currency">
                            <CyberSelect
                              ariaLabel="Currency"
                              value={draft.currency}
                              onChange={(value) =>
                                setDraft((current) => ({ ...current, currency: value }))
                              }
                              options={CURRENCIES.map((currency) => ({
                                value: currency.code,
                                label: `${currency.symbol} ${currency.code}`,
                                hint: currency.name,
                              }))}
                            />
                          </div>
                        </FieldShell>
                      </div>
                    </Section>

                    {/* 03 CYCLE + NEXT DATE */}
                    <Section code="03" title="SCHEDULE">
                      <div className="grid gap-3 md:grid-cols-2">
                        <FieldShell label="BILLING CYCLE" code="INTERVAL" error={customError}>
                          <SegmentedControl
                            ariaLabel="Billing cycle"
                            value={draft.billingCycle}
                            onChange={(value) =>
                              setDraft((current) => ({ ...current, billingCycle: value }))
                            }
                            options={CYCLE_OPTIONS}
                            size="sm"
                          />
                          {draft.billingCycle === 'custom' && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <input
                                className="field w-24"
                                value={draft.customDays}
                                inputMode="numeric"
                                aria-label="Interval in days"
                                onChange={(event) =>
                                  setDraft((current) => ({
                                    ...current,
                                    customDays: event.target.value.replace(/[^\d]/g, '').slice(0, 4),
                                  }))
                                }
                              />
                              <span className="micro text-faint">DAYS BETWEEN CHARGES</span>
                            </div>
                          )}
                        </FieldShell>

                        <FieldShell
                          label="NEXT CYCLE"
                          code="ANCHOR"
                          hint="Every future date is derived from this anchor."
                        >
                          <CyberDatePicker
                            value={draft.nextBillingDate}
                            onChange={(iso) =>
                              setDraft((current) => ({ ...current, nextBillingDate: iso }))
                            }
                          />
                        </FieldShell>
                      </div>
                    </Section>

                    {/* 04 CATEGORY + ACCENT */}
                    <Section code="04" title="CLASSIFICATION">
                      <div className="grid gap-3 md:grid-cols-[1.5fr_1fr]">
                        <FieldShell label="CATEGORY" code="TAG">
                          <SegmentedControl
                            ariaLabel="Category"
                            columns={4}
                            size="sm"
                            value={draft.category}
                            onChange={(value) =>
                              setDraft((current) => ({ ...current, category: value }))
                            }
                            options={CATEGORIES.map((category) => ({
                              value: category.id,
                              label: category.code,
                              hint: category.label,
                            }))}
                          />
                          <p className="micro mt-1.5 text-faint">
                            {CATEGORIES.find((c) => c.id === draft.category)?.label?.toUpperCase()}
                          </p>
                        </FieldShell>

                        <FieldShell label="ACCENT" code="HEX" hint="Used for the module's signal strip.">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <ServiceBadge icon={draft.icon} color={draft.color} size="md" />
                            {[draft.color, ...ACCENTS.filter((a) => a !== draft.color)].map((accent) => (
                              <button
                                key={accent}
                                type="button"
                                aria-label={`Accent ${accent}`}
                                aria-pressed={draft.color === accent}
                                onClick={() => setDraft((current) => ({ ...current, color: accent }))}
                                className={cx(
                                  'h-7 w-7 border-2 transition-transform',
                                  draft.color === accent
                                    ? 'border-fg'
                                    : 'border-line2 hover:scale-105',
                                )}
                                style={{ background: accent }}
                              />
                            ))}
                          </div>
                        </FieldShell>
                      </div>
                    </Section>

                    {/* 05 NOTES */}
                    <Section code="05" title="NOTES" last>
                      <FieldShell
                        label="ANNOTATION"
                        code="FREETEXT"
                        htmlFor="composer-notes"
                        hint="Plan tier, who shares it, anything worth knowing at renewal."
                      >
                        <textarea
                          id="composer-notes"
                          className="field min-h-20 resize-y"
                          value={draft.notes}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, notes: event.target.value.slice(0, 500) }))
                          }
                          placeholder="FAMILY PLAN — SPLIT 3 WAYS..."
                        />
                      </FieldShell>
                    </Section>
                  </motion.div>

                  {/* footer: live readout + commit */}
                  <div className="border-t-2 border-linehard bg-bg2 px-3 py-2.5 md:px-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div className="flex items-end gap-3">
                        <span className="flex items-baseline gap-1">
                          <span className="numeral text-[26px] text-fg">
                            <AnimatedNumber
                              value={monthlyInBase}
                              format={(value) => formatMoney(value, base)}
                              stiffness={260}
                              damping={28}
                            />
                          </span>
                          <span className="micro pb-1 text-faint">/ MONTH</span>
                        </span>
                        <span className="meta hidden text-dim sm:block">
                          {formatMoney(annual, draft.currency)} / YR
                          <span className="text-linehard"> · </span>
                          {(shareOfBurn * 100).toFixed(1)}% OF BURN
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <CyberButton variant="ghost" onClick={closeComposer} disabled={busy}>
                          CANCEL
                        </CyberButton>
                        <CyberButton
                          variant="solid"
                          busy={busy}
                          busyLabel="SAVING"
                          onClick={() => void submit()}
                          leading={editing ? undefined : <IconPlus size={14} />}
                        >
                          {editing ? 'SAVE CHANGES' : 'ADD SUBSCRIPTION'}
                        </CyberButton>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function Section({
  code,
  title,
  children,
  last = false,
}: {
  code: string
  title: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <motion.section variants={ITEM} className={cx('px-3 py-4 md:px-4', !last && 'border-b border-line')}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="micro border border-line2 px-1.5 py-0.5 text-acidink">{code}</span>
        <h3 className="tech-label text-dim">{title}</h3>
        <span className="rule-dotted flex-1" />
      </div>
      {children}
    </motion.section>
  )
}
