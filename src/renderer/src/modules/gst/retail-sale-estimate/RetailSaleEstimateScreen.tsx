import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  FiFileText,
  FiSearch,
  FiX,
  FiPlus,
  FiRotateCcw,
  FiSave,
  FiFilePlus,
  FiTrash2,
  FiPrinter,
  FiEdit3,
  FiCornerDownLeft,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle
} from 'react-icons/fi'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { calculateSaleItemTotals, type LabourRateType } from '../../../utils/jewelleryFormula'
import EstimatePrintPreview from './EstimatePrintPreview'
import { formatDate, formatAmount, formatNumber, toNumber, isValidAmountInput, getTodayDate, getLabourRateType } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'
type MetalType = 'Gold' | 'Silver' | 'Diamond' | 'Other'

type Account = {
  id: string
  accountName: string
  mobileNumber: string
  state: string
  active: boolean
}

type Item = {
  id: string
  itemName: string
  metalType: string
  defaultStampId: string
  stampName: string
  defaultDesignId: string
  designName: string
  fixedWeightPerPcs: number
  defaultTanch: number
  defaultWastage: number
  defaultLabourRate: number
  labourRateType: string
  gstHsnCode: string
  active: boolean
}

type EstimateItemLine = {
  id: string
  itemId: string
  itemName: string
  stampId: string
  stampName: string
  designId: string
  designName: string
  barcode: string
  remark: string
  pcs: number
  grossWeight: number
  packWeight: number
  lessWeight: number
  addWeight: number
  netWeight: number
  tunch: number
  wastage: number
  hishob: number
  labourRate: number
  labourRateType: LabourRateType
  fine: number
  majuri: number
  hsnCode: string
  gstRate: number
  taxableAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
}

const initialHeader = {
  estimateNo: '',
  estimateDate: getTodayDate(),
  accountId: '',
  phone: '',
  metalType: 'Silver' as MetalType,
  narration: '',
  validUntil: ''
}

const initialItemForm = {
  itemId: '',
  stampId: '',
  stampName: '',
  designId: '',
  designName: '',
  barcode: '',
  remark: '',
  pcs: '',
  grossWeight: '',
  packWeight: '',
  addWeight: '',
  tunch: '',
  wastage: '',
  labourRate: '',
  labourRateType: 'Kg' as LabourRateType,
  hsnCode: '',
  gstRate: '3',
  taxableAmount: ''
}








function roundMoney(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100
}

function getStatusLabel(status: EstimateStatus): string {
  if (status === 'OPEN') return 'Open'
  if (status === 'CONVERTED') return 'Converted'
  return 'Cancelled'
}

function isInterState(firmState: string, accountState: string): boolean {
  const cleanFirmState = firmState.trim().toLowerCase()
  const cleanAccountState = accountState.trim().toLowerCase()
  if (!cleanFirmState || !cleanAccountState) return false
  return cleanFirmState !== cleanAccountState
}

function computeGstSplit(
  taxableAmount: number,
  gstRate: number,
  interState: boolean
): { cgst: number; sgst: number; igst: number } {
  const totalTax = roundMoney((taxableAmount * gstRate) / 100)
  if (interState) {
    return { cgst: 0, sgst: 0, igst: totalTax }
  }
  const half = roundMoney(totalTax / 2)
  return { cgst: half, sgst: roundMoney(totalTax - half), igst: 0 }
}

function RetailSaleEstimateScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [header, setHeader] = useState(initialHeader)
  const [itemForm, setItemForm] = useState(initialItemForm)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [itemLines, setItemLines] = useState<EstimateItemLine[]>([])
  const [estimates, setEstimates] = useState<EstimateRegisterRecord[]>([])
  const [firmState, setFirmState] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [itemDeleteTarget, setItemDeleteTarget] = useState<EstimateItemLine | null>(null)
  const [estimateDeleteTarget, setEstimateDeleteTarget] = useState<EstimateRegisterRecord | null>(
    null
  )
  const [convertTarget, setConvertTarget] = useState<EstimateRegisterRecord | null>(null)
  const [previewRecord, setPreviewRecord] = useState<SavedEstimateRecord | null>(null)

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | EstimateStatus>('ALL')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [converting, setConverting] = useState(false)
  const [opening, setOpening] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const accountSelectRef = useRef<HTMLSelectElement | null>(null)
  const itemSelectRef = useRef<HTMLSelectElement | null>(null)
  const pcsInputRef = useRef<HTMLInputElement | null>(null)
  const grossWeightInputRef = useRef<HTMLInputElement | null>(null)
  const addWeightInputRef = useRef<HTMLInputElement | null>(null)
  const wastageInputRef = useRef<HTMLInputElement | null>(null)
  const labourRateInputRef = useRef<HTMLInputElement | null>(null)
  const taxableAmountInputRef = useRef<HTMLInputElement | null>(null)

  const activeAccounts = useMemo(() => {
    return accounts.filter((account) => account.active)
  }, [accounts])

  const activeItems = useMemo(() => {
    return items.filter((item) => item.active && item.metalType === header.metalType)
  }, [items, header.metalType])

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === itemForm.itemId)
  }, [items, itemForm.itemId])

  const selectedAccount = useMemo(() => {
    return accounts.find((account) => account.id === header.accountId)
  }, [accounts, header.accountId])

  const interState = useMemo(() => {
    return isInterState(firmState, selectedAccount?.state ?? '')
  }, [firmState, selectedAccount])

  const itemPreview = useMemo(() => {
    const totals = calculateSaleItemTotals({
      pcs: toNumber(itemForm.pcs),
      grossWeight: toNumber(itemForm.grossWeight),
      addWeight: toNumber(itemForm.addWeight),
      packWeight: toNumber(itemForm.packWeight),
      tunch: toNumber(itemForm.tunch),
      wastage: toNumber(itemForm.wastage),
      labourRate: toNumber(itemForm.labourRate),
      labourRateType: itemForm.labourRateType
    })

    const gstSplit = computeGstSplit(
      toNumber(itemForm.taxableAmount),
      toNumber(itemForm.gstRate),
      interState
    )

    return { ...totals, ...gstSplit }
  }, [itemForm, interState])

  const itemFineTotal = useMemo(() => {
    return itemLines.reduce((total, line) => total + line.fine, 0)
  }, [itemLines])

  const itemMajuriTotal = useMemo(() => {
    return itemLines.reduce((total, line) => total + line.majuri, 0)
  }, [itemLines])

  const gstTotals = useMemo(() => {
    return itemLines.reduce(
      (total, line) => {
        total.taxableAmount += Number(line.taxableAmount || 0)
        total.cgstAmount += Number(line.cgstAmount || 0)
        total.sgstAmount += Number(line.sgstAmount || 0)
        total.igstAmount += Number(line.igstAmount || 0)
        return total
      },
      { taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0 }
    )
  }, [itemLines])

  const itemSummaryTotals = useMemo(() => {
    return itemLines.reduce(
      (total, line) => {
        total.pcs += Number(line.pcs || 0)
        total.grossWeight += Number(line.grossWeight || 0)
        total.netWeight += Number(line.netWeight || 0)
        return total
      },
      { pcs: 0, grossWeight: 0, netWeight: 0 }
    )
  }, [itemLines])

  const filteredEstimates = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return estimates.filter((estimate) => {
      const statusMatch = statusFilter === 'ALL' || estimate.status === statusFilter
      const keywordMatch =
        !keyword ||
        estimate.estimate_no.toLowerCase().includes(keyword) ||
        estimate.account_name.toLowerCase().includes(keyword) ||
        estimate.mobile_number.toLowerCase().includes(keyword) ||
        estimate.metal_type.toLowerCase().includes(keyword) ||
        estimate.estimate_date.toLowerCase().includes(keyword)

      return statusMatch && keywordMatch
    })
  }, [estimates, searchText, statusFilter])

  const statusCounts = useMemo(() => {
    return estimates.reduce(
      (counts, estimate) => {
        counts.all += 1
        counts.open += estimate.status === 'OPEN' ? 1 : 0
        counts.converted += estimate.status === 'CONVERTED' ? 1 : 0
        counts.cancelled += estimate.status === 'CANCELLED' ? 1 : 0
        return counts
      },
      { all: 0, open: 0, converted: 0, cancelled: 0 }
    )
  }, [estimates])

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 4000)
  }, [])

  const focusNextOnEnter = (
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    nextElement?: HTMLElement | null
  ): void => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    nextElement?.focus()
  }

  const handleItemDecimalChange = (
    value: string,
    fieldName:
      | 'pcs'
      | 'grossWeight'
      | 'packWeight'
      | 'addWeight'
      | 'tunch'
      | 'wastage'
      | 'labourRate'
      | 'gstRate'
      | 'taxableAmount'
  ): void => {
    if (!isValidAmountInput(value)) return

    setItemForm((current) => ({
      ...current,
      [fieldName]: value
    }))
  }

  const handleBarcodeKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      const code = itemForm.barcode.trim()
      if (!code) return
      try {
        const tag = await (window.api as any).barcodes?.getByCode?.(code)
        if (tag) {
          const item = items.find((i) => i.id === tag.itemId)
          setItemForm((current) => ({
            ...current,
            barcode: tag.barcode,
            itemId: tag.itemId || current.itemId,
            stampId: tag.stampId || current.stampId,
            stampName: tag.stampName || current.stampName,
            designId: tag.designId || current.designId,
            designName: tag.designName || current.designName,
            grossWeight: tag.grossWeight ? String(tag.grossWeight) : current.grossWeight,
            packWeight: tag.packWeight ? String(tag.packWeight) : current.packWeight,
            tunch: tag.purityTunch ? String(tag.purityTunch) : current.tunch,
            wastage: tag.wastagePercent ? String(tag.wastagePercent) : current.wastage,
            hsnCode: item?.gstHsnCode || tag.hsnCode || current.hsnCode,
            pcs: '1'
          }))
          showAlert('success', `Scanned barcode: ${tag.barcode}`)
        }
      } catch {
        // Non-fatal
      }
    }
  }

  const loadAccounts = useCallback(async (): Promise<void> => {
    const data = await window.api.accounts.list()
    setAccounts(data as unknown as Account[])
  }, [])

  const loadItems = useCallback(async (): Promise<void> => {
    const data = await window.api.items.list()
    setItems(data as unknown as Item[])
  }, [])

  const loadEstimates = useCallback(async (): Promise<void> => {
    const data = await window.api.estimates.list()
    setEstimates(data)
  }, [])

  const loadNextNumber = useCallback(async (): Promise<void> => {
    const nextNumber = await window.api.estimates.getNextNumber()
    setHeader((current) => ({ ...current, estimateNo: nextNumber }))
  }, [])

  const loadFirmState = useCallback(async (): Promise<void> => {
    try {
      const firm = await window.api.firm.get()
      setFirmState(firm?.state ?? '')
    } catch {
      setFirmState('')
    }
  }, [])

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await Promise.all([
        loadAccounts(),
        loadItems(),
        loadEstimates(),
        loadNextNumber(),
        loadFirmState()
      ])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadItems, loadEstimates, loadNextNumber, loadFirmState, showAlert])

  const handleAccountChange = (accountId: string): void => {
    const account = accounts.find((currentAccount) => currentAccount.id === accountId)

    setHeader((current) => ({
      ...current,
      accountId,
      phone: account?.mobileNumber ?? ''
    }))
  }

  const handleMetalChange = (metalType: MetalType): void => {
    setHeader((current) => ({ ...current, metalType }))
    setItemForm(initialItemForm)
    setItemLines([])
  }

  const handleItemChange = (itemId: string): void => {
    const item = items.find((currentItem) => currentItem.id === itemId)

    if (!item) {
      setItemForm(initialItemForm)
      return
    }

    setItemForm((current) => ({
      ...current,
      itemId: item.id,
      stampId: item.defaultStampId,
      stampName: item.stampName,
      designId: item.defaultDesignId,
      designName: item.designName,
      packWeight: item.fixedWeightPerPcs === 0 ? '' : String(item.fixedWeightPerPcs),
      tunch: item.defaultTanch === 0 ? '' : String(item.defaultTanch),
      wastage: item.defaultWastage === 0 ? '' : String(item.defaultWastage),
      labourRate: item.defaultLabourRate === 0 ? '' : String(item.defaultLabourRate),
      labourRateType: getLabourRateType(item.labourRateType),
      hsnCode: item.gstHsnCode || ''
    }))

    window.setTimeout(() => {
      pcsInputRef.current?.focus()
    }, 0)
  }

  const clearItemForm = (): void => {
    setItemForm(initialItemForm)
    window.setTimeout(() => {
      itemSelectRef.current?.focus()
    }, 0)
  }

  const handleAddItemLine = (): void => {
    if (!selectedItem) {
      showAlert('warning', 'Please select an item.')
      itemSelectRef.current?.focus()
      return
    }

    if (toNumber(itemForm.pcs) <= 0) {
      showAlert('warning', 'Please enter pieces quantity.')
      pcsInputRef.current?.focus()
      return
    }

    if (toNumber(itemForm.grossWeight) <= 0) {
      showAlert('warning', 'Please enter gross weight.')
      grossWeightInputRef.current?.focus()
      return
    }

    if (itemPreview.netWeight < 0) {
      showAlert('warning', 'Net weight cannot be negative.')
      grossWeightInputRef.current?.focus()
      return
    }

    const newLine: EstimateItemLine = {
      id: crypto.randomUUID(),
      itemId: selectedItem.id,
      itemName: selectedItem.itemName,
      stampId: itemForm.stampId,
      stampName: itemForm.stampName,
      designId: itemForm.designId,
      designName: itemForm.designName,
      barcode: itemForm.barcode.trim(),
      remark: itemForm.remark.trim(),
      pcs: toNumber(itemForm.pcs),
      grossWeight: toNumber(itemForm.grossWeight),
      packWeight: toNumber(itemForm.packWeight),
      lessWeight: itemPreview.lessWeight,
      addWeight: toNumber(itemForm.addWeight),
      netWeight: itemPreview.netWeight,
      tunch: toNumber(itemForm.tunch),
      wastage: toNumber(itemForm.wastage),
      hishob: itemPreview.hishob,
      labourRate: toNumber(itemForm.labourRate),
      labourRateType: itemForm.labourRateType,
      fine: itemPreview.fine,
      majuri: itemPreview.majuri,
      hsnCode: itemForm.hsnCode.trim(),
      gstRate: toNumber(itemForm.gstRate),
      taxableAmount: toNumber(itemForm.taxableAmount),
      cgstAmount: itemPreview.cgst,
      sgstAmount: itemPreview.sgst,
      igstAmount: itemPreview.igst
    }

    setItemLines((current) => [...current, newLine])
    clearItemForm()
  }

  const handleConfirmDeleteItemLine = (): void => {
    if (!itemDeleteTarget) return
    setItemLines((current) => current.filter((line) => line.id !== itemDeleteTarget.id))
    setItemDeleteTarget(null)
  }

  const validateEstimate = (): boolean => {
    if (!header.accountId) {
      showAlert('warning', 'Please select customer account.')
      accountSelectRef.current?.focus()
      return false
    }

    if (itemLines.length === 0) {
      showAlert('warning', 'Please add at least one item to estimate.')
      itemSelectRef.current?.focus()
      return false
    }

    return true
  }

  const resetForm = async (): Promise<void> => {
    setEditingId(null)
    setHeader(initialHeader)
    setItemForm(initialItemForm)
    setItemLines([])
    await loadNextNumber()
  }

  const buildPayload = (): EstimatePayload => {
    return {
      estimateDate: header.estimateDate,
      accountId: header.accountId,
      phone: header.phone,
      metalType: header.metalType,
      narration: header.narration,
      validUntil: header.validUntil,
      itemLines: itemLines.map((line) => ({
        itemId: line.itemId,
        stampId: line.stampId,
        designId: line.designId,
        barcode: line.barcode,
        remark: line.remark,
        pcs: line.pcs,
        grossWeight: line.grossWeight,
        addWeight: line.addWeight,
        packWeight: line.packWeight,
        tunch: line.tunch,
        wastage: line.wastage,
        labourRate: line.labourRate,
        labourRateType: line.labourRateType,
        hsnCode: line.hsnCode,
        gstRate: line.gstRate,
        taxableAmount: line.taxableAmount
      }))
    }
  }

  const handleSaveEstimate = async (): Promise<void> => {
    if (!validateEstimate()) return

    try {
      setSaving(true)
      const payload = buildPayload()

      if (editingId) {
        await window.api.estimates.update(editingId, payload)
      } else {
        await window.api.estimates.create(payload)
      }

      showAlert(
        'success',
        editingId ? 'Estimate updated successfully.' : 'Estimate saved successfully.'
      )
      await resetForm()
      await loadEstimates()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEditEstimate = async (estimate: EstimateRegisterRecord): Promise<void> => {
    if (estimate.status !== 'OPEN') {
      showAlert('warning', 'Only an open estimate can be edited.')
      return
    }

    try {
      setOpening(true)
      const record = await window.api.estimates.getById(estimate.id)

      setEditingId(record.header.id)
      setHeader({
        estimateNo: record.header.estimate_no,
        estimateDate: record.header.estimate_date,
        accountId: record.header.account_id,
        phone: record.header.mobile_number,
        metalType: record.header.metal_type as MetalType,
        narration: record.header.narration,
        validUntil: record.header.valid_until
      })

      setItemLines(
        record.itemLines.map((line) => ({
          id: line.id,
          itemId: line.item_id,
          itemName: line.item_name_snapshot,
          stampId: '',
          stampName: '',
          designId: '',
          designName: '',
          barcode: line.barcode,
          remark: line.remark,
          pcs: Number(line.pcs || 0),
          grossWeight: Number(line.gross_weight || 0),
          packWeight: 0,
          lessWeight: 0,
          addWeight: 0,
          netWeight: Number(line.net_weight || 0),
          tunch: Number(line.tunch || 0),
          wastage: Number(line.wastage || 0),
          hishob: Number(line.tunch || 0) + Number(line.wastage || 0),
          labourRate: 0,
          labourRateType: 'Kg' as LabourRateType,
          fine: Number(line.fine || 0),
          majuri: Number(line.majuri || 0),
          hsnCode: line.hsn_code || '',
          gstRate: Number(line.gst_rate || 0),
          taxableAmount: Number(line.taxable_amount || 0),
          cgstAmount: Number(line.cgst_amount || 0),
          sgstAmount: Number(line.sgst_amount || 0),
          igstAmount: Number(line.igst_amount || 0)
        }))
      )

      showAlert('success', `Editing estimate ${record.header.estimate_no}.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleConfirmDeleteEstimate = async (): Promise<void> => {
    if (!estimateDeleteTarget) return
    try {
      setDeleting(true)
      const result = await window.api.estimates.remove(estimateDeleteTarget.id)
      if (editingId === estimateDeleteTarget.id) {
        await resetForm()
      }
      setEstimateDeleteTarget(null)
      await loadEstimates()
      showAlert('success', `Estimate ${result.estimateNo} deleted successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleConfirmConvertToSale = async (): Promise<void> => {
    if (!convertTarget) return
    try {
      setConverting(true)
      const result = await window.api.estimates.convertToSale(convertTarget.id)
      setConvertTarget(null)
      await loadEstimates()
      showAlert(
        'success',
        `Estimate ${convertTarget.estimate_no} converted to sale ${result.sale.header.sale_no}.`
      )
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setConverting(false)
    }
  }

  const handleOpenPreview = async (estimate: EstimateRegisterRecord): Promise<void> => {
    try {
      setOpening(true)
      const record = await window.api.estimates.getById(estimate.id)
      setPreviewRecord(record)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadInitialData()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadInitialData])

  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-800 font-sans select-none overflow-hidden">
      {/* ── TOP HEADER BAR ── */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiFileText size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-slate-900 tracking-tight">
                {editingId ? `Edit Retail Sale Estimate (${header.estimateNo})` : 'Retail Sale Estimate'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                ESTIMATE VOUCHER
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Non-Ledger
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Generate quotation estimates with automated GST calculation before formal conversion
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
            title="Close Tab"
          >
            <FiX size={16} />
          </button>
        )}
      </header>

      {/* ── WORKSPACE CONTENT ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Alert Notifications */}
        {alertMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center justify-between border shadow-2xs ${
              alertType === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : alertType === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {alertType === 'success' ? (
                <FiCheckCircle size={14} className="text-emerald-600" />
              ) : (
                <FiAlertCircle size={14} className="text-amber-600" />
              )}
              <span>{alertMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setAlertMessage('')}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <FiX size={14} />
            </button>
          </div>
        )}

        {/* ── 1. ESTIMATE HEADER CARD ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {editingId ? `Edit Estimate ${header.estimateNo}` : 'Estimate Header'}
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Customer details & estimate validity duration
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Est. No.
              </label>
              <input
                value={header.estimateNo}
                disabled
                className="w-full h-8.5 px-2.5 text-xs bg-slate-100 border border-slate-200 rounded-lg text-amber-900 font-mono font-bold shadow-2xs cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Date
              </label>
              <input
                type="date"
                value={header.estimateDate}
                onChange={(event) =>
                  setHeader((current) => ({ ...current, estimateDate: event.target.value }))
                }
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Account / Customer <span className="text-rose-500">*</span>
              </label>
              <select
                ref={accountSelectRef}
                value={header.accountId}
                onChange={(event) => handleAccountChange(event.target.value)}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-semibold"
              >
                <option value="">Select Account</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountName} {account.mobileNumber ? `(${account.mobileNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Phone
              </label>
              <input
                value={header.phone}
                onChange={(event) =>
                  setHeader((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="Mobile number"
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Metal Type
              </label>
              <select
                value={header.metalType}
                onChange={(event) => handleMetalChange(event.target.value as MetalType)}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-semibold"
              >
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Diamond">Diamond</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Valid Until
              </label>
              <input
                type="date"
                value={header.validUntil}
                onChange={(event) =>
                  setHeader((current) => ({ ...current, validUntil: event.target.value }))
                }
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Narration / Purpose
              </label>
              <input
                value={header.narration}
                onChange={(event) =>
                  setHeader((current) => ({ ...current, narration: event.target.value }))
                }
                placeholder="Remarks, terms, or customer notes"
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                GST Tax Mode (Auto)
              </label>
              <div className="h-8.5 px-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold flex items-center shadow-2xs">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    interState
                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {interState ? 'Inter-State (IGST 3%)' : 'Intra-State (CGST 1.5% + SGST 1.5%)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. ITEM ENTRY CARD ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Item Entry
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Scan barcode or select jewellery item to calculate live GST estimate
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2.5 items-end">
            <div className="col-span-2 sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Barcode
              </label>
              <input
                value={itemForm.barcode}
                onChange={(e) => setItemForm((c) => ({ ...c, barcode: e.target.value }))}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Scan / Enter"
                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono text-slate-800 shadow-2xs"
              />
            </div>

            <div className="col-span-2 sm:col-span-3">
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <select
                ref={itemSelectRef}
                value={itemForm.itemId}
                onChange={(event) => handleItemChange(event.target.value)}
                onKeyDown={(event) => focusNextOnEnter(event, pcsInputRef.current)}
                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-semibold text-slate-800 shadow-2xs"
              >
                <option value="">Select Item</option>
                {activeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.itemName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Stamp
              </label>
              <input
                value={itemForm.stampName || '-'}
                disabled
                className="w-full h-8 px-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Design
              </label>
              <input
                value={itemForm.designName || '-'}
                disabled
                className="w-full h-8 px-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Pcs
              </label>
              <input
                ref={pcsInputRef}
                value={itemForm.pcs}
                onChange={(event) => handleItemDecimalChange(event.target.value, 'pcs')}
                onKeyDown={(event) => focusNextOnEnter(event, grossWeightInputRef.current)}
                placeholder="0"
                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-center font-mono font-medium shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Gross Wt (g)
              </label>
              <input
                ref={grossWeightInputRef}
                value={itemForm.grossWeight}
                onChange={(event) => handleItemDecimalChange(event.target.value, 'grossWeight')}
                onKeyDown={(event) => focusNextOnEnter(event, addWeightInputRef.current)}
                placeholder="0.000"
                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono font-bold text-slate-900 shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Pack Wt
              </label>
              <input
                value={itemForm.packWeight}
                onChange={(event) => handleItemDecimalChange(event.target.value, 'packWeight')}
                placeholder="0.000"
                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Less Wt
              </label>
              <input
                value={formatNumber(itemPreview.lessWeight)}
                disabled
                className="w-full h-8 px-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-right font-mono text-slate-600 shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Add Wt
              </label>
              <input
                ref={addWeightInputRef}
                value={itemForm.addWeight}
                onChange={(event) => handleItemDecimalChange(event.target.value, 'addWeight')}
                onKeyDown={(event) => focusNextOnEnter(event, wastageInputRef.current)}
                placeholder="0.000"
                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Net Wt (g)
              </label>
              <input
                value={formatNumber(itemPreview.netWeight)}
                disabled
                className="w-full h-8 px-2 text-xs bg-amber-50/80 border border-amber-200 rounded-lg text-right font-mono font-bold text-amber-950 shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Tunch %
              </label>
              <input
                value={itemForm.tunch}
                onChange={(event) => handleItemDecimalChange(event.target.value, 'tunch')}
                placeholder="0"
                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-center font-mono shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Wstg %
              </label>
              <input
                ref={wastageInputRef}
                value={itemForm.wastage}
                onChange={(event) => handleItemDecimalChange(event.target.value, 'wastage')}
                onKeyDown={(event) => focusNextOnEnter(event, labourRateInputRef.current)}
                placeholder="0"
                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-center font-mono shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Hishob
              </label>
              <input
                value={formatNumber(itemPreview.hishob)}
                disabled
                className="w-full h-8 px-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-center font-mono text-slate-700 shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Majuri Rate
              </label>
              <input
                ref={labourRateInputRef}
                value={itemForm.labourRate}
                onChange={(event) => handleItemDecimalChange(event.target.value, 'labourRate')}
                onKeyDown={(event) => focusNextOnEnter(event, taxableAmountInputRef.current)}
                placeholder="0"
                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Unit
              </label>
              <select
                value={itemForm.labourRateType}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    labourRateType: event.target.value as LabourRateType
                  }))
                }
                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-medium shadow-2xs"
              >
                <option value="Kg">Kg</option>
                <option value="Gm">Gm</option>
                <option value="Pcs">Pcs</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Fine
              </label>
              <input
                value={formatNumber(itemPreview.fine)}
                disabled
                className="w-full h-8 px-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-right font-mono text-slate-800 shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Majuri (₹)
              </label>
              <input
                value={formatNumber(itemPreview.majuri)}
                disabled
                className="w-full h-8 px-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-right font-mono text-slate-800 shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                HSN
              </label>
              <input
                value={itemForm.hsnCode}
                onChange={(event) =>
                  setItemForm((current) => ({ ...current, hsnCode: event.target.value }))
                }
                placeholder="HSN"
                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-mono shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                GST %
              </label>
              <input
                value={itemForm.gstRate}
                onChange={(event) => handleItemDecimalChange(event.target.value, 'gstRate')}
                placeholder="3"
                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-center font-mono shadow-2xs"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Taxable Amt (₹)
              </label>
              <input
                ref={taxableAmountInputRef}
                value={itemForm.taxableAmount}
                onChange={(event) => handleItemDecimalChange(event.target.value, 'taxableAmount')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleAddItemLine()
                  }
                }}
                placeholder="0.00"
                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono font-bold text-slate-900 shadow-2xs"
              />
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddItemLine}
                className="flex-1 h-8 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 active:to-amber-800 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <FiPlus size={14} />
                <span>Add Item</span>
              </button>

              <button
                type="button"
                onClick={clearItemForm}
                className="h-8 px-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors border border-slate-300 shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95"
                title="Clear Item Form"
              >
                <FiRotateCcw size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ── 3. ESTIMATE ITEMS TABLE ── */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-800">
              Estimate Line Items ({itemLines.length})
            </span>
            <span className="text-[11px] text-slate-500">
              Total Weight: <strong className="text-slate-800">{formatNumber(itemSummaryTotals.grossWeight)} g</strong>
            </span>
          </div>

          <div className="overflow-x-auto max-h-60">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 uppercase text-[11px] font-bold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-2 text-center">Pcs</th>
                  <th className="py-2.5 px-3 text-right">Net Wt (g)</th>
                  <th className="py-2.5 px-2 text-center">Tunch</th>
                  <th className="py-2.5 px-2 text-center">Wstg</th>
                  <th className="py-2.5 px-3 text-right">Fine</th>
                  <th className="py-2.5 px-3 text-right">Majuri (₹)</th>
                  <th className="py-2.5 px-2 text-center">HSN</th>
                  <th className="py-2.5 px-2 text-center">GST%</th>
                  <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                  <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                  <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                  <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                  <th className="py-2.5 px-3 text-center w-16">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-800">
                {itemLines.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-8 text-center text-slate-400 italic">
                      No items added yet. Enter item details above and click &quot;Add Item&quot;.
                    </td>
                  </tr>
                ) : (
                  itemLines.map((line, index) => (
                    <tr key={line.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-2 px-3 text-center font-mono text-slate-400">{index + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{line.itemName}</td>
                      <td className="py-2 px-2 text-center font-mono font-medium">{line.pcs}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-950">
                        {formatNumber(line.netWeight)}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-600">{line.tunch}%</td>
                      <td className="py-2 px-2 text-center font-mono text-slate-600">{line.wastage}%</td>
                      <td className="py-2 px-3 text-right font-mono font-medium">{formatNumber(line.fine)}</td>
                      <td className="py-2 px-3 text-right font-mono font-medium">{formatAmount(line.majuri)}</td>
                      <td className="py-2 px-2 text-center font-mono text-slate-500">{line.hsnCode || '-'}</td>
                      <td className="py-2 px-2 text-center font-mono font-semibold">{line.gstRate}%</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{formatAmount(line.taxableAmount)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">₹{formatAmount(line.cgstAmount)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">₹{formatAmount(line.sgstAmount)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">₹{formatAmount(line.igstAmount)}</td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setItemDeleteTarget(line)}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 4. SUMMARY METRIC CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Pcs</div>
            <div className="mt-0.5 text-base font-bold tabular-nums text-slate-900">
              {formatNumber(itemSummaryTotals.pcs)}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gross Wt</div>
            <div className="mt-0.5 text-base font-bold tabular-nums text-slate-900">
              {formatNumber(itemSummaryTotals.grossWeight)} g
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Net Wt</div>
            <div className="mt-0.5 text-base font-bold tabular-nums text-amber-950 font-mono">
              {formatNumber(itemSummaryTotals.netWeight)} g
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fine Total</div>
            <div className="mt-0.5 text-base font-bold tabular-nums text-slate-900">
              {formatNumber(itemFineTotal)} g
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Majuri Total</div>
            <div className="mt-0.5 text-base font-bold tabular-nums text-slate-900">
              ₹{formatAmount(itemMajuriTotal)}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Taxable Turnover</div>
            <div className="mt-0.5 text-base font-bold tabular-nums text-slate-900">
              ₹{formatAmount(gstTotals.taxableAmount)}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total GST Tax</div>
            <div className="mt-0.5 text-base font-bold tabular-nums text-emerald-800">
              ₹{formatAmount(gstTotals.cgstAmount + gstTotals.sgstAmount + gstTotals.igstAmount)}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 shadow-2xs">
            <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">Grand Total</div>
            <div className="mt-0.5 text-lg font-black tabular-nums text-amber-950 font-mono">
              ₹
              {formatAmount(
                gstTotals.taxableAmount +
                  gstTotals.cgstAmount +
                  gstTotals.sgstAmount +
                  gstTotals.igstAmount +
                  itemMajuriTotal
              )}
            </div>
          </div>
        </div>

        {/* ── 5. PRIMARY VOUCHER ACTIONS BAR ── */}
        <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSaveEstimate()}
              disabled={saving}
              className="h-9 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 active:to-amber-800 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <FiSave size={15} />
              <span>{saving ? 'Saving...' : editingId ? 'Update Estimate Voucher' : 'Save Estimate Voucher'}</span>
            </button>

            <button
              type="button"
              onClick={() => void resetForm()}
              disabled={saving}
              className="h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs transition-colors border border-slate-300 shadow-2xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <FiFilePlus size={14} />
              <span>New Blank</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            💡 <em>Estimates are non-ledger entries until converted into confirmed Sales.</em>
          </div>
        </div>

        {/* ── 6. SAVED ESTIMATES REGISTER ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Saved Estimates Register
              </h2>
            </div>

            {/* Status Filter Tabs */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 p-1 bg-slate-50 gap-1 flex-wrap">
              {[
                { id: 'ALL', label: 'All', count: statusCounts.all },
                { id: 'OPEN', label: 'Open', count: statusCounts.open },
                { id: 'CONVERTED', label: 'Converted', count: statusCounts.converted },
                { id: 'CANCELLED', label: 'Cancelled', count: statusCounts.cancelled }
              ].map((tab) => {
                const isSelected = statusFilter === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id as 'ALL' | EstimateStatus)}
                    className={`h-7 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-2xs border-amber-600 font-bold'
                        : 'border-transparent text-slate-600 hover:text-amber-900 hover:bg-amber-50/60 font-medium'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 leading-none rounded-full font-mono font-bold transition-colors ${
                        isSelected ? 'bg-amber-600 text-white border border-amber-400/40' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Search & Refresh */}
            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search estimate, party, mobile..."
                  className="w-full h-8 pl-7 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
                />
                <FiSearch size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText('')}
                    className="absolute right-2 top-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <FiX size={13} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => void loadEstimates()}
                disabled={loading}
                className="h-8 px-3 text-xs font-semibold text-slate-700 hover:text-amber-900 bg-white hover:bg-amber-50 border border-slate-300 hover:border-amber-300 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50 active:scale-95"
                title="Refresh Register"
              >
                <FiRefreshCw size={13} className={loading ? 'animate-spin text-amber-600' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Register Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-3">Est. No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Account / Party</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-2 text-center">Metal</th>
                  <th className="py-2.5 px-3 text-right">Fine</th>
                  <th className="py-2.5 px-3 text-right">Majuri (₹)</th>
                  <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-semibold">
                      <div className="flex items-center justify-center gap-2">
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
                        <span>Loading estimates...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEstimates.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 italic">
                      {searchText || statusFilter !== 'ALL'
                        ? 'No matching estimates found for the active filter.'
                        : 'No estimates recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredEstimates.map((estimate, index) => (
                    <tr key={estimate.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-2 px-3 text-center font-mono text-slate-400">{index + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-amber-900">{estimate.estimate_no}</td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap font-medium">
                        {formatDate(estimate.estimate_date)}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{estimate.account_name}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">{estimate.mobile_number || '-'}</td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                            estimate.metal_type === 'Silver'
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {estimate.metal_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        {formatNumber(estimate.item_fine_total)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        ₹{formatAmount(estimate.item_majuri_total)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{formatAmount(estimate.taxable_amount)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            estimate.status === 'OPEN'
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : estimate.status === 'CONVERTED'
                                ? 'bg-purple-50 text-purple-900 border-purple-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {getStatusLabel(estimate.status)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleOpenPreview(estimate)}
                            disabled={opening}
                            className="p-1.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                            title="View / Print Estimate"
                          >
                            <FiPrinter size={13} />
                          </button>

                          {estimate.status === 'OPEN' && (
                            <button
                              type="button"
                              onClick={() => void handleEditEstimate(estimate)}
                              disabled={opening || saving}
                              className="p-1.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                              title="Edit Estimate"
                            >
                              <FiEdit3 size={13} />
                            </button>
                          )}

                          {estimate.status === 'OPEN' && (
                            <button
                              type="button"
                              onClick={() => setConvertTarget(estimate)}
                              disabled={converting}
                              className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                              title="Convert to Sale"
                            >
                              <FiCornerDownLeft size={12} />
                              <span>Convert</span>
                            </button>
                          )}

                          {estimate.status === 'OPEN' && (
                            <button
                              type="button"
                              onClick={() => setEstimateDeleteTarget(estimate)}
                              disabled={deleting}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-lg shadow-2xs transition-all cursor-pointer"
                              title="Delete Estimate"
                            >
                              <FiTrash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(itemDeleteTarget)}
        title="Remove Item Line?"
        message={
          itemDeleteTarget
            ? `Are you sure you want to remove "${itemDeleteTarget.itemName}" from this estimate?`
            : ''
        }
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDeleteItemLine}
        onCancel={() => setItemDeleteTarget(null)}
      />

      <AppConfirmDialog
        open={Boolean(estimateDeleteTarget)}
        title="Delete Estimate?"
        message={
          estimateDeleteTarget
            ? `Are you sure you want to delete estimate "${estimateDeleteTarget.estimate_no}" for "${estimateDeleteTarget.account_name}"?`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDeleteEstimate()}
        onCancel={() => {
          if (!deleting) setEstimateDeleteTarget(null)
        }}
      />

      <AppConfirmDialog
        open={Boolean(convertTarget)}
        title="Convert to Sale?"
        message={
          convertTarget
            ? `Estimate "${convertTarget.estimate_no}" will be converted into a real Sale bill. This will post stock and account ledger effects. This cannot be undone.`
            : ''
        }
        confirmText="Convert"
        cancelText="Cancel"
        type="info"
        loading={converting}
        onConfirm={() => void handleConfirmConvertToSale()}
        onCancel={() => {
          if (!converting) setConvertTarget(null)
        }}
      />

      {previewRecord && (
        <EstimatePrintPreview estimate={previewRecord} onClose={() => setPreviewRecord(null)} />
      )}
    </div>
  )
}

export default RetailSaleEstimateScreen
