import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiPrinter,
  FiDownload,
  FiSearch,
  FiX,
  FiLayers,
  FiRotateCcw,
  FiCheck,
  FiAward,
  FiChevronDown
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { ConfirmDialog } from '../../../components/ui'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

export interface ItemDesign {
  id: string
  designName: string
  metalType: string
  shortCode?: string
  defaultLabourRate?: number
  defaultLabourType?: 'PER_GRAM' | 'PER_PIECE' | 'PERCENT'
  defaultWastage?: number
  description: string
  active: boolean
}

export interface MetalTypeOption {
  value: string
  label: string
  subtitle: string
  color: string
  dotClass: string
}

export const METAL_TYPES_DATA: MetalTypeOption[] = [
  {
    value: 'Gold',
    label: 'Gold',
    subtitle: 'KDM, 916 Hallmark, Antique, Casting, Calcutta',
    color: 'amber',
    dotClass: 'bg-amber-500'
  },
  {
    value: 'Silver',
    label: 'Silver',
    subtitle: '92.5 Sterling, Payal, Idols, Utensils & Ornaments',
    color: 'slate',
    dotClass: 'bg-slate-400'
  },
  {
    value: 'Diamond',
    label: 'Diamond',
    subtitle: 'Solitaire, Micro-pave, Prong setting, Studded jewelry',
    color: 'violet',
    dotClass: 'bg-violet-500'
  },
  {
    value: 'Platinum',
    label: 'Platinum',
    subtitle: 'Pt 950 rings, love bands, solitaire mounts',
    color: 'sky',
    dotClass: 'bg-sky-500'
  },
  {
    value: 'Other',
    label: 'Other',
    subtitle: 'Mixed alloy, brass, imitation or custom metal patterns',
    color: 'slate',
    dotClass: 'bg-slate-400'
  }
]

export const METAL_OPTIONS = ['All', 'Gold', 'Silver', 'Diamond', 'Platinum', 'Other']

export const STANDARD_DESIGN_PRESETS: Record<
  string,
  {
    name: string
    shortCode: string
    labourRate: number
    labourType: 'PER_GRAM' | 'PER_PIECE' | 'PERCENT'
    wastage: number
  }[]
> = {
  Gold: [
    { name: 'Antique & Temple Work', shortCode: 'TEM', labourRate: 650, labourType: 'PER_GRAM', wastage: 5.0 },
    { name: 'Calcutta Handmade', shortCode: 'CAL', labourRate: 550, labourType: 'PER_GRAM', wastage: 4.0 },
    { name: 'Rajkot Filigree', shortCode: 'FIL', labourRate: 600, labourType: 'PER_GRAM', wastage: 4.5 },
    { name: 'Bombay High Polish', shortCode: 'BMB', labourRate: 250, labourType: 'PER_GRAM', wastage: 2.0 },
    { name: 'Casting / Modern CNC', shortCode: 'CNC', labourRate: 220, labourType: 'PER_GRAM', wastage: 1.5 },
    { name: 'CZ / Studded Work', shortCode: 'CZD', labourRate: 450, labourType: 'PER_GRAM', wastage: 3.5 }
  ],
  Silver: [
    { name: 'Bombay High Polish', shortCode: 'BMB', labourRate: 45, labourType: 'PER_GRAM', wastage: 3.0 },
    { name: 'Oxidised Antique Silver', shortCode: 'OXI', labourRate: 65, labourType: 'PER_GRAM', wastage: 4.0 },
    { name: 'Kolhapuri Payal Work', shortCode: 'KOL', labourRate: 50, labourType: 'PER_GRAM', wastage: 3.5 },
    { name: 'Plain Classic Silver', shortCode: 'PLN', labourRate: 35, labourType: 'PER_GRAM', wastage: 2.0 }
  ],
  Diamond: [
    { name: 'Solitaire Prong Setting', shortCode: 'SOL', labourRate: 1200, labourType: 'PER_PIECE', wastage: 0 },
    { name: 'Micro Pave Studded', shortCode: 'PAV', labourRate: 850, labourType: 'PER_PIECE', wastage: 0 },
    { name: 'Halo Illusion Setting', shortCode: 'HAL', labourRate: 950, labourType: 'PER_PIECE', wastage: 0 }
  ],
  Platinum: [
    { name: 'Platinum Matte & Glossy CNC', shortCode: 'CNC', labourRate: 450, labourType: 'PER_GRAM', wastage: 2.0 },
    { name: 'Platinum Solitaire Mount', shortCode: 'SOL', labourRate: 1500, labourType: 'PER_PIECE', wastage: 0 }
  ]
}

