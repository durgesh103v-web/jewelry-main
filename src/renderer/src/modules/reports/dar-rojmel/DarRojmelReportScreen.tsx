import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
  FiTrendingUp,
  FiX,
  FiCalendar,
  FiRefreshCw,
  FiDownload,
  FiPrinter,
  FiSearch,
  FiInbox,
  FiFilter
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatDate, formatAmount } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'
type DatePreset = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_FY'

const today = dayjs().format('YYYY-MM-DD')

const emptySummary: DarRojmelSummary = {
  totalFine: 0,
  totalAmount: 0,
  saudaCount: 0,
  recordCount: 0
}

function formatFine(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })
}


function formatRate(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}


function getTransactionLabel(type: string): string {
  if (type === 'SALE') return 'Sale'
  if (type === 'PURCHASE') return 'Purchase'
  if (type === 'SAUDA') return 'Sauda'
  return type
}

type DayGroup = {
  entryDate: string
  rows: DarRojmelRow[]
  totalFine: number
  totalAmount: number
}

function groupRowsByDay(rows: DarRojmelRow[]): DayGroup[] {
  const groups: DayGroup[] = []
  let currentGroup: DayGroup | null = null

  for (const row of rows) {
    if (!currentGroup || currentGroup.entryDate !== row.entryDate) {
      currentGroup = { entryDate: row.entryDate, rows: [], totalFine: 0, totalAmount: 0 }
      groups.push(currentGroup)
    }

    currentGroup.rows.push(row)
    currentGroup.totalFine += Number(row.fine || 0)
    currentGroup.totalAmount += Number(row.amount || 0)
  }

  return groups
}

function DarRojmelReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [toDate, setToDate] = useState(today)
  const [activePreset, setActivePreset] = useState<DatePreset | null>('THIS_MONTH')
  const [rows, setRows] = useState<DarRojmelRow[]>([])
  const [summary, setSummary] = useState<DarRojmelSummary>(emptySummary)
  const [typeFilter, setTypeFilter] = useState('All')
  const [searchText, setSearchText] = useState('')
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
      const result = await window.api.reports.darRojmel({
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
    const keyword = searchText.trim().toLowerCase()

    return rows.filter((row) => {
      const typeMatch = typeFilter === 'All' || row.transactionType === typeFilter
      const keywordMatch =
        !keyword ||
        row.billNo?.toLowerCase().includes(keyword) ||
        row.accountName?.toLowerCase().includes(keyword) ||
        row.metalType?.toLowerCase().includes(keyword)

      return typeMatch && keywordMatch
    })
  }, [rows, typeFilter, searchText])

  const dayGroups = useMemo(() => groupRowsByDay(filteredRows), [filteredRows])

  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      showAlert('warning', 'No Dar Rojmel records to export.')
      return
    }
    const headers = ['Sr', 'Date', 'Type', 'Bill No', 'Account Name', 'Metal', 'Fine (g)', 'Rate (INR)', 'Amount (INR)']
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const csvRows = filteredRows.map((r, idx) => [
      idx + 1,
      escapeCsv(formatDate(r.entryDate)),
      escapeCsv(getTransactionLabel(r.transactionType)),
      escapeCsv(r.billNo),
      escapeCsv(r.accountName),
      escapeCsv(r.metalType),
      r.fine || 0,
      r.rate || 0,
      r.amount || 0
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dar_rojmel_${fromDate}_to_${toDate}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Dar Rojmel CSV successfully.')
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
            <FiTrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight">Dar Rojmel Register</h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Day-wise rate-based trading movements across Sauda Book, sales and purchases
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

          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <FiFilter className="w-3.5 h-3.5 text-slate-400" />
              Type:
            </span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-semibold shadow-2xs"
            >
              <option value="All">All Types</option>
              <option value="SALE">Sale</option>
              <option value="PURCHASE">Purchase</option>
              <option value="SAUDA">Sauda</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search bill no, account, metal..."
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
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Fine (g)</span>
            <span className="text-sm font-extrabold font-mono text-slate-900 mt-0.5">
              {formatFine(summary.totalFine)}g
            </span>
          </div>
          <div className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/40 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Sauda Amount</span>
            <span className="text-sm font-extrabold font-mono text-amber-800 mt-0.5">
              ₹{formatAmount(summary.totalAmount)}
            </span>
          </div>
          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sauda Entries</span>
            <span className="text-sm font-extrabold font-mono text-slate-900 mt-0.5">
              {summary.saudaCount}
            </span>
          </div>
          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Records</span>
            <span className="text-sm font-extrabold font-mono text-slate-900 mt-0.5">
              {summary.recordCount}
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          {dayGroups.length === 0 && !loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                <FiInbox className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 mb-1">No Rate-Based Dealings Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-3">
                No dealings found for the selected filter criteria.
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
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Bill / Ref No</th>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3">Metal</th>
                  <th className="py-2.5 px-3 text-right">Fine (g)</th>
                  <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dayGroups.map((group) => {
                  let srNo = 0
                  return (
                    <Fragment key={group.entryDate}>
                      {group.rows.map((row) => {
                        srNo += 1
                        return (
                          <tr key={row.id} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                            <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{srNo}</td>
                            <td className="py-2 px-3 font-mono text-[11px]">{formatDate(row.entryDate)}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.transactionType === 'SAUDA'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : row.transactionType === 'SALE'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}
                              >
                                {getTransactionLabel(row.transactionType)}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">{row.billNo}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{row.accountName}</td>
                            <td className="py-2 px-3 text-slate-600">{row.metalType}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {formatFine(row.fine)}g
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">
                              {row.rate ? `₹${formatRate(row.rate)}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                              {row.amount ? `₹${formatAmount(row.amount)}` : '-'}
                            </td>
                          </tr>
                        )
                      })}
                      <tr key={`${group.entryDate}-subtotal`} className="bg-slate-100/90 font-bold border-y border-slate-200 text-slate-900">
                        <td colSpan={6} className="py-2 px-3 text-right uppercase text-[11px] tracking-wider text-slate-600">
                          {formatDate(group.entryDate)} — Day Subtotal:
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-amber-800">
                          {formatFine(group.totalFine)}g
                        </td>
                        <td className="py-2 px-3 text-right font-mono">-</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700">
                          ₹{formatAmount(group.totalAmount)}
                        </td>
                      </tr>
                    </Fragment>
                  )
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                    Total:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                    {formatFine(summary.totalFine)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">-</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                    ₹{formatAmount(summary.totalAmount)}
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

export default DarRojmelReportScreen
