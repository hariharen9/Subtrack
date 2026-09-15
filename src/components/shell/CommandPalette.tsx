/**
 * SUBTRACK // COMMAND PALETTE
 *
 * ⌘K / CTRL+K opens the query engine. One field does two jobs: it filters the
 * command set and it queries the process index with the fuzzy engine (name,
 * category, cycle, status, amount, month). The parsed intent is printed above
 * the results, so the query language teaches itself.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useUI } from '@/store/ui'
import { usePayments, useSubscriptions, useSystem } from '@/hooks/useSystem'
import { searchSubscriptions, parseQuery, fuzzyScore } from '@/lib/fuzzy'
import { CATEGORY_CODE } from '@/lib/types'
import { cycleSuffix } from '@/lib/cycle'
import { formatMoney } from '@/lib/money'
import { formatSignalDate } from '@/lib/date'
import { pidOf } from '@/lib/id'
import { cx } from '@/lib/cx'
import { useFocusTrap, useScrollLock } from '@/hooks/usePlatform'
import { ServiceBadge } from '@/components/brand/ServiceBadge'
import { Led } from '@/components/ui/Signal'
import { KeyCap } from '@/components/ui/Micro'
import {
  IconArrowRight,
  IconClose,
  IconCore,
  IconData,
  IconDownload,
  IconFlow,
  IconLink,
  IconMoon,
  IconPlus,
  IconSearch,
  IconSun,
  IconSys,
  IconTime,
  IconUpload,
} from '@/components/ui/Icons'
import { burnReadout, copyText, exportJson, openImportDialog } from '@/lib/portability'

interface Command {
  id: string
  label: string
  hint: string
  kbd?: string
  icon: (props: { size?: number; className?: string }) => React.ReactNode
  run: () => void
}

export function CommandPalette() {
  const open = useUI((s) => s.paletteOpen)
  const setOpen = useUI((s) => s.setPaletteOpen)
  const openComposer = useUI((s) => s.openComposer)
  const toggleTheme = useUI((s) => s.toggleTheme)
  const theme = useUI((s) => s.theme)
  const base = useUI((s) => s.baseCurrency)

  const navigate = useNavigate()
  const { summary } = useSystem()
  const subs = useSubscriptions()
  const payments = usePayments()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const trapRef = useFocusTrap<HTMLDivElement>(open)

  useScrollLock(open)

  const commands = useMemo<Command[]>(
    () => [
      {
        id: 'init',
        label: 'Initialize subscription',
        hint: 'New process console',
        kbd: 'N',
        icon: IconPlus,
        run: () => openComposer(),
      },
      {
        id: 'search',
        label: 'Search subscriptions',
        hint: 'Query the process index',
        kbd: '/',
        icon: IconSearch,
        run: () => inputRef.current?.focus(),
      },
      {
        id: 'core',
        label: 'Open Overview',
        hint: 'Burn, load, incoming flow',
        kbd: '1',
        icon: IconCore,
        run: () => navigate('/'),
      },
      {
        id: 'flow',
        label: 'Open Subscriptions',
        hint: 'Every running process',
        kbd: '2',
        icon: IconFlow,
        run: () => navigate('/flow'),
      },
      {
        id: 'time',
        label: 'Open Payment Matrix',
        hint: 'Calendar of outgoing flow',
        kbd: '3',
        icon: IconTime,
        run: () => navigate('/time'),
      },
      {
        id: 'data',
        label: 'Open System Analytics',
        hint: 'Distribution and concentration',
        kbd: '4',
        icon: IconData,
        run: () => navigate('/data'),
      },
      {
        id: 'export',
        label: 'Export data',
        hint: 'Write a JSON snapshot',
        icon: IconDownload,
        run: () => void exportJson(),
      },
      {
        id: 'import',
        label: 'Import data',
        hint: 'Restore from a snapshot file',
        icon: IconUpload,
        run: () => openImportDialog(),
      },
      {
        id: 'copy',
        label: 'Copy burn readout',
        hint: 'Monthly burn, load and process count',
        icon: IconLink,
        run: () =>
          copyText(
            burnReadout(summary.monthlyBurn, summary.annualLoad, base, summary.activeCount),
            'BURN READOUT COPIED',
          ),
      },
      {
        id: 'theme',
        label: theme === 'dark' ? 'Toggle theme → daylight' : 'Toggle theme → night',
        hint: 'Animated skin transition',
        icon: theme === 'dark' ? IconSun : IconMoon,
        run: () => toggleTheme(),
      },
      {
        id: 'sys',
        label: 'Open Settings',
        hint: 'Currency, theme, data volume',
        kbd: '5',
        icon: IconSys,
        run: () => navigate('/sys'),
      },
    ],
    [navigate, openComposer, toggleTheme, theme, summary, base],
  )

  const commandHits = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands
      .map((command) => ({
        command,
        score: Math.max(
          fuzzyScore(command.label, q),
          fuzzyScore(command.hint, q) - 10,
          command.id === q ? 100 : 0,
        ),
      }))
      .filter((hit) => hit.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((hit) => hit.command)
  }, [commands, query])

  const processHits = useMemo(() => searchSubscriptions(subs, query, base), [subs, query, base])
  const intent = useMemo(() => parseQuery(query), [query])

  const totalRows = commandHits.length + processHits.length

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      const timer = window.setTimeout(() => inputRef.current?.focus(), 20)
      return () => window.clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const close = () => setOpen(false)

  const runIndex = (index: number) => {
    if (index < commandHits.length) {
      const command = commandHits[index]
      command.run()
      // Commands that keep the palette open (search focus) opt out of closing.
      if (command.id !== 'search') close()
      return
    }
    const hit = processHits[index - commandHits.length]
    if (hit) {
      navigate(`/flow/${hit.sub.id}`)
      close()
    }
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (totalRows ? (index + 1) % totalRows : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (totalRows ? (index - 1 + totalRows) % totalRows : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      runIndex(activeIndex)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  const filters = [
    intent.amount &&
      `AMOUNT ${intent.amount.op === '=' ? '=' : intent.amount.op} ${formatMoney(intent.amount.value, base)}`,
    intent.cycles.length && `CYCLE ${intent.cycles.join('|').toUpperCase()}`,
    intent.categories.length && `CATEGORY ${intent.categories.join('|').toUpperCase()}`,
    intent.statuses.length && `STATUS ${intent.statuses.join('|').toUpperCase()}`,
    intent.months.length && `MONTH ${intent.months.join('|')}`,
    intent.years.length && `YEAR ${intent.years.join('|')}`,
    intent.days.length && `DAY ${intent.days.join('|')}`,
  ].filter(Boolean) as string[]

  return (
    <AnimatePresence>
      {open && (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[8vh] md:pt-[12vh]">
      <motion.div
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        onClick={close}
        aria-hidden="true"
      />

      <motion.div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        initial={{ opacity: 0, y: -12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
        className="relative w-full max-w-[680px]"
      >
        <div className="cp">
          <span aria-hidden="true" className="cp-shadow clip-cut-br" />
          <div className="cp-frame clip-cut-br bg-line2">
            <div className="cp-in clip-cut-br bg-surface">
              {/* header */}
              <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
                <span className="micro flex items-center gap-2 text-acidink">
                  <Led signal="acid" size="sm" pulse />
                  COMMAND // SEARCH SYSTEM
                </span>
                <span className="micro hidden text-faint sm:inline">
                  INDEX {String(subs.length).padStart(2, '0')} PROCESSES ·{' '}
                  {String(payments.length).padStart(4, '0')} CHARGES
                </span>
                <button
                  type="button"
                  onClick={close}
                  className="-mr-1 p-1 text-faint transition-colors hover:text-fg"
                  aria-label="Close command palette"
                >
                  <IconClose size={14} />
                </button>
              </div>

              {/* input */}
              <div className="flex items-center gap-2.5 border-b border-line px-3 py-3">
                <IconSearch size={16} className="shrink-0 text-faint" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="QUERY ACTIVE PROCESSES..."
                  aria-label="Query"
                  autoComplete="off"
                  spellCheck={false}
                  className="micro min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-faint"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="micro text-faint transition-colors hover:text-fg"
                  >
                    CLEAR
                  </button>
                )}
              </div>

              {/* parsed intent */}
              {(filters.length > 0 || query) && (
                <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-bg2 px-3 py-1.5">
                  <span className="tech-label">PARSED</span>
                  {filters.length === 0 ? (
                    <span className="micro text-faint">TEXT MATCH</span>
                  ) : (
                    filters.map((filter) => (
                      <span key={filter} className="micro border border-line2 px-1.5 py-0.5 text-acidink">
                        {filter}
                      </span>
                    ))
                  )}
                  <span className="micro ml-auto text-faint">
                    {commandHits.length} CMD · {processHits.length} PROC
                  </span>
                </div>
              )}

              {/* results */}
              <ul
                ref={listRef}
                className="max-h-[52vh] overflow-y-auto overscroll-contain py-1"
                role="listbox"
                aria-label="Results"
              >
                {commandHits.length > 0 && (
                  <li className="tech-label px-3 py-1.5" role="presentation">
                    COMMANDS // {commandHits.length}
                  </li>
                )}
                {commandHits.map((command, index) => {
                  const Icon = command.icon
                  const active = index === activeIndex
                  return (
                    <li key={command.id} role="option" aria-selected={active}>
                      <button
                        type="button"
                        data-index={index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => runIndex(index)}
                        className={cx(
                          'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
                          active ? 'bg-acid text-black' : 'hover:bg-surface2',
                        )}
                      >
                        <Icon size={15} className={active ? 'text-black' : 'text-dim'} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">{command.label}</span>
                          <span
                            className={cx('micro block truncate', active ? 'text-black/60' : 'text-faint')}
                          >
                            {command.hint}
                          </span>
                        </span>
                        {command.kbd && (
                          <span
                            className={cx(
                              'micro border px-1 py-0.5',
                              active ? 'border-black/40 text-black/70' : 'border-line2 text-faint',
                            )}
                          >
                            {command.kbd}
                          </span>
                        )}
                        {active && <IconArrowRight size={13} className="text-black/70" />}
                      </button>
                    </li>
                  )
                })}

                {processHits.length > 0 && (
                  <li className="tech-label px-3 py-1.5" role="presentation">
                    ACTIVE PROCESSES // {processHits.length}
                  </li>
                )}
                {processHits.slice(0, 40).map((hit, offset) => {
                  const index = commandHits.length + offset
                  const active = index === activeIndex
                  const { sub } = hit
                  return (
                    <li key={sub.id} role="option" aria-selected={active}>
                      <button
                        type="button"
                        data-index={index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => runIndex(index)}
                        className={cx(
                          'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
                          active ? 'bg-acid text-black' : 'hover:bg-surface2',
                        )}
                      >
                        <ServiceBadge
                          icon={sub.icon}
                          color={sub.color}
                          size="sm"
                          dimmed={sub.status !== 'active'}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-medium">{sub.name}</span>
                            <span
                              className={cx('micro', active ? 'text-black/60' : 'text-faint')}
                            >
                              {CATEGORY_CODE[sub.category]}
                            </span>
                          </span>
                          <span
                            className={cx('pid block truncate', active ? 'text-black/60' : '')}
                          >
                            {pidOf(sub.id)} · {formatSignalDate(sub.nextBillingDate)}
                            {hit.via.length > 0 && ` · VIA ${hit.via.join('+')}`}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="meta block">
                            {formatMoney(sub.price, sub.currency)}
                          </span>
                          <span className={cx('micro block', active ? 'text-black/60' : 'text-faint')}>
                            {cycleSuffix(sub.billingCycle, sub.customIntervalDays)}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}

                {totalRows === 0 && (
                  <li className="px-3 py-8 text-center">
                    <span className="micro block text-dim">NO MATCHING RECORDS</span>
                    <span className="meta mt-1 block text-faint">
                      Try a name, a category, a status, a month or an amount like &gt;500
                    </span>
                  </li>
                )}
              </ul>

              {/* footer */}
              <div className="flex items-center justify-between gap-3 border-t border-line bg-bg2 px-3 py-2">
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <KeyCap>↑</KeyCap>
                    <KeyCap>↓</KeyCap>
                    <span className="tech-label">NAVIGATE</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <KeyCap>⏎</KeyCap>
                    <span className="tech-label">EXECUTE</span>
                  </span>
                  <span className="hidden items-center gap-1.5 sm:flex">
                    <KeyCap>ESC</KeyCap>
                    <span className="tech-label">CLOSE</span>
                  </span>
                </span>
                <span className="tech-label hidden md:inline">
                  QUERY ENGINE // FUZZY · LOCAL
                </span>
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
