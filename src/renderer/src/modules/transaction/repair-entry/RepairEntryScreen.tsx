import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatDate, formatCurrency, formatWeight, toNumber, isValidAmountInput, getTodayDate } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'
type MetalType = 'Gold' | 'Silver' | 'Diamond' | 'Other'

type Account = {
  id: string
  accountName: string
  mobileNumber: string
  groupName?: string
  active: boolean
}

const initialHeader = {
  repairNo: '',
  receiptDate: getTodayDate(),
  accountId: '',
  phone: '',
  itemDescription: '',
  metalType: 'Silver' as MetalType,
  approxWeight: '',
  workDescription: '',
  estimatedCharge: '',
  narration: ''
}

const initialCompleteForm = {
  actualCharge: '',
  completedDate: getTodayDate(),
  narration: ''
}

const initialDeliverForm = {
  deliveredDate: getTodayDate()
}







function getStatusBadge(status: RepairEntryStatus): { label: string; bg: string; text: string; border: string } {
  switch (status) {
    case 'received':
      return {
        label: 'Received',
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200'
      }
    case 'completed':
      return {
        label: 'Completed',
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-200'
      }
    case 'delivered':
      return {
        label: 'Delivered',
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

function RepairEntryScreen({ onClose }: { onClose?: () => void }): React.JSX.Element {
  const [header, setHeader] = useState(initialHeader)
  const [completeForm, setCompleteForm] = useState(initialCompleteForm)
  const [deliverForm, setDeliverForm] = useState(initialDeliverForm)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [entries, setEntries] = useState<RepairEntryRecord[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RepairEntryRecord | null>(null)
  const [completeTarget, setCompleteTarget] = useState<RepairEntryRecord | null>(null)
  const [deliverTarget, setDeliverTarget] = useState<RepairEntryRecord | null>(null)
  const [viewTarget, setViewTarget] = useState<RepairEntryRecord | null>(null)

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | RepairEntryStatus>('ALL')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [opening, setOpening] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const accountSelectRef = useRef<HTMLSelectElement | null>(null)
  const phoneInputRef = useRef<HTMLInputElement | null>(null)
  const itemDescriptionInputRef = useRef<HTMLInputElement | null>(null)
  const workDescriptionInputRef = useRef<HTMLInputElement | null>(null)
  const approxWeightInputRef = useRef<HTMLInputElement | null>(null)
  const estimatedChargeInputRef = useRef<HTMLInputElement | null>(null)
  const narrationInputRef = useRef<HTMLInputElement | null>(null)
  const actualChargeInputRef = useRef<HTMLInputElement | null>(null)

  const activeAccounts = useMemo(() => {
    return accounts.filter((account) => account.active)
  }, [accounts])

  const selectedCustomer = useMemo(() => {
    return accounts.find((account) => account.id === header.accountId)
  }, [accounts, header.accountId])

  const filteredEntries = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return entries.filter((entry) => {
      const statusMatch = statusFilter === 'ALL' || entry.status === statusFilter
      const keywordMatch =
        !keyword ||
        entry.repair_no.toLowerCase().includes(keyword) ||
        (entry.account_name || '').toLowerCase().includes(keyword) ||
        (entry.mobile_number || '').toLowerCase().includes(keyword) ||
        (entry.phone || '').toLowerCase().includes(keyword) ||
        (entry.item_description || '').toLowerCase().includes(keyword) ||
        (entry.work_description || '').toLowerCase().includes(keyword) ||
        (entry.metal_type || '').toLowerCase().includes(keyword) ||
        (entry.receipt_date || '').toLowerCase().includes(keyword)

      return statusMatch && keywordMatch
    })
  }, [entries, searchText, statusFilter])

  const statusCounts = useMemo(() => {
    return entries.reduce(
      (counts, entry) => {
        counts.total += 1
        if (entry.status === 'received') counts.received += 1
        else if (entry.status === 'completed') counts.completed += 1
        else if (entry.status === 'delivered') counts.delivered += 1
        else if (entry.status === 'cancelled') counts.cancelled += 1
        return counts
      },
      { total: 0, received: 0, completed: 0, delivered: 0, cancelled: 0 }
    )
  }, [entries])

  // Table summary totals
  const registerTotals = useMemo(() => {
    return filteredEntries.reduce(
      (acc, entry) => {
        acc.approxWeight += Number(entry.approx_weight || 0)
        acc.estimatedCharge += Number(entry.estimated_charge || 0)
        if (entry.actual_charge !== null) {
          acc.actualCharge += Number(entry.actual_charge || 0)
        }
        return acc
      },
      { approxWeight: 0, estimatedCharge: 0, actualCharge: 0 }
    )
  }, [filteredEntries])

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

  const handleHeaderDecimalChange = (
    value: string,
    fieldName: 'approxWeight' | 'estimatedCharge'
  ): void => {
    if (!isValidAmountInput(value)) return

    setHeader((current) => ({
      ...current,
      [fieldName]: value
    }))
  }

  const loadAccounts = useCallback(async (): Promise<void> => {
    const data = await window.api.accounts.list()
    setAccounts(data)
  }, [])

  const loadEntries = useCallback(async (): Promise<void> => {
    const data = await window.api.repairEntry.list()
    setEntries(data)
  }, [])

  const loadNextNumber = useCallback(async (): Promise<void> => {
    const nextNumber = await window.api.repairEntry.getNextNumber()
    setHeader((current) => ({ ...current, repairNo: nextNumber }))
  }, [])

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await Promise.all([loadAccounts(), loadEntries(), loadNextNumber()])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [loadAccounts, loadEntries, loadNextNumber, showAlert])

  const handleAccountChange = (accountId: string): void => {
    const account = accounts.find((currentAccount) => currentAccount.id === accountId)
    setHeader((current) => ({
      ...current,
      accountId,
      phone: account?.mobileNumber ?? current.phone
    }))
  }

  const handleMetalChange = (metalType: MetalType): void => {
    setHeader((current) => ({ ...current, metalType }))
  }

  const validateEntry = (): boolean => {
    if (!header.accountId) {
      showAlert('warning', 'Please select a customer account.')
      accountSelectRef.current?.focus()
      return false
    }

    if (!header.itemDescription.trim()) {
      showAlert('warning', 'Please enter item description.')
      itemDescriptionInputRef.current?.focus()
      return false
    }

    if (toNumber(header.approxWeight) < 0) {
      showAlert('warning', 'Approx. weight must be a positive number.')
      approxWeightInputRef.current?.focus()
      return false
    }

    return true
  }

  const resetForm = async (): Promise<void> => {
    setEditingId(null)
    setHeader(initialHeader)
    await loadNextNumber()
  }

  const buildPayload = (): RepairEntryPayload => {
    return {
      receiptDate: header.receiptDate,
      accountId: header.accountId,
      phone: header.phone,
      itemDescription: header.itemDescription,
      metalType: header.metalType,
      approxWeight: toNumber(header.approxWeight),
      workDescription: header.workDescription,
      estimatedCharge: toNumber(header.estimatedCharge),
      narration: header.narration
    }
  }

  const handleSaveEntry = async (): Promise<void> => {
    if (!validateEntry()) return

    try {
      setSaving(true)
      const payload = buildPayload()

      if (editingId) {
        await window.api.repairEntry.update(editingId, payload)
      } else {
        await window.api.repairEntry.create(payload)
      }

      showAlert(
        'success',
        editingId
          ? `Repair entry ${header.repairNo} updated successfully.`
          : `Repair entry ${header.repairNo} saved successfully.`
      )
      await resetForm()
      await loadEntries()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleEditEntry = async (entry: RepairEntryRecord): Promise<void> => {
    if (entry.status !== 'received') {
      showAlert('warning', 'Only a repair entry with status "Received" can be edited.')
      return
    }

    try {
      setOpening(true)
      const record = await window.api.repairEntry.getById(entry.id)

      setEditingId(record.id)
      setHeader({
        repairNo: record.repair_no,
        receiptDate: record.receipt_date,
        accountId: record.account_id,
        phone: record.phone || '',
        itemDescription: record.item_description,
        metalType: record.metal_type as MetalType,
        approxWeight: record.approx_weight === 0 ? '' : String(record.approx_weight),
        workDescription: record.work_description || '',
        estimatedCharge: record.estimated_charge === 0 ? '' : String(record.estimated_charge),
        narration: record.narration || ''
      })

      showAlert('success', `Editing repair entry ${record.repair_no}.`)
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
      const result = await window.api.repairEntry.remove(deleteTarget.id)

      if (editingId === deleteTarget.id) {
        await resetForm()
      }

      setDeleteTarget(null)
      await loadEntries()
      showAlert('success', `Repair entry ${result.repairNo} deleted successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenComplete = (entry: RepairEntryRecord): void => {
    setCompleteTarget(entry)
    setCompleteForm({
      actualCharge: entry.estimated_charge === 0 ? '' : String(entry.estimated_charge),
      completedDate: getTodayDate(),
      narration: ''
    })
  }

  const handleSaveComplete = async (): Promise<void> => {
    if (!completeTarget) return

    if (toNumber(completeForm.actualCharge) < 0) {
      showAlert('warning', 'Please enter a valid actual charge.')
      actualChargeInputRef.current?.focus()
      return
    }

    try {
      setCompleting(true)

      await window.api.repairEntry.completeRepair(completeTarget.id, {
        actualCharge: toNumber(completeForm.actualCharge),
        completedDate: completeForm.completedDate,
        narration: completeForm.narration
      })

      setCompleteTarget(null)
      await loadEntries()
      showAlert('success', `Repair entry ${completeTarget.repair_no} marked completed. Charge posted to customer ledger.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setCompleting(false)
    }
  }

  const handleOpenDeliver = (entry: RepairEntryRecord): void => {
    setDeliverTarget(entry)
    setDeliverForm({ deliveredDate: getTodayDate() })
  }

  const handleSaveDeliver = async (): Promise<void> => {
    if (!deliverTarget) return

    try {
      setDelivering(true)

      await window.api.repairEntry.markDelivered(deliverTarget.id, {
        deliveredDate: deliverForm.deliveredDate
      })

      setDeliverTarget(null)
      await loadEntries()
      showAlert('success', `Repair entry ${deliverTarget.repair_no} marked delivered.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDelivering(false)
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
            🛠️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">
                Repair Entry (Customer Item Repair)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100/70 text-amber-900 border border-amber-300/60">
                {editingId ? `Editing ${header.repairNo}` : header.repairNo || 'REP-0001'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Track customer repair articles, estimate charges, complete work, and deliver with ledger posting
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

      {/* ── MAIN SCROLLABLE WORKSPACE ── */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* Top Section: Repair Entry (Item Received) Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {editingId ? `Edit Repair Entry (${header.repairNo})` : 'Repair Entry (Item Received)'}
              </h2>
            </div>

            {/* Invariant Segmented Metal Selector (Zero Layout Shift) */}
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
                Repair No.
              </label>
              <input
                value={header.repairNo}
                disabled
                className="w-full h-8.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Receipt Date *
              </label>
              <input
                type="date"
                value={header.receiptDate}
                onChange={(e) => setHeader((c) => ({ ...c, receiptDate: e.target.value }))}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              />
            </div>

            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Customer Account *
                </label>
                {selectedCustomer?.mobileNumber && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 font-mono">
                    📱 {selectedCustomer.mobileNumber}
                  </span>
                )}
              </div>
              <select
                ref={accountSelectRef}
                value={header.accountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                onKeyDown={(e) => focusNextOnEnter(e, phoneInputRef.current)}
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
              >
                <option value="">Select Customer</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountName} {account.mobileNumber ? `(${account.mobileNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Phone Number
              </label>
              <input
                ref={phoneInputRef}
                value={header.phone}
                onChange={(e) => setHeader((c) => ({ ...c, phone: e.target.value }))}
                onKeyDown={(e) => focusNextOnEnter(e, itemDescriptionInputRef.current)}
                placeholder="Customer Contact No"
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-mono"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Item Description *
              </label>
              <input
                ref={itemDescriptionInputRef}
                value={header.itemDescription}
                onChange={(e) => setHeader((c) => ({ ...c, itemDescription: e.target.value }))}
                onKeyDown={(e) => focusNextOnEnter(e, workDescriptionInputRef.current)}
                placeholder="e.g. 22K Gold Antique Ring with Emerald & CZ stone"
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Work Needed / Repair Description
              </label>
              <input
                ref={workDescriptionInputRef}
                value={header.workDescription}
                onChange={(e) => setHeader((c) => ({ ...c, workDescription: e.target.value }))}
                onKeyDown={(e) => focusNextOnEnter(e, approxWeightInputRef.current)}
                placeholder="e.g. Ring size extension to 14, prong tightening, rhodium polish"
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Approx. Wt. (g)
              </label>
              <input
                ref={approxWeightInputRef}
                value={header.approxWeight}
                onChange={(e) => handleHeaderDecimalChange(e.target.value, 'approxWeight')}
                onKeyDown={(e) => focusNextOnEnter(e, estimatedChargeInputRef.current)}
                placeholder="0.000"
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono font-bold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Estimated Charge (₹)
              </label>
              <input
                ref={estimatedChargeInputRef}
                value={header.estimatedCharge}
                onChange={(e) => handleHeaderDecimalChange(e.target.value, 'estimatedCharge')}
                onKeyDown={(e) => focusNextOnEnter(e, narrationInputRef.current)}
                placeholder="0.00"
                className="w-full h-8.5 px-2.5 text-xs bg-amber-50/40 border border-amber-200/80 rounded-lg text-right font-mono font-bold text-amber-900 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />
            </div>

            <div className="lg:col-span-4">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Narration / Special Instructions
              </label>
              <input
                ref={narrationInputRef}
                value={header.narration}
                onChange={(e) => setHeader((c) => ({ ...c, narration: e.target.value }))}
                placeholder="e.g. Urgent by Friday, customer requested original stone verification..."
                className="w-full h-8.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
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
              onClick={() => void handleSaveEntry()}
              disabled={saving}
              className="h-8 px-5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="animate-spin text-sm">⏳</span> Saving...
                </>
              ) : editingId ? (
                <>
                  <span>✓</span> Update Entry
                </>
              ) : (
                <>
                  <span>＋</span> Save Entry
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Section: Repair Entries Register Panel */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          {/* Section Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Repair Entries Register
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                ({filteredEntries.length} records)
              </span>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Status Tabs */}
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
                  onClick={() => setStatusFilter('received')}
                  className={`h-6 px-2 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    statusFilter === 'received'
                      ? 'bg-amber-100/90 text-amber-900 shadow-2xs border-amber-300 font-bold'
                      : 'border-transparent text-amber-700 hover:text-amber-900 hover:bg-amber-50'
                  }`}
                >
                  Received ({statusCounts.received})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`h-6 px-2 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    statusFilter === 'completed'
                      ? 'bg-blue-100/90 text-blue-900 shadow-2xs border-blue-300 font-bold'
                      : 'border-transparent text-blue-700 hover:text-blue-900 hover:bg-blue-50'
                  }`}
                >
                  Completed ({statusCounts.completed})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('delivered')}
                  className={`h-6 px-2 text-[11px] font-semibold rounded-md transition-colors cursor-pointer border ${
                    statusFilter === 'delivered'
                      ? 'bg-emerald-100/90 text-emerald-900 shadow-2xs border-emerald-300 font-bold'
                      : 'border-transparent text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  Delivered ({statusCounts.delivered})
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
                  placeholder="Search repair no, customer, item, phone..."
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

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => void loadEntries()}
                disabled={loading}
                className="h-8 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="Reload Entries"
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
                  <th className="py-2.5 px-3">Repair No</th>
                  <th className="py-2.5 px-3">Receipt Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3">Work Needed</th>
                  <th className="py-2.5 px-3">Metal</th>
                  <th className="py-2.5 px-3 text-right">Approx. Wt. (g)</th>
                  <th className="py-2.5 px-3 text-right">Est. Charge (₹)</th>
                  <th className="py-2.5 px-3 text-right">Actual Charge (₹)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400">
                      <span className="inline-block animate-spin text-base mr-2">⏳</span>
                      Loading repair entries...
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-10 text-center text-slate-400">
                      <div className="text-2xl mb-1">🛠️</div>
                      {searchText || statusFilter !== 'ALL'
                        ? 'No matching repair entries found for the active filter.'
                        : 'No repair entries saved yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry, index) => {
                    const statusConfig = getStatusBadge(entry.status)

                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-amber-50/30 transition-colors duration-75"
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-amber-900">
                          {entry.repair_no}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                          {formatDate(entry.receipt_date)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-800">{entry.account_name}</div>
                          {(entry.phone || entry.mobile_number) && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {entry.phone || entry.mobile_number}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800 max-w-[160px] truncate" title={entry.item_description}>
                          {entry.item_description}
                        </td>
                        <td className="py-2 px-3 text-slate-600 max-w-[150px] truncate" title={entry.work_description}>
                          {entry.work_description || '-'}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              entry.metal_type === 'Gold'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : entry.metal_type === 'Silver'
                                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                                  : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                            }`}
                          >
                            {entry.metal_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatWeight(entry.approx_weight)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800">
                          ₹{formatCurrency(entry.estimated_charge)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                          {entry.actual_charge !== null ? `₹${formatCurrency(entry.actual_charge)}` : '-'}
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
                              onClick={() => setViewTarget(entry)}
                              className="h-6 px-2 text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                              title="View Details"
                            >
                              👁 View
                            </button>

                            {entry.status === 'received' && (
                              <button
                                type="button"
                                onClick={() => handleOpenComplete(entry)}
                                disabled={opening}
                                className="h-6 px-2 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors cursor-pointer shadow-2xs"
                                title="Complete Repair"
                              >
                                ✓ Complete
                              </button>
                            )}

                            {entry.status === 'completed' && (
                              <button
                                type="button"
                                onClick={() => handleOpenDeliver(entry)}
                                disabled={opening}
                                className="h-6 px-2 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors cursor-pointer shadow-2xs"
                                title="Deliver Item"
                              >
                                📦 Deliver
                              </button>
                            )}

                            {entry.status === 'received' && (
                              <button
                                type="button"
                                onClick={() => void handleEditEntry(entry)}
                                disabled={opening || saving}
                                className="h-6 px-2 text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 rounded transition-colors cursor-pointer"
                                title="Edit Entry"
                              >
                                ✏️ Edit
                              </button>
                            )}

                            {entry.status === 'received' && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(entry)}
                                disabled={deleting}
                                className="h-6 px-2 text-[10px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                                title="Delete Entry"
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

              {/* Table Footer Summary */}
              {filteredEntries.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800 text-[11px] shadow-xs">
                  <tr>
                    <td colSpan={7} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-600">
                      Total ({filteredEntries.length} entries):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {formatWeight(registerTotals.approxWeight)} g
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      ₹{formatCurrency(registerTotals.estimatedCharge)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                      ₹{formatCurrency(registerTotals.actualCharge)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Informative Note */}
          <div className="p-3 bg-amber-50/50 border-t border-amber-100/60 text-[11px] text-amber-900/80 flex items-center gap-2">
            <span className="text-sm">ℹ️</span>
            <span>
              <strong>Customer Repair Custody Note:</strong> Repair Entry only tracks custody of the customer&apos;s own article without impacting showroom inventory. Repair charges are posted to the customer&apos;s account only when the repair is marked <strong>Completed</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* ── CONFIRM DELETE DIALOG ── */}
      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Repair Entry?"
        message={
          deleteTarget
            ? `Are you sure you want to delete repair entry "${deleteTarget.repair_no}" for "${deleteTarget.account_name}"?`
            : ''
        }
        confirmText="Delete Entry"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null)
        }}
      />

      {/* ── COMPLETE REPAIR MODAL ── */}
      {completeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col my-auto">
            {/* Modal Header */}
            <div className="h-12 px-5 bg-blue-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base">✓</span>
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Complete Repair - {completeTarget.repair_no}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setCompleteTarget(null)}
                className="w-7 h-7 flex items-center justify-center text-blue-100 hover:text-white hover:bg-blue-800 rounded-lg transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Context Summary Card */}
              <div className="grid grid-cols-2 gap-2.5 bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">Customer</span>
                  <strong className="text-slate-800">{completeTarget.account_name}</strong>
                  {completeTarget.phone && (
                    <div className="text-[10px] text-slate-400 font-mono">{completeTarget.phone}</div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">Item</span>
                  <strong className="text-slate-800">{completeTarget.item_description}</strong>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">Work Description</span>
                  <div className="text-slate-700">{completeTarget.work_description || '-'}</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">Est. Charge</span>
                  <strong className="text-slate-800 font-mono">₹{formatCurrency(completeTarget.estimated_charge)}</strong>
                </div>
              </div>

              {/* Input Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Completed Date *
                  </label>
                  <input
                    type="date"
                    value={completeForm.completedDate}
                    onChange={(e) =>
                      setCompleteForm((c) => ({ ...c, completedDate: e.target.value }))
                    }
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                    Final Actual Charge (₹) *
                  </label>
                  <input
                    ref={actualChargeInputRef}
                    value={completeForm.actualCharge}
                    onChange={(e) => {
                      if (!isValidAmountInput(e.target.value)) return
                      setCompleteForm((c) => ({ ...c, actualCharge: e.target.value }))
                    }}
                    placeholder="0.00"
                    className="w-full h-8 px-2 text-xs bg-blue-50/40 border border-blue-200 rounded-lg text-right font-mono font-bold text-blue-900 text-sm"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    This amount will be debited to the customer&apos;s account ledger.
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                    Completion Narration / Note
                  </label>
                  <input
                    value={completeForm.narration}
                    onChange={(e) =>
                      setCompleteForm((c) => ({ ...c, narration: e.target.value }))
                    }
                    placeholder="e.g. Ring resized, stones tested and polished"
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="h-12 px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCompleteTarget(null)}
                disabled={completing}
                className="h-8 px-4 text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSaveComplete()}
                disabled={completing}
                className="h-8 px-5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {completing ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span> Saving...
                  </>
                ) : (
                  <>
                    <span>✓</span> Save & Mark Completed
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MARK DELIVERED MODAL ── */}
      {deliverTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col my-auto">
            {/* Modal Header */}
            <div className="h-12 px-5 bg-emerald-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base">📦</span>
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Deliver Repair Item - {deliverTarget.repair_no}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setDeliverTarget(null)}
                className="w-7 h-7 flex items-center justify-center text-emerald-100 hover:text-white hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <strong className="text-slate-800">{deliverTarget.account_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Article:</span>
                  <strong className="text-slate-800">{deliverTarget.item_description}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Actual Charge:</span>
                  <strong className="text-emerald-800 font-mono font-bold text-sm">
                    ₹{formatCurrency(deliverTarget.actual_charge)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                  Delivery Date *
                </label>
                <input
                  type="date"
                  value={deliverForm.deliveredDate}
                  onChange={(e) => setDeliverForm({ deliveredDate: e.target.value })}
                  className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="h-12 px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDeliverTarget(null)}
                disabled={delivering}
                className="h-8 px-4 text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSaveDeliver()}
                disabled={delivering}
                className="h-8 px-5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {delivering ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span> Saving...
                  </>
                ) : (
                  <>
                    <span>✓</span> Confirm Delivered
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW DETAILS MODAL ── */}
      {viewTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col my-auto">
            {/* Modal Header */}
            <div className="h-12 px-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base">📋</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Repair Entry: {viewTarget.repair_no}
                </h3>
                {(() => {
                  const badge = getStatusBadge(viewTarget.status)
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
                onClick={() => setViewTarget(null)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Customer</span>
                  <strong className="text-slate-800">{viewTarget.account_name}</strong>
                  {(viewTarget.phone || viewTarget.mobile_number) && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      {viewTarget.phone || viewTarget.mobile_number}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Metal & Approx Wt</span>
                  <strong className="text-slate-800">
                    {viewTarget.metal_type} - {formatWeight(viewTarget.approx_weight)} g
                  </strong>
                </div>

                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Article Description</span>
                  <div className="text-slate-800 font-medium">{viewTarget.item_description}</div>
                </div>

                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Work Needed</span>
                  <div className="text-slate-700">{viewTarget.work_description || '-'}</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Estimated Charge</span>
                  <div className="font-mono text-slate-800">₹{formatCurrency(viewTarget.estimated_charge)}</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Actual Charge</span>
                  <div className="font-mono font-bold text-emerald-800">
                    {viewTarget.actual_charge !== null ? `₹${formatCurrency(viewTarget.actual_charge)}` : '-'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Receipt Date</span>
                  <div className="text-slate-700">{formatDate(viewTarget.receipt_date)}</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Completed Date</span>
                  <div className="text-slate-700">{formatDate(viewTarget.completed_date)}</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Delivered Date</span>
                  <div className="text-slate-700">{formatDate(viewTarget.delivered_date)}</div>
                </div>

                {viewTarget.narration && (
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Narration</span>
                    <div className="text-slate-600 italic">{viewTarget.narration}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="h-12 px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewTarget(null)}
                className="h-8 px-4 text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RepairEntryScreen
