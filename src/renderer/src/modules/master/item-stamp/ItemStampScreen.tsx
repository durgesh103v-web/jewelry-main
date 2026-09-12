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

export interface ItemStamp {
  id: string
  stampName: string
  metalType: string
  purityKarat?: string
  purityTanch?: number
  shortCode?: string
  isHallmarked?: boolean
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
    subtitle: '24K, 22K (916), 20K (833), 18K (750), 14K (585) & 9K',
    color: 'amber',
    dotClass: 'bg-amber-500'
  },
  {
    value: 'Silver',
    label: 'Silver',
    subtitle: '99.9% Fine, 92.5% Sterling (925), 80.0% & 70.0%',
    color: 'slate',
    dotClass: 'bg-slate-400'
  },
  {
    value: 'Platinum',
    label: 'Platinum',
    subtitle: 'Pt 950 (95.0%) & Pt 900 (90.0%) bullion',
    color: 'sky',
    dotClass: 'bg-sky-500'
  },
  {
    value: 'Diamond',
    label: 'Diamond',
    subtitle: 'Studded diamond jewelry & solitaires',
    color: 'violet',
    dotClass: 'bg-violet-500'
  },
  {
    value: 'Other',
    label: 'Other',
    subtitle: 'Mixed alloy, brass, imitation or custom metals',
    color: 'slate',
    dotClass: 'bg-slate-400'
  }
]

export const METAL_OPTIONS = ['All', 'Gold', 'Silver', 'Platinum', 'Diamond', 'Other']

export const STANDARD_PURITIES: Record<string, { karat: string; tanch: number; shortCode: string }[]> = {
  Gold: [
    { karat: '24K (999)', tanch: 99.9, shortCode: '999' },
    { karat: '22K (916)', tanch: 91.66, shortCode: '916' },
    { karat: '20K (833)', tanch: 83.33, shortCode: '833' },
    { karat: '18K (750)', tanch: 75.0, shortCode: '750' },
    { karat: '14K (585)', tanch: 58.33, shortCode: '585' },
    { karat: '9K (375)', tanch: 37.5, shortCode: '375' }
  ],
  Silver: [
    { karat: '99.9% (Fine)', tanch: 99.9, shortCode: '999' },
    { karat: '92.5% (Sterling)', tanch: 92.5, shortCode: '925' },
    { karat: '80.0% (Standard)', tanch: 80.0, shortCode: '800' },
    { karat: '70.0%', tanch: 70.0, shortCode: '700' }
  ],
  Platinum: [
    { karat: 'Pt 950', tanch: 95.0, shortCode: '950' },
    { karat: 'Pt 900', tanch: 90.0, shortCode: '900' }
  ]
}

const initialForm = {
  stampName: '',
  metalType: 'Gold',
  purityKarat: '22K (916)',
  purityTanch: 91.66,
  shortCode: '916',
  isHallmarked: true,
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

  if (normalized === 'platinum') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 whitespace-nowrap">
        Platinum
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

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap">
      {metal}
    </span>
  )
}

function renderStatus(active: boolean): React.JSX.Element {
  if (active) {
    return <span className="text-emerald-600 font-bold text-xs whitespace-nowrap">Active</span>
  }

  return <span className="text-slate-400 font-medium text-xs whitespace-nowrap">Inactive</span>
}

/**
 * Custom Styled Metal Type Dropdown Component (matching AccountGroup style)
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

  // Handle click outside to close dropdown
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
      {/* Trigger Button */}
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

      {/* Floating Custom Dropdown Card */}
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

