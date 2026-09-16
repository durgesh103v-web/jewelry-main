import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
  FiFileText,
  FiSearch,
  FiX,
  FiRefreshCw,
  FiDownload,
  FiPrinter,
  FiAlertCircle,
  FiCheckCircle
} from 'react-icons/fi'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatDate, formatAmount } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'



function GstSaleReportScreen({
  onClose,
  title = 'Retail Sale GST',
  helpText
}: {
  onClose: () => void
  title: string
  helpText: string
}): React.JSX.Element {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [activePreset, setActivePreset] = useState<string>('THIS_MONTH')
  const [rows, setRows] = useState<GstReportRow[]>([])
  const [searchText, setSearchText] = useState('')
  const [metalFilter, setMetalFilter] = useState('All')
  const [loading, setLoading] = useState(false)
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

  // Quick Preset Handlers
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

  const loadReport = useCallback(async (): Promise<void> => {
    if (fromDate && toDate && fromDate > toDate) {
      showAlert('warning', 'From date cannot be after to date.')
      return
    }

    try {
      setLoading(true)
      const data = await window.api.gstReport.sales({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      })
      setRows(data || [])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, showAlert])

  useEffect(() => {
    // Initialise default to This Month
    const today = dayjs()
    setFromDate(today.startOf('month').format('YYYY-MM-DD'))
    setToDate(today.endOf('month').format('YYYY-MM-DD'))
    setActivePreset('THIS_MONTH')

    const loadTimer = window.setTimeout(() => {
      void loadReport()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredRows = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return rows.filter((row) => {
      const metalMatch = metalFilter === 'All' || row.metalType === metalFilter
      const keywordMatch =
        !keyword ||
        row.billNo.toLowerCase().includes(keyword) ||
        row.accountName.toLowerCase().includes(keyword) ||
        (row.gstNo || '').toLowerCase().includes(keyword) ||
        row.billDate.toLowerCase().includes(keyword)

      return metalMatch && keywordMatch
    })
  }, [rows, searchText, metalFilter])

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (total, row) => {
        total.taxableAmount += Number(row.taxableAmount || 0)
        total.cgstAmount += Number(row.cgstAmount || 0)
        total.sgstAmount += Number(row.sgstAmount || 0)
        total.igstAmount += Number(row.igstAmount || 0)
        total.totalTax += Number(row.totalTax || 0)
        total.totalAmount += Number(row.totalAmount || 0)
        return total
      },
      {
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTax: 0,
        totalAmount: 0
      }
    )
  }, [filteredRows])

  // CSV Export Engine
  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      showAlert('warning', 'No sale records found matching filter criteria to export.')
      return
    }

    const filename = `${title.toLowerCase().replace(/\s+/g, '_')}_${fromDate || 'all'}_to_${toDate || 'all'}.csv`
    const headers = [
      'Sr',
      'Date',
      'Bill No',
      'Customer / Party',
      'GSTIN',
      'Metal',
      'Taxable Amount (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Total Tax (INR)',
      'Total Invoice Value (INR)'
    ]

    const lines: string[] = [
      `"${title} - GST Statutory Register"`,
      `"Date Range: ${fromDate || 'Beginning'} to ${toDate || 'Today'}"`,
      `"Total Bills: ${filteredRows.length}"`,
      `""`,
      headers.join(',')
    ]

    filteredRows.forEach((r, idx) => {
      lines.push([
        idx + 1,
        `"${formatDate(r.billDate)}"`,
        `"${(r.billNo || '').replace(/"/g, '""')}"`,
        `"${(r.accountName || '').replace(/"/g, '""')}"`,
        `"${(r.gstNo || '-').replace(/"/g, '""')}"`,
        `"${r.metalType || 'Gold'}"`,
        Number(r.taxableAmount || 0).toFixed(2),
        Number(r.cgstAmount || 0).toFixed(2),
        Number(r.sgstAmount || 0).toFixed(2),
        Number(r.igstAmount || 0).toFixed(2),
        Number(r.totalTax || 0).toFixed(2),
        Number(r.totalAmount || 0).toFixed(2)
      ].join(','))
    })

    lines.push([
      `"TOTAL"`,
      `""`,
      `""`,
      `""`,
      `""`,
      `""`,
      totals.taxableAmount.toFixed(2),
      totals.cgstAmount.toFixed(2),
      totals.sgstAmount.toFixed(2),
      totals.igstAmount.toFixed(2),
      totals.totalTax.toFixed(2),
      totals.totalAmount.toFixed(2)
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
              <h1 className="font-bold text-sm text-slate-900 tracking-tight">{title}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                GST REGISTER
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Outward Taxable
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Detailed sales invoice register with taxable value, CGST, SGST, IGST and grand totals
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

        {/* ── FILTER & ACTION TOOLBAR ── */}
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            {(['TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_FY'] as const).map((preset) => {
              const isSelected = activePreset === preset
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setPreset(preset)
                    setTimeout(() => void loadReport(), 50)
                  }}
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
              id="gst-sale-from-date"
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
              id="gst-sale-to-date"
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value)
                setActivePreset('')
              }}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-medium shadow-2xs"
            />
          </div>

          {/* Metal Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Metal:</span>
            <select
              id="gst-sale-metal-filter"
              value={metalFilter}
              onChange={(event) => setMetalFilter(event.target.value)}
              className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-semibold shadow-2xs"
            >
              <option value="All">All Metals</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
            </select>
          </div>

          {/* Search Box & Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <input
                id="gst-sale-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search bill, party, GSTIN..."
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
              onClick={() => void loadReport()}
              disabled={loading}
              className="h-8 px-3 text-xs font-semibold text-slate-700 hover:text-amber-900 bg-white hover:bg-amber-50 border border-slate-300 hover:border-amber-300 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50 active:scale-95"
              title="Refresh / Fetch Data"
            >
              <FiRefreshCw size={13} className={loading ? 'animate-spin text-amber-600' : ''} />
              <span>{loading ? 'Fetching...' : 'Show'}</span>
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
              Records: <strong className="text-amber-950 font-bold">{rows.length}</strong> | Showing:{' '}
              <strong className="text-amber-950 font-bold">{filteredRows.length}</strong>
            </div>
          </div>
        </div>

        {/* ── SUMMARY METRIC CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0">
          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Taxable Turnover
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-slate-900">
              ₹{formatAmount(totals.taxableAmount)}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              CGST (1.5%)
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-slate-800">
              ₹{formatAmount(totals.cgstAmount)}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              SGST (1.5%)
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-slate-800">
              ₹{formatAmount(totals.sgstAmount)}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              IGST (3.0%)
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-slate-800">
              ₹{formatAmount(totals.igstAmount)}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 shadow-2xs">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Total GST Tax
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-amber-950">
              ₹{formatAmount(totals.totalTax)}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Invoice Value
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-slate-900">
              ₹{formatAmount(totals.totalAmount)}
            </div>
          </div>
        </div>

        {/* ── DATA TABLE ── */}
        <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 text-center w-10">#</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Bill No</th>
                <th className="py-2.5 px-3">Customer / Party</th>
                <th className="py-2.5 px-3">GSTIN</th>
                <th className="py-2.5 px-2 text-center">Metal</th>
                <th className="py-2.5 px-3 text-right">Taxable Amt (₹)</th>
                <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                <th className="py-2.5 px-3 text-right">IGST (₹)</th>
                <th className="py-2.5 px-3 text-right">Total Tax (₹)</th>
                <th className="py-2.5 px-3 text-right">Grand Total (₹)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-block w-4 h-4 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
                      <span>Loading GST sale report...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 italic">
                    {searchText
                      ? 'No matching sale bills found for the search query.'
                      : 'No sale bills found for the selected date range.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr key={row.id || index} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-2 px-3 text-center font-mono text-slate-400">{index + 1}</td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap font-medium">
                      {formatDate(row.billDate)}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-amber-900">{row.billNo}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{row.accountName}</td>
                    <td className="py-2 px-3 font-mono text-slate-500">{row.gstNo || '-'}</td>
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                          row.metalType === 'Silver'
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {row.metalType || 'Gold'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium">
                      ₹{formatAmount(row.taxableAmount)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                      ₹{formatAmount(row.cgstAmount)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                      ₹{formatAmount(row.sgstAmount)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                      ₹{formatAmount(row.igstAmount)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-emerald-800">
                      ₹{formatAmount(row.totalTax)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-900">
                      ₹{formatAmount(row.totalAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {!loading && filteredRows.length > 0 && (
              <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-10 text-xs">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-[11px]">
                    Total ({filteredRows.length} Bills):
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    ₹{formatAmount(totals.taxableAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    ₹{formatAmount(totals.cgstAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    ₹{formatAmount(totals.sgstAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    ₹{formatAmount(totals.igstAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-emerald-800">
                    ₹{formatAmount(totals.totalTax)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-900 font-bold">
                    ₹{formatAmount(totals.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ── FOOTER HELP BAR ── */}
        <div className="px-3 py-1.5 bg-white rounded-lg border border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
          <span>{helpText}</span>
          <span className="font-mono text-[10px] text-slate-400 font-medium">Sec 31 CGST Act • Tax Invoices</span>
        </div>
      </div>
    </div>
  )
}

export default GstSaleReportScreen
