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

const initialHeader = {
  orderNo: '',
  orderDate: getTodayDate(),
  karigarAccountId: '',
  metalType: 'Silver' as MetalType,
  itemId: '',
  grossWeightGiven: '',
  netWeightGiven: '',
  narration: ''
}

const initialReceiptForm = {
  receiptDate: getTodayDate(),
  pcs: '',
  grossWeightReceived: '',
  netWeightReceived: '',
  tunch: '',
  wastage: '',
  labourRate: '',
  labourRateType: 'Kg' as LabourRateType,
  narration: ''
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

function formatWeight(value: number): string {
  return Number(value || 0).toFixed(3)
}

function formatCurrency(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDate(value: string): string {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
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
        label: 'Received',
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200'
      }
    case 'cancelled':
      return {
        label: 'Cancelled',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200'
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

function JobWorkScreen({ onClose }: { onClose?: () => void }): React.JSX.Element {
  const [header, setHeader] = useState(initialHeader)
  const [receiptForm, setReceiptForm] = useState(initialReceiptForm)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [orders, setOrders] = useState<JobWorkRegisterRecord[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JobWorkRegisterRecord | null>(null)
  const [receiveTarget, setReceiveTarget] = useState<SavedJobWorkRecord | null>(null)
  const [detailRecord, setDetailRecord] = useState<SavedJobWorkRecord | null>(null)

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | JobWorkStatus>('ALL')

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

  const filteredOrders = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return orders.filter((order) => {
      const statusMatch = statusFilter === 'ALL' || order.status === statusFilter
      const keywordMatch =
        !keyword ||
        order.order_no.toLowerCase().includes(keyword) ||
        (order.karigar_name || '').toLowerCase().includes(keyword) ||
        (order.karigar_mobile || '').toLowerCase().includes(keyword) ||
        (order.item_name || '').toLowerCase().includes(keyword) ||
        (order.metal_type || '').toLowerCase().includes(keyword) ||
        (order.order_date || '').toLowerCase().includes(keyword)

      return statusMatch && keywordMatch
    })
  }, [orders, searchText, statusFilter])

  const statusCounts = useMemo(() => {
    return orders.reduce(
      (counts, order) => {
        counts.total += 1
        if (order.status === 'pending') counts.pending += 1
        else if (order.status === 'partial_received') counts.partial += 1
        else if (order.status === 'received') counts.received += 1
        else if (order.status === 'cancelled') counts.cancelled += 1
        return counts
      },
      { total: 0, pending: 0, partial: 0, received: 0, cancelled: 0 }
    )
  }, [orders])

  // Register summary totals
  const registerTotals = useMemo(() => {
    return filteredOrders.reduce(
      (acc, o) => {
        const givenGross = Number(o.gross_weight_given || 0)
        const givenNet = Number(o.net_weight_given || 0)
        const receivedNet = Number(o.total_net_weight_received || 0)
        const balance = Math.max(0, givenNet - receivedNet)
        const majuri = Number(o.total_majuri || 0)

        acc.grossWeightGiven += givenGross
        acc.netWeightGiven += givenNet
        acc.netWeightReceived += receivedNet
        acc.balanceWeight += balance
        acc.totalMajuri += majuri
        return acc
      },
      {
        grossWeightGiven: 0,
        netWeightGiven: 0,
        netWeightReceived: 0,
        balanceWeight: 0,
        totalMajuri: 0
      }
    )
  }, [filteredOrders])

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
    const weightLoss = receiveTarget
      ? Number(receiveTarget.header.net_weight_given || 0) -
        (Number(receiveTarget.header.total_net_weight_received || 0) + netWeight)
      : 0

    return { hishob, fine, majuri, weightLoss }
  }, [receiptForm, receiveTarget])

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
      // Auto fill Net Weight if it's currently empty or matched gross weight
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

  const handleReceiptDecimalChange = (
    value: string,
    fieldName: 'pcs' | 'grossWeightReceived' | 'netWeightReceived' | 'tunch' | 'wastage' | 'labourRate'
  ): void => {
    if (!isValidAmountInput(value)) return

    setReceiptForm((current) => {
      const updated = { ...current, [fieldName]: value }
      // Auto-sync net weight received from gross weight received if net is empty or was equal
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
    setHeader((current) => ({ ...current, metalType, itemId: '' }))
  }

  const handleItemSelect = (itemId: string): void => {
    setHeader((current) => ({ ...current, itemId }))
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
    setHeader(initialHeader)
    await loadNextNumber()
  }

  const buildPayload = (): JobWorkOrderPayload => {
    return {
      orderDate: header.orderDate,
      karigarAccountId: header.karigarAccountId,
      metalType: header.metalType,
      itemId: header.itemId,
      grossWeightGiven: toNumber(header.grossWeightGiven),
      netWeightGiven: toNumber(header.netWeightGiven),
      narration: header.narration
    }
  }

  const handleSaveOrder = async (): Promise<void> => {
    if (!validateOrder()) return

    try {
      setSaving(true)
      const payload = buildPayload()

      if (editingId) {
        await window.api.jobWork.update(editingId, payload)
      } else {
        await window.api.jobWork.create(payload)
      }

      showAlert(
        'success',
        editingId ? `Job work order ${header.orderNo} updated.` : `Job work order ${header.orderNo} saved successfully.`
      )
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
        karigarAccountId: record.header.karigar_account_id,
        metalType: record.header.metal_type as MetalType,
        itemId: record.header.item_id,
        grossWeightGiven:
          record.header.gross_weight_given === 0 ? '' : String(record.header.gross_weight_given),
        netWeightGiven:
          record.header.net_weight_given === 0 ? '' : String(record.header.net_weight_given),
        narration: record.header.narration || ''
      })

      showAlert('success', `Editing job work order ${record.header.order_no}.`)
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
      // Pre-fill initial receipt form with standard defaults
      const remainingBalance = Math.max(
        0,
        Number(record.header.net_weight_given || 0) - Number(record.header.total_net_weight_received || 0)
      )
      setReceiptForm({
        ...initialReceiptForm,
        receiptDate: getTodayDate(),
        pcs: '1',
        grossWeightReceived: remainingBalance > 0 ? String(remainingBalance) : '',
        netWeightReceived: remainingBalance > 0 ? String(remainingBalance) : ''
      })
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
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
      showAlert('success', `Receipt recorded against job work order ${updated.header.order_no}.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setReceiving(false)
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
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* ── TOP HEADER BAR ── */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-lg shadow-2xs font-bold">
            ⚒️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                Job Work (Karigar Out / Receipt)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100/70 text-amber-900 border border-amber-300/60">
                {editingId ? `Editing ${header.orderNo}` : header.orderNo || 'JW-0001'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Track raw metal given to karigars, monitor balances, and record finished goods receipt with fine & majuri
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
              <span>✕</span> Clear Edit
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
        {/* Top Section: Job Work Order (Material Out) Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {editingId ? `Edit Job Work Order (${header.orderNo})` : 'Job Work Order (Material Out)'}
              </h2>
            </div>

            {/* Invariant segmented metal pills with zero layout shift */}
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

            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Karigar Account *
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

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Gr. Wt. Given *
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

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Net Wt. Given *
              </label>
              <input
                ref={netWeightInputRef}
                value={header.netWeightGiven}
                onChange={(e) => handleNetWeightChange(e.target.value)}
                onKeyDown={(e) => focusNextOnEnter(e, narrationInputRef.current)}
                placeholder="0.000"
                className="w-full h-8.5 px-2.5 text-xs bg-amber-50/40 border border-amber-200/80 rounded-lg text-right font-mono font-bold text-amber-900 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />
            </div>

            <div className="lg:col-span-4">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Narration / Crafting Instructions
              </label>
              <input
                ref={narrationInputRef}
                value={header.narration}
                onChange={(e) => setHeader((c) => ({ ...c, narration: e.target.value }))}
                placeholder="e.g., Design pattern, making pair of payal, size details, wastage agreement..."
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* Action Button Row */}
          <div className="flex items-center justify-end gap-2.5 mt-4 pt-3 border-t border-slate-100">
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
                  <span>＋</span> Save Order
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Section: Job Work Register Panel */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          {/* Section Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Job Work Orders Register
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                ({filteredOrders.length} records)
              </span>
            </div>

            {/* Filter Pills & Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Status Pills */}
              <div className="inline-flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`h-6 px-2 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
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
                  className={`h-6 px-2 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
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
                  className={`h-6 px-2 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
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
                  className={`h-6 px-2 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    statusFilter === 'received'
                      ? 'bg-emerald-100/90 text-emerald-900 shadow-2xs border-emerald-300 font-bold'
                      : 'border-transparent text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  Received ({statusCounts.received})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('cancelled')}
                  className={`h-6 px-2 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    statusFilter === 'cancelled'
                      ? 'bg-rose-100/90 text-rose-900 shadow-2xs border-rose-300 font-bold'
                      : 'border-transparent text-rose-700 hover:text-rose-900 hover:bg-rose-50'
                  }`}
                >
                  Cancelled ({statusCounts.cancelled})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search order no, karigar, item, mobile..."
                  className="w-56 h-8 pl-7 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
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

              {/* Refresh button */}
              <button
                type="button"
                onClick={() => void loadOrders()}
                disabled={loading}
                className="h-8 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="Reload Orders"
              >
                <span>🔄</span> Refresh
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">Sr</th>
                  <th className="py-2.5 px-3">Order No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Karigar / Artisan</th>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3">Metal</th>
                  <th className="py-2.5 px-3 text-right">Gr. Wt. Given</th>
                  <th className="py-2.5 px-3 text-right">Net Wt. Given</th>
                  <th className="py-2.5 px-3 text-right">Net Wt. Received</th>
                  <th className="py-2.5 px-3 text-right">Balance Wt.</th>
                  <th className="py-2.5 px-3 text-right">Majuri (₹)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={13} className="py-8 text-center text-slate-400">
                      <span className="inline-block animate-spin text-base mr-2">⏳</span>
                      Loading job work orders...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-10 text-center text-slate-400">
                      <div className="text-2xl mb-1">📋</div>
                      {searchText || statusFilter !== 'ALL'
                        ? 'No matching job work orders found for the active filter.'
                        : 'No job work orders recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => {
                    const statusConfig = getStatusBadge(order.status)
                    const netGiven = Number(order.net_weight_given || 0)
                    const netReceived = Number(order.total_net_weight_received || 0)
                    const balanceWeight = Math.max(0, netGiven - netReceived)

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-amber-50/30 transition-colors duration-75"
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-amber-900">
                          {order.order_no}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                          {formatDate(order.order_date)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-800">{order.karigar_name}</div>
                          {order.karigar_mobile && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {order.karigar_mobile}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">{order.item_name}</td>
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
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatWeight(order.gross_weight_given)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                          {formatWeight(order.net_weight_given)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">
                          {formatWeight(order.total_net_weight_received)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {balanceWeight > 0 ? (
                            <span className="font-bold text-amber-700">
                              {formatWeight(balanceWeight)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              ✓ Closed
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800">
                          ₹{formatCurrency(order.total_majuri)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                          >
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void handleOpenDetail(order)}
                              disabled={opening}
                              className="h-6 px-2 text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                              title="View Details"
                            >
                              👁 View
                            </button>

                            {(order.status === 'pending' || order.status === 'partial_received') && (
                              <button
                                type="button"
                                onClick={() => void handleOpenReceive(order)}
                                disabled={opening}
                                className="h-6 px-2 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors cursor-pointer shadow-2xs"
                                title="Receive Goods"
                              >
                                📥 Receive
                              </button>
                            )}

                            {order.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => void handleEditOrder(order)}
                                disabled={opening || saving}
                                className="h-6 px-2 text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 rounded transition-colors cursor-pointer"
                                title="Edit Order"
                              >
                                ✏️ Edit
                              </button>
                            )}

                            {order.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(order)}
                                disabled={deleting}
                                className="h-6 px-2 text-[10px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                                title="Delete Order"
                              >
                                🗑️
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
                    <td colSpan={6} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-600">
                      Total ({filteredOrders.length} orders):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {formatWeight(registerTotals.grossWeightGiven)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                      {formatWeight(registerTotals.netWeightGiven)}
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

          {/* Informative Footer Note */}
          <div className="p-3 bg-amber-50/50 border-t border-amber-100/60 text-[11px] text-amber-900/80 flex items-center gap-2">
            <span className="text-sm">ℹ️</span>
            <span>
              <strong>Job Work Accounting & Stock Note:</strong> Sending material (Job Work Out) only tracks metal custody with the karigar without touching stock or accounts. Upon receiving finished goods (Receive Goods), inventory increases with fine metal and majuri is posted to the karigar&apos;s account.
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

              <button
                type="button"
                onClick={() => setDetailRecord(null)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
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
                      {detailRecord.header.karigar_mobile}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Item / Metal
                  </span>
                  <strong className="text-slate-800">
                    {detailRecord.header.item_name} ({detailRecord.header.metal_type})
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Order Date
                  </span>
                  <strong className="text-slate-800">
                    {formatDate(detailRecord.header.order_date)}
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Net Weight Given
                  </span>
                  <strong className="text-amber-800 font-mono font-bold">
                    {formatWeight(detailRecord.header.net_weight_given)} g
                  </strong>
                </div>
              </div>

              {/* Receipts Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Received Goods History ({detailRecord.receiptLines.length} entries)
                  </h4>
                  <span className="text-xs font-mono font-semibold text-slate-600">
                    Total Received:{' '}
                    <strong className="text-emerald-700">
                      {formatWeight(detailRecord.header.total_net_weight_received)} g
                    </strong>
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 text-center">Sr</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3 text-right">Pcs</th>
                        <th className="py-2 px-3 text-right">Gr. Wt.</th>
                        <th className="py-2 px-3 text-right">Net Wt.</th>
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
                      {receiveTarget.header.karigar_mobile}
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
                    Balance Remaining
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
                    Gross Wt. *
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
                    Net Wt. *
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
                    Labour Rate
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
                    placeholder="e.g., First lot received, balance pending..."
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              {/* Real-time Calculation Preview Card */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
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
                    Remaining Shortage / Loss
                  </span>
                  <div className="text-sm font-mono font-bold text-slate-700 mt-0.5">
                    {formatWeight(receiptPreview.weightLoss)} g
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                    Total Majuri (Making)
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
                          <th className="py-1.5 px-2.5 text-right">Net Wt.</th>
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
    </div>
  )
}

export default JobWorkScreen
