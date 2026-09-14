import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
  FiFileText,
  FiSearch,
  FiX,
  FiRefreshCw,
  FiDownload,
  FiPrinter,
  FiCornerDownLeft,
  FiTrash2,
  FiAlertCircle,
  FiCheckCircle
} from 'react-icons/fi'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import EstimatePrintPreview from '../retail-sale-estimate/EstimatePrintPreview'

type AlertType = 'success' | 'error' | 'warning'

function formatNumber(value: number): string {
  return Number(value || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '')
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

function getStatusLabel(status: EstimateStatus): string {
  if (status === 'OPEN') return 'Open'
  if (status === 'CONVERTED') return 'Converted'
  return 'Cancelled'
}

function EstimateRegisterScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [estimates, setEstimates] = useState<EstimateRegisterRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | EstimateStatus>('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [activePreset, setActivePreset] = useState<string>('THIS_MONTH')

  const [previewRecord, setPreviewRecord] = useState<SavedEstimateRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EstimateRegisterRecord | null>(null)
  const [convertTarget, setConvertTarget] = useState<EstimateRegisterRecord | null>(null)

  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [converting, setConverting] = useState(false)

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
    }, 4000)
  }, [])

  // Quick Date Preset Handlers
  const setPreset = (preset: 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_FY') => {
    const today = dayjs()
    setActivePreset(preset)
    if (preset === 'TODAY') {
      const d = today.format('YYYY-MM-DD')
      setFromDate(d)
      setToDate(d)
    } else if (preset === 'YESTERDAY') {
      const d = today.subtract(1, 'day').format('YYYY-MM-DD')
      setFromDate(d)
      setToDate(d)
    } else if (preset === 'THIS_WEEK') {
      setFromDate(today.startOf('week').format('YYYY-MM-DD'))
      setToDate(today.endOf('week').format('YYYY-MM-DD'))
    } else if (preset === 'THIS_MONTH') {
      setFromDate(today.startOf('month').format('YYYY-MM-DD'))
      setToDate(today.endOf('month').format('YYYY-MM-DD'))
    } else if (preset === 'THIS_FY') {
      const currentYear = today.month() >= 3 ? today.year() : today.year() - 1
      setFromDate(`${currentYear}-04-01`)
      setToDate(`${currentYear + 1}-03-31`)
    }
  }

  const loadEstimates = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.estimates.list()
      setEstimates(data || [])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    const today = dayjs()
    setFromDate(today.startOf('month').format('YYYY-MM-DD'))
    setToDate(today.endOf('month').format('YYYY-MM-DD'))
    setActivePreset('THIS_MONTH')

    const loadTimer = window.setTimeout(() => {
      void loadEstimates()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadEstimates])

  const filteredEstimates = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return estimates.filter((estimate) => {
      const statusMatch = statusFilter === 'ALL' || estimate.status === statusFilter
      const fromMatch = !fromDate || estimate.estimate_date >= fromDate
      const toMatch = !toDate || estimate.estimate_date <= toDate
      const keywordMatch =
        !keyword ||
        estimate.estimate_no.toLowerCase().includes(keyword) ||
        estimate.account_name.toLowerCase().includes(keyword) ||
        (estimate.mobile_number || '').toLowerCase().includes(keyword) ||
        estimate.metal_type.toLowerCase().includes(keyword) ||
        estimate.estimate_date.toLowerCase().includes(keyword)

      return statusMatch && fromMatch && toMatch && keywordMatch
    })
  }, [estimates, searchText, statusFilter, fromDate, toDate])

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

  const totals = useMemo(() => {
    return filteredEstimates.reduce(
      (total, estimate) => {
        total.fine += Number(estimate.item_fine_total || 0)
        total.majuri += Number(estimate.item_majuri_total || 0)
        total.taxableAmount += Number(estimate.taxable_amount || 0)
        total.totalTax +=
          Number(estimate.cgst_amount || 0) +
          Number(estimate.sgst_amount || 0) +
          Number(estimate.igst_amount || 0)
        return total
      },
      { fine: 0, majuri: 0, taxableAmount: 0, totalTax: 0 }
    )
  }, [filteredEstimates])

  const openEstimate = async (estimateId: string): Promise<void> => {
    try {
      setOpening(true)
      const record = await window.api.estimates.getById(estimateId)
      setPreviewRecord(record)
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
      const result = await window.api.estimates.remove(deleteTarget.id)
      setDeleteTarget(null)
      await loadEstimates()
      showAlert('success', `Estimate ${result.estimateNo} deleted successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  const handleConfirmConvert = async (): Promise<void> => {
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

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredEstimates.length === 0) {
      showAlert('warning', 'No estimates found matching filter criteria.')
      return
    }

    const filename = `estimate_register_${fromDate || 'all'}_to_${toDate || 'all'}.csv`
    const headers = [
      'Sr',
      'Est. No',
      'Date',
      'Account / Party',
      'Mobile',
      'Metal',
      'Fine (g)',
      'Majuri (INR)',
      'Taxable Amount (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Total Tax (INR)',
      'Grand Total (INR)',
      'Status'
    ]

    const lines: string[] = [
      `"Retail Sale Estimate Register"`,
      `"Date Range: ${fromDate || 'Beginning'} to ${toDate || 'Today'}"`,
      `"Total Estimates: ${filteredEstimates.length}"`,
      `""`,
      headers.join(',')
    ]

    filteredEstimates.forEach((e, idx) => {
      const totalTax =
        Number(e.cgst_amount || 0) + Number(e.sgst_amount || 0) + Number(e.igst_amount || 0)
      const grandTotal = Number(e.taxable_amount || 0) + totalTax + Number(e.item_majuri_total || 0)

      lines.push([
        idx + 1,
        `"${e.estimate_no}"`,
        `"${formatDate(e.estimate_date)}"`,
        `"${(e.account_name || '').replace(/"/g, '""')}"`,
        `"${(e.mobile_number || '-').replace(/"/g, '""')}"`,
        `"${e.metal_type || 'Gold'}"`,
        Number(e.item_fine_total || 0).toFixed(3),
        Number(e.item_majuri_total || 0).toFixed(2),
        Number(e.taxable_amount || 0).toFixed(2),
        Number(e.cgst_amount || 0).toFixed(2),
        Number(e.sgst_amount || 0).toFixed(2),
        Number(e.igst_amount || 0).toFixed(2),
        totalTax.toFixed(2),
        grandTotal.toFixed(2),
        `"${getStatusLabel(e.status)}"`
      ].join(','))
    })

    const grandTotalAll = totals.taxableAmount + totals.totalTax + totals.majuri
    lines.push([
      `"TOTAL"`,
      `""`,
      `""`,
      `""`,
      `""`,
      `""`,
      totals.fine.toFixed(3),
      totals.majuri.toFixed(2),
      totals.taxableAmount.toFixed(2),
      `""`,
      `""`,
      `""`,
      totals.totalTax.toFixed(2),
      grandTotalAll.toFixed(2),
      `""`
    ].join(','))

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', `Exported ${filename} successfully.`)
  }

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
              <h1 className="font-bold text-sm text-slate-900 tracking-tight">Estimate Register</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                REGISTER
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Estimates
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Complete register of all customer quotation estimates and conversion tracking
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
      <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        {/* Alerts */}
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

        {/* ── STATUS TABS & FILTER TOOLBAR ── */}
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
          {/* Status Tabs */}
          <div className="inline-flex items-center rounded-xl border border-slate-200 p-0.5 bg-slate-50 gap-1">
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

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            {(['TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_FY'] as const).map((preset) => {
              const isSelected = activePreset === preset
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPreset(preset)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-2xs font-bold border-amber-600'
                      : 'text-slate-600 hover:text-amber-900 hover:bg-amber-50/70 border-transparent font-medium'
                  }`}
                >
                  {preset === 'TODAY'
                    ? 'Today'
                    : preset === 'YESTERDAY'
                      ? 'Yesterday'
                      : preset === 'THIS_WEEK'
                        ? 'This Week'
                        : preset === 'THIS_MONTH'
                          ? 'This Month'
                          : 'This FY'}
                </button>
              )
            })}
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              id="estimate-register-from-date"
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value)
                setActivePreset('')
              }}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-medium shadow-2xs"
            />
            <span className="text-slate-500 font-medium">To:</span>
            <input
              id="estimate-register-to-date"
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value)
                setActivePreset('')
              }}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-medium shadow-2xs"
            />
          </div>

          {/* Search Box & Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <input
                id="estimate-register-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search estimate, party, mobile..."
                className="w-48 h-8 pl-7 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs font-medium"
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

            <button
              type="button"
              onClick={handleExportCsv}
              className="h-8 px-3.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 active:to-amber-800 border border-amber-600 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
              title="Export Register to CSV"
            >
              <FiDownload size={13} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="h-8 px-3 text-xs font-semibold text-slate-700 hover:text-amber-900 bg-white hover:bg-amber-50 border border-slate-300 hover:border-amber-300 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
              title="Print Register"
            >
              <FiPrinter size={13} className="text-slate-600" />
              <span>Print</span>
            </button>

            <div className="text-[11px] text-slate-500 font-medium pl-1 border-l border-slate-200 hidden sm:block">
              Total: <strong className="text-amber-950 font-bold">{estimates.length}</strong> | Showing:{' '}
              <strong className="text-amber-950 font-bold">{filteredEstimates.length}</strong>
            </div>
          </div>
        </div>

        {/* ── SUMMARY METRIC CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0">
          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Estimates
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-slate-900">
              {filteredEstimates.length}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Fine Wt
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-slate-800">
              {formatNumber(totals.fine)} g
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Majuri
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-slate-800">
              ₹{formatAmount(totals.majuri)}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Taxable Turnover
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-slate-900">
              ₹{formatAmount(totals.taxableAmount)}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Total GST Tax
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-emerald-950">
              ₹{formatAmount(totals.totalTax)}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 shadow-2xs">
            <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
              Grand Total Value
            </div>
            <div className="mt-1 text-lg font-black tabular-nums text-amber-950 font-mono">
              ₹{formatAmount(totals.taxableAmount + totals.totalTax + totals.majuri)}
            </div>
          </div>
        </div>

        {/* ── REGISTER DATA TABLE ── */}
        <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 text-center w-10">#</th>
                <th className="py-2.5 px-3">Est. No</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Account / Party</th>
                <th className="py-2.5 px-3">Mobile</th>
                <th className="py-2.5 px-2 text-center">Metal</th>
                <th className="py-2.5 px-3 text-right">Fine (g)</th>
                <th className="py-2.5 px-3 text-right">Majuri (₹)</th>
                <th className="py-2.5 px-3 text-right">Taxable Amt (₹)</th>
                <th className="py-2.5 px-3 text-right">Total Tax (₹)</th>
                <th className="py-2.5 px-2 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-block w-4 h-4 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
                      <span>Loading estimate register...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEstimates.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 italic">
                    {searchText || statusFilter !== 'ALL' || fromDate || toDate
                      ? 'No matching estimates found.'
                      : 'No estimates recorded yet.'}
                  </td>
                </tr>
              ) : (
                filteredEstimates.map((estimate, index) => {
                  const totalTax =
                    Number(estimate.cgst_amount || 0) +
                    Number(estimate.sgst_amount || 0) +
                    Number(estimate.igst_amount || 0)

                  return (
                    <tr
                      key={estimate.id}
                      onDoubleClick={() => void openEstimate(estimate.id)}
                      className="hover:bg-amber-50/40 transition-colors cursor-pointer"
                    >
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
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                        ₹{formatAmount(totalTax)}
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
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onDoubleClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => void openEstimate(estimate.id)}
                            disabled={opening}
                            className="p-1.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                            title="View / Print Estimate"
                          >
                            <FiPrinter size={13} />
                          </button>

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
                              onClick={() => setDeleteTarget(estimate)}
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
                  )
                })
              )}
            </tbody>

            {!loading && filteredEstimates.length > 0 && (
              <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-10 text-xs">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-[11px]">
                    Total ({filteredEstimates.length} Estimates):
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {formatNumber(totals.fine)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    ₹{formatAmount(totals.majuri)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    ₹{formatAmount(totals.taxableAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-emerald-800">
                    ₹{formatAmount(totals.totalTax)}
                  </td>
                  <td colSpan={2} className="py-2.5 px-3 text-right tabular-nums text-slate-900 font-bold">
                    ₹{formatAmount(totals.taxableAmount + totals.totalTax + totals.majuri)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ── FOOTER HELP BAR ── */}
        <div className="px-3 py-1.5 bg-white rounded-lg border border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
          <span>Double-click any estimate or click Open / Print to view, print, or convert it into a confirmed Sale bill.</span>
          <span className="font-mono text-[10px] text-slate-400 font-medium">Estimates Ledger Register</span>
        </div>
      </div>

      {previewRecord && (
        <EstimatePrintPreview estimate={previewRecord} onClose={() => setPreviewRecord(null)} />
      )}

      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Estimate?"
        message={
          deleteTarget
            ? `Are you sure you want to delete estimate "${deleteTarget.estimate_no}" for "${deleteTarget.account_name}"?`
            : ''
        }
        confirmText="Delete"
        cancelText="Close"
        type="danger"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null)
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
        onConfirm={() => void handleConfirmConvert()}
        onCancel={() => {
          if (!converting) setConvertTarget(null)
        }}
      />
    </div>
  )
}

export default EstimateRegisterScreen
