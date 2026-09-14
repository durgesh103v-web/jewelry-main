import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
  FiBookOpen,
  FiX,
  FiCalendar,
  FiRefreshCw,
  FiDownload,
  FiPrinter,
  FiSearch,
  FiInbox,
  FiArrowDownLeft,
  FiArrowUpRight,
  FiDollarSign
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'
type DatePreset = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_FY'

const today = dayjs().format('YYYY-MM-DD')

const emptySummary: CashBookReportSummary = {
  openingBalance: 0,
  totalReceipt: 0,
  totalPayment: 0,
  closingBalance: 0
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

function CashBookReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [toDate, setToDate] = useState(today)
  const [search, setSearch] = useState('')
  const [activePreset, setActivePreset] = useState<DatePreset | null>('THIS_MONTH')
  const [rows, setRows] = useState<CashBookReportRow[]>([])
  const [summary, setSummary] = useState<CashBookReportSummary>(emptySummary)
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
    }, 3000)
  }, [])

  const setPreset = (preset: DatePreset) => {
    setActivePreset(preset)
    const now = dayjs()
    if (preset === 'TODAY') {
      const d = now.format('YYYY-MM-DD')
      setFromDate(d)
      setToDate(d)
    } else if (preset === 'YESTERDAY') {
      const d = now.subtract(1, 'day').format('YYYY-MM-DD')
      setFromDate(d)
      setToDate(d)
    } else if (preset === 'THIS_WEEK') {
      setFromDate(now.startOf('week').format('YYYY-MM-DD'))
      setToDate(now.endOf('week').format('YYYY-MM-DD'))
    } else if (preset === 'THIS_MONTH') {
      setFromDate(now.startOf('month').format('YYYY-MM-DD'))
      setToDate(now.endOf('month').format('YYYY-MM-DD'))
    } else if (preset === 'THIS_FY') {
      const currentYear = now.month() >= 3 ? now.year() : now.year() - 1
      setFromDate(`${currentYear}-04-01`)
      setToDate(`${currentYear + 1}-03-31`)
    }
  }

  const loadReport = useCallback(async (): Promise<void> => {
    if (!fromDate || !toDate) {
      showAlert('warning', 'Please select date range.')
      return
    }

    if (fromDate > toDate) {
      showAlert('warning', 'From date cannot be after to date.')
      return
    }

    try {
      setLoading(true)
      const result = await window.api.cashBookReport.get({ fromDate, toDate })
      setRows(result.rows || [])
      setSummary(result.summary || emptySummary)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [fromDate, showAlert, toDate])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(
      (r) =>
        r.voucherNo?.toLowerCase().includes(q) ||
        r.accountName?.toLowerCase().includes(q) ||
        r.narration?.toLowerCase().includes(q) ||
        r.sourceLabel?.toLowerCase().includes(q)
    )
  }, [rows, search])

  const handleExportCsv = () => {
    if (rows.length === 0) {
      showAlert('warning', 'No cash book records to export.')
      return
    }
    const headers = ['Date', 'Voucher No', 'Type', 'Particular / Account', 'Narration', 'Receipt (Cash In)', 'Payment (Cash Out)', 'Running Balance']
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const csvRows = [
      [formatDate(fromDate), '-', 'Opening', 'Opening Cash Balance', '-', '0.00', '0.00', summary.openingBalance],
      ...filteredRows.map((r) => [
        escapeCsv(formatDate(r.voucherDate)),
        escapeCsv(r.voucherNo),
        escapeCsv(r.sourceLabel || r.voucherType),
        escapeCsv(r.accountName || '-'),
        escapeCsv(r.narration || '-'),
        r.receiptAmount || 0,
        r.paymentAmount || 0,
        r.runningBalance || 0
      ]),
      ['Total', '', '', '', '', summary.totalReceipt, summary.totalPayment, summary.closingBalance]
    ]

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cash_book_${fromDate}_to_${toDate}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Cash Book CSV successfully.')
  }

  const presets: { id: DatePreset; label: string }[] = [
    { id: 'TODAY', label: 'Today' },
    { id: 'YESTERDAY', label: 'Yesterday' },
    { id: 'THIS_WEEK', label: 'This Week' },
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'THIS_FY', label: 'This FY' }
  ]

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiBookOpen className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight">Cash Book Register</h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Live double-entry cash flow ledger with receipts, payments & balances
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
        >
          <FiX className="w-4 h-4" />
        </button>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col p-3 gap-2.5 overflow-hidden">
        {alertMessage && (
          <div className="shrink-0">
            <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
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

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <FiCalendar className="w-3.5 h-3.5 text-amber-600" />
              From:
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setActivePreset(null)
                setFromDate(e.target.value)
              }}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-semibold shadow-2xs"
            />
            <span className="text-slate-600 font-semibold">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setActivePreset(null)
                setToDate(e.target.value)
              }}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-semibold shadow-2xs"
            />
          </div>

          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search voucher, party, narration..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-amber-500 shadow-2xs font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadReport()}
              disabled={loading}
              className="h-8 px-3 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 text-amber-600 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Loading...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={loading}
              className="h-8 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-amber-600 cursor-pointer disabled:opacity-50"
            >
              <FiDownload className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="h-8 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <FiPrinter className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Opening Balance</span>
            <span className="text-sm font-extrabold font-mono text-slate-900 mt-0.5">
              ₹{formatAmount(summary.openingBalance)}
            </span>
          </div>
          <div className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <FiArrowDownLeft className="w-3.5 h-3.5" />
              Total Receipts (In)
            </span>
            <span className="text-sm font-extrabold font-mono text-emerald-700 mt-0.5">
              ₹{formatAmount(summary.totalReceipt)}
            </span>
          </div>
          <div className="p-3 rounded-xl border border-rose-200/80 bg-rose-50/40 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <FiArrowUpRight className="w-3.5 h-3.5" />
              Total Payments (Out)
            </span>
            <span className="text-sm font-extrabold font-mono text-rose-700 mt-0.5">
              ₹{formatAmount(summary.totalPayment)}
            </span>
          </div>
          <div className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/40 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <FiDollarSign className="w-3.5 h-3.5" />
              Closing Cash Balance
            </span>
            <span className="text-sm font-extrabold font-mono text-amber-800 mt-0.5">
              ₹{formatAmount(summary.closingBalance)}
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          {rows.length === 0 && !loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                <FiInbox className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 mb-1">No Cash Entries Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-3">
                No cash transactions found for the selected period {formatDate(fromDate)} to {formatDate(toDate)}.
              </p>
              <button
                type="button"
                onClick={() => setPreset('THIS_MONTH')}
                className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                Reset to This Month
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Voucher / Bill No</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Particulars / Account</th>
                  <th className="py-2.5 px-3">Narration</th>
                  <th className="py-2.5 px-3 text-right">Receipt (₹)</th>
                  <th className="py-2.5 px-3 text-right">Payment (₹)</th>
                  <th className="py-2.5 px-3 text-right">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Opening Row */}
                <tr className="bg-slate-50/70 font-semibold text-slate-700">
                  <td className="py-2 px-3 font-mono text-[11px]">{formatDate(fromDate)}</td>
                  <td className="py-2 px-3 font-mono text-slate-400">-</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                      OPENING
                    </span>
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-900">Opening Cash in Hand</td>
                  <td className="py-2 px-3 text-slate-400">-</td>
                  <td className="py-2 px-3 text-right font-mono">-</td>
                  <td className="py-2 px-3 text-right font-mono">-</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                    ₹{formatAmount(summary.openingBalance)}
                  </td>
                </tr>

                {filteredRows.map((row) => {
                  const isReceipt = row.voucherType === 'RECEIPT' || (row.receiptAmount && row.receiptAmount > 0)
                  return (
                    <tr key={row.id} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                      <td className="py-2 px-3 font-mono text-[11px]">{formatDate(row.voucherDate)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{row.voucherNo}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isReceipt
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {row.sourceLabel || (isReceipt ? 'Receipt' : 'Payment')}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{row.accountName || '-'}</td>
                      <td className="py-2 px-3 text-slate-500 max-w-xs truncate">{row.narration || '-'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                        {row.receiptAmount ? `₹${formatAmount(row.receiptAmount)}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                        {row.paymentAmount ? `₹${formatAmount(row.paymentAmount)}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{formatAmount(row.runningBalance)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                    Total Transactions:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                    ₹{formatAmount(summary.totalReceipt)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                    ₹{formatAmount(summary.totalPayment)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                    ₹{formatAmount(summary.closingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default CashBookReportScreen
