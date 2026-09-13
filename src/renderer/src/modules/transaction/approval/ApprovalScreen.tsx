import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { calculateSaleItemTotals, type LabourRateType } from '../../../utils/jewelleryFormula'

type AlertType = 'success' | 'error' | 'warning'
type MetalType = 'Gold' | 'Silver' | 'Diamond' | 'Other'

type Account = {
  id: string
  accountName: string
  mobileNumber: string
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
  barcodeValue?: string
  barcode?: string
  active: boolean
}

type ApprovalItemLine = {
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
  unit: string
  labourRate: number
  labourRateType: LabourRateType
  fine: number
  majuri: number
}

const initialHeader = {
  approvalNo: '',
  approvalDate: getTodayDate(),
  accountId: '',
  phone: '',
  metalType: 'Silver' as MetalType,
  narration: '',
  reminderDate: ''
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
  unit: 'GM',
  labourRate: '',
  labourRateType: 'Kg' as LabourRateType
}

function getTodayDate(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toNumber(value: string | number): number {
  if (value === '') return 0
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function isValidAmountInput(value: string): boolean {
  return /^-?\d*\.?\d*$/.test(value)
}

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
}

function formatDate(value: string): string {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function getLabourRateType(value: string): LabourRateType {
  if (value === 'Gm' || value === 'Pcs') return value
  return 'Kg'
}

function getStatusLabel(status: ApprovalStatus): string {
  if (status === 'pending') return 'Pending'
  if (status === 'approved') return 'Approved (Sale)'
  if (status === 'returned') return 'Returned'
  return 'Partial Return'
}

function getStatusBadgeStyle(status: ApprovalStatus): string {
  if (status === 'pending') return 'bg-amber-50 text-amber-800 border-amber-200'
  if (status === 'approved') return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (status === 'returned') return 'bg-slate-100 text-slate-700 border-slate-200'
  return 'bg-blue-50 text-blue-800 border-blue-200'
}

function ApprovalScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [header, setHeader] = useState(initialHeader)
  const [itemForm, setItemForm] = useState(initialItemForm)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [itemLines, setItemLines] = useState<ApprovalItemLine[]>([])
  const [approvals, setApprovals] = useState<ApprovalRegisterRecord[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [itemDeleteTarget, setItemDeleteTarget] = useState<ApprovalItemLine | null>(null)
  const [approvalDeleteTarget, setApprovalDeleteTarget] = useState<ApprovalRegisterRecord | null>(
    null
  )
  const [convertTarget, setConvertTarget] = useState<ApprovalRegisterRecord | null>(null)
  const [returnAllTarget, setReturnAllTarget] = useState<ApprovalRegisterRecord | null>(null)
  const [detailRecord, setDetailRecord] = useState<SavedApprovalRecord | null>(null)
  const [selectedDetailLineIds, setSelectedDetailLineIds] = useState<string[]>([])

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | ApprovalStatus>('ALL')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [converting, setConverting] = useState(false)
  const [returning, setReturning] = useState(false)
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

  const activeAccounts = useMemo(() => {
    return accounts.filter((account) => account.active)
  }, [accounts])

  const activeItems = useMemo(() => {
    return items.filter((item) => item.active && item.metalType === header.metalType)
  }, [items, header.metalType])

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === itemForm.itemId)
  }, [items, itemForm.itemId])

  const itemPreview = useMemo(() => {
    return calculateSaleItemTotals({
      pcs: toNumber(itemForm.pcs),
      grossWeight: toNumber(itemForm.grossWeight),
      addWeight: toNumber(itemForm.addWeight),
      packWeight: toNumber(itemForm.packWeight),
      tunch: toNumber(itemForm.tunch),
      wastage: toNumber(itemForm.wastage),
      labourRate: toNumber(itemForm.labourRate),
      labourRateType: itemForm.labourRateType
    })
  }, [itemForm])

  const itemFineTotal = useMemo(() => {
    return itemLines.reduce((total, line) => total + line.fine, 0)
  }, [itemLines])

  const itemMajuriTotal = useMemo(() => {
    return itemLines.reduce((total, line) => total + line.majuri, 0)
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

  const filteredApprovals = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return approvals.filter((approval) => {
      const statusMatch = statusFilter === 'ALL' || approval.status === statusFilter
      const keywordMatch =
        !keyword ||
        approval.approval_no.toLowerCase().includes(keyword) ||
        approval.account_name.toLowerCase().includes(keyword) ||
        approval.mobile_number.toLowerCase().includes(keyword) ||
        approval.metal_type.toLowerCase().includes(keyword) ||
        approval.approval_date.toLowerCase().includes(keyword)

      return statusMatch && keywordMatch
    })
  }, [approvals, searchText, statusFilter])

  const statusCounts = useMemo(() => {
    return approvals.reduce(
      (counts, approval) => {
        counts.all += 1
        if (approval.status === 'pending') counts.pending += 1
        else if (approval.status === 'approved') counts.approved += 1
        else if (approval.status === 'returned') counts.returned += 1
        else if (approval.status === 'partial_return') counts.partial += 1
        return counts
      },
      { all: 0, pending: 0, approved: 0, returned: 0, partial: 0 }
    )
  }, [approvals])

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 3000)
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
      'pcs' | 'grossWeight' | 'packWeight' | 'addWeight' | 'tunch' | 'wastage' | 'labourRate'
  ): void => {
    if (!isValidAmountInput(value)) return

    setItemForm((current) => ({
      ...current,
      [fieldName]: value
    }))
  }

  const loadAccounts = useCallback(async (): Promise<void> => {
    const data = await window.api.accounts.list()
    setAccounts(data)
  }, [])

  const loadItems = useCallback(async (): Promise<void> => {
    const data = await window.api.items.list()
    setItems(data)
  }, [])

  const loadApprovals = useCallback(async (): Promise<void> => {
    const data = await window.api.approvals.list()
    setApprovals(data)
  }, [])

  const loadNextApprovalNo = useCallback(async (): Promise<void> => {
    const nextNo = await window.api.approvals.getNextNumber()
    setHeader((current) => ({
      ...current,
      approvalNo: nextNo
    }))
  }, [])

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await Promise.all([loadAccounts(), loadItems(), loadApprovals(), loadNextApprovalNo()])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadItems, loadApprovals, loadNextApprovalNo, showAlert])

  const handleAccountChange = (accountId: string): void => {
    const matchedAccount = accounts.find((account) => account.id === accountId)

    setHeader((current) => ({
      ...current,
      accountId,
      phone: matchedAccount ? matchedAccount.mobileNumber : ''
    }))
  }

  const handleMetalChange = (metalType: MetalType): void => {
    if (header.metalType === metalType) return

    setHeader((current) => ({
      ...current,
      metalType
    }))

    setItemForm(initialItemForm)
    setItemLines([])
  }

  const handleItemChange = (itemId: string): void => {
    const matched = items.find((item) => item.id === itemId)

    if (!matched) {
      setItemForm((current) => ({
        ...current,
        itemId: '',
        stampId: '',
        stampName: '',
        designId: '',
        designName: '',
        packWeight: '',
        tunch: '',
        wastage: '',
        labourRate: '',
        labourRateType: 'Kg'
      }))
      return
    }

    setItemForm((current) => ({
      ...current,
      itemId,
      stampId: matched.defaultStampId || '',
      stampName: matched.stampName || '',
      designId: matched.defaultDesignId || '',
      designName: matched.designName || '',
      barcode: current.barcode || matched.barcodeValue || matched.barcode || '',
      packWeight: matched.fixedWeightPerPcs ? String(matched.fixedWeightPerPcs) : '',
      tunch: matched.defaultTanch ? String(matched.defaultTanch) : '',
      wastage: matched.defaultWastage ? String(matched.defaultWastage) : '',
      labourRate: matched.defaultLabourRate ? String(matched.defaultLabourRate) : '',
      labourRateType: getLabourRateType(matched.labourRateType)
    }))
  }

  const handleBarcodeKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && itemForm.barcode.trim()) {
      e.preventDefault()
      const query = itemForm.barcode.trim().toLowerCase()
      const matched = activeItems.find(
        (item) =>
          item.itemName.toLowerCase() === query ||
          item.barcodeValue?.toLowerCase() === query ||
          item.barcode?.toLowerCase() === query
      )
      if (matched) {
        handleItemChange(matched.id)
        showAlert('success', `Item selected: ${matched.itemName}`)
        pcsInputRef.current?.focus()
      } else {
        showAlert('warning', `No item matching barcode "${itemForm.barcode}"`)
      }
    }
  }

  const clearItemForm = (): void => {
    setItemForm(initialItemForm)
    itemSelectRef.current?.focus()
  }

  const handleAddItemLine = (): void => {
    if (!itemForm.itemId || !selectedItem) {
      showAlert('warning', 'Please select an item.')
      itemSelectRef.current?.focus()
      return
    }

    const pcs = toNumber(itemForm.pcs)
    const grossWeight = toNumber(itemForm.grossWeight)

    if (pcs <= 0) {
      showAlert('warning', 'Please enter valid pcs.')
      pcsInputRef.current?.focus()
      return
    }

    if (grossWeight <= 0) {
      showAlert('warning', 'Please enter valid gross weight.')
      grossWeightInputRef.current?.focus()
      return
    }

    const newLine: ApprovalItemLine = {
      id: crypto.randomUUID(),
      itemId: selectedItem.id,
      itemName: selectedItem.itemName,
      stampId: itemForm.stampId,
      stampName: itemForm.stampName,
      designId: itemForm.designId,
      designName: itemForm.designName,
      barcode: itemForm.barcode,
      remark: itemForm.remark,
      pcs,
      grossWeight,
      packWeight: toNumber(itemForm.packWeight),
      lessWeight: itemPreview.lessWeight,
      addWeight: toNumber(itemForm.addWeight),
      netWeight: itemPreview.netWeight,
      tunch: toNumber(itemForm.tunch),
      wastage: toNumber(itemForm.wastage),
      hishob: itemPreview.hishob,
      unit: itemForm.unit,
      labourRate: toNumber(itemForm.labourRate),
      labourRateType: itemForm.labourRateType,
      fine: itemPreview.fine,
      majuri: itemPreview.majuri
    }

    setItemLines((current) => [...current, newLine])
    clearItemForm()
  }

  const handleConfirmDeleteItemLine = (): void => {
    if (!itemDeleteTarget) return

    setItemLines((current) => current.filter((line) => line.id !== itemDeleteTarget.id))
    setItemDeleteTarget(null)
  }

  const resetForm = async (): Promise<void> => {
    setEditingId(null)
    setHeader(initialHeader)
    setItemForm(initialItemForm)
    setItemLines([])
    await loadNextApprovalNo()
    accountSelectRef.current?.focus()
  }

  const handleSaveApproval = async (): Promise<void> => {
    if (!header.approvalDate) {
      showAlert('warning', 'Please enter approval date.')
      return
    }

    if (!header.accountId) {
      showAlert('warning', 'Please select customer account.')
      accountSelectRef.current?.focus()
      return
    }

    if (itemLines.length === 0) {
      showAlert('warning', 'Please add at least one item line to approval.')
      itemSelectRef.current?.focus()
      return
    }

    try {
      setSaving(true)

      const payload = {
        approvalDate: header.approvalDate,
        accountId: header.accountId,
        phone: header.phone,
        metalType: header.metalType,
        narration: header.narration,
        reminderDate: header.reminderDate,
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
          unit: line.unit,
          labourRate: line.labourRate,
          labourRateType: line.labourRateType
        }))
      }

      if (editingId) {
        await window.api.approvals.update(editingId, payload)
        showAlert('success', 'Approval updated successfully.')
      } else {
        await window.api.approvals.create(payload)
        showAlert('success', 'Approval saved successfully.')
      }

      await resetForm()
      await loadApprovals()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEditApproval = async (approval: ApprovalRegisterRecord): Promise<void> => {
    if (approval.status !== 'pending') {
      showAlert('warning', 'Only a pending approval can be edited.')
      return
    }

    try {
      setOpening(true)
      const record = await window.api.approvals.getById(approval.id)

      setEditingId(record.header.id)
      setHeader({
        approvalNo: record.header.approval_no,
        approvalDate: record.header.approval_date,
        accountId: record.header.account_id,
        phone: (record.header.phone as string) || (record.header.mobile_number as string) || '',
        metalType: record.header.metal_type as MetalType,
        narration: (record.header.narration as string) || '',
        reminderDate: (record.header.reminder_date as string) || ''
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
          barcode: line.barcode || '',
          remark: line.remark || '',
          pcs: Number(line.pcs || 0),
          grossWeight: Number(line.gross_weight || 0),
          packWeight: Number(line.pack_weight || 0),
          lessWeight: Number(line.less_weight || 0),
          addWeight: 0,
          netWeight: Number(line.net_weight || 0),
          tunch: Number(line.tunch || 0),
          wastage: Number(line.wastage || 0),
          hishob: Number(line.hishob || 0),
          unit: 'GM',
          labourRate: Number(line.labour_rate || 0),
          labourRateType: getLabourRateType(line.labour_rate_type),
          fine: Number(line.fine || 0),
          majuri: Number(line.majuri || 0)
        }))
      )

      showAlert('success', `Editing approval ${record.header.approval_no}.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleConfirmDeleteApproval = async (): Promise<void> => {
    if (!approvalDeleteTarget) return

    try {
      setDeleting(true)
      const result = await window.api.approvals.remove(approvalDeleteTarget.id)

      if (editingId === approvalDeleteTarget.id) {
        await resetForm()
      }

      setApprovalDeleteTarget(null)
      await loadApprovals()
      showAlert('success', `Approval ${result.approvalNo} deleted successfully.`)
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
      const result = await window.api.approvals.convertToSale(convertTarget.id)

      setConvertTarget(null)
      await loadApprovals()
      showAlert(
        'success',
        `Approval ${convertTarget.approval_no} converted to sale ${result.sale.header.sale_no}.`
      )
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setConverting(false)
    }
  }

  const handleConfirmReturnAll = async (): Promise<void> => {
    if (!returnAllTarget) return

    try {
      setReturning(true)
      await window.api.approvals.returnApproval(returnAllTarget.id, {
        returnAll: true,
        lineIds: [],
        narration: ''
      })

      setReturnAllTarget(null)
      await loadApprovals()
      showAlert('success', `All items on approval ${returnAllTarget.approval_no} marked returned.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setReturning(false)
    }
  }

  const handleOpenDetail = async (approval: ApprovalRegisterRecord): Promise<void> => {
    try {
      setOpening(true)
      const record = await window.api.approvals.getById(approval.id)
      setDetailRecord(record)
      setSelectedDetailLineIds([])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const toggleDetailLineSelection = (lineId: string): void => {
    setSelectedDetailLineIds((current) =>
      current.includes(lineId) ? current.filter((id) => id !== lineId) : [...current, lineId]
    )
  }

  const handleReturnSelectedLines = async (): Promise<void> => {
    if (!detailRecord || selectedDetailLineIds.length === 0) {
      showAlert('warning', 'Please select at least one item line to return.')
      return
    }

    try {
      setReturning(true)
      await window.api.approvals.returnApproval(detailRecord.header.id, {
        lineIds: selectedDetailLineIds,
        returnAll: false,
        narration: ''
      })

      const refreshed = await window.api.approvals.getById(detailRecord.header.id)
      setDetailRecord(refreshed)
      setSelectedDetailLineIds([])
      await loadApprovals()
      showAlert('success', 'Selected item(s) marked as returned.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setReturning(false)
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
    <div className="h-full flex flex-col bg-[var(--color-background-app,#f8fafc)] text-slate-900 overflow-hidden font-sans select-none">
      {/* ── TOP HEADER BAR ── */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-xs shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            🤝
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>{editingId ? `Edit Approval ${header.approvalNo}` : 'Approval (Maal Approval) Transaction'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 font-mono font-bold">
                {header.approvalNo || 'NEW'}
              </span>
              {editingId && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700 font-bold uppercase">
                  Editing Mode
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Custody tracking for jewelry sent on trial/inspection (Jangad) without financial sale debt
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {itemLines.length > 0 && (
            <button
              type="button"
              onClick={() => void resetForm()}
              className="h-8 px-3 text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              ✕ Clear Form
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
              title="Close Tab"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Global Alert Notification */}
      <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />

      {/* ── MAIN SCROLLABLE CONTENT WORKSPACE ── */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* Top Section: Header & Item Entry */}
        <div className="flex flex-col gap-4">
          {/* Approval Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Approval Header
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">Metal:</span>
                <div className="inline-flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                  {(['Gold', 'Silver', 'Diamond', 'Other'] as MetalType[]).map((m) => {
                    const isSelected = header.metalType === m
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleMetalChange(m)}
                        className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors duration-100 cursor-pointer flex items-center border ${
                          isSelected
                            ? 'bg-white text-amber-800 shadow-2xs border-slate-200/90 font-bold'
                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                        }`}
                      >
                        {m}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Appr. No.
                </label>
                <input
                  value={header.approvalNo}
                  disabled
                  className="w-full h-8.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Date
                </label>
                <input
                  type="date"
                  value={header.approvalDate}
                  onChange={(e) => setHeader((c) => ({ ...c, approvalDate: e.target.value }))}
                  className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Customer Account *
                </label>
                <select
                  ref={accountSelectRef}
                  value={header.accountId}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
                >
                  <option value="">Select Account</option>
                  {activeAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Phone No
                </label>
                <input
                  value={header.phone}
                  onChange={(e) => setHeader((c) => ({ ...c, phone: e.target.value }))}
                  placeholder="Mobile number"
                  className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Reminder Date
                </label>
                <input
                  type="date"
                  value={header.reminderDate}
                  onChange={(e) => setHeader((c) => ({ ...c, reminderDate: e.target.value }))}
                  className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Narration
                </label>
                <input
                  value={header.narration}
                  onChange={(e) => setHeader((c) => ({ ...c, narration: e.target.value }))}
                  placeholder="Purpose / trial remarks"
                  className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Item Entry Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Item Entry
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Scan barcode or select an ornament to send on approval
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2.5 items-end">
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

              <div className="col-span-2 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                  Item Name *
                </label>
                <select
                  ref={itemSelectRef}
                  value={itemForm.itemId}
                  onChange={(e) => handleItemChange(e.target.value)}
                  onKeyDown={(e) => focusNextOnEnter(e, pcsInputRef.current)}
                  className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-medium text-slate-800 shadow-2xs"
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
                  className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                  Design
                </label>
                <input
                  value={itemForm.designName || '-'}
                  disabled
                  className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                  Pcs *
                </label>
                <input
                  ref={pcsInputRef}
                  value={itemForm.pcs}
                  onChange={(e) => handleItemDecimalChange(e.target.value, 'pcs')}
                  onKeyDown={(e) => focusNextOnEnter(e, grossWeightInputRef.current)}
                  placeholder="0"
                  className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono text-slate-800 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                  Gr. Wt. *
                </label>
                <input
                  ref={grossWeightInputRef}
                  value={itemForm.grossWeight}
                  onChange={(e) => handleItemDecimalChange(e.target.value, 'grossWeight')}
                  onKeyDown={(e) => focusNextOnEnter(e, addWeightInputRef.current)}
                  placeholder="0.000"
                  className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono text-slate-800 shadow-2xs font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                  Pack Wt.
                </label>
                <input
                  value={itemForm.packWeight}
                  onChange={(e) => handleItemDecimalChange(e.target.value, 'packWeight')}
                  placeholder="0.000"
                  className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono text-slate-800 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                  Less Wt.
                </label>
                <input
                  value={formatNumber(itemPreview.lessWeight)}
                  disabled
                  className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-slate-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                  Add Wt.
                </label>
                <input
                  ref={addWeightInputRef}
                  value={itemForm.addWeight}
                  onChange={(e) => handleItemDecimalChange(e.target.value, 'addWeight')}
                  onKeyDown={(e) => focusNextOnEnter(e, wastageInputRef.current)}
                  placeholder="0.000"
                  className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono text-slate-800 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                  Net Wt.
                </label>
                <input
                  value={formatNumber(itemPreview.netWeight)}
                  disabled
                  className="w-full h-8 px-2 text-xs bg-amber-50/50 border border-amber-200 rounded-lg text-right font-mono text-amber-900 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                  Tunch
                </label>
                <input
                  value={itemForm.tunch}
                  onChange={(e) => handleItemDecimalChange(e.target.value, 'tunch')}
                  placeholder="0"
                  className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono text-slate-800 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                  Wstg
                </label>
                <input
                  ref={wastageInputRef}
                  value={itemForm.wastage}
                  onChange={(e) => handleItemDecimalChange(e.target.value, 'wastage')}
                  onKeyDown={(e) => focusNextOnEnter(e, labourRateInputRef.current)}
                  placeholder="0"
                  className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono text-slate-800 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                  Hishob
                </label>
                <input
                  value={formatNumber(itemPreview.hishob)}
                  disabled
                  className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-slate-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-amber-800 block mb-1 uppercase tracking-wider">
                  Fine
                </label>
                <input
                  value={formatNumber(itemPreview.fine)}
                  disabled
                  className="w-full h-8 px-2 text-xs bg-amber-50 border border-amber-200 rounded-lg text-right font-mono text-amber-900 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                  Majuri Rate
                </label>
                <input
                  ref={labourRateInputRef}
                  value={itemForm.labourRate}
                  onChange={(e) => handleItemDecimalChange(e.target.value, 'labourRate')}
                  placeholder="0"
                  className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono text-slate-800 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                  Unit
                </label>
                <select
                  value={itemForm.labourRateType}
                  onChange={(e) =>
                    setItemForm((current) => ({
                      ...current,
                      labourRateType: e.target.value as LabourRateType
                    }))
                  }
                  className="w-full h-8 px-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                >
                  <option value="Kg">Kg</option>
                  <option value="Gm">Gm</option>
                  <option value="Pcs">Pcs</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                  Majuri
                </label>
                <input
                  value={formatNumber(itemPreview.majuri)}
                  disabled
                  className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-slate-800 font-bold"
                />
              </div>

              <div className="col-span-2 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                  Remark
                </label>
                <input
                  value={itemForm.remark}
                  onChange={(e) => setItemForm((c) => ({ ...c, remark: e.target.value }))}
                  placeholder="Line note / trial detail"
                  className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-slate-800 shadow-2xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleAddItemLine}
                className="h-9 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                style={{ color: '#ffffff' }}
              >
                <span>➕</span>
                <span>Add Item to Approval</span>
              </button>
              <button
                type="button"
                onClick={clearItemForm}
                className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Clear Fields
              </button>
            </div>
          </div>

          {/* Added Approval Items Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Approval Items ({itemLines.length})
                </h2>
              </div>
              {itemLines.length > 0 && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-700">
                    Net Wt: <strong className="font-mono text-slate-900">{formatNumber(itemSummaryTotals.netWeight)}</strong>
                  </span>
                  <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Fine Total: {formatNumber(itemFineTotal)}
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto max-h-[280px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Barcode</th>
                    <th className="py-2.5 px-3">Stamp</th>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3">Design</th>
                    <th className="py-2.5 px-3 text-right">Pcs</th>
                    <th className="py-2.5 px-3 text-right">Gr. Wt.</th>
                    <th className="py-2.5 px-3 text-right">Net Wt.</th>
                    <th className="py-2.5 px-3 text-right">Tunch</th>
                    <th className="py-2.5 px-3 text-right">Wstg</th>
                    <th className="py-2.5 px-3 text-right text-amber-800 font-bold">Fine</th>
                    <th className="py-2.5 px-3 text-right">M. Rate</th>
                    <th className="py-2.5 px-3 text-right">Majuri</th>
                    <th className="py-2.5 px-3">Remark</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {loading && itemLines.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-6 text-center text-slate-400">
                        Loading...
                      </td>
                    </tr>
                  ) : itemLines.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-8 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="text-2xl">📦</span>
                          <span className="font-semibold text-xs text-slate-500">
                            No items added to approval yet
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Use the item entry form above to add items on trial
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    itemLines.map((line, index) => (
                      <tr key={line.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{line.barcode || '-'}</td>
                        <td className="py-2 px-3 text-slate-600">{line.stampName || '-'}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{line.itemName}</td>
                        <td className="py-2 px-3 text-slate-600">{line.designName || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatNumber(line.pcs)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatNumber(line.grossWeight)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatNumber(line.netWeight)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatNumber(line.tunch)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatNumber(line.wastage)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">{formatNumber(line.fine)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatNumber(line.labourRate)}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">{formatNumber(line.majuri)}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px] max-w-[120px] truncate">{line.remark || '-'}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setItemDeleteTarget(line)}
                            className="px-2 py-1 text-[11px] font-bold rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {itemLines.length > 0 && (
                  <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200 text-slate-900 sticky bottom-0">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 text-right font-semibold text-slate-600">
                        Total ({itemLines.length} items):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatNumber(itemSummaryTotals.pcs)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatNumber(itemSummaryTotals.grossWeight)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{formatNumber(itemSummaryTotals.netWeight)}</td>
                      <td colSpan={2} className="py-2.5 px-3 text-right">-</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">{formatNumber(itemFineTotal)}</td>
                      <td></td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatNumber(itemMajuriTotal)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Bottom Action Footer on Entry Card */}
            <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => void handleSaveApproval()}
                  disabled={saving}
                  className="h-10 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  style={{ color: '#ffffff' }}
                >
                  <span>💾</span>
                  <span>{saving ? 'Saving...' : editingId ? 'Update Approval' : 'Post & Save Approval'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void resetForm()}
                  disabled={saving}
                  className="h-10 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span>✨</span>
                  <span>New Blank Approval</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 font-medium leading-tight">
                💡 <strong>Note:</strong> Goods leave showcase custody without generating financial debt. When the customer confirms, click <em>Convert to Sale</em> in the register below.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Saved Approvals Register */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Saved Approvals Register
              </h2>
            </div>

            {/* Status Filter Tabs */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 p-1 bg-slate-50 gap-1 flex-wrap">
              {[
                { id: 'ALL', label: 'All', count: statusCounts.all },
                { id: 'pending', label: 'Pending', count: statusCounts.pending },
                { id: 'approved', label: 'Approved', count: statusCounts.approved },
                { id: 'partial_return', label: 'Partial Return', count: statusCounts.partial },
                { id: 'returned', label: 'Returned', count: statusCounts.returned }
              ].map((tab) => {
                const isSelected = statusFilter === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id as 'ALL' | ApprovalStatus)}
                    className={`h-7 px-3 text-xs font-semibold rounded-lg transition-colors duration-100 cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-2xs border-slate-200'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 leading-none rounded-full font-mono font-bold transition-colors ${
                        isSelected ? 'bg-amber-100 text-amber-800' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <input
                  id="approval-search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search approval no, account, phone..."
                  className="w-full h-8 px-2.5 pr-7 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => void loadApprovals()}
                disabled={loading}
                className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>

              <div className="text-xs text-slate-500 font-medium">
                Showing: <strong className="text-amber-800">{filteredApprovals.length}</strong>
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Appr. No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer Account</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Metal</th>
                  <th className="py-2.5 px-3 text-right">Fine</th>
                  <th className="py-2.5 px-3 text-right">Majuri</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {loading && approvals.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-400">
                      Loading approvals...
                    </td>
                  </tr>
                ) : filteredApprovals.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-400">
                      {searchText || statusFilter !== 'ALL'
                        ? 'No matching approval found.'
                        : 'No approval saved yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredApprovals.map((approval, index) => (
                    <tr key={approval.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-amber-800">{approval.approval_no}</td>
                      <td className="py-2 px-3 font-mono">{formatDate(approval.approval_date)}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{approval.account_name}</td>
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{approval.mobile_number || '-'}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {approval.metal_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">{formatNumber(approval.item_fine_total)}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">{formatNumber(approval.item_majuri_total)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${getStatusBadgeStyle(approval.status)}`}>
                          {getStatusLabel(approval.status)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => void handleOpenDetail(approval)}
                            disabled={opening}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            View
                          </button>

                          {approval.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => void handleEditApproval(approval)}
                              disabled={opening || saving}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                          )}

                          {(approval.status === 'pending' || approval.status === 'partial_return') && (
                            <button
                              type="button"
                              onClick={() => setConvertTarget(approval)}
                              disabled={converting}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                            >
                              Convert to Sale
                            </button>
                          )}

                          {(approval.status === 'pending' || approval.status === 'partial_return') && (
                            <button
                              type="button"
                              onClick={() => setReturnAllTarget(approval)}
                              disabled={returning}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-colors cursor-pointer"
                            >
                              Return All
                            </button>
                          )}

                          {approval.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => setApprovalDeleteTarget(approval)}
                              disabled={deleting}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                            >
                              Delete
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

      {/* Confirmation Dialogs */}
      <AppConfirmDialog
        open={Boolean(itemDeleteTarget)}
        title="Remove Item Line?"
        message={
          itemDeleteTarget
            ? `Are you sure you want to remove "${itemDeleteTarget.itemName}" from this approval?`
            : ''
        }
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDeleteItemLine}
        onCancel={() => setItemDeleteTarget(null)}
      />

      <AppConfirmDialog
        open={Boolean(approvalDeleteTarget)}
        title="Delete Approval?"
        message={
          approvalDeleteTarget
            ? `Are you sure you want to delete approval "${approvalDeleteTarget.approval_no}" for "${approvalDeleteTarget.account_name}"?`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDeleteApproval()}
        onCancel={() => {
          if (!deleting) setApprovalDeleteTarget(null)
        }}
      />

      <AppConfirmDialog
        open={Boolean(convertTarget)}
        title="Convert Approval to Real Sale?"
        message={
          convertTarget
            ? `Approval "${convertTarget.approval_no}" for "${convertTarget.account_name}" will be converted into a real Sale bill. This will post permanent stock issue and customer account ledger debit (Nave). This action cannot be undone.`
            : ''
        }
        confirmText="Convert to Sale"
        cancelText="Cancel"
        type="info"
        loading={converting}
        onConfirm={() => void handleConfirmConvertToSale()}
        onCancel={() => {
          if (!converting) setConvertTarget(null)
        }}
      />

      <AppConfirmDialog
        open={Boolean(returnAllTarget)}
        title="Return All Items?"
        message={
          returnAllTarget
            ? `All pending items on approval "${returnAllTarget.approval_no}" will be marked as returned by "${returnAllTarget.account_name}". Goods will be confirmed back in stock.`
            : ''
        }
        confirmText="Return All"
        cancelText="Cancel"
        type="warning"
        loading={returning}
        onConfirm={() => void handleConfirmReturnAll()}
        onCancel={() => {
          if (!returning) setReturnAllTarget(null)
        }}
      />

      {/* Detail Record Modal */}
      {detailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="h-13 px-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🤝</span>
                <span className="font-bold text-sm text-slate-900">
                  Approval Details: {detailRecord.header.approval_no}
                </span>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${getStatusBadgeStyle(detailRecord.header.status)}`}>
                  {getStatusLabel(detailRecord.header.status)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailRecord(null)}
                className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Account</span>
                  <span className="font-bold text-slate-900 block">{detailRecord.header.account_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Date</span>
                  <span className="font-bold text-slate-900 block">{formatDate(detailRecord.header.approval_date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Metal</span>
                  <span className="font-bold text-slate-900 block">{detailRecord.header.metal_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Fine</span>
                  <span className="font-bold text-amber-800 block">{formatNumber(detailRecord.header.item_fine_total)}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      {detailRecord.header.status !== 'approved' &&
                        detailRecord.header.status !== 'returned' && <th className="py-2.5 px-3">Sel</th>}
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Barcode</th>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3 text-right">Pcs</th>
                      <th className="py-2.5 px-3 text-right">Net Wt</th>
                      <th className="py-2.5 px-3 text-right">Fine</th>
                      <th className="py-2.5 px-3 text-right">Majuri</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {detailRecord.itemLines.map((line, index) => {
                      const canSelect =
                        line.return_status === 'pending' &&
                        detailRecord.header.status !== 'approved' &&
                        detailRecord.header.status !== 'returned'

                      return (
                        <tr key={line.id} className="hover:bg-slate-50/70">
                          {detailRecord.header.status !== 'approved' &&
                            detailRecord.header.status !== 'returned' && (
                              <td className="py-2 px-3">
                                {canSelect ? (
                                  <input
                                    type="checkbox"
                                    checked={selectedDetailLineIds.includes(line.id)}
                                    onChange={() => toggleDetailLineSelection(line.id)}
                                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                  />
                                ) : (
                                  '-'
                                )}
                              </td>
                            )}
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{line.barcode || '-'}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{line.item_name_snapshot}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatNumber(line.pcs)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatNumber(line.net_weight)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">{formatNumber(line.fine)}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">{formatNumber(line.majuri)}</td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                                line.return_status === 'returned'
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {line.return_status === 'returned' ? 'Returned' : 'With Customer'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {detailRecord.header.status !== 'approved' &&
                detailRecord.header.status !== 'returned' && (
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-slate-500">
                      {selectedDetailLineIds.length} item(s) selected for return
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleReturnSelectedLines()}
                      disabled={returning || selectedDetailLineIds.length === 0}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                      style={{ color: '#ffffff' }}
                    >
                      {returning ? 'Please wait...' : 'Return Selected Items'}
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApprovalScreen
