import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import {
  calculateHishob,
  calculateFine,
  calculateMajuri,
  type LabourRateType
} from '../../../utils/jewelleryFormula'

type AlertType = 'success' | 'error' | 'warning'
type MetalType = 'Gold' | 'Silver' | 'Diamond' | 'Other'

type Account = {
  id: string
  accountName: string
  mobileNumber: string
  address?: string
  groupName?: string
  active: boolean
}

type Item = {
  id: string
  itemName: string
  metalType: string
  defaultStampId?: string
  stampName?: string
  defaultDesignId?: string
  designName?: string
  defaultTanch?: number
  defaultWastage?: number
  defaultLabourRate?: number
  labourRateType?: string
  barcode?: string
  active: boolean
}

function getTodayDate(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr || getTodayDate())
  if (isNaN(d.getTime())) return getTodayDate()
  d.setDate(d.getDate() + days)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
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

function formatWeight(value: number | string | undefined | null): string {
  return Number(value || 0).toFixed(3)
}

function formatCurrency(value: number | string | undefined | null): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDate(value?: string | null): string {
  if (!value) return '-'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function getDaysRemaining(dueDateStr?: string | null): { text: string; isOverdue: boolean; isToday: boolean } {
  if (!dueDateStr) return { text: '-', isOverdue: false, isToday: false }
  const today = new Date(getTodayDate()).getTime()
  const due = new Date(dueDateStr).getTime()
  if (isNaN(due)) return { text: '-', isOverdue: false, isToday: false }

  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true, isToday: false }
  }
  if (diffDays === 0) {
    return { text: 'Due Today', isOverdue: false, isToday: true }
  }
  return { text: `${diffDays}d left`, isOverdue: false, isToday: false }
}

function getStatusBadge(status: JobWorkStatus): { label: string; bg: string; text: string; border: string } {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending',
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200'
      }
    case 'partial_received':
      return {
        label: 'Partial Received',
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-200'
      }
    case 'received':
      return {
        label: 'Received / Closed',
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200'
      }
    case 'cancelled':
      return {
        label: 'Cancelled',
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-slate-300'
      }
    default:
      return {
        label: status,
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200'
      }
  }
}

const initialHeader = {
  orderNo: '',
  orderDate: getTodayDate(),
  dueDate: addDays(getTodayDate(), 7),
  karigarAccountId: '',
  metalType: 'Silver' as MetalType,
  itemId: '',
  expectedPcs: '1',
  grossWeightGiven: '',
  netWeightGiven: '',
  tunchGiven: '',
  fineWeightGiven: '',
  narration: ''
}

const initialReceiptForm = {
  receiptDate: getTodayDate(),
  pcs: '1',
  grossWeightReceived: '',
  netWeightReceived: '',
  tunch: '',
  wastage: '',
  labourRate: '',
  labourRateType: 'Kg' as LabourRateType,
  narration: ''
}

