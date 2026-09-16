import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
  FiUsers,
  FiX,
  FiRefreshCw,
  FiDownload,
  FiPrinter,
  FiSearch,
  FiArrowDownLeft,
  FiArrowUpRight
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatDate, formatAmount } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'

const emptyTotals: OutstandingReportTotals = {
  goldFine: 0,
  silverFine: 0,
  cash: 0,
  anamat: 0,
  bank: 0
}

const emptyResult: OutstandingReportResult = {
  receivable: [],
  payable: [],
  receivableTotals: emptyTotals,
  payableTotals: emptyTotals
}

function formatFine(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })
}



function OutstandingReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [result, setResult] = useState<OutstandingReportResult>(emptyResult)
  const [searchText, setSearchText] = useState('')
  const [activeTab, setActiveTab] = useState<'ALL' | 'RECEIVABLE' | 'PAYABLE'>('ALL')
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
      const data = await window.api.reports.outstanding()
      setResult(data || emptyResult)
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

  const matchesSearch = (record: OutstandingReportRecord) => {
    if (!keyword) return true
    return (
      record.accountName?.toLowerCase().includes(keyword) ||
      record.otherName?.toLowerCase().includes(keyword) ||
      record.mobileNumber?.toLowerCase().includes(keyword) ||
      record.city?.toLowerCase().includes(keyword) ||
      record.groupName?.toLowerCase().includes(keyword)
    )
  }

  const filteredReceivable = useMemo(
    () => (result.receivable || []).filter(matchesSearch),
    [result.receivable, keyword]
  )

  const filteredPayable = useMemo(
    () => (result.payable || []).filter(matchesSearch),
    [result.payable, keyword]
  )

  const handleExportCsv = () => {
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const headers = ['Category', 'Account Name', 'Group', 'Mobile', 'City', 'Gold Fine (g)', 'Silver Fine (g)', 'Cash (INR)', 'Anamat (INR)', 'Bank (INR)', 'Last Transaction', 'Days Idle']
    const csvRows = [
      ...filteredReceivable.map((r) => [
        'Receivable (Due to us)',
        escapeCsv(r.accountName),
        escapeCsv(r.groupName),
        escapeCsv(r.mobileNumber || '-'),
        escapeCsv(r.city || '-'),
        r.goldFine || 0,
        r.silverFine || 0,
        r.cash || 0,
        r.anamat || 0,
        r.bank || 0,
        escapeCsv(formatDate(r.lastTransactionDate)),
        r.daysSinceLastTransaction ?? '-'
      ]),
      ...filteredPayable.map((r) => [
        'Payable (We owe)',
        escapeCsv(r.accountName),
        escapeCsv(r.groupName),
        escapeCsv(r.mobileNumber || '-'),
        escapeCsv(r.city || '-'),
        r.goldFine || 0,
        r.silverFine || 0,
        r.cash || 0,
        r.anamat || 0,
        r.bank || 0,
        escapeCsv(formatDate(r.lastTransactionDate)),
        r.daysSinceLastTransaction ?? '-'
      ])
    ]

    if (csvRows.length === 0) {
      showAlert('warning', 'No outstanding records to export.')
      return
    }

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `outstanding_balances_${dayjs().format('YYYY-MM-DD')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Outstanding Report CSV successfully.')
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
            <h1 className="font-bold text-sm text-slate-900 tracking-tight">Party Outstanding Report</h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Receivables and payables overview categorized by dominant ledger balances & ageing
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
          {/* Segmented Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
                activeTab === 'ALL'
                  ? 'bg-amber-500 text-white font-bold border-amber-600 shadow-2xs'
                  : 'text-slate-700 hover:text-amber-900 hover:bg-amber-50/70 border-transparent font-medium'
              }`}
            >
              All Outstanding ({filteredReceivable.length + filteredPayable.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('RECEIVABLE')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1 ${
                activeTab === 'RECEIVABLE'
                  ? 'bg-emerald-600 text-white font-bold border-emerald-700 shadow-2xs'
                  : 'text-emerald-800 hover:bg-emerald-50 border-transparent font-medium'
              }`}
            >
              <FiArrowDownLeft className="w-3 h-3" />
              Receivables ({filteredReceivable.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PAYABLE')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1 ${
                activeTab === 'PAYABLE'
                  ? 'bg-rose-600 text-white font-bold border-rose-700 shadow-2xs'
                  : 'text-rose-800 hover:bg-rose-50 border-transparent font-medium'
              }`}
            >
              <FiArrowUpRight className="w-3 h-3" />
              Payables ({filteredPayable.length})
            </button>
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

        {/* Content Area */}
        <div className="flex-1 overflow-auto space-y-3">
          {/* Receivables Section */}
          {(activeTab === 'ALL' || activeTab === 'RECEIVABLE') && (
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
              <div className="px-3.5 py-2.5 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiArrowDownLeft className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                    Receivables — Parties Owe Us ({filteredReceivable.length})
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono font-bold text-emerald-800">
                  <span>Gold: {formatFine(result.receivableTotals.goldFine)}g</span>
                  <span>Cash: ₹{formatAmount(result.receivableTotals.cash)}</span>
                </div>
              </div>

              <div className="overflow-x-auto max-h-72">
                {filteredReceivable.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs font-medium">
                    No outstanding receivables found.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">#</th>
                        <th className="py-2 px-3">Account Name</th>
                        <th className="py-2 px-3">Group</th>
                        <th className="py-2 px-3">Mobile</th>
                        <th className="py-2 px-3">City</th>
                        <th className="py-2 px-3 text-right">Gold Fine (g)</th>
                        <th className="py-2 px-3 text-right">Silver Fine (g)</th>
                        <th className="py-2 px-3 text-right">Cash Due (₹)</th>
                        <th className="py-2 px-3 text-right">Anamat (₹)</th>
                        <th className="py-2 px-3 text-right">Bank (₹)</th>
                        <th className="py-2 px-3">Last Txn</th>
                        <th className="py-2 px-3 text-center">Days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReceivable.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-emerald-50/40 text-slate-700 font-medium">
                          <td className="py-1.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-semibold text-slate-900">{r.accountName}</td>
                          <td className="py-1.5 px-3 text-slate-500">{r.groupName}</td>
                          <td className="py-1.5 px-3 font-mono text-slate-600">{r.mobileNumber || '-'}</td>
                          <td className="py-1.5 px-3 text-slate-600">{r.city || '-'}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-amber-800">
                            {r.goldFine ? `${formatFine(r.goldFine)}g` : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-800">
                            {r.silverFine ? `${formatFine(r.silverFine)}g` : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {r.cash ? `₹${formatAmount(r.cash)}` : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-medium text-slate-700">
                            {r.anamat ? `₹${formatAmount(r.anamat)}` : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-medium text-slate-700">
                            {r.bank ? `₹${formatAmount(r.bank)}` : '-'}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-[11px] text-slate-500">{formatDate(r.lastTransactionDate)}</td>
                          <td className="py-1.5 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                              {r.daysSinceLastTransaction ?? '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Payables Section */}
          {(activeTab === 'ALL' || activeTab === 'PAYABLE') && (
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
              <div className="px-3.5 py-2.5 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiArrowUpRight className="w-4 h-4 text-rose-700" />
                  <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                    Payables — We Owe Parties ({filteredPayable.length})
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono font-bold text-rose-800">
                  <span>Gold: {formatFine(result.payableTotals.goldFine)}g</span>
                  <span>Cash: ₹{formatAmount(result.payableTotals.cash)}</span>
                </div>
              </div>

              <div className="overflow-x-auto max-h-72">
                {filteredPayable.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs font-medium">
                    No outstanding payables found.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">#</th>
                        <th className="py-2 px-3">Account Name</th>
                        <th className="py-2 px-3">Group</th>
                        <th className="py-2 px-3">Mobile</th>
                        <th className="py-2 px-3">City</th>
                        <th className="py-2 px-3 text-right">Gold Fine (g)</th>
                        <th className="py-2 px-3 text-right">Silver Fine (g)</th>
                        <th className="py-2 px-3 text-right">Cash Payable (₹)</th>
                        <th className="py-2 px-3 text-right">Anamat (₹)</th>
                        <th className="py-2 px-3 text-right">Bank (₹)</th>
                        <th className="py-2 px-3">Last Txn</th>
                        <th className="py-2 px-3 text-center">Days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPayable.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-rose-50/40 text-slate-700 font-medium">
                          <td className="py-1.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-semibold text-slate-900">{r.accountName}</td>
                          <td className="py-1.5 px-3 text-slate-500">{r.groupName}</td>
                          <td className="py-1.5 px-3 font-mono text-slate-600">{r.mobileNumber || '-'}</td>
                          <td className="py-1.5 px-3 text-slate-600">{r.city || '-'}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-amber-800">
                            {r.goldFine ? `${formatFine(r.goldFine)}g` : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-800">
                            {r.silverFine ? `${formatFine(r.silverFine)}g` : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-700">
                            {r.cash ? `₹${formatAmount(r.cash)}` : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-medium text-slate-700">
                            {r.anamat ? `₹${formatAmount(r.anamat)}` : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-medium text-slate-700">
                            {r.bank ? `₹${formatAmount(r.bank)}` : '-'}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-[11px] text-slate-500">{formatDate(r.lastTransactionDate)}</td>
                          <td className="py-1.5 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                              {r.daysSinceLastTransaction ?? '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OutstandingReportScreen