const initialForm = {
  designName: '',
  metalType: 'Gold',
  shortCode: '',
  defaultLabourRate: 0,
  defaultLabourType: 'PER_GRAM' as 'PER_GRAM' | 'PER_PIECE' | 'PERCENT',
  defaultWastage: 0,
  description: '',
  active: true
}

function renderMetalBadge(metal: string): React.JSX.Element {
  const normalized = (metal || '').toLowerCase()

  if (normalized === 'gold') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
        Gold
      </span>
    )
  }

  if (normalized === 'silver') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300 whitespace-nowrap">
        Silver
      </span>
    )
  }

  if (normalized === 'diamond') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200 whitespace-nowrap">
        Diamond
      </span>
    )
  }

  if (normalized === 'platinum') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 whitespace-nowrap">
        Platinum
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap">
      {metal}
    </span>
  )
}

function renderLabourTypeBadge(type: string | undefined): React.JSX.Element {
  if (type === 'PER_PIECE') {
    return <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">₹ / Pc</span>
  }
  if (type === 'PERCENT') {
    return <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">% Value</span>
  }
  return <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">₹ / Gram</span>
}

/**
 * Custom Styled Metal Type Dropdown Component
 */
interface MetalTypeSelectProps {
  value: string
  onChange: (val: string) => void
  onSelectNext?: () => void
}