export function JobWorkScreen({ onClose }: { onClose?: () => void }): React.JSX.Element {
  const [header, setHeader] = useState(initialHeader)
  const [receiptForm, setReceiptForm] = useState(initialReceiptForm)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [orders, setOrders] = useState<JobWorkRegisterRecord[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JobWorkRegisterRecord | null>(null)
  const [receiveTarget, setReceiveTarget] = useState<SavedJobWorkRecord | null>(null)
  const [detailRecord, setDetailRecord] = useState<SavedJobWorkRecord | null>(null)
  const [printTarget, setPrintTarget] = useState<JobWorkRegisterRecord | SavedJobWorkHeader | null>(null)

  // Filters & Search
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | JobWorkStatus>('ALL')
  const [karigarFilter, setKarigarFilter] = useState<string>('ALL')
  const [metalFilter, setMetalFilter] = useState<string>('ALL')
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'TODAY' | 'THIS_MONTH' | 'CUSTOM'>('ALL')
  const [customFromDate, setCustomFromDate] = useState<string>('')
  const [customToDate, setCustomToDate] = useState<string>('')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [receiving, setReceiving] = useState(false)
  const [opening, setOpening] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const karigarSelectRef = useRef<HTMLSelectElement | null>(null)
  const itemSelectRef = useRef<HTMLSelectElement | null>(null)
  const grossWeightInputRef = useRef<HTMLInputElement | null>(null)
  const netWeightInputRef = useRef<HTMLInputElement | null>(null)
  const tunchInputRef = useRef<HTMLInputElement | null>(null)
  const narrationInputRef = useRef<HTMLInputElement | null>(null)

  const receiptPcsInputRef = useRef<HTMLInputElement | null>(null)
  const receiptGrossInputRef = useRef<HTMLInputElement | null>(null)
  const receiptNetInputRef = useRef<HTMLInputElement | null>(null)
  const receiptTunchInputRef = useRef<HTMLInputElement | null>(null)
  const receiptWastageInputRef = useRef<HTMLInputElement | null>(null)
  const receiptLabourRateInputRef = useRef<HTMLInputElement | null>(null)

  const activeAccounts = useMemo(() => {
    return accounts.filter((account) => account.active)
  }, [accounts])

  const selectedKarigar = useMemo(() => {
    return accounts.find((account) => account.id === header.karigarAccountId)
  }, [accounts, header.karigarAccountId])

  const activeItems = useMemo(() => {
    return items.filter((item) => item.active && item.metalType === header.metalType)
  }, [items, header.metalType])

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === header.itemId)
  }, [items, header.itemId])

  // Calculated Fine Given for current form
  const computedFineGiven = useMemo(() => {
    const net = toNumber(header.netWeightGiven)
    const tunch = toNumber(header.tunchGiven)
    if (net <= 0 || tunch <= 0) return 0
    return Number(((net * tunch) / 100).toFixed(3))
  }, [header.netWeightGiven, header.tunchGiven])

  // Real-time calculation preview for goods receipt modal
  const receiptPreview = useMemo(() => {
    const netWeight = toNumber(receiptForm.netWeightReceived)
    const pcs = toNumber(receiptForm.pcs)
    const tunch = toNumber(receiptForm.tunch)
    const wastage = toNumber(receiptForm.wastage)
    const labourRate = toNumber(receiptForm.labourRate)

    const hishob = calculateHishob(tunch, wastage)
    const fine = calculateFine(netWeight, tunch, wastage)
    const majuri = calculateMajuri({
      netWeight,
      pcs,
      labourRate,
      labourRateType: receiptForm.labourRateType
    })

    const netGiven = receiveTarget ? Number(receiveTarget.header.net_weight_given || 0) : 0
    const alreadyReceived = receiveTarget
      ? Number(receiveTarget.header.total_net_weight_received || 0)
      : 0
    const newTotalReceived = alreadyReceived + netWeight
    const remainingBalance = Math.max(0, netGiven - newTotalReceived)
    const weightLoss = netGiven > 0 ? Number((netGiven - newTotalReceived).toFixed(3)) : 0

    return { hishob, fine, majuri, remainingBalance, weightLoss }
  }, [receiptForm, receiveTarget])

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    const today = getTodayDate()

    return orders.filter((order) => {
      // Status filter
      let statusMatch = true
      if (statusFilter === 'OVERDUE') {
        const isOverdue =
          (order.status === 'pending' || order.status === 'partial_received') &&
          Boolean(order.due_date && order.due_date < today)
        statusMatch = isOverdue
      } else if (statusFilter !== 'ALL') {
        statusMatch = order.status === statusFilter
      }

      // Karigar filter
      const karigarMatch =
        karigarFilter === 'ALL' || order.karigar_name === karigarFilter

      // Metal filter
      const metalMatch =
        metalFilter === 'ALL' || order.metal_type === metalFilter

      // Date Range filter
      let dateMatch = true
      if (dateRangeFilter === 'TODAY') {
        dateMatch = order.order_date === today
      } else if (dateRangeFilter === 'THIS_MONTH') {
        const currentMonth = today.substring(0, 7)
        dateMatch = (order.order_date || '').startsWith(currentMonth)
      } else if (dateRangeFilter === 'CUSTOM') {
        if (customFromDate && (order.order_date || '') < customFromDate) dateMatch = false
        if (customToDate && (order.order_date || '') > customToDate) dateMatch = false
      }

      // Keyword search
      const keywordMatch =
        !keyword ||
        order.order_no.toLowerCase().includes(keyword) ||
        (order.karigar_name || '').toLowerCase().includes(keyword) ||
        (order.karigar_mobile || '').toLowerCase().includes(keyword) ||
        (order.item_name || '').toLowerCase().includes(keyword) ||
        (order.metal_type || '').toLowerCase().includes(keyword) ||
        (order.order_date || '').toLowerCase().includes(keyword)

      return statusMatch && karigarMatch && metalMatch && dateMatch && keywordMatch
    })
  }, [
    orders,
    searchText,
    statusFilter,
    karigarFilter,
    metalFilter,
    dateRangeFilter,
    customFromDate,
    customToDate
  ])

  // Status counts for badge tabs
  const statusCounts = useMemo(() => {
    const today = getTodayDate()
    return orders.reduce(
      (counts, order) => {
        counts.total += 1
        if (order.status === 'pending') counts.pending += 1
        else if (order.status === 'partial_received') counts.partial += 1
        else if (order.status === 'received') counts.received += 1
        else if (order.status === 'cancelled') counts.cancelled += 1

        if (
          (order.status === 'pending' || order.status === 'partial_received') &&
          Boolean(order.due_date && order.due_date < today)
        ) {
          counts.overdue += 1
        }
        return counts
      },
      { total: 0, pending: 0, partial: 0, received: 0, cancelled: 0, overdue: 0 }
    )
  }, [orders])

  // Top Executive Metric Totals
  const executiveMetrics = useMemo(() => {
    return orders.reduce(
      (acc, o) => {
        const netGiven = Number(o.net_weight_given || 0)
        const netReceived = Number(o.total_net_weight_received || 0)
        const fineGiven = Number(o.fine_weight_given || 0)
        const fineReceived = Number(o.total_fine_received || 0)
        const balance = Math.max(0, netGiven - netReceived)
        const majuri = Number(o.total_majuri || 0)

        if (o.status === 'pending' || o.status === 'partial_received') {
          acc.activeOrdersCount += 1
          acc.activeGivenWeight += netGiven
          acc.pendingBalanceWeight += balance
        }

        acc.totalGivenWeight += netGiven
        acc.totalReceivedWeight += netReceived
        acc.totalFineGiven += fineGiven
        acc.totalFineReceived += fineReceived
        acc.totalMajuri += majuri

        return acc
      },
      {
        activeOrdersCount: 0,
        activeGivenWeight: 0,
        pendingBalanceWeight: 0,
        totalGivenWeight: 0,
        totalReceivedWeight: 0,
        totalFineGiven: 0,
        totalFineReceived: 0,
        totalMajuri: 0
      }
    )
  }, [orders])

  // Register summary totals of filtered orders
  const registerTotals = useMemo(() => {
    return filteredOrders.reduce(
      (acc, o) => {
        const givenGross = Number(o.gross_weight_given || 0)
        const givenNet = Number(o.net_weight_given || 0)
        const fineGiven = Number(o.fine_weight_given || 0)
        const receivedNet = Number(o.total_net_weight_received || 0)
        const receivedFine = Number(o.total_fine_received || 0)
        const balance = Math.max(0, givenNet - receivedNet)
        const majuri = Number(o.total_majuri || 0)

        acc.grossWeightGiven += givenGross
        acc.netWeightGiven += givenNet
        acc.fineWeightGiven += fineGiven
        acc.netWeightReceived += receivedNet
        acc.fineWeightReceived += receivedFine
        acc.balanceWeight += balance
        acc.totalMajuri += majuri
        return acc
      },
      {
        grossWeightGiven: 0,
        netWeightGiven: 0,
        fineWeightGiven: 0,
        netWeightReceived: 0,
        fineWeightReceived: 0,
        balanceWeight: 0,
        totalMajuri: 0
      }
    )
  }, [filteredOrders])

  // Unique list of karigars in the register for filter dropdown
  const karigarOptions = useMemo(() => {
    const set = new Set<string>()
    orders.forEach((o) => {
      if (o.karigar_name) set.add(o.karigar_name)
    })
    return Array.from(set).sort()
  }, [orders])

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

  const handleGrossWeightChange = (value: string): void => {
    if (!isValidAmountInput(value)) return

    setHeader((current) => {
      const shouldAutoSyncNet =
        current.netWeightGiven === '' || current.netWeightGiven === current.grossWeightGiven
      return {
        ...current,
        grossWeightGiven: value,
        netWeightGiven: shouldAutoSyncNet ? value : current.netWeightGiven
      }
    })
  }

  const handleNetWeightChange = (value: string): void => {
    if (!isValidAmountInput(value)) return
    setHeader((current) => ({
      ...current,
      netWeightGiven: value
    }))
  }

  const handleTunchChange = (value: string): void => {
    if (!isValidAmountInput(value)) return
    setHeader((current) => ({
      ...current,
      tunchGiven: value
    }))
  }

  const handleReceiptDecimalChange = (
    value: string,
    fieldName: 'pcs' | 'grossWeightReceived' | 'netWeightReceived' | 'tunch' | 'wastage' | 'labourRate'
  ): void => {
    if (!isValidAmountInput(value)) return

    setReceiptForm((current) => {
      const updated = { ...current, [fieldName]: value }
      if (fieldName === 'grossWeightReceived') {
        if (current.netWeightReceived === '' || current.netWeightReceived === current.grossWeightReceived) {
          updated.netWeightReceived = value
        }
      }
      return updated
    })
  }

  const loadAccounts = useCallback(async (): Promise<void> => {
    const data = await window.api.accounts.list()
    setAccounts(data)
  }, [])

  const loadItems = useCallback(async (): Promise<void> => {
    const data = await window.api.items.list()
    setItems(data)
  }, [])

  const loadOrders = useCallback(async (): Promise<void> => {
    const data = await window.api.jobWork.list()
    setOrders(data)
  }, [])

  const loadNextNumber = useCallback(async (): Promise<void> => {
    const nextNumber = await window.api.jobWork.getNextNumber()
    setHeader((current) => ({ ...current, orderNo: nextNumber }))
  }, [])

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await Promise.all([loadAccounts(), loadItems(), loadOrders(), loadNextNumber()])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadItems, loadOrders, loadNextNumber, showAlert])

  const handleMetalChange = (metalType: MetalType): void => {
    setHeader((current) => ({
      ...current,
      metalType,
      itemId: '',
      tunchGiven: metalType === 'Gold' ? '91.60' : metalType === 'Silver' ? '92.50' : ''
    }))
  }

  const handleItemSelect = (itemId: string): void => {
    const found = items.find((i) => i.id === itemId)
    setHeader((current) => ({
      ...current,
      itemId,
      tunchGiven: found?.defaultTanch ? String(found.defaultTanch) : current.tunchGiven
    }))
  }

  const validateOrder = (): boolean => {
    if (!header.karigarAccountId) {
      showAlert('warning', 'Please select a Karigar account.')
      karigarSelectRef.current?.focus()
      return false
    }

    if (!header.itemId) {
      showAlert('warning', 'Please select an item.')
      itemSelectRef.current?.focus()
      return false
    }

    if (toNumber(header.grossWeightGiven) <= 0) {
      showAlert('warning', 'Please enter gross weight given.')
      grossWeightInputRef.current?.focus()
      return false
    }

    if (toNumber(header.netWeightGiven) <= 0) {
      showAlert('warning', 'Please enter net weight given.')
      netWeightInputRef.current?.focus()
      return false
    }

    return true
  }

  const resetForm = async (): Promise<void> => {
    setEditingId(null)
    setHeader({
      ...initialHeader,
      dueDate: addDays(getTodayDate(), 7)
    })
    await loadNextNumber()
  }

  const buildPayload = (): JobWorkOrderPayload => {
    const netWeight = toNumber(header.netWeightGiven)
    const tunch = toNumber(header.tunchGiven)
    const calculatedFine = tunch > 0 ? Number(((netWeight * tunch) / 100).toFixed(3)) : 0

    return {
      orderDate: header.orderDate,
      dueDate: header.dueDate || '',
      karigarAccountId: header.karigarAccountId,
      metalType: header.metalType,
      itemId: header.itemId,
      expectedPcs: toNumber(header.expectedPcs) || 1,
      grossWeightGiven: toNumber(header.grossWeightGiven),
      netWeightGiven: netWeight,
      tunchGiven: tunch,
      fineWeightGiven: calculatedFine,
      narration: header.narration
    }
  }

  const handleSaveOrder = async (): Promise<void> => {
    if (!validateOrder()) return

    try {
      setSaving(true)
      const payload = buildPayload()

      let savedRecord: SavedJobWorkRecord
      if (editingId) {
        savedRecord = await window.api.jobWork.update(editingId, payload)
      } else {
        savedRecord = await window.api.jobWork.create(payload)
      }

      showAlert(
        'success',
        editingId
          ? `Job work order ${header.orderNo} updated successfully.`
          : `Job work order ${header.orderNo} saved successfully.`
      )

      // Optionally offer print challan
      setPrintTarget(savedRecord.header)

      await resetForm()
      await loadOrders()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEditOrder = async (order: JobWorkRegisterRecord): Promise<void> => {
    if (order.status !== 'pending') {
      showAlert('warning', 'Only a pending job work order can be edited.')
      return
    }

    try {
      setOpening(true)
      const record = await window.api.jobWork.getById(order.id)

      setEditingId(record.header.id)
      setHeader({
        orderNo: record.header.order_no,
        orderDate: record.header.order_date,
        dueDate: record.header.due_date || addDays(record.header.order_date, 7),
        karigarAccountId: record.header.karigar_account_id,
        metalType: record.header.metal_type as MetalType,
        itemId: record.header.item_id,
        expectedPcs: record.header.expected_pcs ? String(record.header.expected_pcs) : '1',
        grossWeightGiven:
          record.header.gross_weight_given === 0 ? '' : String(record.header.gross_weight_given),
        netWeightGiven:
          record.header.net_weight_given === 0 ? '' : String(record.header.net_weight_given),
        tunchGiven:
          record.header.tunch_given && record.header.tunch_given > 0
            ? String(record.header.tunch_given)
            : '',
        fineWeightGiven:
          record.header.fine_weight_given && record.header.fine_weight_given > 0
            ? String(record.header.fine_weight_given)
            : '',
        narration: record.header.narration || ''
      })

      showAlert('success', `Editing job work order ${record.header.order_no}.`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      const result = await window.api.jobWork.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        await resetForm()
      }

      setDeleteTarget(null)
      await loadOrders()
      showAlert('success', `Job work order ${result.orderNo} deleted successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenDetail = async (order: JobWorkRegisterRecord): Promise<void> => {
    try {
      setOpening(true)
      const record = await window.api.jobWork.getById(order.id)
      setDetailRecord(record)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleOpenReceive = async (order: JobWorkRegisterRecord): Promise<void> => {
    try {
      setOpening(true)
      const record = await window.api.jobWork.getById(order.id)
      setReceiveTarget(record)

      const remainingBalance = Math.max(
        0,
        Number(record.header.net_weight_given || 0) - Number(record.header.total_net_weight_received || 0)
      )

      // Get item default settings if available
      const itemMaster = items.find((i) => i.id === record.header.item_id)

      setReceiptForm({
        ...initialReceiptForm,
        receiptDate: getTodayDate(),
        pcs: record.header.expected_pcs ? String(record.header.expected_pcs) : '1',
        grossWeightReceived: remainingBalance > 0 ? String(remainingBalance) : '',
        netWeightReceived: remainingBalance > 0 ? String(remainingBalance) : '',
        tunch:
          record.header.tunch_given && record.header.tunch_given > 0
            ? String(record.header.tunch_given)
            : itemMaster?.defaultTanch
              ? String(itemMaster.defaultTanch)
              : '',
        wastage: itemMaster?.defaultWastage ? String(itemMaster.defaultWastage) : '0',
        labourRate: itemMaster?.defaultLabourRate ? String(itemMaster.defaultLabourRate) : '',
        labourRateType: (itemMaster?.labourRateType as LabourRateType) || 'Kg'
      })
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleOpenPrint = (record: JobWorkRegisterRecord | SavedJobWorkHeader): void => {
    setPrintTarget(record)
  }

  const validateReceipt = (): boolean => {
    if (toNumber(receiptForm.pcs) <= 0) {
      showAlert('warning', 'Please enter valid pcs received.')
      receiptPcsInputRef.current?.focus()
      return false
    }

    if (toNumber(receiptForm.grossWeightReceived) <= 0) {
      showAlert('warning', 'Please enter gross weight received.')
      receiptGrossInputRef.current?.focus()
      return false
    }

    if (toNumber(receiptForm.netWeightReceived) <= 0) {
      showAlert('warning', 'Please enter net weight received.')
      receiptNetInputRef.current?.focus()
      return false
    }

    return true
  }

  const handleSaveReceipt = async (): Promise<void> => {
    if (!receiveTarget) return
    if (!validateReceipt()) return

    try {
      setReceiving(true)

      const payload: JobWorkReceiptPayload = {
        receiptDate: receiptForm.receiptDate,
        pcs: toNumber(receiptForm.pcs),
        grossWeightReceived: toNumber(receiptForm.grossWeightReceived),
        netWeightReceived: toNumber(receiptForm.netWeightReceived),
        tunch: toNumber(receiptForm.tunch),
        wastage: toNumber(receiptForm.wastage),
        labourRate: toNumber(receiptForm.labourRate),
        labourRateType: receiptForm.labourRateType,
        narration: receiptForm.narration
      }

      const updated = await window.api.jobWork.receiveGoods(receiveTarget.header.id, payload)

      setReceiveTarget(updated)
      setReceiptForm(initialReceiptForm)
      await loadOrders()
      showAlert('success', `Goods receipt recorded against job work order ${updated.header.order_no}.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setReceiving(false)
    }
  }

  const exportCSV = (): void => {
    if (filteredOrders.length === 0) {
      showAlert('warning', 'No orders to export.')
      return
    }

    const headers = [
      'Order No',
      'Order Date',
      'Due Date',
      'Karigar Name',
      'Karigar Mobile',
      'Item Name',
      'Metal Type',
      'Gross Wt Given (g)',
      'Net Wt Given (g)',
      'Tunch % Given',
      'Fine Wt Given (g)',
      'Net Wt Received (g)',
      'Fine Received (g)',
      'Balance Wt (g)',
      'Total Majuri (INR)',
      'Status',
      'Narration'
    ]

    const rows = filteredOrders.map((o) => {
      const netGiven = Number(o.net_weight_given || 0)
      const netReceived = Number(o.total_net_weight_received || 0)
      const balance = Math.max(0, netGiven - netReceived)

      return [
        o.order_no,
        o.order_date,
        o.due_date || '',
        `"${o.karigar_name || ''}"`,
        o.karigar_mobile || '',
        `"${o.item_name || ''}"`,
        o.metal_type,
        formatWeight(o.gross_weight_given),
        formatWeight(o.net_weight_given),
        o.tunch_given ? `${o.tunch_given}%` : '',
        formatWeight(o.fine_weight_given),
        formatWeight(o.total_net_weight_received),
        formatWeight(o.total_fine_received),
        formatWeight(balance),
        o.total_majuri || 0,
        o.status,
        `"${(o.narration || '').replace(/"/g, '""')}"`
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `JobWork_Orders_${getTodayDate()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showAlert('success', 'Job work register exported successfully.')
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
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* ── TOP HEADER BAR ── */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 text-lg shadow-2xs font-bold">
            ⚒️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                Job Work (Karigar Issue & Receipt Hub)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100/80 text-amber-900 border border-amber-300">
                {editingId ? `Editing ${header.orderNo}` : header.orderNo || 'JW-0001'}
              </span>
              <span className="text-[11px] text-slate-400">•</span>
              <span className="text-[11px] text-slate-500 font-medium">
                Rule 55 / ITC-04 Compliant
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Track raw metal given to artisans, monitor outstanding metal balances, and record finished ornaments with fine & majuri
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editingId && (
            <button
              type="button"
              onClick={() => void resetForm()}
              className="h-8 px-3 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>✕</span> Cancel Edit
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

      {/* ── MAIN SCROLLABLE WORKSPACE ── */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* ── TOP EXECUTIVE KPI METRICS ROW ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Active Orders */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Active Orders</span>
              <span className="text-xs">📋</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold font-mono text-slate-900">
                {executiveMetrics.activeOrdersCount}
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-medium">
                {formatWeight(executiveMetrics.activeGivenWeight)} g issued
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400">Open in workshop</div>
          </div>

          {/* Outstanding Metal In Custody */}
          <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[10px] font-bold uppercase tracking-wider">Metal With Karigars</span>
              <span className="text-xs">⚖️</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold font-mono text-amber-900">
                {formatWeight(executiveMetrics.pendingBalanceWeight)} g
              </span>
              <span className="text-[10px] text-amber-700 font-semibold bg-amber-200/60 px-1.5 py-0.2 rounded">
                Pending Ret.
              </span>
            </div>
            <div className="mt-1 text-[10px] text-amber-800/80">Outstanding metal balance</div>
          </div>

          {/* Finished Goods Received */}
          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[10px] font-bold uppercase tracking-wider">Crafted Received</span>
              <span className="text-xs">📥</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold font-mono text-emerald-900">
                {formatWeight(executiveMetrics.totalReceivedWeight)} g
              </span>
              <span className="text-[11px] font-mono text-emerald-700 font-medium">
                {formatWeight(executiveMetrics.totalFineReceived)} g Fine
              </span>
            </div>
            <div className="mt-1 text-[10px] text-emerald-800/80">Received back into stock</div>
          </div>

          {/* Total Karigar Majuri Accrued */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Majuri (Making)</span>
              <span className="text-xs">💰</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold font-mono text-slate-900">
                ₹{formatCurrency(executiveMetrics.totalMajuri)}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400">Credited to karigar ledgers</div>
          </div>

          {/* Overdue Tracker */}
          <div
            onClick={() => setStatusFilter(statusCounts.overdue > 0 ? 'OVERDUE' : 'ALL')}
            className={`p-3 rounded-xl border shadow-2xs flex flex-col justify-between cursor-pointer transition-colors ${
              statusCounts.overdue > 0
                ? 'bg-amber-100/50 border-amber-300 hover:bg-amber-100/80'
                : 'bg-white border-slate-200/90'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Overdue Crafting</span>
              <span className="text-xs">{statusCounts.overdue > 0 ? '⚠️' : '✓'}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span
                className={`text-lg font-bold font-mono ${
                  statusCounts.overdue > 0 ? 'text-amber-900' : 'text-emerald-700'
                }`}
              >
                {statusCounts.overdue}
              </span>
              <span className="text-[10px] text-slate-500">
                {statusCounts.overdue > 0 ? 'Past Due Date' : 'All on track'}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400">Click to filter overdue</div>
          </div>
        </div>

        {/* ── TOP SECTION: JOB WORK ORDER (MATERIAL OUT) CARD ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 mb-3.5 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {editingId ? `Edit Job Work Order (${header.orderNo})` : 'New Job Work Order (Issue Metal to Karigar)'}
              </h2>
            </div>

            {/* Metal Selection Segmented Control */}
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

          {/* Form Input Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Order No */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Order No.
              </label>
              <input
                value={header.orderNo}
                disabled
                className="w-full h-8.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono font-bold"
              />
            </div>

            {/* Order Date */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Order Date *
              </label>
              <input
                type="date"
                value={header.orderDate}
                onChange={(e) => setHeader((c) => ({ ...c, orderDate: e.target.value }))}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              />
            </div>

            {/* Promised Due Date with Quick Presets */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Due Date
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() =>
                      setHeader((c) => ({ ...c, dueDate: addDays(c.orderDate || getTodayDate(), 7) }))
                    }
                    className="text-amber-700 hover:underline font-medium cursor-pointer"
                  >
                    +7d
                  </button>
                  <span>|</span>
                  <button
                    type="button"
                    onClick={() =>
                      setHeader((c) => ({ ...c, dueDate: addDays(c.orderDate || getTodayDate(), 15) }))
                    }
                    className="text-amber-700 hover:underline font-medium cursor-pointer"
                  >
                    +15d
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={header.dueDate}
                onChange={(e) => setHeader((c) => ({ ...c, dueDate: e.target.value }))}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              />
            </div>

            {/* Karigar Account */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Karigar / Artisan *
                </label>
                {selectedKarigar?.mobileNumber && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 font-mono">
                    📱 {selectedKarigar.mobileNumber}
                  </span>
                )}
              </div>
              <select
                ref={karigarSelectRef}
                value={header.karigarAccountId}
                onChange={(e) => setHeader((c) => ({ ...c, karigarAccountId: e.target.value }))}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              >
                <option value="">Select Karigar / Artisan</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountName} {account.mobileNumber ? `(${account.mobileNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Crafting Item */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Crafting Item *
                </label>
                {selectedItem && (
                  <span className="text-[10px] text-slate-500 font-medium">
                    {selectedItem.metalType}
                  </span>
                )}
              </div>
              <select
                ref={itemSelectRef}
                value={header.itemId}
                onChange={(e) => handleItemSelect(e.target.value)}
                onKeyDown={(e) => focusNextOnEnter(e, grossWeightInputRef.current)}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              >
                <option value="">Select Item ({header.metalType})</option>
                {activeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.itemName}
                  </option>
                ))}
              </select>
            </div>

            {/* Planned Pcs */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Planned Pcs *
              </label>
              <input
                value={header.expectedPcs}
                onChange={(e) => {
                  if (isValidAmountInput(e.target.value)) {
                    setHeader((c) => ({ ...c, expectedPcs: e.target.value }))
                  }
                }}
                placeholder="1"
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono font-bold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />
            </div>

            {/* Gross Weight Given */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Gr. Wt. Given (g) *
              </label>
              <input
                ref={grossWeightInputRef}
                value={header.grossWeightGiven}
                onChange={(e) => handleGrossWeightChange(e.target.value)}
                onKeyDown={(e) => focusNextOnEnter(e, netWeightInputRef.current)}
                placeholder="0.000"
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono font-bold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />
            </div>

            {/* Net Weight Given */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Net Wt. Given (g) *
              </label>
              <input
                ref={netWeightInputRef}
                value={header.netWeightGiven}
                onChange={(e) => handleNetWeightChange(e.target.value)}
                onKeyDown={(e) => focusNextOnEnter(e, tunchInputRef.current)}
                placeholder="0.000"
                className="w-full h-8.5 px-2.5 text-xs bg-amber-50/40 border border-amber-200/80 rounded-lg text-right font-mono font-bold text-amber-900 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />
            </div>

            {/* Tunch % Given & Fine Preview */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Purity / Touch %
                </label>
                {computedFineGiven > 0 && (
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100/70 px-1 py-0.1 rounded">
                    {formatWeight(computedFineGiven)}g Pure
                  </span>
                )}
              </div>
              <input
                ref={tunchInputRef}
                value={header.tunchGiven}
                onChange={(e) => handleTunchChange(e.target.value)}
                onKeyDown={(e) => focusNextOnEnter(e, narrationInputRef.current)}
                placeholder={header.metalType === 'Gold' ? '91.60' : '92.50'}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono font-bold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />
            </div>

            {/* Narration / Crafting Instructions */}
            <div className="lg:col-span-6">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Narration / Crafting Instructions / Design Details
              </label>
              <input
                ref={narrationInputRef}
                value={header.narration}
                onChange={(e) => setHeader((c) => ({ ...c, narration: e.target.value }))}
                placeholder="e.g., Make Pair of Antique Payal with ghungroo bells, rhodium finish, wastage 8% agreed..."
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* Action Button Row */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {computedFineGiven > 0 && (
                <span>
                  Pure Fine Metal issued to artisan:{' '}
                  <strong className="text-amber-900 font-mono">{formatWeight(computedFineGiven)} g</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => void resetForm()}
                disabled={saving}
                className="h-8 px-4 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={() => void handleSaveOrder()}
                disabled={saving}
                className="h-8 px-5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span> Saving...
                  </>
                ) : editingId ? (
                  <>
                    <span>✓</span> Update Order
                  </>
                ) : (
                  <>
                    <span>＋</span> Save & Issue Metal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── BOTTOM SECTION: JOB WORK REGISTER PANEL ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          {/* Section Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Job Work Orders Register
                </h2>
                <span className="text-[11px] text-slate-500 font-medium">
                  ({filteredOrders.length} of {orders.length} orders)
                </span>
              </div>

              {/* Action Buttons: Export CSV & Refresh */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportCSV}
                  className="h-8 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Export filtered records to CSV"
                >
                  <span>📊</span> Export CSV
                </button>

                <button
                  type="button"
                  onClick={() => void loadOrders()}
                  disabled={loading}
                  className="h-8 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Reload Orders"
                >
                  <span>🔄</span> Refresh
                </button>
              </div>
            </div>

            {/* Filter Pills and Dropdown Controls */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {/* Status Segmented Tabs */}
              <div className="inline-flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    statusFilter === 'ALL'
                      ? 'bg-white text-slate-800 shadow-2xs border-slate-200/90 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                  }`}
                >
                  All ({statusCounts.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    statusFilter === 'pending'
                      ? 'bg-amber-100/90 text-amber-900 shadow-2xs border-amber-300 font-bold'
                      : 'border-transparent text-amber-700 hover:text-amber-900 hover:bg-amber-50'
                  }`}
                >
                  Pending ({statusCounts.pending})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('partial_received')}
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    statusFilter === 'partial_received'
                      ? 'bg-blue-100/90 text-blue-900 shadow-2xs border-blue-300 font-bold'
                      : 'border-transparent text-blue-700 hover:text-blue-900 hover:bg-blue-50'
                  }`}
                >
                  Partial ({statusCounts.partial})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('received')}
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    statusFilter === 'received'
                      ? 'bg-emerald-100/90 text-emerald-900 shadow-2xs border-emerald-300 font-bold'
                      : 'border-transparent text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  Closed ({statusCounts.received})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('OVERDUE')}
                  className={`h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    statusFilter === 'OVERDUE'
                      ? 'bg-amber-200/90 text-amber-950 shadow-2xs border-amber-400 font-bold'
                      : 'border-transparent text-amber-800 hover:bg-amber-100/50'
                  }`}
                >
                  ⚠️ Overdue ({statusCounts.overdue})
                </button>
              </div>

              {/* Karigar Filter Dropdown */}
              <select
                value={karigarFilter}
                onChange={(e) => setKarigarFilter(e.target.value)}
                className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium shadow-2xs"
              >
                <option value="ALL">All Karigars ({karigarOptions.length})</option>
                {karigarOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>

              {/* Metal Filter Dropdown */}
              <select
                value={metalFilter}
                onChange={(e) => setMetalFilter(e.target.value)}
                className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium shadow-2xs"
              >
                <option value="ALL">All Metals</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Diamond">Diamond</option>
                <option value="Other">Other</option>
              </select>

              {/* Date Filter Dropdown */}
              <select
                value={dateRangeFilter}
                onChange={(e) =>
                  setDateRangeFilter(e.target.value as 'ALL' | 'TODAY' | 'THIS_MONTH' | 'CUSTOM')
                }
                className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium shadow-2xs"
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="CUSTOM">Custom Date</option>
              </select>

              {dateRangeFilter === 'CUSTOM' && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                    title="From Date"
                  />
                  <span className="text-slate-400 text-xs">-</span>
                  <input
                    type="date"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                    title="To Date"
                  />
                </div>
              )}

              {/* Search Bar */}
              <div className="relative ml-auto">
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search order no, karigar, item, mobile..."
                  className="w-60 h-8 pl-7 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                />
                <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText('')}
                    className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">Sr</th>
                  <th className="py-2.5 px-3">Order No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Karigar / Artisan</th>
                  <th className="py-2.5 px-3">Item & Pcs</th>
                  <th className="py-2.5 px-3">Metal</th>
                  <th className="py-2.5 px-3 text-right">Gr. Given</th>
                  <th className="py-2.5 px-3 text-right">Net Given</th>
                  <th className="py-2.5 px-3 text-right">Fine Given</th>
                  <th className="py-2.5 px-3 text-right">Net Received</th>
                  <th className="py-2.5 px-3 text-right">Balance Metal</th>
                  <th className="py-2.5 px-3 text-right">Majuri (₹)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={15} className="py-10 text-center text-slate-400">
                      <span className="inline-block animate-spin text-base mr-2">⏳</span>
                      Loading job work orders...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-12 text-center text-slate-400">
                      <div className="text-2xl mb-1">📋</div>
                      {searchText || statusFilter !== 'ALL' || karigarFilter !== 'ALL'
                        ? 'No matching job work orders found for the active filter.'
                        : 'No job work orders recorded yet. Issue metal above to get started.'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => {
                    const statusConfig = getStatusBadge(order.status)
                    const netGiven = Number(order.net_weight_given || 0)
                    const netReceived = Number(order.total_net_weight_received || 0)
                    const balanceWeight = Math.max(0, netGiven - netReceived)
                    const dueInfo = getDaysRemaining(order.due_date)

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-amber-50/30 transition-colors duration-75"
                      >
                        {/* Sr */}
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>

                        {/* Order No */}
                        <td className="py-2 px-3 font-mono font-bold text-amber-900 whitespace-nowrap">
                          {order.order_no}
                        </td>

                        {/* Date */}
                        <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                          {formatDate(order.order_date)}
                        </td>

                        {/* Due Date & Overdue Badge */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {order.due_date ? (
                            <div>
                              <div className="text-slate-700 font-medium">{formatDate(order.due_date)}</div>
                              {order.status !== 'received' && (
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                    dueInfo.isOverdue
                                      ? 'bg-amber-200/90 text-amber-950 border border-amber-300'
                                      : dueInfo.isToday
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {dueInfo.text}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Karigar Name */}
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-800">{order.karigar_name}</div>
                          {order.karigar_mobile && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              📱 {order.karigar_mobile}
                            </div>
                          )}
                        </td>

                        {/* Item & Pcs */}
                        <td className="py-2 px-3 font-medium text-slate-800">
                          <div>{order.item_name}</div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Qty: {order.expected_pcs || 1} pcs
                          </span>
                        </td>

                        {/* Metal */}
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              order.metal_type === 'Gold'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : order.metal_type === 'Silver'
                                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                                  : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                            }`}
                          >
                            {order.metal_type}
                          </span>
                        </td>

                        {/* Gr. Given */}
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatWeight(order.gross_weight_given)}
                        </td>

                        {/* Net Given */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                          {formatWeight(order.net_weight_given)}
                        </td>

                        {/* Fine Given */}
                        <td className="py-2 px-3 text-right font-mono text-amber-800">
                          {order.fine_weight_given && order.fine_weight_given > 0 ? (
                            <span>
                              {formatWeight(order.fine_weight_given)}
                              {order.tunch_given ? (
                                <span className="text-[10px] text-slate-400 block font-sans">
                                  @{order.tunch_given}%
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Net Received */}
                        <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">
                          {formatWeight(order.total_net_weight_received)}
                        </td>

                        {/* Balance Metal */}
                        <td className="py-2 px-3 text-right font-mono">
                          {balanceWeight > 0 ? (
                            <span className="font-bold text-amber-700 bg-amber-50/70 px-1.5 py-0.5 rounded border border-amber-200/60">
                              {formatWeight(balanceWeight)} g
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              ✓ Closed
                            </span>
                          )}
                        </td>

                        {/* Majuri */}
                        <td className="py-2 px-3 text-right font-mono text-slate-800">
                          ₹{formatCurrency(order.total_majuri)}
                        </td>

                        {/* Status */}
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                          >
                            {statusConfig.label}
                          </span>
                        </td>

                        {/* Action Buttons Column */}
                        <td className="py-2 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            {/* View Details */}
                            <button
                              type="button"
                              onClick={() => void handleOpenDetail(order)}
                              disabled={opening}
                              className="h-7 px-2 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                              title="View Order Details & History"
                            >
                              <span>👁️</span> View
                            </button>

                            {/* Receive Goods */}
                            {(order.status === 'pending' || order.status === 'partial_received') && (
                              <button
                                type="button"
                                onClick={() => void handleOpenReceive(order)}
                                disabled={opening}
                                className="h-7 px-2 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                                title="Record Goods Received"
                              >
                                <span>📥</span> Receive
                              </button>
                            )}

                            {/* Print Challan / Issue Slip */}
                            <button
                              type="button"
                              onClick={() => handleOpenPrint(order)}
                              className="h-7 px-2 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                              title="Print Karigar Delivery Challan"
                            >
                              <span>🖨️</span> Print
                            </button>

                            {/* Edit Order */}
                            {order.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => void handleEditOrder(order)}
                                disabled={opening || saving}
                                className="h-7 px-2 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="Edit Job Work Order"
                              >
                                <span>✏️</span> Edit
                              </button>
                            )}

                            {/* Delete Order */}
                            {order.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(order)}
                                disabled={deleting}
                                className="h-7 px-2 text-[11px] font-semibold text-slate-600 hover:text-rose-700 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center"
                                title="Delete Order"
                              >
                                <span>🗑️</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>

              {/* Table Footer Summary Row */}
              {filteredOrders.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800 text-[11px] shadow-xs">
                  <tr>
                    <td colSpan={7} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-600">
                      Total ({filteredOrders.length} orders):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {formatWeight(registerTotals.grossWeightGiven)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                      {formatWeight(registerTotals.netWeightGiven)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                      {formatWeight(registerTotals.fineWeightGiven)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                      {formatWeight(registerTotals.netWeightReceived)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                      {formatWeight(registerTotals.balanceWeight)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      ₹{formatCurrency(registerTotals.totalMajuri)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Statutory Compliance Footer Note */}
          <div className="p-3 bg-amber-50/50 border-t border-amber-100/60 text-[11px] text-amber-900/80 flex items-center gap-2">
            <span className="text-sm">ℹ️</span>
            <span>
              <strong>Job Work Accounting & GST Rule 55 Note:</strong> Sending gold/silver to a karigar for job-work is non-taxable and accompanied by a Delivery Challan. Stock increases in pure fine metal and financial liability for crafting labour (majuri) posts automatically to the Karigar&apos;s ledger upon recording goods receipt.
            </span>
          </div>
        </div>
      </div>

      {/* ── CONFIRM DELETE DIALOG ── */}
      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Job Work Order?"
        message={
          deleteTarget
            ? `Are you sure you want to delete job work order "${deleteTarget.order_no}" for "${deleteTarget.karigar_name}"?`
            : ''
        }
        confirmText="Delete Order"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null)
        }}
      />

      {/* ── DETAIL VIEW MODAL ── */}
      {detailRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col my-auto max-h-[90vh]">
            {/* Modal Header */}
            <div className="h-12 px-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-base">📋</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Job Work Order Details: {detailRecord.header.order_no}
                </h3>
                {(() => {
                  const badge = getStatusBadge(detailRecord.header.status)
                  return (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {badge.label}
                    </span>
                  )
                })()}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPrint(detailRecord.header)}
                  className="h-7 px-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <span>🖨️</span> Print Slip
                </button>
                <button
                  type="button"
                  onClick={() => setDetailRecord(null)}
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Order Information Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Karigar Name
                  </span>
                  <strong className="text-slate-800">{detailRecord.header.karigar_name}</strong>
                  {detailRecord.header.karigar_mobile && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      📱 {detailRecord.header.karigar_mobile}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Crafting Item / Metal
                  </span>
                  <strong className="text-slate-800">
                    {detailRecord.header.item_name} ({detailRecord.header.metal_type})
                  </strong>
                  <div className="text-[10px] text-slate-400">
                    Planned: {detailRecord.header.expected_pcs || 1} pcs
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Order / Due Date
                  </span>
                  <strong className="text-slate-800">
                    {formatDate(detailRecord.header.order_date)}
                  </strong>
                  {detailRecord.header.due_date && (
                    <div className="text-[10px] text-amber-700 font-medium">
                      Due: {formatDate(detailRecord.header.due_date)}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Net Weight Given
                  </span>
                  <strong className="text-amber-800 font-mono font-bold">
                    {formatWeight(detailRecord.header.net_weight_given)} g
                  </strong>
                  {detailRecord.header.tunch_given && detailRecord.header.tunch_given > 0 && (
                    <div className="text-[10px] text-amber-700 font-mono">
                      @{detailRecord.header.tunch_given}% ({formatWeight(detailRecord.header.fine_weight_given)}g Fine)
                    </div>
                  )}
                </div>
              </div>

              {detailRecord.header.narration && (
                <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/60 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block mb-0.5">
                    Crafting Instructions
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {detailRecord.header.narration}
                  </p>
                </div>
              )}

              {/* Receipts Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Received Goods History ({detailRecord.receiptLines.length} entries)
                  </h4>
                  <div className="flex items-center gap-3 text-xs font-mono font-semibold">
                    <span className="text-slate-600">
                      Total Recv:{' '}
                      <strong className="text-emerald-700">
                        {formatWeight(detailRecord.header.total_net_weight_received)} g
                      </strong>
                    </span>
                    <span className="text-slate-600">
                      Balance:{' '}
                      <strong className="text-amber-700">
                        {formatWeight(
                          Math.max(
                            0,
                            Number(detailRecord.header.net_weight_given || 0) -
                              Number(detailRecord.header.total_net_weight_received || 0)
                          )
                        )}{' '}
                        g
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 text-center">Sr</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3 text-right">Pcs</th>
                        <th className="py-2 px-3 text-right">Gr. Wt</th>
                        <th className="py-2 px-3 text-right">Net Wt</th>
                        <th className="py-2 px-3 text-right">Tunch%</th>
                        <th className="py-2 px-3 text-right">Wstg%</th>
                        <th className="py-2 px-3 text-right">Fine</th>
                        <th className="py-2 px-3 text-right">Loss</th>
                        <th className="py-2 px-3 text-right">Majuri</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {detailRecord.receiptLines.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-6 text-center text-slate-400">
                            No receipts recorded yet against this order.
                          </td>
                        </tr>
                      ) : (
                        detailRecord.receiptLines.map((line, index) => (
                          <tr key={line.id} className="hover:bg-slate-50/60">
                            <td className="py-1.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {index + 1}
                            </td>
                            <td className="py-1.5 px-3">{formatDate(line.receipt_date)}</td>
                            <td className="py-1.5 px-3 text-right font-mono">{line.pcs}</td>
                            <td className="py-1.5 px-3 text-right font-mono">
                              {formatWeight(line.gross_weight_received)}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-800">
                              {formatWeight(line.net_weight_received)}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono">{line.tunch}%</td>
                            <td className="py-1.5 px-3 text-right font-mono">{line.wastage}%</td>
                            <td className="py-1.5 px-3 text-right font-mono text-amber-800 font-semibold">
                              {formatWeight(line.fine_received)}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono text-slate-500">
                              {formatWeight(line.weight_loss)}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-800">
                              ₹{formatCurrency(line.majuri)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="h-12 px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setDetailRecord(null)}
                className="h-8 px-4 text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECEIVE GOODS MODAL ── */}
      {receiveTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col my-auto max-h-[92vh]">
            {/* Modal Header */}
            <div className="h-12 px-5 bg-emerald-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base">📥</span>
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Receive Finished Goods - Order {receiveTarget.header.order_no}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setReceiveTarget(null)}
                className="w-7 h-7 flex items-center justify-center text-emerald-100 hover:text-white hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Order Context Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                    Karigar
                  </span>
                  <strong className="text-slate-800">{receiveTarget.header.karigar_name}</strong>
                  {receiveTarget.header.karigar_mobile && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      📱 {receiveTarget.header.karigar_mobile}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Item</span>
                  <strong className="text-slate-800">
                    {receiveTarget.header.item_name} ({receiveTarget.header.metal_type})
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                    Net Wt. Given
                  </span>
                  <strong className="text-slate-800 font-mono">
                    {formatWeight(receiveTarget.header.net_weight_given)} g
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                    Outstanding Balance
                  </span>
                  <strong className="text-amber-800 font-mono font-bold">
                    {formatWeight(
                      Math.max(
                        0,
                        Number(receiveTarget.header.net_weight_given || 0) -
                          Number(receiveTarget.header.total_net_weight_received || 0)
                      )
                    )}{' '}
                    g
                  </strong>
                </div>
              </div>

              {/* Entry Fields */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Receipt Date *
                  </label>
                  <input
                    type="date"
                    value={receiptForm.receiptDate}
                    onChange={(e) =>
                      setReceiptForm((c) => ({ ...c, receiptDate: e.target.value }))
                    }
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Pcs Received *
                  </label>
                  <input
                    ref={receiptPcsInputRef}
                    value={receiptForm.pcs}
                    onChange={(e) => handleReceiptDecimalChange(e.target.value, 'pcs')}
                    onKeyDown={(e) => focusNextOnEnter(e, receiptGrossInputRef.current)}
                    placeholder="1"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Gross Wt. (g) *
                  </label>
                  <input
                    ref={receiptGrossInputRef}
                    value={receiptForm.grossWeightReceived}
                    onChange={(e) =>
                      handleReceiptDecimalChange(e.target.value, 'grossWeightReceived')
                    }
                    onKeyDown={(e) => focusNextOnEnter(e, receiptNetInputRef.current)}
                    placeholder="0.000"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                    Net Wt. (g) *
                  </label>
                  <input
                    ref={receiptNetInputRef}
                    value={receiptForm.netWeightReceived}
                    onChange={(e) =>
                      handleReceiptDecimalChange(e.target.value, 'netWeightReceived')
                    }
                    onKeyDown={(e) => focusNextOnEnter(e, receiptTunchInputRef.current)}
                    placeholder="0.000"
                    className="w-full h-8 px-2 text-xs bg-emerald-50/50 border border-emerald-200 rounded-lg text-right font-mono font-bold text-emerald-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Tunch %
                  </label>
                  <input
                    ref={receiptTunchInputRef}
                    value={receiptForm.tunch}
                    onChange={(e) => handleReceiptDecimalChange(e.target.value, 'tunch')}
                    onKeyDown={(e) => focusNextOnEnter(e, receiptWastageInputRef.current)}
                    placeholder="92.00"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Wastage %
                  </label>
                  <input
                    ref={receiptWastageInputRef}
                    value={receiptForm.wastage}
                    onChange={(e) => handleReceiptDecimalChange(e.target.value, 'wastage')}
                    onKeyDown={(e) => focusNextOnEnter(e, receiptLabourRateInputRef.current)}
                    placeholder="0.00"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                    Hishob %
                  </label>
                  <input
                    value={receiptPreview.hishob}
                    disabled
                    className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-slate-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Labour Rate (₹)
                  </label>
                  <input
                    ref={receiptLabourRateInputRef}
                    value={receiptForm.labourRate}
                    onChange={(e) => handleReceiptDecimalChange(e.target.value, 'labourRate')}
                    placeholder="0"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Labour Unit
                  </label>
                  <select
                    value={receiptForm.labourRateType}
                    onChange={(e) =>
                      setReceiptForm((c) => ({
                        ...c,
                        labourRateType: e.target.value as LabourRateType
                      }))
                    }
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                  >
                    <option value="Kg">Per Kg</option>
                    <option value="Gm">Per Gm</option>
                    <option value="Pcs">Per Pcs</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Receipt Narration / Remarks
                  </label>
                  <input
                    value={receiptForm.narration}
                    onChange={(e) => setReceiptForm((c) => ({ ...c, narration: e.target.value }))}
                    placeholder="e.g., Finished ornaments received, polished condition..."
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              {/* Real-time Calculation Preview Card */}
              <div className="grid grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-center">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">
                    Fine Received
                  </span>
                  <div className="text-sm font-mono font-bold text-amber-900 mt-0.5">
                    {formatWeight(receiptPreview.fine)} g
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Post-Recv Balance
                  </span>
                  <div className="text-sm font-mono font-bold text-slate-800 mt-0.5">
                    {formatWeight(receiptPreview.remainingBalance)} g
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Total Loss / Shortage
                  </span>
                  <div className="text-sm font-mono font-bold text-slate-700 mt-0.5">
                    {formatWeight(receiptPreview.weightLoss)} g
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                    Total Majuri
                  </span>
                  <div className="text-sm font-mono font-bold text-emerald-900 mt-0.5">
                    ₹{formatCurrency(receiptPreview.majuri)}
                  </div>
                </div>
              </div>

              {/* History of Existing Receipts */}
              {receiveTarget.receiptLines.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Previous Receipts for this Order ({receiveTarget.receiptLines.length})
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-1.5 px-2.5 text-center">Sr</th>
                          <th className="py-1.5 px-2.5">Date</th>
                          <th className="py-1.5 px-2.5 text-right">Pcs</th>
                          <th className="py-1.5 px-2.5 text-right">Net Wt</th>
                          <th className="py-1.5 px-2.5 text-right">Fine</th>
                          <th className="py-1.5 px-2.5 text-right">Majuri</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {receiveTarget.receiptLines.map((line, idx) => (
                          <tr key={line.id}>
                            <td className="py-1 px-2.5 text-center text-slate-400 font-mono text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="py-1 px-2.5">{formatDate(line.receipt_date)}</td>
                            <td className="py-1 px-2.5 text-right font-mono">{line.pcs}</td>
                            <td className="py-1 px-2.5 text-right font-mono font-semibold">
                              {formatWeight(line.net_weight_received)}
                            </td>
                            <td className="py-1 px-2.5 text-right font-mono">
                              {formatWeight(line.fine_received)}
                            </td>
                            <td className="py-1 px-2.5 text-right font-mono font-bold text-emerald-800">
                              ₹{formatCurrency(line.majuri)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="h-12 px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setReceiveTarget(null)}
                disabled={receiving}
                className="h-8 px-4 text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSaveReceipt()}
                disabled={receiving}
                className="h-8 px-5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {receiving ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span> Recording...
                  </>
                ) : (
                  <>
                    <span>✓</span> Save Goods Receipt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── KARIGAR ISSUE DELIVERY CHALLAN PRINT MODAL (RULE 55 / ITC-04) ── */}
      {printTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col my-auto max-h-[95vh]">
            {/* Modal Actions Bar (hidden on paper print) */}
            <div className="h-12 px-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-base">🖨️</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Print Karigar Issue Delivery Challan ({printTarget.order_no})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-8 px-4 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>🖨️</span> Print Voucher
                </button>
                <button
                  type="button"
                  onClick={() => setPrintTarget(null)}
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 overflow-y-auto font-sans text-slate-800 space-y-4">
              {/* Document Header */}
              <div className="text-center pb-4 border-b-2 border-slate-800">
                <h2 className="text-xl font-bold uppercase tracking-wide text-slate-900">
                  SHREE JEWELLERY
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Manufacturers, Wholesalers & Retailers of Gold, Silver & Diamond Ornaments
                </p>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-center gap-4">
                  <span>GSTIN: 24AAACS1234F1Z1</span>
                  <span>•</span>
                  <span>Contact: +91 98765 43210</span>
                </div>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded-md text-[11px] font-bold uppercase tracking-widest text-slate-800">
                  JOB WORK ISSUE CHALLAN / KARIGAR OUT SLIP
                  <span className="block text-[9px] font-normal tracking-normal text-slate-500">
                    (Issued under GST Rule 55 / Section 143 for job-work purposes)
                  </span>
                </div>
              </div>

              {/* Order & Karigar Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Issued To (Artisan / Karigar)
                  </span>
                  <div className="font-bold text-sm text-slate-900">{printTarget.karigar_name}</div>
                  {printTarget.karigar_mobile && (
                    <div className="text-slate-600 font-mono">📱 Mobile: {printTarget.karigar_mobile}</div>
                  )}
                  {printTarget.karigar_address && (
                    <div className="text-slate-500 text-[11px]">{printTarget.karigar_address}</div>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-right">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Challan / Order No: </span>
                    <strong className="font-mono text-sm text-amber-900">{printTarget.order_no}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Issue Date: </span>
                    <strong className="font-mono">{formatDate(printTarget.order_date)}</strong>
                  </div>
                  {printTarget.due_date && (
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Promised Due Date: </span>
                      <strong className="font-mono text-amber-800">{formatDate(printTarget.due_date)}</strong>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Status: </span>
                    <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      {printTarget.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Crafting Specification Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-[11px] font-bold text-slate-800 uppercase border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3 text-center">Metal</th>
                      <th className="py-2 px-3 text-right">Planned Pcs</th>
                      <th className="py-2 px-3 text-right">Gross Wt Given</th>
                      <th className="py-2 px-3 text-right">Net Wt Given</th>
                      <th className="py-2 px-3 text-right">Purity / Touch</th>
                      <th className="py-2 px-3 text-right">Fine Metal (Pure)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{printTarget.item_name}</td>
                      <td className="py-2.5 px-3 text-center">{printTarget.metal_type}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{printTarget.expected_pcs || 1} pcs</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {formatWeight(printTarget.gross_weight_given)} g
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatWeight(printTarget.net_weight_given)} g
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {printTarget.tunch_given && printTarget.tunch_given > 0
                          ? `${printTarget.tunch_given}%`
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">
                        {printTarget.fine_weight_given && printTarget.fine_weight_given > 0
                          ? `${formatWeight(printTarget.fine_weight_given)} g`
                          : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Special Instructions */}
              {printTarget.narration && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                    Special Crafting & Manufacturing Instructions
                  </span>
                  <p className="text-slate-800 font-medium leading-relaxed italic">
                    &ldquo;{printTarget.narration}&rdquo;
                  </p>
                </div>
              )}

              {/* Statutory Terms & Conditions */}
              <div className="text-[10px] text-slate-500 bg-slate-50/60 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                <strong>Declaration & Terms:</strong>
                <ol className="list-decimal pl-4 mt-0.5 space-y-0.5">
                  <li>The precious metal described above is delivered strictly for job work / manufacturing purposes and is not a sale.</li>
                  <li>Title and property in the goods remain with the principal firm at all times.</li>
                  <li>Any metal shortage or filing loss exceeding the agreed standard tolerance will be recovered financially or in pure metal from the artisan.</li>
                  <li>Finished ornaments must be returned on or before the agreed delivery date in sound crafted condition.</li>
                </ol>
              </div>

              {/* Signatures */}
              <div className="pt-8 border-t border-slate-300 grid grid-cols-2 text-center text-xs text-slate-600">
                <div>
                  <div className="border-b border-slate-400 w-3/4 mx-auto mb-1.5" />
                  <span className="font-bold text-slate-800">Artisan / Karigar Signature</span>
                  <p className="text-[10px] text-slate-400">Received metal in good condition</p>
                </div>

                <div>
                  <div className="border-b border-slate-400 w-3/4 mx-auto mb-1.5" />
                  <span className="font-bold text-slate-800">For Shree Jewellery</span>
                  <p className="text-[10px] text-slate-400">Authorized Signatory</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="h-12 px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0 print:hidden">
              <button
                type="button"
                onClick={() => setPrintTarget(null)}
                className="h-8 px-4 text-xs font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-8 px-4 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>🖨️</span> Print Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobWorkScreen
