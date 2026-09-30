/**
 * SUBTRACK // CATEGORY MANAGER (SETTINGS)
 *
 * Full-featured website-wide custom taxonomy management:
 * - Subscriptions & Daily Spends categories
 * - Add new categories with custom name, code, signal color & discretionary flags
 * - Edit existing category properties
 * - Rearrange / Reorder categories (move up / move down)
 * - Safe delete with automatic migration of existing records to fallback category
 * - Reset to factory defaults with armed confirmation
 */
import { useState } from 'react'
import { useUI } from '@/store/ui'
import {
  type CategoryMeta,
  type SpendCategoryMeta,
  DEFAULT_CATEGORIES,
  DEFAULT_SPEND_CATEGORIES,
} from '@/lib/types'
import { CutPanel } from '@/components/ui/CutPanel'
import { CyberButton, IconButton } from '@/components/ui/CyberButton'
import { SectionHeader } from '@/components/ui/Micro'
import { ArmedButton, ToggleSwitch } from '@/components/ui/Controls'
import { IconPlus, IconCheck, IconClose, IconTerminate, IconEdit } from '@/components/ui/Icons'
import { SIGNAL_HEX } from '@/components/ui/Signal'
import { cx } from '@/lib/cx'

type SignalColor = 'acid' | 'blue' | 'magenta' | 'orange' | 'red'

const SIGNAL_OPTIONS: { id: SignalColor; label: string; bg: string }[] = [
  { id: 'acid', label: 'Acid Lime', bg: '#00FF66' },
  { id: 'blue', label: 'Cyan Blue', bg: '#00D8FF' },
  { id: 'magenta', label: 'Magenta', bg: '#FF0055' },
  { id: 'orange', label: 'Amber Orange', bg: '#FF9900' },
  { id: 'red', label: 'Signal Red', bg: '#FF3333' },
]

