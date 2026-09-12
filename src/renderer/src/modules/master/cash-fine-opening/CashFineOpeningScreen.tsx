import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiRotateCcw,
  FiPlus,
  FiCheck,
  FiDownload,
  FiTrash2,
  FiEdit2,
  FiX,
  FiSave,
  FiDollarSign,
  FiLayers,
  FiTrendingUp,
  FiTrendingDown,
  FiCreditCard
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { ConfirmDialog } from '../../../components/ui'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'
type MetalType = 'Gold' | 'Silver' | 'Platinum' | 'Diamond'

interface LineForm {
  metalType: MetalType
  entryType: string
  details: string
  location: string
  weight: string
  tanch: string
  rate: string
  amount: string
  ptStatus: string
}

interface OpeningLine {
  id?: string
  lineNo: number
  metalType: MetalType
  entryType: string
  details: string
  location: string
  weight: number
  tanch: number
  fine: number
  rate: number
  amount: number
  ptStatus: string
}

const initialLineForm: LineForm = {
  metalType: 'Gold',
  entryType: 'Bullion Bar',
  details: '',
  location: 'Main Vault',
  weight: '',
  tanch: '99.90',
  rate: '',
  amount: '',
  ptStatus: ''
}

const initialSummaryForm = {
  goldPurchaseFine: '',
  goldPurchaseAmount: '',
  goldSaleFine: '',
  goldSaleAmount: '',
  silverPurchaseFine: '',
  silverPurchaseAmount: '',
  silverSaleFine: '',
  silverSaleAmount: '',
  platinumPurchaseFine: '',
  platinumPurchaseAmount: '',
  platinumSaleFine: '',
  platinumSaleAmount: '',
  openingCash: '',
  openingBankBalance: '',
  openingPettyCash: ''
}

function toNumber(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function isValidAmountInput(value: string): boolean {
  return /^-?\d*\.?\d*$/.test(value)
}

function roundNumber(value: number, decimals = 3): number {
  const factor = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function calculateFine(weight: number, tanch: number): number {
  return roundNumber((weight * tanch) / 100, 3)
}

function formatWeight(value: number): string {
  return Number(value || 0).toFixed(3)
}

function formatCurrency(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  })
}

function numberToInput(value: number | undefined): string {
  return !value || Number(value) === 0 ? '' : String(value)
}

const METAL_PRESETS: {
  metal: MetalType
  label: string
  activeClass: string
  defaultTanch: string
}[] = [
  {
    metal: 'Gold',
    label: 'Gold (Au)',
    activeClass: 'bg-amber-500 !text-white border-amber-500 shadow-xs font-bold',
    defaultTanch: '99.90'
  },
  {
    metal: 'Silver',
    label: 'Silver (Ag)',
    activeClass: 'bg-slate-700 !text-white border-slate-700 shadow-xs font-bold',
    defaultTanch: '99.90'
  },
  {
    metal: 'Platinum',
    label: 'Platinum (Pt)',
    activeClass: 'bg-cyan-700 !text-white border-cyan-700 shadow-xs font-bold',
    defaultTanch: '95.00'
  },
  {
    metal: 'Diamond',
    label: 'Diamond / Solitaire',
    activeClass: 'bg-emerald-700 !text-white border-emerald-700 shadow-xs font-bold',
    defaultTanch: '100.00'
  }
]

const PURITY_SHORTCUTS = [
  { label: '24K (99.9%)', tanch: '99.90', metal: 'Gold' },
  { label: '22K (91.66%)', tanch: '91.66', metal: 'Gold' },
  { label: '18K (75.0%)', tanch: '75.00', metal: 'Gold' },
  { label: '999 Fine', tanch: '99.90', metal: 'Silver' },
  { label: '925 Sterling', tanch: '92.50', metal: 'Silver' },
  { label: 'Pt950', tanch: '95.00', metal: 'Platinum' }
]

const ENTRY_TYPES = [
  'Bullion Bar',
  'Coin / Sovereign',
  'Raw Scrap / Melting',
  'Lagdi',
  'Unallocated Fine',
  'Opening Fine Reserve',
  'Purchase Stock',
  'Sale Lot',
  'Voucher / Other'
]

const LOCATION_OPTIONS = [
  'Main Vault',
  'Counter Safe 1',
  'Counter Safe 2',
  'Locker Room',
  'Branch Vault',
  'Showroom Display'
]

function CashFineOpeningScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [lineForm, setLineForm] = useState<LineForm>(initialLineForm)
  const [summaryForm, setSummaryForm] = useState(initialSummaryForm)
  const [lines, setLines] = useState<OpeningLine[]>([])
  const [editingLineNo, setEditingLineNo] = useState<number | null>(null)
  const [selectedLineNo, setSelectedLineNo] = useState<number | null>(null)
  const [deleteTargetLineNo, setDeleteTargetLineNo] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')
  const alertTimerRef = useRef<number | null>(null)

  // Live Fine calculation for form
  const liveFine = useMemo(() => {
    return calculateFine(toNumber(lineForm.weight), toNumber(lineForm.tanch))
  }, [lineForm.weight, lineForm.tanch])

  // Live Valuation Amount for form
  const liveAmount = useMemo(() => {
    if (lineForm.amount && toNumber(lineForm.amount) > 0) {
      return toNumber(lineForm.amount)
    }
    const rate = toNumber(lineForm.rate)
    if (rate > 0) {
      return roundNumber(liveFine * rate, 2)
    }
    return 0
  }, [lineForm.amount, lineForm.rate, liveFine])

  // Live Aggregate KPIs
  const totals = useMemo(() => {
    let goldWeight = 0
    let goldFine = 0
    let silverWeight = 0
    let silverFine = 0
    let platinumWeight = 0
    let platinumFine = 0
    let diamondWeight = 0
    let totalBullionValuation = 0

    lines.forEach((line) => {
      const w = Number(line.weight || 0)
      const f = Number(line.fine || 0)
      const val = Number(line.amount || 0) || (line.rate ? roundNumber(f * line.rate, 2) : 0)

      totalBullionValuation += val

      if (line.metalType === 'Gold') {
        goldWeight += w
        goldFine += f
      } else if (line.metalType === 'Silver') {
        silverWeight += w
        silverFine += f
      } else if (line.metalType === 'Platinum') {
        platinumWeight += w
        platinumFine += f
      } else if (line.metalType === 'Diamond') {
        diamondWeight += w
      }
    })

    const openingCash = toNumber(summaryForm.openingCash)
    const openingBank = toNumber(summaryForm.openingBankBalance)
    const openingPetty = toNumber(summaryForm.openingPettyCash)
    const totalCashAndBank = openingCash + openingBank + openingPetty

    return {
      goldWeight: roundNumber(goldWeight, 3),
      goldFine: roundNumber(goldFine, 3),
      silverWeight: roundNumber(silverWeight, 3),
      silverFine: roundNumber(silverFine, 3),
      platinumWeight: roundNumber(platinumWeight, 3),
      platinumFine: roundNumber(platinumFine, 3),
      diamondWeight: roundNumber(diamondWeight, 3),
      totalBullionValuation: roundNumber(totalBullionValuation, 2),
      totalCashAndBank: roundNumber(totalCashAndBank, 2)
    }
  }, [lines, summaryForm.openingCash, summaryForm.openingBankBalance, summaryForm.openingPettyCash])

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 3500)
  }, [])

  const updateLineForm = (field: keyof LineForm, value: string): void => {
    setLineForm((current) => ({
      ...current,
      [field]: value
    }))
  }

  const handleMetalSelect = (metal: MetalType): void => {
    const preset = METAL_PRESETS.find((p) => p.metal === metal)
    setLineForm((current) => ({
      ...current,
      metalType: metal,
      tanch: preset ? preset.defaultTanch : current.tanch
    }))
  }

  const updateSummary = (field: keyof typeof initialSummaryForm, value: string): void => {
    if (!isValidAmountInput(value)) return
    setSummaryForm((current) => ({
      ...current,
      [field]: value
    }))
  }

  const loadOpening = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.cashFineOpening.get()

      setLines(
        (data.lines || []).map((line) => ({
          id: line.id,
          lineNo: line.lineNo,
          metalType: (line.metalType as MetalType) || 'Gold',
          entryType: line.entryType || '',
          details: line.details || '',
          location: line.location || 'Main Vault',
          weight: Number(line.weight || 0),
          tanch: Number(line.tanch || 0),
          fine: Number(line.fine || 0),
          rate: Number(line.rate || 0),
          amount: Number(line.amount || 0),
          ptStatus: line.ptStatus || ''
        }))
      )

      setSummaryForm({
        goldPurchaseFine: numberToInput(data.summary?.goldPurchaseFine),
        goldPurchaseAmount: numberToInput(data.summary?.goldPurchaseAmount),
        goldSaleFine: numberToInput(data.summary?.goldSaleFine),
        goldSaleAmount: numberToInput(data.summary?.goldSaleAmount),
        silverPurchaseFine: numberToInput(data.summary?.silverPurchaseFine),
        silverPurchaseAmount: numberToInput(data.summary?.silverPurchaseAmount),
        silverSaleFine: numberToInput(data.summary?.silverSaleFine),
        silverSaleAmount: numberToInput(data.summary?.silverSaleAmount),
        platinumPurchaseFine: numberToInput(data.summary?.platinumPurchaseFine),
        platinumPurchaseAmount: numberToInput(data.summary?.platinumPurchaseAmount),
        platinumSaleFine: numberToInput(data.summary?.platinumSaleFine),
        platinumSaleAmount: numberToInput(data.summary?.platinumSaleAmount),
        openingCash: numberToInput(data.summary?.openingCash),
        openingBankBalance: numberToInput(data.summary?.openingBankBalance),
        openingPettyCash: numberToInput(data.summary?.openingPettyCash)
      })

      setSelectedLineNo(null)
      setEditingLineNo(null)
      setLineForm(initialLineForm)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const handleSaveLine = (): void => {
    if (toNumber(lineForm.weight) <= 0) {
      showAlert('warning', 'Please enter a valid weight.')
      return
    }

    if (toNumber(lineForm.tanch) <= 0) {
      showAlert('warning', 'Please enter a valid purity (tanch).')
      return
    }

    const calculatedFine = calculateFine(toNumber(lineForm.weight), toNumber(lineForm.tanch))
    const rateVal = toNumber(lineForm.rate)
    let amountVal = toNumber(lineForm.amount)
    if (amountVal <= 0 && rateVal > 0) {
      amountVal = roundNumber(calculatedFine * rateVal, 2)
    }

    if (editingLineNo !== null) {
      setLines((current) =>
        current.map((line) =>
          line.lineNo === editingLineNo
            ? {
                ...line,
                metalType: lineForm.metalType,
                entryType: lineForm.entryType,
                details: lineForm.details.trim(),
                location: lineForm.location.trim() || 'Main Vault',
                weight: toNumber(lineForm.weight),
                tanch: toNumber(lineForm.tanch),
                fine: calculatedFine,
                rate: rateVal,
                amount: amountVal,
                ptStatus: lineForm.ptStatus
              }
            : line
        )
      )
      showAlert('success', `Bullion Line #${editingLineNo} updated.`)
      setEditingLineNo(null)
    } else {
      const newLine: OpeningLine = {
        lineNo: lines.length + 1,
        metalType: lineForm.metalType,
        entryType: lineForm.entryType,
        details: lineForm.details.trim(),
        location: lineForm.location.trim() || 'Main Vault',
        weight: toNumber(lineForm.weight),
        tanch: toNumber(lineForm.tanch),
        fine: calculatedFine,
        rate: rateVal,
        amount: amountVal,
        ptStatus: lineForm.ptStatus
      }
      setLines((current) => [...current, newLine])
      showAlert('success', 'Bullion lot added.')
    }

    setLineForm((current) => ({
      ...initialLineForm,
      metalType: current.metalType,
      location: current.location
    }))
  }

  const startEditLine = (line: OpeningLine): void => {
    setEditingLineNo(line.lineNo)
    setSelectedLineNo(line.lineNo)
    setLineForm({
      metalType: line.metalType,
      entryType: line.entryType || 'Bullion Bar',
      details: line.details || '',
      location: line.location || 'Main Vault',
      weight: String(line.weight || ''),
      tanch: String(line.tanch || ''),
      rate: line.rate ? String(line.rate) : '',
      amount: line.amount ? String(line.amount) : '',
      ptStatus: line.ptStatus || ''
    })
  }

  const cancelEditLine = (): void => {
    setEditingLineNo(null)
    setLineForm(initialLineForm)
  }

  const confirmDeleteLine = (lineNo: number): void => {
    setDeleteTargetLineNo(lineNo)
  }

  const handleDeleteConfirmed = (): void => {
    if (deleteTargetLineNo === null) return
    setLines((current) =>
      current
        .filter((l) => l.lineNo !== deleteTargetLineNo)
        .map((l, index) => ({ ...l, lineNo: index + 1 }))
    )
    if (editingLineNo === deleteTargetLineNo) {
      cancelEditLine()
    }
    if (selectedLineNo === deleteTargetLineNo) {
      setSelectedLineNo(null)
    }
    setDeleteTargetLineNo(null)
    showAlert('success', 'Line removed.')
  }

  const handleSaveAll = async (): Promise<void> => {
    try {
      setSaving(true)

      await window.api.cashFineOpening.save({
        lines: lines.map((line) => ({
          metalType: line.metalType,
          entryType: line.entryType,
          details: line.details,
          location: line.location,
          weight: line.weight,
          tanch: line.tanch,
          rate: line.rate,
          amount: line.amount,
          ptStatus: line.ptStatus
        })),
        summary: {
          goldPurchaseFine: toNumber(summaryForm.goldPurchaseFine),
          goldPurchaseAmount: toNumber(summaryForm.goldPurchaseAmount),
          goldSaleFine: toNumber(summaryForm.goldSaleFine),
          goldSaleAmount: toNumber(summaryForm.goldSaleAmount),
          silverPurchaseFine: toNumber(summaryForm.silverPurchaseFine),
          silverPurchaseAmount: toNumber(summaryForm.silverPurchaseAmount),
          silverSaleFine: toNumber(summaryForm.silverSaleFine),
          silverSaleAmount: toNumber(summaryForm.silverSaleAmount),
          platinumPurchaseFine: toNumber(summaryForm.platinumPurchaseFine),
          platinumPurchaseAmount: toNumber(summaryForm.platinumPurchaseAmount),
          platinumSaleFine: toNumber(summaryForm.platinumSaleFine),
          platinumSaleAmount: toNumber(summaryForm.platinumSaleAmount),
          openingCash: toNumber(summaryForm.openingCash),
          openingBankBalance: toNumber(summaryForm.openingBankBalance),
          openingPettyCash: toNumber(summaryForm.openingPettyCash)
        }
      })

      showAlert('success', 'Cash Fine Opening master balances saved successfully!')
      await loadOpening()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleExportCsv = (): void => {
    if (lines.length === 0) {
      showAlert('warning', 'No bullion lines to export.')
      return
    }

    const headers = [
      'Line No',
      'Metal',
      'Category',
      'Details / Remark',
      'Vault Location',
      'Gross Wt (g/cts)',
      'Tanch (%)',
      'Fine Wt (g)',
      'Rate (₹)',
      'Valuation (₹)',
      'PT Status'
    ]

    const rows = lines.map((l) => [
      l.lineNo,
      `"${l.metalType}"`,
      `"${l.entryType || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${(l.location || '').replace(/"/g, '""')}"`,
      l.weight,
      l.tanch,
      l.fine,
      l.rate || 0,
      l.amount || (l.rate ? roundNumber(l.fine * l.rate, 2) : 0),
      `"${l.ptStatus || ''}"`
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cash_fine_opening_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showAlert('success', `Exported ${lines.length} bullion lines to CSV.`)
  }

  useEffect(() => {
    void loadOpening()
    return () => {
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadOpening])

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-background-app,#f8fafc)] overflow-hidden select-none">
      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteTargetLineNo !== null}
        title="Remove Bullion Line"
        message={`Are you sure you want to remove line #${deleteTargetLineNo}? This cannot be undone.`}
        confirmLabel="Remove Line"
        cancelLabel="Keep Line"
        variant="danger"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetLineNo(null)}
      />

      {/* Main Top Header Bar */}
      <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs shrink-0">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FiLayers className="text-amber-600" size={18} />
            Cash & Fine Metal Opening Master
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Initialize firm-level liquid cash, bank balances, and raw bullion reserves for Fine & Dar Rojmel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadOpening()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Reload Master Data"
          >
            <FiRotateCcw size={13} className={loading ? 'animate-spin text-slate-500' : 'text-slate-500'} />
            <span>Reload</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Export Bullion Lines to CSV"
          >
            <FiDownload size={13} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
            title="Close Window"
          >
            <FiX size={16} />
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {alertMessage && (
        <div className="px-6 pt-3 shrink-0">
          <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="px-6 pt-3 pb-1 grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Cash & Bank</div>
            <div className="text-base font-extrabold text-emerald-700">₹ {formatCurrency(totals.totalCashAndBank)}</div>
          </div>
          <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <FiDollarSign size={18} />
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Gold Fine Reserve</div>
            <div className="text-base font-extrabold text-amber-700">{formatWeight(totals.goldFine)} <span className="text-xs font-semibold">g</span></div>
            <div className="text-[10px] text-slate-400 font-medium">Gross: {formatWeight(totals.goldWeight)}g</div>
          </div>
          <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            Au
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Silver Fine Reserve</div>
            <div className="text-base font-extrabold text-slate-800">{formatWeight(totals.silverFine)} <span className="text-xs font-semibold">g</span></div>
            <div className="text-[10px] text-slate-400 font-medium">Gross: {formatWeight(totals.silverWeight)}g</div>
          </div>
          <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            Ag
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-cyan-600 uppercase tracking-wider">Platinum Reserve</div>
            <div className="text-base font-extrabold text-cyan-800">{formatWeight(totals.platinumFine)} <span className="text-xs font-semibold">g</span></div>
            <div className="text-[10px] text-slate-400 font-medium">Gross: {formatWeight(totals.platinumWeight)}g</div>
          </div>
          <div className="h-9 w-9 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
            Pt
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">Bullion Valuation</div>
            <div className="text-base font-extrabold text-indigo-900">₹ {formatCurrency(totals.totalBullionValuation)}</div>
            <div className="text-[10px] text-slate-400 font-medium">{lines.length} Bullion Lots</div>
          </div>
          <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FiCreditCard size={18} />
          </div>
        </div>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3">
        {/* Bullion Lot Entry Form Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {editingLineNo !== null ? `Edit Bullion Lot #${editingLineNo}` : 'Add Bullion Opening Lot'}
              </span>
              {editingLineNo !== null && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Editing Mode
                </span>
              )}
            </div>

            {/* Metal Quick Selectors */}
            <div className="flex items-center gap-1.5">
              {METAL_PRESETS.map((p) => (
                <button
                  key={p.metal}
                  type="button"
                  onClick={() => handleMetalSelect(p.metal)}
                  className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer border ${
                    lineForm.metalType === p.metal
                      ? p.activeClass
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-8 gap-3 items-end">
            {/* Entry Type */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 uppercase">Category / Type</label>
              <select
                value={lineForm.entryType}
                onChange={(e) => updateLineForm('entryType', e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-amber-500 font-medium text-slate-800"
              >
                {ENTRY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Vault / Location */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 uppercase">Vault / Safe</label>
              <select
                value={lineForm.location}
                onChange={(e) => updateLineForm('location', e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-amber-500 font-medium text-slate-800"
              >
                {LOCATION_OPTIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Details / Lot Remarks */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold text-slate-600 uppercase">Details / Lot Mark</label>
              <input
                type="text"
                value={lineForm.details}
                onChange={(e) => updateLineForm('details', e.target.value)}
                placeholder="e.g. MMTC 999 Bar #4810, Scrap Melter 2"
                className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-amber-500 text-slate-800"
              />
            </div>

            {/* Gross Weight */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase">Gross Wt (g)</label>
              <input
                type="text"
                value={lineForm.weight}
                onChange={(e) => isValidAmountInput(e.target.value) && updateLineForm('weight', e.target.value)}
                placeholder="0.000"
                className="w-full h-8 px-2.5 text-xs bg-amber-50/50 border border-amber-300 rounded-md font-bold text-slate-900 focus:bg-white focus:border-amber-500"
              />
            </div>

            {/* Tanch (%) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 uppercase">Purity / Tanch (%)</label>
              <input
                type="text"
                value={lineForm.tanch}
                onChange={(e) => isValidAmountInput(e.target.value) && updateLineForm('tanch', e.target.value)}
                placeholder="99.90"
                className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md font-semibold focus:bg-white focus:border-amber-500 text-slate-800"
              />
            </div>

            {/* Live Fine Wt (Readonly) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-amber-700 uppercase">Fine Wt (g)</label>
              <input
                type="text"
                value={formatWeight(liveFine)}
                readOnly
                className="w-full h-8 px-2.5 text-xs bg-amber-100/60 border border-amber-300 rounded-md font-extrabold text-amber-900 select-all"
              />
            </div>

            {/* Rate & Actions */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 uppercase">Rate ₹/g</label>
              <input
                type="text"
                value={lineForm.rate}
                onChange={(e) => isValidAmountInput(e.target.value) && updateLineForm('rate', e.target.value)}
                placeholder="Optional"
                className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-amber-500 text-slate-800"
              />
            </div>
          </div>

          {/* Sub Row: Purity Shortcuts & Action Buttons */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Touch:</span>
              {PURITY_SHORTCUTS.filter((s) => s.metal === lineForm.metalType || lineForm.metalType === 'Gold').map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => updateLineForm('tanch', s.tanch)}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800 transition-colors border border-slate-200 cursor-pointer"
                >
                  {s.label}
                </button>
              ))}

              <div className="w-px h-4 bg-slate-200 mx-1" />

              <span className="text-xs font-medium text-slate-500">
                Calculated Valuation: <strong className="text-slate-800 font-bold">₹ {formatCurrency(liveAmount)}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {editingLineNo !== null && (
                <button
                  type="button"
                  onClick={cancelEditLine}
                  className="h-8 px-3 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveLine}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-xs font-bold !text-white shadow-sm transition-all focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                style={{ color: '#ffffff' }}
              >
                {editingLineNo !== null ? <FiCheck size={14} /> : <FiPlus size={14} />}
                <span className="!text-white" style={{ color: '#ffffff' }}>
                  {editingLineNo !== null ? 'Update Bullion Lot' : 'Add Bullion Lot'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Bullion Holdings Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Bullion Holdings Register</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                {lines.length} {lines.length === 1 ? 'Lot' : 'Lots'}
              </span>
            </div>

            {selectedLineNo && (
              <span className="text-xs text-amber-700 font-semibold">
                Selected Line #{selectedLineNo}
              </span>
            )}
          </div>

          <div className="overflow-x-auto max-h-[260px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/75 sticky top-0 z-10 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3">Metal</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Details / Lot</th>
                  <th className="py-2.5 px-3">Vault Location</th>
                  <th className="py-2.5 px-3 text-right">Gross Wt</th>
                  <th className="py-2.5 px-3 text-right">Tanch %</th>
                  <th className="py-2.5 px-3 text-right text-amber-800">Fine Wt (g)</th>
                  <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right text-emerald-800">Valuation (₹)</th>
                  <th className="py-2.5 px-3 text-center">Pt St</th>
                  <th className="py-2.5 px-3 text-center w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400 font-medium">
                      Loading bullion opening lines...
                    </td>
                  </tr>
                ) : lines.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400 font-medium">
                      No bullion opening lots recorded yet. Use the form above to add raw gold, silver, or platinum reserves.
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => {
                    const isSelected = selectedLineNo === line.lineNo
                    const isEditing = editingLineNo === line.lineNo
                    const valAmount = line.amount || (line.rate ? roundNumber(line.fine * line.rate, 2) : 0)

                    return (
                      <tr
                        key={line.lineNo}
                        onClick={() => setSelectedLineNo(line.lineNo)}
                        className={`transition-colors cursor-pointer ${
                          isEditing
                            ? 'bg-amber-50/80 font-medium'
                            : isSelected
                              ? 'bg-amber-50/40'
                              : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2 px-3 text-center font-bold text-slate-400">{line.lineNo}</td>
                        <td className="py-2 px-3 font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              line.metalType === 'Gold'
                                ? 'bg-amber-100 text-amber-800 font-bold'
                                : line.metalType === 'Silver'
                                  ? 'bg-slate-200 text-slate-800 font-bold'
                                  : line.metalType === 'Platinum'
                                    ? 'bg-cyan-100 text-cyan-800 font-bold'
                                    : 'bg-emerald-100 text-emerald-800 font-bold'
                            }`}
                          >
                            {line.metalType}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-700">{line.entryType || '-'}</td>
                        <td className="py-2 px-3 text-slate-600">{line.details || '-'}</td>
                        <td className="py-2 px-3 text-slate-500 font-medium">{line.location || 'Main Vault'}</td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-800">{formatWeight(line.weight)}</td>
                        <td className="py-2 px-3 text-right font-medium text-slate-600">{line.tanch.toFixed(2)}%</td>
                        <td className="py-2 px-3 text-right font-bold text-amber-700">{formatWeight(line.fine)}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{line.rate ? `₹${line.rate.toLocaleString('en-IN')}` : '-'}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">{valAmount > 0 ? `₹${formatCurrency(valAmount)}` : '-'}</td>
                        <td className="py-2 px-3 text-center">
                          {line.ptStatus ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                              {line.ptStatus}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditLine(line)
                              }}
                              className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-amber-50 cursor-pointer transition-colors"
                              title="Edit Line"
                            >
                              <FiEdit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                confirmDeleteLine(line.lineNo)
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                              title="Delete Line"
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
        </div>

        {/* 3 Bottom Financial Cards: Cash & Bank, Gold Baseline, Silver & Platinum Baseline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Opening Liquidity / Cash & Bank Balances */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <FiDollarSign className="text-emerald-600" />
                  Opening Cash & Bank Reserves
                </span>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  Cash Book Baseline
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase flex justify-between">
                    <span>Cash In Hand (₹)</span>
                    <span className="text-[10px] font-normal text-slate-400 lowercase">physical drawer cash</span>
                  </label>
                  <input
                    type="text"
                    value={summaryForm.openingCash}
                    onChange={(e) => updateSummary('openingCash', e.target.value)}
                    placeholder="0.00"
                    className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 focus:bg-white focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase flex justify-between">
                    <span>Bank Opening Balance (₹)</span>
                    <span className="text-[10px] font-normal text-slate-400 lowercase">main current a/c</span>
                  </label>
                  <input
                    type="text"
                    value={summaryForm.openingBankBalance}
                    onChange={(e) => updateSummary('openingBankBalance', e.target.value)}
                    placeholder="0.00"
                    className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 focus:bg-white focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase flex justify-between">
                    <span>Petty Cash / Drawer (₹)</span>
                    <span className="text-[10px] font-normal text-slate-400 lowercase">daily counter drawer</span>
                  </label>
                  <input
                    type="text"
                    value={summaryForm.openingPettyCash}
                    onChange={(e) => updateSummary('openingPettyCash', e.target.value)}
                    placeholder="0.00"
                    className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 focus:bg-white focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500">Total Liquid Cash:</span>
              <strong className="text-emerald-700 font-extrabold text-sm">₹ {formatCurrency(totals.totalCashAndBank)}</strong>
            </div>
          </div>

          {/* Card 2: Gold Historical Baseline Turnovers */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <FiTrendingUp className="text-amber-600" />
                  Gold Historical Turnover Baseline
                </span>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  Rojmel Opening
                </span>
              </div>

              <div className="space-y-2.5">
                {/* Gold Purchase */}
                <div className="p-2.5 rounded-lg bg-amber-50/40 border border-amber-200/60 space-y-1.5">
                  <div className="text-[11px] font-bold text-amber-900 uppercase">Prior Gold Purchases</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Fine Wt (g)</label>
                      <input
                        type="text"
                        value={summaryForm.goldPurchaseFine}
                        onChange={(e) => updateSummary('goldPurchaseFine', e.target.value)}
                        placeholder="0.000"
                        className="w-full h-7 px-2 text-xs bg-white border border-amber-300 rounded font-medium focus:border-amber-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Amount (₹)</label>
                      <input
                        type="text"
                        value={summaryForm.goldPurchaseAmount}
                        onChange={(e) => updateSummary('goldPurchaseAmount', e.target.value)}
                        placeholder="0.00"
                        className="w-full h-7 px-2 text-xs bg-white border border-amber-300 rounded font-medium focus:border-amber-500 text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Gold Sale */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-800 uppercase">Prior Gold Sales</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Fine Wt (g)</label>
                      <input
                        type="text"
                        value={summaryForm.goldSaleFine}
                        onChange={(e) => updateSummary('goldSaleFine', e.target.value)}
                        placeholder="0.000"
                        className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded font-medium focus:border-amber-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Amount (₹)</label>
                      <input
                        type="text"
                        value={summaryForm.goldSaleAmount}
                        onChange={(e) => updateSummary('goldSaleAmount', e.target.value)}
                        placeholder="0.00"
                        className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded font-medium focus:border-amber-500 text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2 text-[10px] text-slate-400 italic">
              Populates cumulative turnover baselines for Dar Rojmel and GST transitions.
            </div>
          </div>

          {/* Card 3: Silver & Platinum Historical Baseline Turnovers */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <FiTrendingDown className="text-slate-600" />
                  Silver & Platinum Turnovers
                </span>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  Baseline Records
                </span>
              </div>

              <div className="space-y-2.5">
                {/* Silver Purchases / Sales */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-800 uppercase">Silver Baseline Turnover</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Purchase Fine (g)</label>
                      <input
                        type="text"
                        value={summaryForm.silverPurchaseFine}
                        onChange={(e) => updateSummary('silverPurchaseFine', e.target.value)}
                        placeholder="0.000"
                        className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded font-medium focus:border-amber-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Sale Fine (g)</label>
                      <input
                        type="text"
                        value={summaryForm.silverSaleFine}
                        onChange={(e) => updateSummary('silverSaleFine', e.target.value)}
                        placeholder="0.000"
                        className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded font-medium focus:border-amber-500 text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Platinum Purchases / Sales */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-800 uppercase">Platinum Baseline Turnover</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Purchase Fine (g)</label>
                      <input
                        type="text"
                        value={summaryForm.platinumPurchaseFine}
                        onChange={(e) => updateSummary('platinumPurchaseFine', e.target.value)}
                        placeholder="0.000"
                        className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded font-medium focus:border-amber-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">Sale Fine (g)</label>
                      <input
                        type="text"
                        value={summaryForm.platinumSaleFine}
                        onChange={(e) => updateSummary('platinumSaleFine', e.target.value)}
                        placeholder="0.000"
                        className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded font-medium focus:border-amber-500 text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2 text-[10px] text-slate-400 italic">
              Values integrate with multi-metal financial ledgers seamlessly.
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Toolbar */}
      <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between shadow-lg shrink-0">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
          <span>Opening Cash & Fine balances automatically update the master day-book and ledger journals.</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadOpening()}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <FiRotateCcw size={14} className={loading ? 'animate-spin text-slate-500' : 'text-slate-500'} />
            <span>Reload</span>
          </button>

          <button
            type="button"
            onClick={() => void handleSaveAll()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 h-9 px-6 rounded-md bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-xs font-bold !text-white shadow-sm transition-all focus:ring-2 focus:ring-amber-500/20 cursor-pointer disabled:opacity-50"
            style={{ color: '#ffffff' }}
          >
            <FiSave size={15} />
            <span className="!text-white font-bold" style={{ color: '#ffffff' }}>
              {saving ? 'Saving...' : 'Save Opening Balances'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default CashFineOpeningScreen
