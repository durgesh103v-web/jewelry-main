import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiFileText,
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

function formatDate(value: string): string {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function getTransactionLabel(type: string): string {
  if (type === 'SALE') return 'Sale'
  if (type === 'PURCHASE') return 'Purchase'
  return type
}

function AccountWiseSalePurchaseReportScreen({
  onClose
}: {
  onClose: () => void
}): React.JSX.Element {
  const [records, setRecords] = useState<AccountWiseSalePurchaseRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [metalFilter, setMetalFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [accountFilter, setAccountFilter] = useState('All')
  const [loading, setLoading] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const accountOptions = useMemo(() => {
    const map = new Map<string, string>()
    records.forEach((record) => {
      map.set(record.accountId, record.accountName)
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [records])

  const filteredRecords = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return records.filter((record) => {
      const metalMatch = metalFilter === 'All' || record.metalType === metalFilter
      const typeMatch = typeFilter === 'All' || record.transactionType === typeFilter
      const accountMatch = accountFilter === 'All' || record.accountId === accountFilter
      const keywordMatch =
        !keyword ||
        record.billNo?.toLowerCase().includes(keyword) ||
        record.accountName?.toLowerCase().includes(keyword) ||
        record.mobileNumber?.toLowerCase().includes(keyword) ||
        record.city?.toLowerCase().includes(keyword) ||
        record.groupName?.toLowerCase().includes(keyword) ||
        record.metalType?.toLowerCase().includes(keyword) ||
        record.billDate?.toLowerCase().includes(keyword)

      return metalMatch && typeMatch && accountMatch && keywordMatch
    })
  }, [records, searchText, metalFilter, typeFilter, accountFilter])

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (total, record) => {
        total.fineJama += Number(record.fineJama || 0) + Number(record.paymentFineJama || 0)
        total.fineNave += Number(record.fineNave || 0) + Number(record.paymentFineNave || 0)
        total.cashJama += Number(record.cashJama || 0) + Number(record.paymentCashJama || 0)
        total.cashNave += Number(record.cashNave || 0) + Number(record.paymentCashNave || 0)
        return total
      },
      {
        fineJama: 0,
        fineNave: 0,
        cashJama: 0,
        cashNave: 0
      }
    )
  }, [filteredRecords])

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
      const data = await window.api.reports.accountWiseSalePurchase()
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

  const handleExportCsv = () => {
    if (filteredRecords.length === 0) {
      showAlert('warning', 'No sale/purchase records to export.')
      return
    }
    const headers = ['Sr', 'Date', 'Bill No', 'Type', 'Account Name', 'Mobile', 'City', 'Metal', 'Fine Jama (g)', 'Fine Nave (g)', 'Cash Jama (INR)', 'Cash Nave (INR)', 'Closing Fine (g)', 'Closing Cash (INR)']
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const csvRows = [
      ...filteredRecords.map((r, idx) => {
        const closingFine = r.metalType === 'Gold' ? r.closingGoldFine : r.closingSilverFine
        return [
          idx + 1,
          escapeCsv(formatDate(r.billDate)),
          escapeCsv(r.billNo),
          escapeCsv(getTransactionLabel(r.transactionType)),
          escapeCsv(r.accountName),
          escapeCsv(r.mobileNumber || '-'),
          escapeCsv(r.city || '-'),
          escapeCsv(r.metalType),
          Number(r.fineJama || 0) + Number(r.paymentFineJama || 0),
          Number(r.fineNave || 0) + Number(r.paymentFineNave || 0),
          Number(r.cashJama || 0) + Number(r.paymentCashJama || 0),
          Number(r.cashNave || 0) + Number(r.paymentCashNave || 0),
          closingFine || 0,
          r.closingCash || 0
        ]
      }),
      ['Total', '', '', '', '', '', '', '', totals.fineJama, totals.fineNave, totals.cashJama, totals.cashNave, '', '']
    ]

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `account_wise_sale_purchase_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Account-Wise Sale Purchase CSV successfully.')
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiFileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight">Account-Wise Sale & Purchase Ledger</h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Comparative ledger of sale and purchase movements with fine & cash jama/nave
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
          {/* Account Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <FiFilter className="w-3.5 h-3.5 text-slate-400" />
              Account:
            </span>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-semibold shadow-2xs max-w-[180px]"
            >
              <option value="All">All Accounts</option>
              {accountOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-semibold">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-semibold shadow-2xs"
            >
              <option value="All">All Types</option>
              <option value="SALE">Sale</option>
              <option value="PURCHASE">Purchase</option>
            </select>
          </div>

          {/* Metal Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-semibold">Metal:</span>
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

          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search bill no, account, mobile..."
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
          <div className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Fine Jama</span>
            <span className="text-sm font-extrabold font-mono text-emerald-700 mt-0.5">
              {formatFine(totals.fineJama)}g
            </span>
          </div>
          <div className="p-3 rounded-xl border border-rose-200/80 bg-rose-50/40 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Total Fine Nave</span>
            <span className="text-sm font-extrabold font-mono text-rose-700 mt-0.5">
              {formatFine(totals.fineNave)}g
            </span>
          </div>
          <div className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Cash Jama</span>
            <span className="text-sm font-extrabold font-mono text-emerald-700 mt-0.5">
              ₹{formatAmount(totals.cashJama)}
            </span>
          </div>
          <div className="p-3 rounded-xl border border-rose-200/80 bg-rose-50/40 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Total Cash Nave</span>
            <span className="text-sm font-extrabold font-mono text-rose-700 mt-0.5">
              ₹{formatAmount(totals.cashNave)}
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
              <h3 className="font-bold text-sm text-slate-800 mb-1">No Transactions Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-3">
                {searchText ? 'No records matching your search.' : 'No sale or purchase records recorded yet.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Bill No</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Metal</th>
                  <th className="py-2.5 px-3 text-right">Fine Jama (g)</th>
                  <th className="py-2.5 px-3 text-right">Fine Nave (g)</th>
                  <th className="py-2.5 px-3 text-right">Cash Jama (₹)</th>
                  <th className="py-2.5 px-3 text-right">Cash Nave (₹)</th>
                  <th className="py-2.5 px-3 text-right">Closing Fine</th>
                  <th className="py-2.5 px-3 text-right">Closing Cash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record, index) => {
                  const closingFine =
                    record.metalType === 'Gold' ? record.closingGoldFine : record.closingSilverFine

                  const fineJ = Number(record.fineJama || 0) + Number(record.paymentFineJama || 0)
                  const fineN = Number(record.fineNave || 0) + Number(record.paymentFineNave || 0)
                  const cashJ = Number(record.cashJama || 0) + Number(record.paymentCashJama || 0)
                  const cashN = Number(record.cashNave || 0) + Number(record.paymentCashNave || 0)

                  return (
                    <tr key={`${record.transactionType}-${record.id}`} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{index + 1}</td>
                      <td className="py-2 px-3 font-mono text-[11px]">{formatDate(record.billDate)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{record.billNo}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            record.transactionType === 'SALE'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}
                        >
                          {getTransactionLabel(record.transactionType)}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{record.accountName}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{record.mobileNumber || '-'}</td>
                      <td className="py-2 px-3 text-slate-600">{record.metalType}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        {fineJ ? `${formatFine(fineJ)}g` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                        {fineN ? `${formatFine(fineN)}g` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        {cashJ ? `₹${formatAmount(cashJ)}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                        {cashN ? `₹${formatAmount(cashN)}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">
                        {formatFine(closingFine)}g
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">
                        ₹{formatAmount(record.closingCash)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0">
                <tr>
                  <td colSpan={7} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                    Total:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                    {formatFine(totals.fineJama)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                    {formatFine(totals.fineNave)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                    ₹{formatAmount(totals.cashJama)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                    ₹{formatAmount(totals.cashNave)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default AccountWiseSalePurchaseReportScreen