export function CategoryManager() {
  const [tab, setTab] = useState<'subs' | 'spends'>('subs')
  const subCategories = useUI((s) => s.subCategories)
  const spendCategories = useUI((s) => s.spendCategories)
  const addSubCategory = useUI((s) => s.addSubCategory)
  const updateSubCategory = useUI((s) => s.updateSubCategory)
  const deleteSubCategory = useUI((s) => s.deleteSubCategory)
  const reorderSubCategories = useUI((s) => s.reorderSubCategories)
  const resetSubCategories = useUI((s) => s.resetSubCategories)

  const addSpendCategory = useUI((s) => s.addSpendCategory)
  const updateSpendCategory = useUI((s) => s.updateSpendCategory)
  const deleteSpendCategory = useUI((s) => s.deleteSpendCategory)
  const reorderSpendCategories = useUI((s) => s.reorderSpendCategories)
  const resetSpendCategories = useUI((s) => s.resetSpendCategories)
  const pushToast = useUI((s) => s.pushToast)

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editSignal, setEditSignal] = useState<SignalColor>('blue')
  const [editDiscretionary, setEditDiscretionary] = useState(true)

  // Adding state
  const [isAdding, setIsAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newSignal, setNewSignal] = useState<SignalColor>('acid')
  const [newDiscretionary, setNewDiscretionary] = useState(true)
  const [formError, setFormError] = useState('')

  // Delete modal/confirm state
  const [deletingCat, setDeletingCat] = useState<{ id: string; label: string; tab: 'subs' | 'spends' } | null>(null)
  const [fallbackCatId, setFallbackCatId] = useState('other')

  const startEdit = (cat: CategoryMeta | SpendCategoryMeta) => {
    setEditingId(cat.id)
    setEditLabel(cat.label)
    setEditCode(cat.code)
    setEditSignal(cat.signal)
    if ('discretionary' in cat) {
      setEditDiscretionary(cat.discretionary)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditLabel('')
    setEditCode('')
    setEditSignal('blue')
  }

  const saveEdit = () => {
    if (!editingId || !editLabel.trim()) return
    const code = (editCode.trim() || editLabel.trim().slice(0, 3)).toUpperCase().slice(0, 4)
    if (tab === 'subs') {
      updateSubCategory(editingId, {
        label: editLabel.trim(),
        code,
        signal: editSignal,
      })
      pushToast({ kind: 'ok', label: 'CATEGORY UPDATED', text: `${editLabel} [${code}] written` })
    } else {
      updateSpendCategory(editingId, {
        label: editLabel.trim(),
        code,
        signal: editSignal,
        discretionary: editDiscretionary,
      })
      pushToast({ kind: 'ok', label: 'SPEND CATEGORY UPDATED', text: `${editLabel} [${code}] written` })
    }
    cancelEdit()
  }

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!newLabel.trim()) {
      setFormError('CATEGORY LABEL IS REQUIRED')
      return
    }

    const id = newLabel
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')

    if (!id) {
      setFormError('INVALID CATEGORY NAME')
      return
    }

    const existingList = tab === 'subs' ? subCategories : spendCategories
    if (existingList.some((c) => c.id === id)) {
      setFormError(`CATEGORY "${id}" ALREADY EXISTS`)
      return
    }

    const code = (newCode.trim() || newLabel.trim().slice(0, 3)).toUpperCase().slice(0, 4)

    if (tab === 'subs') {
      addSubCategory({
        id,
        label: newLabel.trim(),
        code,
        signal: newSignal,
      })
      pushToast({ kind: 'ok', label: 'CATEGORY INITIALIZED', text: `${newLabel} [${code}] added to subscriptions` })
    } else {
      addSpendCategory({
        id,
        label: newLabel.trim(),
        code,
        signal: newSignal,
        discretionary: newDiscretionary,
      })
      pushToast({ kind: 'ok', label: 'CATEGORY INITIALIZED', text: `${newLabel} [${code}] added to spends` })
    }

    setNewLabel('')
    setNewCode('')
    setNewSignal('acid')
    setNewDiscretionary(true)
    setIsAdding(false)
  }

  // Move up / down handlers
  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const list = tab === 'subs' ? [...subCategories] : [...spendCategories]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= list.length) return

    const temp = list[index]
    list[index] = list[targetIndex]
    list[targetIndex] = temp

    if (tab === 'subs') {
      reorderSubCategories(list as CategoryMeta[])
    } else {
      reorderSpendCategories(list as SpendCategoryMeta[])
    }
  }

  const confirmDelete = async () => {
    if (!deletingCat) return
    const { id, label, tab: targetTab } = deletingCat

    if (targetTab === 'subs') {
      await deleteSubCategory(id, fallbackCatId)
      pushToast({ kind: 'alert', label: 'CATEGORY REMOVED', text: `${label} removed · records migrated to [${fallbackCatId}]` })
    } else {
      await deleteSpendCategory(id, fallbackCatId)
      pushToast({ kind: 'alert', label: 'CATEGORY REMOVED', text: `${label} removed · spends migrated to [${fallbackCatId}]` })
    }
    setDeletingCat(null)
  }

  const currentList = tab === 'subs' ? subCategories : spendCategories

  return (
    <CutPanel cut="tl-br" cutSize={14} innerClassName="p-0">
      <SectionHeader
        code="TAX"
        title="Custom Taxonomy & Categories"
        signal="magenta"
        right={
          <span className="micro text-faint">
            {currentList.length} CATEGORIES · WEBSITE-WIDE
          </span>
        }
      />

      {/* Domain Mode Switcher */}
      <div className="border-b border-line px-3 py-2.5 md:px-4 bg-surface2/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setTab('subs')
                cancelEdit()
                setIsAdding(false)
              }}
              className={cx(
                'micro flex items-center gap-2 border px-3 py-1.5 transition-colors cursor-pointer',
                tab === 'subs'
                  ? 'border-acid bg-acid text-black font-semibold shadow-sm'
                  : 'border-line bg-surface text-dim hover:border-linehard hover:text-fg'
              )}
            >
              <span>SUBSCRIPTION PROCESSES</span>
              <span className={cx('px-1 py-0.2 text-[9px] rounded font-mono', tab === 'subs' ? 'bg-black/20 text-black' : 'bg-surface2 text-faint')}>
                {subCategories.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('spends')
                cancelEdit()
                setIsAdding(false)
              }}
              className={cx(
                'micro flex items-center gap-2 border px-3 py-1.5 transition-colors cursor-pointer',
                tab === 'spends'
                  ? 'border-acid bg-acid text-black font-semibold shadow-sm'
                  : 'border-line bg-surface text-dim hover:border-linehard hover:text-fg'
              )}
            >
              <span>DAILY SPENDS & CARDS</span>
              <span className={cx('px-1 py-0.2 text-[9px] rounded font-mono', tab === 'spends' ? 'bg-black/20 text-black' : 'bg-surface2 text-faint')}>
                {spendCategories.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isAdding && (
              <CyberButton
                variant="solid"
                size="sm"
                leading={<IconPlus size={13} />}
                onClick={() => {
                  setIsAdding(true)
                  cancelEdit()
                }}
              >
                ADD CATEGORY
              </CyberButton>
            )}
          </div>
        </div>

        <p className="meta mt-2 text-faint">
          {tab === 'subs'
            ? 'Manage subscription categories across the overview, matrix, filters, charts, and composer.'
            : 'Manage daily expense sectors across spend logs, velocity registers, card transactions, and weekly budget limiter.'}
        </p>
      </div>

      {/* Add New Category Panel */}
      {isAdding && (
        <form onSubmit={handleAddCategory} className="border-b-2 border-acid/50 bg-acid/5 px-3 py-3 md:px-4">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <span className="tech-label text-acidink flex items-center gap-2">
              <IconPlus size={14} /> NEW {tab === 'subs' ? 'SUBSCRIPTION' : 'SPEND'} CATEGORY
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-faint hover:text-fg transition-colors"
            >
              <IconClose size={15} />
            </button>
          </div>

          {formError && (
            <div className="mt-2 text-[11px] font-mono text-redink border border-red/40 bg-red/10 px-2 py-1">
              {formError}
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="tech-label block text-[10px] text-faint mb-1">NAME / LABEL</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => {
                  setNewLabel(e.target.value)
                  if (!newCode) {
                    setNewCode(e.target.value.slice(0, 3).toUpperCase())
                  }
                }}
                placeholder="e.g. Gaming, Wellness, SaaS"
                className="field w-full"
                autoFocus
              />
            </div>

            <div>
              <label className="tech-label block text-[10px] text-faint mb-1">CODE (2–4 CHARS)</label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="e.g. GAM"
                maxLength={4}
                className="field w-full uppercase font-mono"
              />
            </div>

            <div>
              <label className="tech-label block text-[10px] text-faint mb-1">SIGNAL COLOR</label>
              <div className="flex items-center gap-1.5 h-[38px]">
                {SIGNAL_OPTIONS.map((sig) => (
                  <button
                    key={sig.id}
                    type="button"
                    onClick={() => setNewSignal(sig.id)}
                    title={sig.label}
                    className={cx(
                      'flex-1 h-8 rounded border flex items-center justify-center transition-all cursor-pointer',
                      newSignal === sig.id
                        ? 'border-fg ring-2 ring-fg/40 scale-105'
                        : 'border-line2 hover:border-linehard opacity-75 hover:opacity-100'
                    )}
                    style={{ backgroundColor: sig.bg }}
                  >
                    {newSignal === sig.id && <IconCheck size={14} className="text-black drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {tab === 'spends' && (
            <div className="mt-3 border-t border-line pt-2">
              <ToggleSwitch
                label="Discretionary Lifestyle Spend"
                code="BUDGET"
                description="When enabled, expenses in this category count toward the weekly discretionary budget limiter."
                checked={newDiscretionary}
                onChange={setNewDiscretionary}
              />
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <CyberButton variant="solid" size="sm" type="submit" leading={<IconCheck size={14} />}>
              CREATE CATEGORY
            </CyberButton>
            <CyberButton variant="ghost" size="sm" type="button" onClick={() => setIsAdding(false)}>
              CANCEL
            </CyberButton>
          </div>
        </form>
      )}

      {/* Category List */}
      <div className="divide-y divide-line">
        {currentList.map((cat, index) => {
          const isEditing = editingId === cat.id
          const isFirst = index === 0
          const isLast = index === currentList.length - 1
          const isDefault = (tab === 'subs' ? DEFAULT_CATEGORIES : DEFAULT_SPEND_CATEGORIES).some((d) => d.id === cat.id)

          if (isEditing) {
            return (
              <div key={cat.id} className="bg-surface2/40 px-3 py-3 md:px-4 border-l-2 border-acid">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="tech-label text-acidink">EDIT CATEGORY: {cat.id}</span>
                  <button type="button" onClick={cancelEdit} className="text-faint hover:text-fg">
                    <IconClose size={14} />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="tech-label block text-[10px] text-faint mb-1">DISPLAY LABEL</label>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="field w-full"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="tech-label block text-[10px] text-faint mb-1">CODE (2–4 CHARS)</label>
                    <input
                      type="text"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value.toUpperCase().slice(0, 4))}
                      maxLength={4}
                      className="field w-full uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="tech-label block text-[10px] text-faint mb-1">SIGNAL COLOR</label>
                    <div className="flex items-center gap-1.5 h-[38px]">
                      {SIGNAL_OPTIONS.map((sig) => (
                        <button
                          key={sig.id}
                          type="button"
                          onClick={() => setEditSignal(sig.id)}
                          title={sig.label}
                          className={cx(
                            'flex-1 h-8 rounded border flex items-center justify-center transition-all cursor-pointer',
                            editSignal === sig.id
                              ? 'border-fg ring-2 ring-fg/40 scale-105'
                              : 'border-line2 hover:border-linehard opacity-75 hover:opacity-100'
                          )}
                          style={{ backgroundColor: sig.bg }}
                        >
                          {editSignal === sig.id && <IconCheck size={14} className="text-black drop-shadow" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {tab === 'spends' && (
                  <div className="mt-3 border-t border-line pt-2">
                    <ToggleSwitch
                      label="Discretionary Spend"
                      code="BUDGET"
                      description="Counts toward weekly lifestyle limiter."
                      checked={editDiscretionary}
                      onChange={setEditDiscretionary}
                    />
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <CyberButton variant="solid" size="sm" onClick={saveEdit} leading={<IconCheck size={14} />}>
                    SAVE CHANGES
                  </CyberButton>
                  <CyberButton variant="ghost" size="sm" onClick={cancelEdit}>
                    CANCEL
                  </CyberButton>
                </div>
              </div>
            )
          }

          return (
            <div
              key={cat.id}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 md:px-4 transition-colors hover:bg-surface2/30"
            >
              {/* Left: Reorder controls + Signal Indicator + Label + Code */}
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Reorder Arrows */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => moveCategory(index, 'up')}
                    aria-label={`Move ${cat.label} up`}
                    className={cx(
                      'grid h-4 w-5 place-items-center border border-line bg-surface text-[9px] font-mono transition-colors cursor-pointer',
                      isFirst ? 'opacity-20 cursor-not-allowed' : 'hover:border-acid hover:text-acidink text-dim'
                    )}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => moveCategory(index, 'down')}
                    aria-label={`Move ${cat.label} down`}
                    className={cx(
                      'grid h-4 w-5 place-items-center border border-line bg-surface text-[9px] font-mono transition-colors cursor-pointer',
                      isLast ? 'opacity-20 cursor-not-allowed' : 'hover:border-acid hover:text-acidink text-dim'
                    )}
                  >
                    ▼
                  </button>
                </div>

                {/* Signal Dot */}
                <span
                  className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: SIGNAL_HEX[cat.signal] || '#00D8FF' }}
                  title={`Signal: ${cat.signal}`}
                />

                {/* Name & ID */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-fg truncate">{cat.label}</span>
                    <span className="micro border border-line px-1.5 py-0.2 font-mono text-dim">
                      {cat.code}
                    </span>
                    {isDefault && (
                      <span className="micro text-[9px] text-faint hidden sm:inline">
                        CORE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="micro text-[10px] text-faint font-mono">id: {cat.id}</span>
                    {'discretionary' in cat && (
                      <span className={cx('micro text-[9px] px-1 py-0.2 rounded font-mono', (cat as SpendCategoryMeta).discretionary ? 'bg-orange/15 text-orangeink' : 'bg-blue/15 text-blueink')}>
                        {(cat as SpendCategoryMeta).discretionary ? 'DISCRETIONARY' : 'FIXED / ESSENTIAL'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions (Edit & Delete) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <IconButton
                  label={`Edit ${cat.label}`}
                  size="sm"
                  onClick={() => startEdit(cat)}
                >
                  <IconEdit size={13} />
                </IconButton>

                <IconButton
                  label={`Delete ${cat.label}`}
                  size="sm"
                  disabled={currentList.length <= 1}
                  onClick={() => {
                    const fallback = currentList.find((c) => c.id !== cat.id)?.id ?? 'other'
                    setFallbackCatId(fallback)
                    setDeletingCat({ id: cat.id, label: cat.label, tab })
                  }}
                  className="text-faint hover:text-redink hover:border-red/40"
                >
                  <IconTerminate size={13} />
                </IconButton>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer / Reset taxonomy */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-3 py-3 md:px-4 bg-surface2/10">
        <div className="flex items-center gap-2">
          <ArmedButton
            tone="warn"
            label={`RESET ${tab === 'subs' ? 'SUBSCRIPTIONS' : 'SPENDS'} TO DEFAULTS`}
            armedLabel="CONFIRM TAXONOMY RESET"
            onConfirm={() => {
              if (tab === 'subs') {
                resetSubCategories()
                pushToast({ kind: 'ok', label: 'TAXONOMY RESET', text: 'Default subscription categories restored' })
              } else {
                resetSpendCategories()
                pushToast({ kind: 'ok', label: 'TAXONOMY RESET', text: 'Default spend categories restored' })
              }
            }}
          />
        </div>
        <span className="micro text-faint">
          CHANGES APPLY SYNCHRONOUSLY WEBSITE WIDE
        </span>
      </div>

      {/* Delete & Migration Modal */}
      {deletingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md border-2 border-red/60 bg-surface p-4 shadow-2xl">
            <div className="flex items-center gap-2 text-redink font-semibold">
              <IconTerminate size={16} />
              <span>DELETE CATEGORY: {deletingCat.label.toUpperCase()}</span>
            </div>

            <p className="meta mt-2 text-dim">
              Deleting this category will permanently remove it from the taxonomy. Any existing {deletingCat.tab === 'subs' ? 'subscriptions and payments' : 'spends and card transactions'} will be safely migrated to a fallback category.
            </p>

            <div className="mt-3">
              <label className="tech-label block text-[10px] text-faint mb-1">MIGRATE EXISTING RECORDS TO:</label>
              <select
                value={fallbackCatId}
                onChange={(e) => setFallbackCatId(e.target.value)}
                className="field w-full font-mono text-xs"
              >
                {currentList
                  .filter((c) => c.id !== deletingCat.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} [{c.code}]
                    </option>
                  ))}
              </select>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <CyberButton variant="ghost" size="sm" onClick={() => setDeletingCat(null)}>
                CANCEL
              </CyberButton>
              <CyberButton variant="solid" size="sm" onClick={confirmDelete} className="bg-red text-white hover:bg-red/90 border-red">
                DELETE & MIGRATE
              </CyberButton>
            </div>
          </div>
        </div>
      )}
    </CutPanel>
  )
}
