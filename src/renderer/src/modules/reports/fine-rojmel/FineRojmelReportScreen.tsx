import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
  FiActivity,
  FiX,
  FiCalendar,
  FiRefreshCw,
  FiDownload,
  FiPrinter,
  FiInbox,
  FiFilter
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'
type DatePreset = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_FY'

const today = dayjs().format('YYYY-MM-DD')

const emptySummary: FineRojmelSummary = {
  openingGoldBalance: 0,
  totalGoldIn: 0,
  totalGoldOut: 0,
  closingGoldBalance: 0,
  openingSilverBalance: 0,
  totalSilverIn: 0,
  totalSilverOut: 0,
  closingSilverBalance: 0
}

function formatFine(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })
}

function formatDate(value: string): string {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function FineRojmelReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [toDate, setToDate] = useState(today)
  const [metalFilter, setMetalFilter] = useState('All')
  const [activePreset, setActivePreset] = useState<DatePreset | null>('THIS_MONTH')
  const [rows, setRows] = useState<FineRojmelRow[]>([])
  const [summary, setSummary] = useState<FineRojmelSummary>(emptySummary)
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
    if (fromDate && toDate && fromDate > toDate) {
      showAlert('warning', 'From date cannot be after to date.')
      return
    }

    try {
      setLoading(true)
      const result = await window.api.fineReport.rojmel({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      })
      setRows(result.rows || [])
      setSummary(result.summary || emptySummary)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, showAlert])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => metalFilter === 'All' || row.metalType === metalFilter)
  }, [rows, metalFilter])

  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      showAlert('warning', 'No Fine Rojmel records to export.')
      return
    }
    const headers = ['Sr', 'Date', 'Metal Type', 'Fine In (g)', 'Fine Out (g)', 'Balance Fine (g)']
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const csvRows = filteredRows.map((r, idx) => [
      idx + 1,
      escapeCsv(formatDate(r.entryDate)),
      escapeCsv(r.metalType),
      r.fineIn || 0,
      r.fineOut || 0,
      r.balance || 0
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fine_rojmel_${fromDate || 'start'}_to_${toDate || 'end'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Fine Rojmel CSV successfully.')
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
            <FiActivity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight">Fine Rojmel Register</h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Day-wise pure fine metal ledger carrying forward balances for Gold & Silver
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

          {/* Metal Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <FiFilter className="w-3.5 h-3.5 text-slate-400" />
              Metal:
            </span>
            <select
              value={metalFilter}
              onChange={(e) => setMetalFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-semibold shadow-2xs"
            >
              <option value="All">All Metals</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
            </select>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 shrink-0">
          <div className="p-2.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Gold Opening</span>
            <strong className="text-xs font-mono font-bold text-slate-900 block mt-0.5">
              {formatFine(summary.openingGoldBalance)}g
            </strong>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-200/80 bg-amber-50/40 shadow-2xs">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">Gold In</span>
            <strong className="text-xs font-mono font-bold text-amber-800 block mt-0.5">
              {formatFine(summary.totalGoldIn)}g
            </strong>
          </div>
          <div className="p-2.5 rounded-xl border border-rose-200/80 bg-rose-50/40 shadow-2xs">
            <span className="text-[10px] font-bold text-rose-700 uppercase block">Gold Out</span>
            <strong className="text-xs font-mono font-bold text-rose-700 block mt-0.5">
              {formatFine(summary.totalGoldOut)}g
            </strong>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-300 bg-amber-100/60 shadow-2xs">
            <span className="text-[10px] font-bold text-amber-900 uppercase block">Gold Closing</span>
            <strong className="text-xs font-mono font-extrabold text-amber-900 block mt-0.5">
              {formatFine(summary.closingGoldBalance)}g
            </strong>
          </div>

          <div className="p-2.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Silver Opening</span>
            <strong className="text-xs font-mono font-bold text-slate-900 block mt-0.5">
              {formatFine(summary.openingSilverBalance)}g
            </strong>
          </div>
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-700 uppercase block">Silver In</span>
            <strong className="text-xs font-mono font-bold text-slate-800 block mt-0.5">
              {formatFine(summary.totalSilverIn)}g
            </strong>
          </div>
          <div className="p-2.5 rounded-xl border border-rose-200/80 bg-rose-50/40 shadow-2xs">
            <span className="text-[10px] font-bold text-rose-700 uppercase block">Silver Out</span>
            <strong className="text-xs font-mono font-bold text-rose-700 block mt-0.5">
              {formatFine(summary.totalSilverOut)}g
            </strong>
          </div>
          <div className="p-2.5 rounded-xl border border-slate-300 bg-slate-100 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-800 uppercase block">Silver Closing</span>
            <strong className="text-xs font-mono font-extrabold text-slate-900 block mt-0.5">
              {formatFine(summary.closingSilverBalance)}g
            </strong>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          {filteredRows.length === 0 && !loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                <FiInbox className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 mb-1">No Fine Movement Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-3">
                No fine gold or silver transactions found for the selected filter criteria.
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
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Metal Type</th>
                  <th className="py-2.5 px-3 text-right">Fine In (g)</th>
                  <th className="py-2.5 px-3 text-right">Fine Out (g)</th>
                  <th className="py-2.5 px-3 text-right">Cumulative Balance (g)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{index + 1}</td>
                    <td className="py-2 px-3 font-mono text-[11px]">{formatDate(row.entryDate)}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.metalType === 'Gold'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-800 border border-slate-300'
                        }`}
                      >
                        {row.metalType}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                      {row.fineIn ? `${formatFine(row.fineIn)}g` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                      {row.fineOut ? `${formatFine(row.fineOut)}g` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {formatFine(row.balance)}g
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default FineRojmelReportScreen
