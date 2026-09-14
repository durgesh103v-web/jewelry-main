import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiDollarSign,
  FiDownload,
  FiFilter,
  FiInbox,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiX,
  FiXCircle
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'
type DatePreset = 'TODAY' | 'THIS_MONTH' | 'THIS_FY' | 'ALL_TIME'

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })
}

function formatAmount(value: number): string {
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

function VoidReasonDialog({
  open,
  bill,
  reason,
  onReasonChange,
  loading,
  onConfirm,
  onCancel
}: {
  open: boolean
  bill: SaleDeleteListRecord | null
  reason: string
  onReasonChange: (value: string) => void
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}): React.JSX.Element | null {
  if (!open || !bill) return null

  const trimmedReason = reason.trim()

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
            <FiAlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-rose-950">Delete / Void Sale Bill?</h3>
            <p className="text-xs text-rose-700 mt-0.5">Permanent reversal of financial & stock ledger entries</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Bill No:</span>
              <span className="font-mono font-bold text-slate-900">{bill.sale_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Account:</span>
              <span className="font-bold text-slate-900">{bill.account_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Bill Date:</span>
              <span className="font-mono text-slate-800">{formatDate(bill.sale_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Fine & Majuri:</span>
              <span className="font-mono font-bold text-amber-900">
                {formatNumber(bill.item_fine_total)}g | ₹{formatAmount(bill.item_majuri_total)}
              </span>
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed">
            Voiding this bill will <strong className="text-rose-700">permanently reverse</strong> its stock and account ledger
            effect and remove it from active statements. This action cannot be undone.
          </p>

          <div>
            <label htmlFor="void-reason" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Reason for Deletion <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="void-reason"
              rows={3}
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="e.g. Duplicate entry, wrong customer selected, entry mistake..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-2xs font-medium resize-none"
              autoFocus
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Minimum 3 characters required. Reason will be permanently logged with the audit trail.
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-8.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || trimmedReason.length < 3}
            className="h-8.5 px-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs border border-rose-700 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
            <span>{loading ? 'Voiding Bill...' : 'Confirm & Delete Bill'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteSaleBillsScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [bills, setBills] = useState<SaleDeleteListRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [activePreset, setActivePreset] = useState<DatePreset>('ALL_TIME')

  const [voidTarget, setVoidTarget] = useState<SaleDeleteListRecord | null>(null)
  const [voidReason, setVoidReason] = useState('')

  const [loading, setLoading] = useState(false)
  const [voiding, setVoiding] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

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

  const setPreset = (preset: DatePreset) => {
    setActivePreset(preset)
    const now = dayjs()
    if (preset === 'TODAY') {
      const d = now.format('YYYY-MM-DD')
      setFromDate(d)
      setToDate(d)
    } else if (preset === 'THIS_MONTH') {
      setFromDate(now.startOf('month').format('YYYY-MM-DD'))
      setToDate(now.endOf('month').format('YYYY-MM-DD'))
    } else if (preset === 'THIS_FY') {
      const currentYear = now.month() >= 3 ? now.year() : now.year() - 1
      setFromDate(`${currentYear}-04-01`)
      setToDate(`${currentYear + 1}-03-31`)
    } else {
      setFromDate('')
      setToDate('')
    }
  }

  const loadBills = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.sales.listAllForDelete()
      setBills(data || [])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadBills()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadBills])

  const filteredBills = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return bills.filter((bill) => {
      if (fromDate && bill.sale_date < fromDate) return false
      if (toDate && bill.sale_date > toDate) return false
      if (statusFilter === 'ACTIVE' && bill.status !== 'ACTIVE') return false
      if (statusFilter === 'VOIDED' && bill.status === 'ACTIVE') return false

      if (!keyword) return true

      return (
        bill.sale_no.toLowerCase().includes(keyword) ||
        bill.account_name.toLowerCase().includes(keyword) ||
        (bill.mobile_number || '').toLowerCase().includes(keyword) ||
        (bill.status || '').toLowerCase().includes(keyword) ||
        (bill.metal_type || '').toLowerCase().includes(keyword)
      )
    })
  }, [bills, searchText, fromDate, toDate, statusFilter])

  const totals = useMemo(() => {
    return filteredBills.reduce(
      (acc, bill) => {
        if (bill.status === 'ACTIVE') {
          acc.activeCount += 1
          acc.activeFine += Number(bill.item_fine_total || 0)
          acc.activeMajuri += Number(bill.item_majuri_total || 0)
        } else {
          acc.voidedCount += 1
          acc.voidedFine += Number(bill.item_fine_total || 0)
          acc.voidedMajuri += Number(bill.item_majuri_total || 0)
        }
        return acc
      },
      { activeCount: 0, voidedCount: 0, activeFine: 0, activeMajuri: 0, voidedFine: 0, voidedMajuri: 0 }
    )
  }, [filteredBills])

  const requestVoid = (bill: SaleDeleteListRecord): void => {
    setVoidReason('')
    setVoidTarget(bill)
  }

  const closeVoidDialog = (): void => {
    if (voiding) return
    setVoidTarget(null)
    setVoidReason('')
  }

  const handleConfirmVoid = async (): Promise<void> => {
    if (!voidTarget || voidReason.trim().length < 3) return

    try {
      setVoiding(true)
      const result = await window.api.sales.cancel(voidTarget.id, voidReason.trim())
      setVoidTarget(null)
      setVoidReason('')
      await loadBills()
      showAlert('success', `Sale bill ${result.saleNo} deleted/voided successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setVoiding(false)
    }
  }

  const handleExportCsv = () => {
    if (filteredBills.length === 0) {
      showAlert('warning', 'No bills to export.')
      return
    }
    const headers = [
      'Sr',
      'Bill No',
      'Date',
      'Account',
      'Mobile',
      'Metal',
      'Fine (g)',
      'Majuri (INR)',
      'Status',
      'Void Reason'
    ]
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const csvRows = [
      ...filteredBills.map((b, idx) => [
        idx + 1,
        escapeCsv(b.sale_no),
        escapeCsv(formatDate(b.sale_date)),
        escapeCsv(b.account_name),
        escapeCsv(b.mobile_number || '-'),
        escapeCsv(b.metal_type),
        formatNumber(b.item_fine_total),
        formatAmount(b.item_majuri_total),
        escapeCsv(b.status === 'ACTIVE' ? 'Active' : 'Voided'),
        escapeCsv(b.void_reason || '-')
      ]),
      [
        'Total Active',
        '',
        '',
        '',
        '',
        '',
        formatNumber(totals.activeFine),
        formatAmount(totals.activeMajuri),
        `${totals.activeCount} Active`,
        ''
      ]
    ]

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `delete_sale_bills_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Sale Bills CSV successfully.')
  }

  const presets: { id: DatePreset; label: string }[] = [
    { id: 'TODAY', label: 'Today' },
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'THIS_FY', label: 'This FY' },
    { id: 'ALL_TIME', label: 'All Time' }
  ]

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-700 text-base shadow-2xs font-bold">
            <FiTrash2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Delete / Void Sale Bills</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-mono">
                {filteredBills.length} Bills
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Restricted utility for voiding incorrectly generated sale invoices & reversing ledger effects
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadBills()}
            disabled={loading}
            className="h-8 px-3 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 text-amber-600 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Loading...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || filteredBills.length === 0}
            className="h-8 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-amber-600 cursor-pointer disabled:opacity-50"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={filteredBills.length === 0}
            className="h-8 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FiPrinter className="w-3.5 h-3.5 text-slate-600" />
            <span>Print</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col p-3 gap-2.5 overflow-hidden">
        {alertMessage && (
          <div className="shrink-0 no-print">
            <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />
          </div>
        )}

        {/* Restricted Security Notice Banner */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 shrink-0 shadow-2xs no-print">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
            <FiAlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <strong className="font-bold text-amber-950 block">Restricted Audit Operation:</strong>
            <p className="text-amber-900/90 leading-snug mt-0.5">
              Deleting/voiding a sale bill permanently reverses stock reductions and customer ledger entries. Use strictly to correct duplicate or erroneous bills. A mandatory cancellation reason is recorded with the invoice audit trail.
            </p>
          </div>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 no-print">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-700 font-bold flex items-center gap-1">
                <FiFilter className="w-3.5 h-3.5 text-amber-600" /> Status:
              </span>
              <select
                className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-2xs"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Bills</option>
                <option value="ACTIVE">Active Only</option>
                <option value="VOIDED">Voided Only</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold flex items-center gap-1">
                <FiCalendar className="w-3.5 h-3.5 text-amber-600" /> Date:
              </span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setActivePreset('ALL_TIME')
                  setFromDate(e.target.value)
                }}
                className="h-8 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              />
              <span className="text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setActivePreset('ALL_TIME')
                  setToDate(e.target.value)
                }}
                className="h-8 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              />
            </div>

            {/* Date Presets */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
                    activePreset === p.id
                      ? 'bg-amber-500 text-white font-bold border-amber-600 shadow-2xs'
                      : 'text-slate-700 hover:text-amber-900 hover:bg-amber-50/70 border-transparent font-medium'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-80">
            <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search bill no, account, mobile, metal..."
              className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs font-medium"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText && (
              <button
                type="button"
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                onClick={() => setSearchText('')}
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Active Bills
              </span>
              <strong className="text-base font-extrabold font-mono text-emerald-900 block mt-0.5">
                {totals.activeCount} Invoices
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <FiCheckCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                Voided / Deleted
              </span>
              <strong className="text-base font-extrabold font-mono text-rose-900 block mt-0.5">
                {totals.voidedCount} Invoices
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200">
              <FiXCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Active Fine Weight
              </span>
              <strong className="text-base font-extrabold font-mono text-amber-900 block mt-0.5">
                {formatNumber(totals.activeFine)}g
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
              <FiAlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                Active Majuri Amount
              </span>
              <strong className="text-base font-extrabold font-mono text-blue-900 block mt-0.5">
                ₹{formatAmount(totals.activeMajuri)}
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200">
              <FiDollarSign className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Bill No</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Account</th>
                <th className="py-2.5 px-3">Mobile</th>
                <th className="py-2.5 px-3">Metal</th>
                <th className="py-2.5 px-3 text-right">Fine (g)</th>
                <th className="py-2.5 px-3 text-right">Majuri (₹)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Void Reason</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                    <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading sale bills...
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2">
                        <FiInbox className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm text-slate-800 mb-0.5">No Sale Bills Found</span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {searchText || fromDate || toDate || statusFilter !== 'ALL'
                          ? 'No matching sale bills found for your search filters.'
                          : 'No sale bills recorded in the system yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill, index) => {
                  const isActive = bill.status === 'ACTIVE'
                  return (
                    <tr
                      key={bill.id}
                      className={`transition-colors font-medium ${
                        isActive ? 'hover:bg-amber-50/40 text-slate-700' : 'bg-rose-50/20 text-slate-500'
                      }`}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{index + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{bill.sale_no}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-800">{formatDate(bill.sale_date)}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{bill.account_name}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{bill.mobile_number || '-'}</td>
                      <td className="py-2 px-3 text-slate-600">{bill.metal_type}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-900">
                        {formatNumber(bill.item_fine_total)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-800">
                        ₹{formatAmount(bill.item_majuri_total)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {isActive ? 'Active' : 'Voided'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 italic text-[11px] max-w-[200px] truncate" title={bill.void_reason || ''}>
                        {bill.void_reason || '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {isActive ? (
                          <button
                            type="button"
                            onClick={() => requestVoid(bill)}
                            disabled={voiding}
                            className="h-7 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-200 hover:border-rose-300 rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          >
                            <FiTrash2 className="w-3 h-3 text-rose-600" />
                            <span>Delete / Void</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-semibold italic">Voided</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>

            {filteredBills.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0 z-10 shadow-inner">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 text-right text-xs uppercase tracking-wider">
                    Total Active:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-amber-900 bg-amber-100/50">
                    {formatNumber(totals.activeFine)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-blue-900 bg-blue-100/50">
                    ₹{formatAmount(totals.activeMajuri)}
                  </td>
                  <td colSpan={3} className="py-2.5 px-3 text-left text-xs text-slate-600">
                    {totals.activeCount} Active / {totals.voidedCount} Voided
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer info note */}
        <div className="px-4 py-2 bg-white rounded-lg border border-slate-200/90 text-[11px] text-slate-500 flex items-center justify-between shrink-0 no-print shadow-2xs">
          <span>* Voided bills are excluded from Sale Register, Account Balance, Outstanding and Stock Report totals automatically.</span>
          <span className="font-semibold text-slate-600">Jewelry ERP Security & Audit</span>
        </div>
      </div>

      <VoidReasonDialog
        open={Boolean(voidTarget)}
        bill={voidTarget}
        reason={voidReason}
        onReasonChange={setVoidReason}
        loading={voiding}
        onConfirm={() => void handleConfirmVoid()}
        onCancel={closeVoidDialog}
      />
    </div>
  )
}

export default DeleteSaleBillsScreen
