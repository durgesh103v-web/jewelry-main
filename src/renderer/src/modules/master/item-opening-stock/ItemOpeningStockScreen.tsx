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
  FiChevronDown
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { ConfirmDialog } from '../../../components/ui'
import ItemOpeningStockPrintPreview from './ItemOpeningStockPrintPreview'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import {
  calculateFine,
  calculateHishob,
  calculateMajuri,
  calculateNetWeight
} from '../../../utils/jewelleryFormula'

type UnitType = 'Kg' | 'Gm' | 'Pcs'
type MetalType = 'Gold' | 'Silver' | 'Diamond' | 'Platinum' | 'Other'

export interface ItemOption {
  id: string
  itemName: string
  metalType: string
  defaultStampId?: string
  defaultDesignId?: string
  defaultTanch?: number
  defaultWastage?: number
  defaultLabourRate?: number
  labourRateType?: string
  active: boolean
}

export interface StampOption {
  id: string
  stampName: string
  metalType: string
  purityTanch?: number
  purityKarat?: string
  active: boolean
}

export interface DesignOption {
  id: string
  designName: string
  metalType: string
  defaultLabourRate?: number
  defaultLabourType?: string
  defaultWastage?: number
  active: boolean
}

export interface OpeningStockRecord {
  id: string
  stockDate: string
  itemId: string
  itemName: string
  metalType: string
  stampId: string
  stampName: string
  designId: string
  designName: string
  barcode: string
  huid?: string
  location?: string
  diamondCarats?: number
  diamondPcs?: number
  stoneAmount?: number
  remark: string
  pcs: number
  grossWeight: number
  lessWeight: number
  addWeight: number
  netWeight: number
  tanch: number
  wastage: number
  hishob: number
  unit: UnitType
  majuriRate: number
  fine: number
  majuri: number
  active: boolean
}

export interface MetalTypeOption {
  value: MetalType
  label: string
  subtitle: string
  color: string
  dotClass: string
}

export const METAL_TYPES_DATA: MetalTypeOption[] = [
  {
    value: 'Gold',
    label: 'Gold',
    subtitle: '24K, 22K (916), 18K (750), 14K & Fine Bullion',
    color: 'amber',
    dotClass: 'bg-amber-500'
  },
  {
    value: 'Silver',
    label: 'Silver',
    subtitle: '99.9 Fine, 92.5 Sterling, Utensils & Ornaments',
    color: 'slate',
    dotClass: 'bg-slate-400'
  },
  {
    value: 'Diamond',
    label: 'Diamond',
    subtitle: 'Studded jewellery, Solitaires, Polki & Gems',
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
    subtitle: 'Mixed alloy, brass, imitation or custom metal stock',
    color: 'slate',
    dotClass: 'bg-slate-400'
  }
]

export const METAL_OPTIONS = ['All', 'Gold', 'Silver', 'Diamond', 'Platinum', 'Other']

const today = new Date().toISOString().slice(0, 10)

const initialForm = {
  stockDate: today,
  metalType: 'Gold' as MetalType,
  stampId: '',
  itemId: '',
  designId: '',
  huid: '',
  location: '',
  diamondCarats: '',
  diamondPcs: '',
  stoneAmount: '',
  pcs: '1',
  grossWeight: '',
  lessWeight: '0',
  addWeight: '0',
  tanch: '91.66',
  wastage: '0',
  unit: 'Gm' as UnitType,
  majuriRate: '0',
  barcode: '',
  remark: '',
  active: true
}