function CustomMetalTypeDropdown({ value, onChange, onSelectNext }: MetalTypeSelectProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const selectedOption = useMemo(() => {
    return METAL_TYPES_DATA.find((m) => m.value.toLowerCase() === value.toLowerCase()) || METAL_TYPES_DATA[0]
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-10 px-3.5 flex items-center justify-between text-xs font-medium border rounded-lg bg-white transition-all cursor-pointer ${
          isOpen
            ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
            : 'border-slate-200 hover:border-slate-300 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${selectedOption.dotClass} shrink-0`} />
          <span className="font-semibold text-slate-800">{selectedOption.label}</span>
          <span className="text-slate-400 text-[11px] font-normal hidden sm:inline truncate max-w-[280px]">
            — {selectedOption.subtitle}
          </span>
        </div>

        <FiChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-600' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden py-1 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Select Metal Category
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
            {METAL_TYPES_DATA.map((opt) => {
              const isSelected = opt.value.toLowerCase() === value.toLowerCase()
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                    onSelectNext?.()
                  }}
                  className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer group ${
                    isSelected
                      ? 'bg-amber-50/70 text-amber-950 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${opt.dotClass} shrink-0`} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold leading-tight">{opt.label}</div>
                      <div className="text-[11px] text-slate-400 font-normal leading-tight mt-0.5 truncate">
                        {opt.subtitle}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="text-amber-600 font-bold ml-2 shrink-0">
                      <FiCheck size={16} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function ItemDesignScreen({ onClose: _onClose }: { onClose?: () => void }): React.JSX.Element {
  const [form, setForm] = useState(initialForm)
  const [itemDesigns, setItemDesigns] = useState<ItemDesign[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ItemDesign | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)

  // Filters
  const [searchText, setSearchText] = useState('')
  const [metalTypeFilter, setMetalTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const designNameInputRef = useRef<HTMLInputElement | null>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null)

  const selectedDesign = useMemo(() => {
    return itemDesigns.find((d) => d.id === selectedId) || null
  }, [itemDesigns, selectedId])

  const filteredDesigns = useMemo(() => {
    return itemDesigns.filter((design) => {
      // Metal Filter
      if (metalTypeFilter !== 'All' && design.metalType.toLowerCase() !== metalTypeFilter.toLowerCase()) {
        return false
      }

      // Status Filter
      if (statusFilter === 'ACTIVE' && !design.active) return false
      if (statusFilter === 'INACTIVE' && design.active) return false

      // Search Query
      const query = searchText.trim().toLowerCase()
      if (!query) return true

      return (
        design.designName.toLowerCase().includes(query) ||
        design.metalType.toLowerCase().includes(query) ||
        (design.shortCode || '').toLowerCase().includes(query) ||
        (design.description || '').toLowerCase().includes(query)
      )
    })
  }, [itemDesigns, searchText, metalTypeFilter, statusFilter])

  const activeCount = useMemo(() => {
    return itemDesigns.filter((d) => d.active).length
  }, [itemDesigns])

  const hasActiveFilters = searchText.trim() !== '' || metalTypeFilter !== 'All' || statusFilter !== 'ALL'

  const handleClearFilters = useCallback(() => {
    setSearchText('')
    setMetalTypeFilter('All')
    setStatusFilter('ALL')
  }, [])

  const showAlert = useCallback((type: 'success' | 'error' | 'warning', message: string): void => {
    setAlert({ type, message })
  }, [])

  const clearAlert = useCallback((): void => {
    setAlert(null)
  }, [])

  const loadItemDesigns = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.itemDesigns.list()
      setItemDesigns(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const openNewForm = useCallback((): void => {
    setEditingId(null)
    setForm(initialForm)
    setFormOpen(true)
    window.setTimeout(() => designNameInputRef.current?.focus(), 50)
  }, [])

  const openEditForm = useCallback((design: ItemDesign): void => {
    setEditingId(design.id)
    setSelectedId(design.id)
    setForm({
      designName: design.designName,
      metalType: design.metalType,
      shortCode: design.shortCode || '',
      defaultLabourRate: design.defaultLabourRate ?? 0,
      defaultLabourType: design.defaultLabourType || 'PER_GRAM',
      defaultWastage: design.defaultWastage ?? 0,
      description: design.description || '',
      active: design.active
    })
    setFormOpen(true)
    window.setTimeout(() => designNameInputRef.current?.focus(), 50)
  }, [])

  const closeForm = useCallback((): void => {
    setFormOpen(false)
    setEditingId(null)
    setForm(initialForm)
  }, [])

  const applyPreset = (preset: {
    name: string
    shortCode: string
    labourRate: number
    labourType: 'PER_GRAM' | 'PER_PIECE' | 'PERCENT'
    wastage: number
  }): void => {
    setForm((prev) => ({
      ...prev,
      designName: preset.name,
      shortCode: preset.shortCode,
      defaultLabourRate: preset.labourRate,
      defaultLabourType: preset.labourType,
      defaultWastage: preset.wastage
    }))
  }

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return

    if (!form.designName.trim()) {
      showAlert('warning', 'Please enter a valid Item Design Name.')
      designNameInputRef.current?.focus()
      return
    }

    try {
      setSaving(true)

      const payload = {
        ...form,
        designName: form.designName.trim(),
        shortCode: form.shortCode.trim().toUpperCase(),
        defaultLabourRate: Number(form.defaultLabourRate) || 0,
        defaultLabourType: form.defaultLabourType,
        defaultWastage: Number(form.defaultWastage) || 0,
        description: form.description.trim()
      }

      const successMessage = editingId
        ? `Item design "${form.designName}" updated successfully.`
        : `Item design "${form.designName}" created successfully.`

      if (editingId) {
        await window.api.itemDesigns.update(editingId, payload)
      } else {
        await window.api.itemDesigns.create(payload)
      }

      closeForm()
      await loadItemDesigns()
      showAlert('success', successMessage)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [closeForm, editingId, form, loadItemDesigns, saving, showAlert])

  const requestDelete = useCallback((design: ItemDesign): void => {
    setDeleteTarget(design)
  }, [])

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await window.api.itemDesigns.remove(deleteTarget.id)

      if (selectedId === deleteTarget.id) {
        setSelectedId(null)
      }

      if (editingId === deleteTarget.id) {
        closeForm()
      }

      setDeleteTarget(null)
      await loadItemDesigns()
      showAlert('success', `Item design "${deleteTarget.designName}" deleted successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelDelete = useCallback((): void => {
    if (deleting) return
    setDeleteTarget(null)
  }, [deleting])

  const handlePrint = useCallback((): void => {
    window.print()
  }, [])

  const handleExportCsv = useCallback((): void => {
    if (filteredDesigns.length === 0) {
      showAlert('warning', 'No item designs to export.')
      return
    }

    const headers = ['Sr No', 'Design Name', 'Metal Type', 'Tag Code', 'Labour Rate (₹)', 'Labour Type', 'Wastage %', 'Description', 'Status']
    const rows = filteredDesigns.map((d, i) => [
      i + 1,
      `"${d.designName.replace(/"/g, '""')}"`,
      `"${d.metalType.replace(/"/g, '""')}"`,
      `"${(d.shortCode || '').replace(/"/g, '""')}"`,
      d.defaultLabourRate ?? 0,
      `"${d.defaultLabourType || 'PER_GRAM'}"`,
      d.defaultWastage ?? 0,
      `"${(d.description || '').replace(/"/g, '""')}"`,
      d.active ? 'Active' : 'Inactive'
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `item_designs_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showAlert('success', `Exported ${filteredDesigns.length} item designs to CSV.`)
  }, [filteredDesigns, showAlert])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        openNewForm()
      } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        if (formOpen) {
          e.preventDefault()
          void handleSave()
        }
      } else if (e.key === 'Escape') {
        if (deleteTarget) {
          handleCancelDelete()
        } else if (formOpen) {
          closeForm()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeForm, deleteTarget, formOpen, handleCancelDelete, handleSave, openNewForm])

  // Load initial data
  useEffect(() => {
    void loadItemDesigns()
  }, [loadItemDesigns])

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-app,#eef2f6)]">
      {/* Alert */}
      {alert && (
        <div className="px-6 pt-4 shrink-0">
          <AppAlert type={alert.type} message={alert.message} onClose={clearAlert} />
        </div>
      )}

      {/* Top Action Toolbar & Filter Bar */}
      <div className="px-6 pt-4 pb-2 shrink-0 space-y-3 no-print">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={openNewForm}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-amber-600 hover:bg-amber-700 active:bg-amber-800 !text-white text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              <FiPlus size={15} className="stroke-[2.5]" />
              <span className="!text-white text-white font-semibold" style={{ color: '#ffffff' }}>
                Add New Design
              </span>
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-200 hover:border-slate-400 hover:text-slate-900 transition-colors shadow-sm cursor-pointer"
              title="Print Item Designs"
            >
              <FiPrinter size={14} />
              Print
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 hover:border-emerald-400 hover:text-emerald-900 transition-colors shadow-sm cursor-pointer"
              title="Export filtered designs to CSV"
            >
              <FiDownload size={14} />
              Export CSV
            </button>
          </div>

          <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 text-slate-500 select-none">
            Selected:{' '}
            <span className={`font-bold ${selectedDesign ? 'text-amber-700' : 'text-slate-400'}`}>
              {selectedDesign ? selectedDesign.designName : 'None'}
            </span>
          </div>
        </div>

        {/* Filter Bar (Table View Only) */}
        {!formOpen && (
          <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex-wrap">
            {/* Metal Type Filter */}
            <div className="w-36">
              <select
                value={metalTypeFilter}
                onChange={(e) => setMetalTypeFilter(e.target.value)}
                className="w-full h-9 text-xs border border-slate-200 rounded-md px-3 bg-slate-50 hover:bg-white text-slate-700 cursor-pointer focus:outline-none focus:border-amber-500 font-medium transition-colors"
              >
                {METAL_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m === 'All' ? 'All Metals' : m}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-32">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 text-xs border border-slate-200 rounded-md px-3 bg-slate-50 hover:bg-white text-slate-700 cursor-pointer focus:outline-none focus:border-amber-500 font-medium transition-colors"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by design name, metal, code, remarks..."
                className="w-full h-9 pl-9 pr-8 text-xs border border-slate-200 rounded-md bg-slate-50 hover:bg-white focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-0.5 transition-colors"
                >
                  <FiX size={12} />
                </button>
              )}
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md font-medium transition-colors cursor-pointer"
                title="Reset all search filters"
              >
                <FiRotateCcw size={12} />
                Reset
              </button>
            )}

            {/* Count Badges */}
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium ml-auto pr-1 select-none">
              <span>
                Total <strong className="text-slate-700 font-bold">{itemDesigns.length}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Active <strong className="text-emerald-700 font-bold">{activeCount}</strong>
              </span>
              {filteredDesigns.length !== itemDesigns.length && (
                <>
                  <span className="text-slate-300">|</span>
                  <span>
                    Showing <strong className="text-amber-700 font-bold">{filteredDesigns.length}</strong>
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-hidden flex flex-col px-6 pb-5 pt-2 gap-4 min-h-0">
        {formOpen ? (
          /* Form View */
          <div className="flex-1 overflow-hidden flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                {editingId ? `Edit Item Design: ${form.designName || 'Untitled'}` : 'Create New Item Design'}
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">Fields marked with * are mandatory</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Row 1: Design Name & Metal Type (2 Columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Design Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="designName" className="block text-xs font-bold text-slate-700">
                      Design / Pattern Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="designName"
                      ref={designNameInputRef}
                      type="text"
                      value={form.designName}
                      onChange={(e) => setForm({ ...form, designName: e.target.value })}
                      placeholder="e.g. Antique & Temple Work, Calcutta Handmade, Bombay Polish"
                      className="w-full h-10 px-3.5 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-800"
                    />
                  </div>

                  {/* Metal Type (Custom Dropdown) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Metal Type <span className="text-rose-500">*</span>
                    </label>
                    <CustomMetalTypeDropdown
                      value={form.metalType}
                      onChange={(newMetal) => setForm((prev) => ({ ...prev, metalType: newMetal }))}
                      onSelectNext={() => descriptionInputRef.current?.focus()}
                    />
                  </div>
                </div>

                {/* Quick Presets for Selected Metal */}
                {STANDARD_DESIGN_PRESETS[form.metalType] && (
                  <div className="bg-amber-50/50 border border-amber-200/60 rounded-lg p-3.5">
                    <div className="text-[11px] font-bold text-amber-900 mb-2.5 flex items-center gap-1.5">
                      <FiAward size={14} className="text-amber-600" />
                      Popular Jewellery Patterns ({form.metalType}):
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {STANDARD_DESIGN_PRESETS[form.metalType].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className="px-3 py-1.5 text-xs rounded-md bg-white border border-amber-300/80 text-amber-900 hover:bg-amber-100/70 hover:border-amber-400 font-semibold transition-colors shadow-2xs cursor-pointer"
                        >
                          {preset.name} · Code: {preset.shortCode} · ₹{preset.labourRate}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Row 2: Tag Code, Making Charge, Labour Type, Wastage % (4 Columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {/* Short Code (Tag Print) */}
                  <div className="space-y-1.5">
                    <label htmlFor="shortCode" className="block text-xs font-bold text-slate-700">
                      Tag / Print Short Code
                    </label>
                    <input
                      id="shortCode"
                      type="text"
                      maxLength={10}
                      value={form.shortCode}
                      onChange={(e) => setForm({ ...form, shortCode: e.target.value.toUpperCase() })}
                      placeholder="e.g. TEM, CAL, BMB"
                      className="w-full h-10 px-3.5 text-xs font-bold border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-800 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">Printed on small barcode labels</p>
                  </div>

                  {/* Default Making / Labour Charge */}
                  <div className="space-y-1.5">
                    <label htmlFor="defaultLabourRate" className="block text-xs font-bold text-slate-700">
                      Default Making Charge (₹)
                    </label>
                    <input
                      id="defaultLabourRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.defaultLabourRate || ''}
                      onChange={(e) => setForm({ ...form, defaultLabourRate: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-full h-10 px-3.5 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-800 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">Standard labour for this pattern</p>
                  </div>

                  {/* Labour Calculation Type */}
                  <div className="space-y-1.5">
                    <label htmlFor="defaultLabourType" className="block text-xs font-bold text-slate-700">
                      Labour Calculation Type
                    </label>
                    <select
                      id="defaultLabourType"
                      value={form.defaultLabourType}
                      onChange={(e) =>
                        setForm({ ...form, defaultLabourType: e.target.value as 'PER_GRAM' | 'PER_PIECE' | 'PERCENT' })
                      }
                      className="w-full h-10 px-3.5 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-800 cursor-pointer"
                    >
                      <option value="PER_GRAM">Per Gram (₹ / gm)</option>
                      <option value="PER_PIECE">Per Piece (₹ / pc)</option>
                      <option value="PERCENT">Percentage of Gold Value (%)</option>
                    </select>
                    <p className="text-[10px] text-slate-400">Billing calculation formula</p>
                  </div>

                  {/* Default Wastage Baseline (%) */}
                  <div className="space-y-1.5">
                    <label htmlFor="defaultWastage" className="block text-xs font-bold text-slate-700">
                      Default Wastage % (घाटा)
                    </label>
                    <input
                      id="defaultWastage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={form.defaultWastage || ''}
                      onChange={(e) => setForm({ ...form, defaultWastage: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 3.50"
                      className="w-full h-10 px-3.5 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-800 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">Karagir issue & stock baseline</p>
                  </div>
                </div>

                {/* Row 3: Description (Textarea matching Account Group) */}
                <div className="space-y-1.5">
                  <label htmlFor="description" className="block text-xs font-bold text-slate-700">
                    Description / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    id="description"
                    ref={descriptionInputRef}
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Enter short purpose, artisan specifications or notes for this design..."
                    className="w-full p-3 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-800 resize-none"
                  />
                </div>

                {/* Row 4: Active Status */}
                <div className="pt-1">
                  <label className="inline-flex items-start gap-3 cursor-pointer select-none p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors max-w-lg">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="w-4 h-4 mt-0.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer shrink-0"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Active Status</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Active designs are selectable in Item Master, Jobwork Issue, Tagging and Billing
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Form Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="h-9 px-4 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 h-9 px-5 rounded-md bg-amber-600 hover:bg-amber-700 !text-white text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 cursor-pointer"
                style={{ color: '#ffffff' }}
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="!text-white text-white font-semibold">Saving...</span>
                  </>
                ) : (
                  <span className="!text-white text-white font-semibold">
                    {editingId ? 'Update Design' : 'Save Design'}
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="flex-1 overflow-hidden min-h-0 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col">
            {/* Print Title */}
            <div className="hidden print:block p-4 border-b border-slate-300 text-center">
              <h2 className="text-xl font-bold text-slate-900">ITEM DESIGN DIRECTORY</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Generated on {new Date().toLocaleDateString()} · Total Records: {itemDesigns.length}
              </p>
            </div>

            <div className="w-full h-full overflow-auto">
              <table className="w-full text-xs text-left border-collapse print:text-[10px]">
                <thead className="sticky top-0 z-10 bg-slate-200 text-slate-800 border-b border-slate-300 font-bold uppercase tracking-wider select-none print:static">
                  <tr className="border-l-4 border-l-slate-200">
                    <th className="py-3 px-3 w-16 text-center text-[10px] font-bold text-slate-700">Sr No</th>
                    <th className="py-3 px-4 min-w-[180px]">Design Name</th>
                    <th className="py-3 px-3 min-w-[100px]">Metal</th>
                    <th className="py-3 px-3 text-center min-w-[90px]">Tag Code</th>
                    <th className="py-3 px-3 text-right min-w-[100px]">Labour Rate</th>
                    <th className="py-3 px-3 text-center min-w-[100px]">Labour Type</th>
                    <th className="py-3 px-3 text-right min-w-[90px]">Wastage %</th>
                    <th className="py-3 px-4 min-w-[180px]">Description</th>
                    <th className="py-3 px-3 text-center w-24">Status</th>
                    <th className="py-3 px-3 text-center w-24 no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-20 text-center text-slate-500">
                        <div className="inline-flex flex-col items-center gap-3">
                          <span className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                          <span className="font-medium text-sm">Loading item designs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredDesigns.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-20 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <FiLayers size={36} className="text-slate-300" />
                          {searchText ? (
                            <p className="text-sm">
                              No item designs matching <span className="font-semibold text-slate-700">"{searchText}"</span>
                            </p>
                          ) : (
                            <p className="text-sm">
                              No item designs found. Click <span className="font-semibold text-amber-600">"Add New Design"</span> to create one.
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDesigns.map((design, index) => {
                      const isSelected = selectedId === design.id
                      return (
                        <tr
                          key={design.id}
                          onClick={() => setSelectedId(design.id)}
                          onDoubleClick={() => openEditForm(design)}
                          className={`border-l-4 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-amber-50/70 border-l-amber-500'
                              : 'border-l-transparent hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {design.designName}
                          </td>
                          <td className="py-3 px-3">
                            {renderMetalBadge(design.metalType)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {design.shortCode ? (
                              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                {design.shortCode}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                            {design.defaultLabourRate ? `₹${design.defaultLabourRate.toFixed(2)}` : '₹0.00'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {renderLabourTypeBadge(design.defaultLabourType)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                            {design.defaultWastage ? `${design.defaultWastage.toFixed(2)}%` : '0.00%'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 truncate max-w-[200px]" title={design.description}>
                            {design.description || <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {design.active ? (
                              <span className="text-emerald-600 font-bold text-xs whitespace-nowrap">Active</span>
                            ) : (
                              <span className="text-slate-400 font-medium text-xs whitespace-nowrap">Inactive</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center no-print">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditForm(design)
                                }}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                                title="Edit Design"
                              >
                                <FiEdit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  requestDelete(design)
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Delete Design"
                              >
                                <FiTrash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Helper bottom bar */}
            <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 select-none shrink-0 no-print font-medium bg-slate-50 p-2.5 rounded-b-xl border-t border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>Click row to select · Double-click to edit · Shortcuts: Ctrl+N (New), Ctrl+S (Save), Esc (Cancel)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400">Total: {itemDesigns.length}</span>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-700 font-semibold">Active: {activeCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Item Design?"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.designName}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}

export default ItemDesignScreen
