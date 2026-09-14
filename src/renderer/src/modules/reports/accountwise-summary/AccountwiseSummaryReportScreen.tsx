import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiUsers,
  FiX,
  FiRefreshCw,
  FiDownload,
  FiPrinter,
  FiSearch,
  FiInbox,
  FiFilter
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

function formatFine(value: number): string {
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

function matchesSearch(record: AccountwiseSummaryRecord, keyword: string): boolean {
  if (!keyword) return true

  return (
    record.accountName?.toLowerCase().includes(keyword) ||
    record.otherName?.toLowerCase().includes(keyword) ||
    record.mobileNumber?.toLowerCase().includes(keyword) ||
    record.city?.toLowerCase().includes(keyword) ||
    record.groupName?.toLowerCase().includes(keyword)
  )
}

function AccountwiseSummaryReportScreen({
  onClose
}: {
  onClose: () => void
}): React.JSX.Element {
  const [records, setRecords] = useState<AccountwiseSummaryRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [groupFilter, setGroupFilter] = useState('All')
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

  const loadReport = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.reports.accountwiseSummary()
      setRecords(data || [])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const keyword = searchText.trim().toLowerCase()

  const groupsList = useMemo(() => {
    const set = new Set<string>()
    records.forEach((r) => {
      if (r.groupName) set.add(r.groupName)
    })
    return ['All', ...Array.from(set).sort()]
  }, [records])

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const matchesGroup = groupFilter === 'All' || record.groupName === groupFilter
        return matchesGroup && matchesSearch(record, keyword)
      }),
    [records, keyword, groupFilter]
  )

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (total, record) => {
        total.totalSaleFine += record.totalSaleFine || 0
        total.totalSaleValue += record.totalSaleValue || 0
        total.totalPurchaseFine += record.totalPurchaseFine || 0
        total.totalPurchaseValue += record.totalPurchaseValue || 0
        total.goldFine += record.goldFine || 0
        total.silverFine += record.silverFine || 0
        total.cash += record.cash || 0
        return total
      },
      {
        totalSaleFine: 0,
        totalSaleValue: 0,
        totalPurchaseFine: 0,
        totalPurchaseValue: 0,
        goldFine: 0,
        silverFine: 0,
        cash: 0
      }
    )
  }, [filteredRecords])

  const handleExportCsv = () => {
    if (filteredRecords.length === 0) {
      showAlert('warning', 'No records to export.')
      return
    }
    const headers = ['Sr', 'Account Name', 'Group', 'City', 'Total Sale Fine (g)', 'Sale Labour/Value (INR)', 'Total Purchase Fine (g)', 'Purchase Labour/Value (INR)', 'Gold Fine Balance (g)', 'Silver Fine Balance (g)', 'Cash Balance (INR)']
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const csvRows = [
      ...filteredRecords.map((r, idx) => [
        idx + 1,
        escapeCsv(r.accountName),
        escapeCsv(r.groupName),
        escapeCsv(r.city || '-'),
        r.totalSaleFine || 0,
        r.totalSaleValue || 0,
        r.totalPurchaseFine || 0,
        r.totalPurchaseValue || 0,
        r.goldFine || 0,
        r.silverFine || 0,
        r.cash || 0
      ]),
      ['Total', '', '', '', totals.totalSaleFine, totals.totalSaleValue, totals.totalPurchaseFine, totals.totalPurchaseValue, totals.goldFine, totals.silverFine, totals.cash]
    ]

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `accountwise_summary_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Accountwise Summary CSV successfully.')
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiUsers className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight">Accountwise Summary Report</h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Comprehensive lifetime sales, purchases, and current balances summarized by account
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
          {/* Group Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <FiFilter className="w-3.5 h-3.5 text-slate-400" />
              Group:
            </span>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-semibold shadow-2xs"
            >
              {groupsList.map((g) => (
                <option key={g} value={g}>
                  {g === 'All' ? 'All Groups' : g}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search account, mobile, city, group..."
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
          <div className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/40 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Sale Fine</span>
            <span className="text-sm font-extrabold font-mono text-amber-800 mt-0.5">
              {formatFine(totals.totalSaleFine)}g
            </span>
          </div>
          <div className="p-3 rounded-xl border border-blue-200/80 bg-blue-50/40 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Total Purchase Fine</span>
            <span className="text-sm font-extrabold font-mono text-blue-800 mt-0.5">
              {formatFine(totals.totalPurchaseFine)}g
            </span>
          </div>
          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Gold Fine Balance</span>
            <span className="text-sm font-extrabold font-mono text-slate-900 mt-0.5">
              {formatFine(totals.goldFine)}g
            </span>
          </div>
          <div className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Cash Balance</span>
            <span className="text-sm font-extrabold font-mono text-emerald-700 mt-0.5">
              ₹{formatAmount(totals.cash)}
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          {filteredRecords.length === 0 && !loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                <FiInbox className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 mb-1">No Accounts Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-3">
                {searchText ? 'No accounts matching your search.' : 'No accounts recorded yet.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3">Group</th>
                  <th className="py-2.5 px-3">City</th>
                  <th className="py-2.5 px-3 text-right">Sale Fine (g)</th>
                  <th className="py-2.5 px-3 text-right">Sale Value (₹)</th>
                  <th className="py-2.5 px-3 text-right">Purchase Fine (g)</th>
                  <th className="py-2.5 px-3 text-right">Purchase Value (₹)</th>
                  <th className="py-2.5 px-3 text-right">Gold Fine (g)</th>
                  <th className="py-2.5 px-3 text-right">Silver Fine (g)</th>
                  <th className="py-2.5 px-3 text-right">Cash Due (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record, index) => (
                  <tr key={record.id} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{index + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{record.accountName}</td>
                    <td className="py-2 px-3 text-slate-500">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {record.groupName}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{record.city || '-'}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">
                      {record.totalSaleFine ? `${formatFine(record.totalSaleFine)}g` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                      {record.totalSaleValue ? `₹${formatAmount(record.totalSaleValue)}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                      {record.totalPurchaseFine ? `${formatFine(record.totalPurchaseFine)}g` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                      {record.totalPurchaseValue ? `₹${formatAmount(record.totalPurchaseValue)}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">
                      {record.goldFine ? `${formatFine(record.goldFine)}g` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">
                      {record.silverFine ? `${formatFine(record.silverFine)}g` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      {record.cash ? `₹${formatAmount(record.cash)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                    Total:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                    {formatFine(totals.totalSaleFine)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                    ₹{formatAmount(totals.totalSaleValue)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-blue-800">
                    {formatFine(totals.totalPurchaseFine)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                    ₹{formatAmount(totals.totalPurchaseValue)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                    {formatFine(totals.goldFine)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                    {formatFine(totals.silverFine)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                    ₹{formatAmount(totals.cash)}
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

export default AccountwiseSummaryReportScreen