function toNumber(value: string | number): number {
  if (value === '') return 0
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
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

/**
 * Custom Styled Metal Type Dropdown Component
 */
interface MetalTypeSelectProps {
  value: MetalType
  onChange: (val: MetalType) => void
}

function CustomMetalTypeDropdown({ value, onChange }: MetalTypeSelectProps): React.JSX.Element {
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
          <span className="text-slate-400 text-[11px] font-normal hidden sm:inline truncate max-w-[240px]">
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

export function ItemOpeningStockScreen({ onClose: _onClose }: { onClose?: () => void }): React.JSX.Element {
  const [form, setForm] = useState(initialForm)
  const [items, setItems] = useState<ItemOption[]>([])
  const [stamps, setStamps] = useState<StampOption[]>([])
  const [designs, setDesigns] = useState<DesignOption[]>([])
  const [savedRecords, setSavedRecords] = useState<OpeningStockRecord[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OpeningStockRecord | null>(null)
  const [printRecords, setPrintRecords] = useState<OpeningStockRecord[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)

  // Filters
  const [searchText, setSearchText] = useState('')
  const [metalTypeFilter, setMetalTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const itemSelectRef = useRef<HTMLSelectElement | null>(null)
  const grossWeightRef = useRef<HTMLInputElement | null>(null)

  const selectedRecord = useMemo(() => {
    return savedRecords.find((r) => r.id === selectedId) || null
  }, [savedRecords, selectedId])

  // Filter master options based on selected metal
  const filteredItems = useMemo(() => {
    return items.filter((item) => item.metalType.toLowerCase() === form.metalType.toLowerCase() && item.active)
  }, [items, form.metalType])

  const filteredStamps = useMemo(() => {
    return stamps.filter((stamp) => stamp.metalType.toLowerCase() === form.metalType.toLowerCase() && stamp.active)
  }, [stamps, form.metalType])

  const filteredDesigns = useMemo(() => {
    return designs.filter((design) => design.metalType.toLowerCase() === form.metalType.toLowerCase() && design.active)
  }, [designs, form.metalType])

  // Dynamic live calculation preview
  const preview = useMemo(() => {
    const gross = toNumber(form.grossWeight)
    const less = toNumber(form.lessWeight)
    const add = toNumber(form.addWeight)
    const netWeight = calculateNetWeight(gross, less, add)
    const tanch = toNumber(form.tanch)
    const wastage = toNumber(form.wastage)
    const hishob = calculateHishob(tanch, wastage)
    const fine = calculateFine(netWeight, tanch, wastage)
    const majuri = calculateMajuri({
      netWeight,
      pcs: toNumber(form.pcs),
      labourRate: toNumber(form.majuriRate),
      labourRateType: form.unit
    })

    return {
      netWeight,
      hishob,
      fine,
      majuri
    }
  }, [form])

  const filteredRecords = useMemo(() => {
    return savedRecords.filter((record) => {
      // Metal Filter
      if (metalTypeFilter !== 'All' && record.metalType.toLowerCase() !== metalTypeFilter.toLowerCase()) {
        return false
      }

      // Status Filter
      if (statusFilter === 'ACTIVE' && !record.active) return false
      if (statusFilter === 'INACTIVE' && record.active) return false

      // Search Query
      const query = searchText.trim().toLowerCase()
      if (!query) return true

      return (
        record.itemName.toLowerCase().includes(query) ||
        record.metalType.toLowerCase().includes(query) ||
        record.stampName.toLowerCase().includes(query) ||
        record.designName.toLowerCase().includes(query) ||
        (record.huid || '').toLowerCase().includes(query) ||
        (record.location || '').toLowerCase().includes(query) ||
        (record.barcode || '').toLowerCase().includes(query) ||
        (record.remark || '').toLowerCase().includes(query)
      )
    })
  }, [savedRecords, searchText, metalTypeFilter, statusFilter])

  const activeCount = useMemo(() => {
    return savedRecords.filter((r) => r.active).length
  }, [savedRecords])

  const summaryTotals = useMemo(() => {
    return filteredRecords.reduce(
      (acc, r) => {
        const net = Number(r.netWeight || 0)
        const fine = Number(r.fine || 0)
        const majuri = Number(r.majuri || 0)
        const pcs = Number(r.pcs || 0)

        acc.totalPcs += pcs
        acc.totalNetWeight += net
        acc.totalFine += fine
        acc.totalMajuri += majuri

        if (r.metalType.toLowerCase() === 'gold') {
          acc.goldFine += fine
          acc.goldNet += net
        } else if (r.metalType.toLowerCase() === 'silver') {
          acc.silverFine += fine
          acc.silverNet += net
        }

        return acc
      },
      { totalPcs: 0, totalNetWeight: 0, totalFine: 0, totalMajuri: 0, goldFine: 0, goldNet: 0, silverFine: 0, silverNet: 0 }
    )
  }, [filteredRecords])

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

  // Load masters & opening stock records
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const [stockData, itemData, stampData, designData] = await Promise.all([
        window.api.itemOpeningStock.list(),
        window.api.items.list(),
        window.api.itemStamps.list(),
        window.api.itemDesigns.list()
      ])

      setSavedRecords(stockData)
      setItems(itemData)
      setStamps(stampData)
      setDesigns(designData)
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
    window.setTimeout(() => itemSelectRef.current?.focus(), 50)
  }, [])

  const openEditForm = useCallback((record: OpeningStockRecord): void => {
    setEditingId(record.id)
    setSelectedId(record.id)
    setForm({
      stockDate: record.stockDate || today,
      metalType: (record.metalType as MetalType) || 'Gold',
      stampId: record.stampId || '',
      itemId: record.itemId || '',
      designId: record.designId || '',
      huid: record.huid || '',
      location: record.location || '',
      diamondCarats: record.diamondCarats ? String(record.diamondCarats) : '',
      diamondPcs: record.diamondPcs ? String(record.diamondPcs) : '',
      stoneAmount: record.stoneAmount ? String(record.stoneAmount) : '',
      pcs: String(record.pcs || 1),
      grossWeight: String(record.grossWeight || ''),
      lessWeight: String(record.lessWeight || '0'),
      addWeight: String(record.addWeight || '0'),
      tanch: String(record.tanch || '91.66'),
      wastage: String(record.wastage || '0'),
      unit: (record.unit as UnitType) || 'Gm',
      majuriRate: String(record.majuriRate || '0'),
      barcode: record.barcode || '',
      remark: record.remark || '',
      active: record.active
    })
    setFormOpen(true)
    window.setTimeout(() => grossWeightRef.current?.focus(), 50)
  }, [])

  const closeForm = useCallback((): void => {
    setFormOpen(false)
    setEditingId(null)
    setForm(initialForm)
  }, [])

  const handleItemSelect = (selectedItemId: string): void => {
    const selectedItem = items.find((i) => i.id === selectedItemId)
    if (!selectedItem) {
      setForm((prev) => ({ ...prev, itemId: selectedItemId }))
      return
    }

    setForm((prev) => ({
      ...prev,
      itemId: selectedItemId,
      stampId: selectedItem.defaultStampId || prev.stampId,
      designId: selectedItem.defaultDesignId || prev.designId,
      tanch: selectedItem.defaultTanch ? String(selectedItem.defaultTanch) : prev.tanch,
      wastage: selectedItem.defaultWastage ? String(selectedItem.defaultWastage) : prev.wastage,
      majuriRate: selectedItem.defaultLabourRate ? String(selectedItem.defaultLabourRate) : prev.majuriRate
    }))
  }

  const handleMetalChange = (newMetal: MetalType): void => {
    const defaultTanch = newMetal === 'Gold' ? '91.66' : newMetal === 'Silver' ? '92.50' : '95.00'
    setForm((prev) => ({
      ...prev,
      metalType: newMetal,
      itemId: '',
      stampId: '',
      designId: '',
      tanch: defaultTanch
    }))
  }

  const handleSave = useCallback(async (): Promise<void> => {
    if (saving) return

    if (!form.itemId) {
      showAlert('warning', 'Please select an Item.')
      itemSelectRef.current?.focus()
      return
    }

    if (toNumber(form.grossWeight) <= 0) {
      showAlert('warning', 'Please enter a valid Gross Weight.')
      grossWeightRef.current?.focus()
      return
    }

    try {
      setSaving(true)

      const payload = {
        stockDate: form.stockDate || today,
        itemId: form.itemId,
        stampId: form.stampId || '',
        designId: form.designId || '',
        huid: form.huid.trim().toUpperCase(),
        location: form.location.trim(),
        diamondCarats: toNumber(form.diamondCarats),
        diamondPcs: Math.floor(toNumber(form.diamondPcs)),
        stoneAmount: toNumber(form.stoneAmount),
        barcode: form.barcode.trim(),
        remark: form.remark.trim(),
        pcs: Math.max(1, Math.floor(toNumber(form.pcs))),
        grossWeight: toNumber(form.grossWeight),
        lessWeight: toNumber(form.lessWeight),
        addWeight: toNumber(form.addWeight),
        tanch: toNumber(form.tanch),
        wastage: toNumber(form.wastage),
        hishob: preview.hishob,
        unit: form.unit,
        majuriRate: toNumber(form.majuriRate),
        active: Boolean(form.active)
      }

      const successMessage = editingId
        ? 'Opening stock entry updated successfully.'
        : 'Opening stock entry saved successfully.'

      if (editingId) {
        await window.api.itemOpeningStock.update(editingId, payload)
      } else {
        await window.api.itemOpeningStock.create(payload)
      }

      closeForm()
      await loadData()
      showAlert('success', successMessage)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [closeForm, editingId, form, loadData, preview.hishob, saving, showAlert])

  const requestDelete = useCallback((record: OpeningStockRecord): void => {
    setDeleteTarget(record)
  }, [])

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await window.api.itemOpeningStock.remove(deleteTarget.id)

      if (selectedId === deleteTarget.id) {
        setSelectedId(null)
      }

      if (editingId === deleteTarget.id) {
        closeForm()
      }

      setDeleteTarget(null)
      await loadData()
      showAlert('success', 'Opening stock entry deleted successfully.')
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
    if (filteredRecords.length === 0) {
      showAlert('warning', 'No opening stock records to print.')
      return
    }
    setPrintRecords(filteredRecords)
  }, [filteredRecords, showAlert])

  const handleExportCsv = useCallback((): void => {
    if (filteredRecords.length === 0) {
      showAlert('warning', 'No opening stock records to export.')
      return
    }

    const headers = [
      'Sr No',
      'Date',
      'Item Name',
      'Metal',
      'Stamp',
      'Design',
      'HUID',
      'Location / Tray',
      'Pcs',
      'Gross Wt (g)',
      'Less Wt (g)',
      'Net Wt (g)',
      'Tanch %',
      'Wastage %',
      'Fine Wt (g)',
      'Diamond Cts',
      'Diamond Pcs',
      'Majuri Rate',
      'Majuri (₹)',
      'Barcode',
      'Remarks',
      'Status'
    ]

    const rows = filteredRecords.map((r, i) => [
      i + 1,
      `"${r.stockDate || ''}"`,
      `"${r.itemName.replace(/"/g, '""')}"`,
      `"${r.metalType}"`,
      `"${(r.stampName || '').replace(/"/g, '""')}"`,
      `"${(r.designName || '').replace(/"/g, '""')}"`,
      `"${r.huid || ''}"`,
      `"${(r.location || '').replace(/"/g, '""')}"`,
      r.pcs ?? 1,
      r.grossWeight ?? 0,
      r.lessWeight ?? 0,
      r.netWeight ?? 0,
      r.tanch ?? 0,
      r.wastage ?? 0,
      r.fine ?? 0,
      r.diamondCarats ?? 0,
      r.diamondPcs ?? 0,
      r.majuriRate ?? 0,
      r.majuri ?? 0,
      `"${r.barcode || ''}"`,
      `"${(r.remark || '').replace(/"/g, '""')}"`,
      r.active ? 'Active' : 'Inactive'
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `item_opening_stock_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showAlert('success', `Exported ${filteredRecords.length} opening stock entries to CSV.`)
  }, [filteredRecords, showAlert])

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
        if (printRecords) {
          setPrintRecords(null)
        } else if (deleteTarget) {
          handleCancelDelete()
        } else if (formOpen) {
          closeForm()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeForm, deleteTarget, formOpen, handleCancelDelete, handleSave, openNewForm, printRecords])

  // Initial load
  useEffect(() => {
    void loadData()
  }, [loadData])

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
                Add Opening Stock
              </span>
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-200 hover:border-slate-400 hover:text-slate-900 transition-colors shadow-sm cursor-pointer"
              title="Print Opening Stock Register"
            >
              <FiPrinter size={14} />
              Print Register
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 hover:border-emerald-400 hover:text-emerald-900 transition-colors shadow-sm cursor-pointer"
              title="Export filtered records to CSV"
            >
              <FiDownload size={14} />
              Export CSV
            </button>
          </div>

          <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 text-slate-500 select-none">
            Selected:{' '}
            <span className={`font-bold ${selectedRecord ? 'text-amber-700' : 'text-slate-400'}`}>
              {selectedRecord ? `${selectedRecord.itemName} (${selectedRecord.netWeight.toFixed(3)}g)` : 'None'}
            </span>
          </div>
        </div>

        {/* Filter Bar (Table View Only) */}
        {!formOpen && (
          <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex-wrap">
            {/* Metal Filter */}
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
                placeholder="Search by item, stamp, design, HUID, tray/location, barcode..."
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
                Total <strong className="text-slate-700 font-bold">{savedRecords.length}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Active <strong className="text-emerald-700 font-bold">{activeCount}</strong>
              </span>
              {filteredRecords.length !== savedRecords.length && (
                <>
                  <span className="text-slate-300">|</span>
                  <span>
                    Showing <strong className="text-amber-700 font-bold">{filteredRecords.length}</strong>
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
                {editingId ? 'Edit Item Opening Stock' : 'Create Item Opening Stock'}
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">Fields marked with * are mandatory</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1: Item Identification & Classification */}
              <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-4.5 space-y-4 shadow-2xs">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  1. Product & Stamp Classification
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Metal Type */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Metal Type <span className="text-rose-500">*</span>
                    </label>
                    <CustomMetalTypeDropdown value={form.metalType} onChange={handleMetalChange} />
                  </div>

                  {/* Item Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="itemId" className="block text-xs font-bold text-slate-700">
                      Item Name <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="itemId"
                      ref={itemSelectRef}
                      value={form.itemId}
                      onChange={(e) => handleItemSelect(e.target.value)}
                      className="w-full h-10 px-3 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800 cursor-pointer"
                    >
                      <option value="">Select Item Name</option>
                      {filteredItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.itemName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Stamp / Karat */}
                  <div className="space-y-1.5">
                    <label htmlFor="stampId" className="block text-xs font-bold text-slate-700">
                      Stamp / Purity Hallmark
                    </label>
                    <select
                      id="stampId"
                      value={form.stampId}
                      onChange={(e) => {
                        const sId = e.target.value
                        const stamp = stamps.find((s) => s.id === sId)
                        setForm((prev) => ({
                          ...prev,
                          stampId: sId,
                          tanch: stamp?.purityTanch ? String(stamp.purityTanch) : prev.tanch
                        }))
                      }}
                      className="w-full h-10 px-3 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800 cursor-pointer"
                    >
                      <option value="">Select Stamp (Optional)</option>
                      {filteredStamps.map((stamp) => (
                        <option key={stamp.id} value={stamp.id}>
                          {stamp.stampName} {stamp.purityKarat ? `(${stamp.purityKarat})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Item Design */}
                  <div className="space-y-1.5">
                    <label htmlFor="designId" className="block text-xs font-bold text-slate-700">
                      Item Design / Pattern
                    </label>
                    <select
                      id="designId"
                      value={form.designId}
                      onChange={(e) => {
                        const dId = e.target.value
                        const design = designs.find((d) => d.id === dId)
                        setForm((prev) => ({
                          ...prev,
                          designId: dId,
                          majuriRate: design?.defaultLabourRate ? String(design.defaultLabourRate) : prev.majuriRate,
                          wastage: design?.defaultWastage ? String(design.defaultWastage) : prev.wastage
                        }))
                      }}
                      className="w-full h-10 px-3 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800 cursor-pointer"
                    >
                      <option value="">Select Design (Optional)</option>
                      {filteredDesigns.map((design) => (
                        <option key={design.id} value={design.id}>
                          {design.designName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Location, HUID & Barcode Tag */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                  {/* Location / Tray */}
                  <div className="space-y-1.5">
                    <label htmlFor="location" className="block text-xs font-bold text-slate-700">
                      Tray / Counter / Vault Location
                    </label>
                    <input
                      id="location"
                      type="text"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="e.g. Tray A-1, Showcase 2, Vault-3"
                      className="w-full h-10 px-3 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                    />
                  </div>

                  {/* HUID / Hallmark No */}
                  <div className="space-y-1.5">
                    <label htmlFor="huid" className="block text-xs font-bold text-slate-700">
                      BIS Hallmark / HUID No.
                    </label>
                    <input
                      id="huid"
                      type="text"
                      maxLength={20}
                      value={form.huid}
                      onChange={(e) => setForm({ ...form, huid: e.target.value.toUpperCase() })}
                      placeholder="e.g. AB1234 / HUID-9912"
                      className="w-full h-10 px-3 text-xs font-bold font-mono border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800 uppercase"
                    />
                  </div>

                  {/* Barcode */}
                  <div className="space-y-1.5">
                    <label htmlFor="barcode" className="block text-xs font-bold text-slate-700">
                      Barcode Tag Code (Optional)
                    </label>
                    <input
                      id="barcode"
                      type="text"
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      placeholder="Auto-generated if left blank"
                      className="w-full h-10 px-3 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                    />
                  </div>

                  {/* Stock Entry Date */}
                  <div className="space-y-1.5">
                    <label htmlFor="stockDate" className="block text-xs font-bold text-slate-700">
                      Stock Inward Date
                    </label>
                    <input
                      id="stockDate"
                      type="date"
                      value={form.stockDate}
                      onChange={(e) => setForm({ ...form, stockDate: e.target.value })}
                      className="w-full h-10 px-3 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Weight & Purity Calculations */}
              <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-4.5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 flex-wrap gap-2">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    2. Weights, Purity & Fine Metal Calculation
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 border border-amber-300 px-2.5 py-0.5 rounded-full">
                      Pure Fine Metal: <strong className="font-mono text-xs">{preview.fine.toFixed(3)} g</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  {/* Pcs */}
                  <div className="space-y-1.5">
                    <label htmlFor="pcs" className="block text-xs font-bold text-slate-700">
                      Quantity (Pcs) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="pcs"
                      type="number"
                      min="1"
                      value={form.pcs}
                      onChange={(e) => setForm({ ...form, pcs: e.target.value })}
                      className="w-full h-10 px-3 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                    />
                  </div>

                  {/* Gross Weight */}
                  <div className="space-y-1.5">
                    <label htmlFor="grossWeight" className="block text-xs font-bold text-slate-700">
                      Gross Weight (g) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="grossWeight"
                      ref={grossWeightRef}
                      type="number"
                      step="0.001"
                      min="0"
                      value={form.grossWeight}
                      onChange={(e) => setForm({ ...form, grossWeight: e.target.value })}
                      placeholder="0.000"
                      className="w-full h-10 px-3 text-xs font-mono font-bold border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-900"
                    />
                  </div>

                  {/* Less / Stone Weight */}
                  <div className="space-y-1.5">
                    <label htmlFor="lessWeight" className="block text-xs font-bold text-slate-700">
                      Less / Stone Wt (g)
                    </label>
                    <input
                      id="lessWeight"
                      type="number"
                      step="0.001"
                      min="0"
                      value={form.lessWeight}
                      onChange={(e) => setForm({ ...form, lessWeight: e.target.value })}
                      placeholder="0.000"
                      className="w-full h-10 px-3 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                    />
                  </div>

                  {/* Add Weight */}
                  <div className="space-y-1.5">
                    <label htmlFor="addWeight" className="block text-xs font-bold text-slate-700">
                      Add Weight (g)
                    </label>
                    <input
                      id="addWeight"
                      type="number"
                      step="0.001"
                      min="0"
                      value={form.addWeight}
                      onChange={(e) => setForm({ ...form, addWeight: e.target.value })}
                      placeholder="0.000"
                      className="w-full h-10 px-3 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                    />
                  </div>

                  {/* Calculated Net Weight */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Calculated Net Wt (g)</label>
                    <div className="w-full h-10 px-3 flex items-center bg-amber-50/60 border border-amber-200 rounded-lg font-mono font-bold text-amber-950 text-xs select-none">
                      {preview.netWeight.toFixed(3)} g
                    </div>
                  </div>
                </div>

                {/* Purity Tanch & Wastage */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                  {/* Tanch % */}
                  <div className="space-y-1.5">
                    <label htmlFor="tanch" className="block text-xs font-bold text-slate-700">
                      Purity % (Tanch) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="tanch"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={form.tanch}
                      onChange={(e) => setForm({ ...form, tanch: e.target.value })}
                      placeholder="e.g. 91.66, 75.00, 92.50"
                      className="w-full h-10 px-3 text-xs font-mono font-bold border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                    />
                  </div>

                  {/* Wastage % */}
                  <div className="space-y-1.5">
                    <label htmlFor="wastage" className="block text-xs font-bold text-slate-700">
                      Wastage % (घाटा)
                    </label>
                    <input
                      id="wastage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={form.wastage}
                      onChange={(e) => setForm({ ...form, wastage: e.target.value })}
                      placeholder="0.00"
                      className="w-full h-10 px-3 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                    />
                  </div>

                  {/* Hishob / Total Purity Factor */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Total Hishob % (Tanch + Wstg)</label>
                    <div className="w-full h-10 px-3 flex items-center bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 text-xs select-none">
                      {preview.hishob.toFixed(2)} %
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Diamond / Stone Details (Optional) */}
              <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-4.5 space-y-4 shadow-2xs">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  3. Diamond & Studded Gemstone Details (Optional)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Diamond Carats */}
                  <div className="space-y-1.5">
                    <label htmlFor="diamondCarats" className="block text-xs font-bold text-slate-700">
                      Diamond / Stone Weight (Cts)
                    </label>
                    <input
                      id="diamondCarats"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.diamondCarats}
                      onChange={(e) => setForm({ ...form, diamondCarats: e.target.value })}
                      placeholder="0.00 Cts"
                      className="w-full h-10 px-3 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                    />
                  </div>

                  {/* Diamond Pcs */}
                  <div className="space-y-1.5">
                    <label htmlFor="diamondPcs" className="block text-xs font-bold text-slate-700">
                      Diamond / Stone Pcs
                    </label>
                    <input
                      id="diamondPcs"
                      type="number"
                      min="0"
                      value={form.diamondPcs}
                      onChange={(e) => setForm({ ...form, diamondPcs: e.target.value })}
                      placeholder="0"
                      className="w-full h-10 px-3 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                    />
                  </div>

                  {/* Stone Value */}
                  <div className="space-y-1.5">
                    <label htmlFor="stoneAmount" className="block text-xs font-bold text-slate-700">
                      Stone / Diamond Valuation (₹)
                    </label>
                    <input
                      id="stoneAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.stoneAmount}
                      onChange={(e) => setForm({ ...form, stoneAmount: e.target.value })}
                      placeholder="₹ 0.00"
                      className="w-full h-10 px-3 text-xs font-mono font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Making Charge & Labour Valuation */}
              <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-4.5 space-y-4 shadow-2xs">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  4. Making / Labour Charge & Valuation
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Majuri Rate */}
                  <div className="space-y-1.5">
                    <label htmlFor="majuriRate" className="block text-xs font-bold text-slate-700">
                      Labour / Majuri Rate (₹)
                    </label>
                    <input
                      id="majuriRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.majuriRate}
                      onChange={(e) => setForm({ ...form, majuriRate: e.target.value })}
                      placeholder="0.00"
                      className="w-full h-10 px-3 text-xs font-mono font-bold border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                    />
                  </div>

                  {/* Labour Unit */}
                  <div className="space-y-1.5">
                    <label htmlFor="unit" className="block text-xs font-bold text-slate-700">
                      Calculation Unit
                    </label>
                    <select
                      id="unit"
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value as UnitType })}
                      className="w-full h-10 px-3 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800 cursor-pointer"
                    >
                      <option value="Gm">Per Gram (₹ / gm)</option>
                      <option value="Pcs">Per Piece (₹ / pc)</option>
                      <option value="Kg">Per Kilogram (₹ / kg)</option>
                    </select>
                  </div>

                  {/* Total Calculated Majuri */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Total Calculated Majuri (₹)</label>
                    <div className="w-full h-10 px-3 flex items-center bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 text-xs select-none">
                      ₹ {preview.majuri.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Remarks & Active Status */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="remark" className="block text-xs font-bold text-slate-700">
                    Remarks / Inward Narration <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="remark"
                    type="text"
                    value={form.remark}
                    onChange={(e) => setForm({ ...form, remark: e.target.value })}
                    placeholder="Enter short notes, tray code or supplier reference..."
                    className="w-full h-10 px-3.5 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-800"
                  />
                </div>

                <div className="pt-1">
                  <label className="inline-flex items-start gap-3 cursor-pointer select-none p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors max-w-lg">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="w-4 h-4 mt-0.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer shrink-0"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Active Stock Item</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Active items are immediately available in stock registers, barcode scanning, and billing
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
                    {editingId ? 'Update Stock' : 'Save Opening Stock'}
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="flex-1 overflow-hidden min-h-0 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col">
            <div className="w-full h-full overflow-auto">
              <table className="w-full text-xs text-left border-collapse print:text-[10px]">
                <thead className="sticky top-0 z-10 bg-slate-200 text-slate-800 border-b border-slate-300 font-bold uppercase tracking-wider select-none print:static">
                  <tr className="border-l-4 border-l-slate-200">
                    <th className="py-3 px-3 w-14 text-center text-[10px] font-bold text-slate-700">Sr</th>
                    <th className="py-3 px-3 min-w-[90px]">Date</th>
                    <th className="py-3 px-4 min-w-[170px]">Item Name</th>
                    <th className="py-3 px-3 min-w-[90px]">Metal</th>
                    <th className="py-3 px-3 min-w-[110px]">Stamp / Karat</th>
                    <th className="py-3 px-3 min-w-[110px]">Design</th>
                    <th className="py-3 px-3 text-center min-w-[90px]">HUID / Tray</th>
                    <th className="py-3 px-3 text-center w-14">Pcs</th>
                    <th className="py-3 px-3 text-right min-w-[90px]">Gross Wt</th>
                    <th className="py-3 px-3 text-right min-w-[80px]">Less Wt</th>
                    <th className="py-3 px-3 text-right min-w-[90px]">Net Wt</th>
                    <th className="py-3 px-3 text-right min-w-[80px]">Tanch %</th>
                    <th className="py-3 px-3 text-right min-w-[80px]">Fine (Pure)</th>
                    <th className="py-3 px-3 text-right min-w-[90px]">Labour (₹)</th>
                    <th className="py-3 px-3 text-center w-24">Status</th>
                    <th className="py-3 px-3 text-center w-24 no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={16} className="py-20 text-center text-slate-500">
                        <div className="inline-flex flex-col items-center gap-3">
                          <span className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                          <span className="font-medium text-sm">Loading opening stock...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="py-20 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <FiLayers size={36} className="text-slate-300" />
                          {searchText ? (
                            <p className="text-sm">
                              No opening stock matching <span className="font-semibold text-slate-700">"{searchText}"</span>
                            </p>
                          ) : (
                            <p className="text-sm">
                              No opening stock entries found. Click <span className="font-semibold text-amber-600">"Add Opening Stock"</span> to inward inventory.
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record, index) => {
                      const isSelected = selectedId === record.id
                      return (
                        <tr
                          key={record.id}
                          onClick={() => setSelectedId(record.id)}
                          onDoubleClick={() => openEditForm(record)}
                          className={`border-l-4 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-amber-50/70 border-l-amber-500'
                              : 'border-l-transparent hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {index + 1}
                          </td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            {record.stockDate || '-'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {record.itemName}
                          </td>
                          <td className="py-3 px-3">
                            {renderMetalBadge(record.metalType)}
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            {record.stampName || '-'}
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            {record.designName || '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {record.huid ? (
                              <span className="font-mono font-bold text-[11px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                                {record.huid}
                              </span>
                            ) : record.location ? (
                              <span className="text-[11px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                {record.location}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                            {record.pcs}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-700">
                            {record.grossWeight.toFixed(3)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">
                            {record.lessWeight ? record.lessWeight.toFixed(3) : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {record.netWeight.toFixed(3)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {record.tanch ? `${record.tanch.toFixed(2)}%` : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-amber-900 bg-amber-50/40">
                            {record.fine.toFixed(3)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-800">
                            {record.majuri ? `₹${record.majuri.toFixed(2)}` : '₹0.00'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {record.active ? (
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
                                  openEditForm(record)
                                }}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                                title="Edit Opening Stock"
                              >
                                <FiEdit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  requestDelete(record)
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Delete Entry"
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

            {/* Helper bottom summary bar */}
            <div className="flex items-center justify-between gap-4 text-[11px] text-slate-600 select-none shrink-0 no-print font-medium bg-slate-50 p-2.5 rounded-b-xl border-t border-slate-200 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>Double-click row to edit · Shortcuts: Ctrl+N (New), Ctrl+S (Save), Esc (Cancel)</span>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <span>
                  Total Pcs: <strong className="text-slate-900 font-bold">{summaryTotals.totalPcs}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Net Wt: <strong className="text-slate-900 font-bold">{summaryTotals.totalNetWeight.toFixed(3)}g</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300 font-bold">
                  Gold Fine: {summaryTotals.goldFine.toFixed(3)}g
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded border border-slate-300 font-bold">
                  Silver Fine: {summaryTotals.silverFine.toFixed(3)}g
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Opening Stock Entry?"
        description={
          deleteTarget
            ? `Are you sure you want to delete opening stock for "${deleteTarget.itemName}" (${deleteTarget.netWeight.toFixed(3)}g)? This will revert the stock balance in inventory.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />

      {/* Print Preview Modal */}
      {printRecords && (
        <ItemOpeningStockPrintPreview
          records={printRecords}
          onClose={() => setPrintRecords(null)}
          autoPrintOnOpen={false}
        />
      )}
    </div>
  )
}

export default ItemOpeningStockScreen