export function ItemStampScreen({ onClose: _onClose }: { onClose?: () => void }): React.JSX.Element {
  const [form, setForm] = useState(initialForm)
  const [itemStamps, setItemStamps] = useState<ItemStamp[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ItemStamp | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)

  // Filters
  const [searchText, setSearchText] = useState('')
  const [metalTypeFilter, setMetalTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const stampNameInputRef = useRef<HTMLInputElement | null>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null)

  const selectedStamp = useMemo(() => {
    return itemStamps.find((s) => s.id === selectedId) || null
  }, [itemStamps, selectedId])

  const filteredStamps = useMemo(() => {
    return itemStamps.filter((stamp) => {
      // Metal Filter
      if (metalTypeFilter !== 'All' && stamp.metalType.toLowerCase() !== metalTypeFilter.toLowerCase()) {
        return false
      }

      // Status Filter
      if (statusFilter === 'ACTIVE' && !stamp.active) return false
      if (statusFilter === 'INACTIVE' && stamp.active) return false

      // Search Query
      const query = searchText.trim().toLowerCase()
      if (!query) return true

      return (
        stamp.stampName.toLowerCase().includes(query) ||
        stamp.metalType.toLowerCase().includes(query) ||
        (stamp.purityKarat || '').toLowerCase().includes(query) ||
        (stamp.shortCode || '').toLowerCase().includes(query) ||
        (stamp.description || '').toLowerCase().includes(query)
      )
    })
  }, [itemStamps, searchText, metalTypeFilter, statusFilter])

  const activeCount = useMemo(() => {
    return itemStamps.filter((s) => s.active).length
  }, [itemStamps])

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

  const loadItemStamps = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.itemStamps.list()
      setItemStamps(data)
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
    window.setTimeout(() => stampNameInputRef.current?.focus(), 50)
  }, [])

  const openEditForm = useCallback((stamp: ItemStamp): void => {
    setEditingId(stamp.id)
    setSelectedId(stamp.id)
    setForm({
      stampName: stamp.stampName,
      metalType: stamp.metalType,
      purityKarat: stamp.purityKarat || '',
      purityTanch: stamp.purityTanch ?? 0,
      shortCode: stamp.shortCode || '',
      isHallmarked: stamp.isHallmarked !== false,
      description: stamp.description || '',
      active: stamp.active
    })
    setFormOpen(true)
    window.setTimeout(() => stampNameInputRef.current?.focus(), 50)
  }, [])

  const closeForm = useCallback((): void => {
    setFormOpen(false)
    setEditingId(null)
    setForm(initialForm)
  }, [])

  const handleMetalChange = (newMetal: string): void => {
    const presets = STANDARD_PURITIES[newMetal]
    const defaultPreset = presets && presets[0]

    setForm((prev) => ({
      ...prev,
      metalType: newMetal,
      purityKarat: defaultPreset ? defaultPreset.karat : prev.purityKarat,
      purityTanch: defaultPreset ? defaultPreset.tanch : prev.purityTanch,
      shortCode: defaultPreset ? defaultPreset.shortCode : prev.shortCode
    }))
  }

  const applyPreset = (preset: { karat: string; tanch: number; shortCode: string }): void => {
    setForm((prev) => ({
      ...prev,
      purityKarat: preset.karat,
      purityTanch: preset.tanch,
      shortCode: preset.shortCode,
      stampName: prev.stampName ? prev.stampName : `${preset.shortCode} ${prev.metalType} (${preset.karat})`
    }))
  }

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return

    if (!form.stampName.trim()) {
      showAlert('warning', 'Please enter a valid Stamp Name.')
      stampNameInputRef.current?.focus()
      return
    }

    try {
      setSaving(true)

      const payload = {
        ...form,
        stampName: form.stampName.trim(),
        purityKarat: form.purityKarat.trim(),
        purityTanch: Number(form.purityTanch) || 0,
        shortCode: form.shortCode.trim(),
        isHallmarked: Boolean(form.isHallmarked),
        description: form.description.trim()
      }

      const successMessage = editingId
        ? `Item stamp "${form.stampName}" updated successfully.`
        : `Item stamp "${form.stampName}" created successfully.`

      if (editingId) {
        await window.api.itemStamps.update(editingId, payload)
      } else {
        await window.api.itemStamps.create(payload)
      }

      closeForm()
      await loadItemStamps()
      showAlert('success', successMessage)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [closeForm, editingId, form, loadItemStamps, saving, showAlert])

  const requestDelete = useCallback((stamp: ItemStamp): void => {
    setDeleteTarget(stamp)
  }, [])

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await window.api.itemStamps.remove(deleteTarget.id)

      if (selectedId === deleteTarget.id) {
        setSelectedId(null)
      }

      if (editingId === deleteTarget.id) {
        closeForm()
      }

      setDeleteTarget(null)
      await loadItemStamps()
      showAlert('success', `Item stamp "${deleteTarget.stampName}" deleted successfully.`)
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
    if (filteredStamps.length === 0) {
      showAlert('warning', 'No item stamps to export.')
      return
    }

    const headers = ['Sr No', 'Stamp Name', 'Metal Type', 'Purity Karat', 'Tanch %', 'Tag Code', 'Hallmarked', 'Description', 'Status']
    const rows = filteredStamps.map((s, i) => [
      i + 1,
      `"${s.stampName.replace(/"/g, '""')}"`,
      `"${s.metalType.replace(/"/g, '""')}"`,
      `"${(s.purityKarat || '').replace(/"/g, '""')}"`,
      s.purityTanch ?? 0,
      `"${(s.shortCode || '').replace(/"/g, '""')}"`,
      s.isHallmarked ? 'Yes' : 'No',
      `"${(s.description || '').replace(/"/g, '""')}"`,
      s.active ? 'Active' : 'Inactive'
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `item_stamps_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showAlert('success', `Exported ${filteredStamps.length} item stamps to CSV.`)
  }, [filteredStamps, showAlert])

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

  // Load data on mount
  useEffect(() => {
    void loadItemStamps()
  }, [loadItemStamps])

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
                Add New Stamp
              </span>
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-200 hover:border-slate-400 hover:text-slate-900 transition-colors shadow-sm cursor-pointer"
              title="Print Item Stamps"
            >
              <FiPrinter size={14} />
              Print
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 hover:border-emerald-400 hover:text-emerald-900 transition-colors shadow-sm cursor-pointer"
              title="Export filtered stamps to CSV"
            >
              <FiDownload size={14} />
              Export CSV
            </button>
          </div>

          <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 text-slate-500 select-none">
            Selected:{' '}
            <span className={`font-bold ${selectedStamp ? 'text-amber-700' : 'text-slate-400'}`}>
              {selectedStamp ? selectedStamp.stampName : 'None'}
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
                <option value="All">All Metals</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Platinum">Platinum</option>
                <option value="Diamond">Diamond</option>
                <option value="Other">Other</option>
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
                placeholder="Search by stamp name, karat, code, notes..."
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
                Total <strong className="text-slate-700 font-bold">{itemStamps.length}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Active <strong className="text-emerald-700 font-bold">{activeCount}</strong>
              </span>
              {filteredStamps.length !== itemStamps.length && (
                <>
                  <span className="text-slate-300">|</span>
                  <span>
                    Showing <strong className="text-amber-700 font-bold">{filteredStamps.length}</strong>
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
                {editingId ? `Edit Item Stamp: ${form.stampName || 'Untitled'}` : 'Create New Item Stamp'}
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">Fields marked with * are mandatory</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Row 1: Stamp Name & Metal Type (2 Columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Stamp Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="stampName" className="block text-xs font-bold text-slate-700">
                      Stamp / Hallmark Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="stampName"
                      ref={stampNameInputRef}
                      type="text"
                      value={form.stampName}
                      onChange={(e) => setForm({ ...form, stampName: e.target.value })}
                      placeholder="e.g. 916 BIS Hallmark (22K), 750 (18K), 925"
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
                      onChange={(newMetal) => handleMetalChange(newMetal)}
                      onSelectNext={() => descriptionInputRef.current?.focus()}
                    />
                  </div>
                </div>

                {/* Quick Presets for Selected Metal */}
                {STANDARD_PURITIES[form.metalType] && (
                  <div className="bg-amber-50/50 border border-amber-200/60 rounded-lg p-3.5">
                    <div className="text-[11px] font-bold text-amber-900 mb-2.5 flex items-center gap-1.5">
                      <FiAward size={14} className="text-amber-600" />
                      Quick Presets ({form.metalType}):
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {STANDARD_PURITIES[form.metalType].map((preset) => (
                        <button
                          key={preset.karat}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className="px-3 py-1.5 text-xs rounded-md bg-white border border-amber-300/80 text-amber-900 hover:bg-amber-100/70 hover:border-amber-400 font-semibold transition-colors shadow-2xs cursor-pointer"
                        >
                          {preset.karat} · {preset.tanch}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Row 2: Purity / Karat, Default Tanch %, Short Print Code (3 Columns) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Purity / Karat */}
                  <div className="space-y-1.5">
                    <label htmlFor="purityKarat" className="block text-xs font-bold text-slate-700">
                      Purity / Karat
                    </label>
                    <input
                      id="purityKarat"
                      type="text"
                      value={form.purityKarat}
                      onChange={(e) => setForm({ ...form, purityKarat: e.target.value })}
                      placeholder="e.g. 22K, 18K, 14K, 92.5%"
                      className="w-full h-10 px-3.5 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-800"
                    />
                    <p className="text-[10px] text-slate-400">Purity standard label (e.g. 22K, 18K)</p>
                  </div>

                  {/* Default Purity / Tanch % */}
                  <div className="space-y-1.5">
                    <label htmlFor="purityTanch" className="block text-xs font-bold text-slate-700">
                      Default Purity % (Tanch)
                    </label>
                    <input
                      id="purityTanch"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={form.purityTanch || ''}
                      onChange={(e) => setForm({ ...form, purityTanch: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 91.66, 75.00, 92.50"
                      className="w-full h-10 px-3.5 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-800 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">Used for fine gold/silver metal math</p>
                  </div>

                  {/* Short Code (Tag Print) */}
                  <div className="space-y-1.5">
                    <label htmlFor="shortCode" className="block text-xs font-bold text-slate-700">
                      Tag / Print Short Code
                    </label>
                    <input
                      id="shortCode"
                      type="text"
                      maxLength={15}
                      value={form.shortCode}
                      onChange={(e) => setForm({ ...form, shortCode: e.target.value.toUpperCase() })}
                      placeholder="e.g. 916, 750, 925"
                      className="w-full h-10 px-3.5 text-xs font-bold border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-800 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">Printed on small jewelry barcode tags</p>
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
                    placeholder="Enter short purpose, notes or details for this stamp..."
                    className="w-full p-3 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-800 resize-none"
                  />
                </div>

                {/* Row 4: Flags (Hallmarked & Active in 2 Columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Hallmarked / HUID Applicable */}
                  <label className="flex items-start gap-3 cursor-pointer select-none p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.isHallmarked}
                      onChange={(e) => setForm({ ...form, isHallmarked: e.target.checked })}
                      className="w-4 h-4 mt-0.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer shrink-0"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">BIS Hallmarked / HUID Required</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Marks items under this stamp as legally certified hallmarked jewelry
                      </div>
                    </div>
                  </label>

                  {/* Active Toggle */}
                  <label className="flex items-start gap-3 cursor-pointer select-none p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="w-4 h-4 mt-0.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer shrink-0"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Active Status</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Active stamps are selectable in Item Master, Tagging and Billing
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
                    {editingId ? 'Update Stamp' : 'Save Stamp'}
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
              <h2 className="text-xl font-bold text-slate-900">ITEM STAMP DIRECTORY</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Generated on {new Date().toLocaleDateString()} · Total Records: {itemStamps.length}
              </p>
            </div>

            <div className="w-full h-full overflow-auto">
              <table className="w-full text-xs text-left border-collapse print:text-[10px]">
                <thead className="sticky top-0 z-10 bg-slate-200 text-slate-800 border-b border-slate-300 font-bold uppercase tracking-wider select-none print:static">
                  <tr className="border-l-4 border-l-slate-200">
                    <th className="py-3 px-3 w-16 text-center text-[10px] font-bold text-slate-700">Sr No</th>
                    <th className="py-3 px-4 min-w-[180px]">Stamp Name</th>
                    <th className="py-3 px-3 min-w-[110px]">Metal</th>
                    <th className="py-3 px-3 text-center min-w-[100px]">Purity / Karat</th>
                    <th className="py-3 px-3 text-right min-w-[90px]">Tanch %</th>
                    <th className="py-3 px-3 text-center min-w-[90px]">Tag Code</th>
                    <th className="py-3 px-3 text-center min-w-[100px]">Hallmark</th>
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
                          <span className="font-medium text-sm">Loading item stamps...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredStamps.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-20 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <FiLayers size={36} className="text-slate-300" />
                          {searchText ? (
                            <p className="text-sm">
                              No item stamps matching <span className="font-semibold text-slate-700">"{searchText}"</span>
                            </p>
                          ) : (
                            <p className="text-sm">
                              No item stamps found. Click <span className="font-semibold text-amber-600">"Add New Stamp"</span> to create one.
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStamps.map((stamp, index) => {
                      const isSelected = selectedId === stamp.id
                      return (
                        <tr
                          key={stamp.id}
                          onClick={() => setSelectedId(stamp.id)}
                          onDoubleClick={() => openEditForm(stamp)}
                          className={`transition-colors cursor-pointer select-none group ${
                            isSelected
                              ? 'bg-amber-50/90 border-l-4 border-l-amber-500 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] relative'
                              : 'border-l-4 border-l-transparent hover:bg-slate-100 hover:border-l-amber-300 hover:shadow-[0_2px_4px_rgba(0,0,0,0.02)]'
                          }`}
                        >
                          {/* Sr No */}
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block min-w-[22px] text-center font-semibold text-[11px] text-slate-500 bg-slate-100/80 px-1.5 py-0.5 rounded">
                              {index + 1}
                            </span>
                          </td>

                          {/* Stamp Name */}
                          <td className="py-3 px-4">
                            <div className={`font-semibold ${isSelected ? 'text-amber-950' : 'text-slate-900'}`}>
                              {stamp.stampName}
                            </div>
                          </td>

                          {/* Metal Type */}
                          <td className="py-3 px-3">
                            {renderMetalBadge(stamp.metalType)}
                          </td>

                          {/* Purity / Karat */}
                          <td className="py-3 px-3 text-center">
                            {stamp.purityKarat ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 whitespace-nowrap">
                                {stamp.purityKarat}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono">-</span>
                            )}
                          </td>

                          {/* Tanch % */}
                          <td className="py-3 px-3 text-right">
                            {stamp.purityTanch && stamp.purityTanch > 0 ? (
                              <span className="font-mono font-medium text-slate-800">
                                {Number(stamp.purityTanch).toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono">-</span>
                            )}
                          </td>

                          {/* Tag Code */}
                          <td className="py-3 px-3 text-center">
                            {stamp.shortCode ? (
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                {stamp.shortCode}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">-</span>
                            )}
                          </td>

                          {/* Hallmark Status */}
                          <td className="py-3 px-3 text-center">
                            {stamp.isHallmarked !== false ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <FiCheck size={11} className="stroke-[3]" />
                                BIS HUID
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Non-HM</span>
                            )}
                          </td>

                          {/* Description */}
                          <td className="py-3 px-4 text-slate-600">
                            {stamp.description ? (
                              <span className="line-clamp-1">{stamp.description}</span>
                            ) : (
                              <span className="text-slate-300 font-mono">-</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            {renderStatus(stamp.active)}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-2 text-center no-print">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditForm(stamp)
                                }}
                                className="p-1.5 rounded-md text-amber-600 hover:text-amber-900 hover:bg-amber-100 transition-all cursor-pointer"
                                title="Edit Item Stamp"
                              >
                                <FiEdit2 size={16} className="stroke-[2.2]" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  requestDelete(stamp)
                                }}
                                className="p-1.5 rounded-md text-rose-500 hover:text-rose-800 hover:bg-rose-100 transition-all cursor-pointer"
                                title="Delete Item Stamp"
                              >
                                <FiTrash2 size={16} className="stroke-[2.2]" />
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
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Item Stamp?"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.stampName}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Stamp"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}

export default ItemStampScreen
