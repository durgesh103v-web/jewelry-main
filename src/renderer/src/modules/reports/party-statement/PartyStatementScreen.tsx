import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
  FiFileText,
  FiX,
  FiCalendar,
  FiRefreshCw,
  FiDownload,
  FiPrinter,
  FiSearch,
  FiInbox,
  FiUser
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'
type DatePreset = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_FY'

type Account = {
  id: string
  accountName: string
  mobileNumber: string
  city: string
  active: boolean
}

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

function getLedgerTypeLabel(sourceType: string): string {
  if (sourceType === 'SALE') return 'Sale'
  if (sourceType === 'SALE_PAYMENT') return 'Sale Payment'
  if (sourceType === 'SALE_RETURN') return 'Sale Return'
  if (sourceType === 'PURCHASE') return 'Purchase'
  if (sourceType === 'PURCHASE_PAYMENT') return 'Purchase Payment'
  if (sourceType === 'PURCHASE_RETURN') return 'Purchase Return'
  if (sourceType === 'CASH_RECEIPT') return 'Cash Receipt'
  if (sourceType === 'CASH_PAYMENT') return 'Cash Payment'
  return sourceType
}

function formatDate(value: string): string {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function PartyStatementScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [toDate, setToDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [activePreset, setActivePreset] = useState<DatePreset | null>('THIS_MONTH')
  const [report, setReport] = useState<AccountLedgerDetailsRecord | null>(null)
  const [searchText, setSearchText] = useState('')

  const [loading, setLoading] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const activeAccounts = useMemo(() => {
    return accounts.filter((account) => account.active)
  }, [accounts])

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

  const filteredRows = useMemo(() => {
    if (!report) return []

    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return report.rows

    return report.rows.filter((row) => {
      return (
        row.sourceType?.toLowerCase().includes(keyword) ||
        (row.billNo || row.saleNo)?.toLowerCase().includes(keyword) ||
        row.metalType?.toLowerCase().includes(keyword) ||
        row.narration?.toLowerCase().includes(keyword) ||
        row.entryDate?.toLowerCase().includes(keyword)
      )
    })
  }, [report, searchText])

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

  const loadAccounts = useCallback(async (): Promise<void> => {
    try {
      setLoadingAccounts(true)
      const data = await window.api.accounts.list()
      setAccounts(data || [])

      const firstAccount = (data || []).find((account) => account.active)
      if (firstAccount) {
        setSelectedAccountId(firstAccount.id)
      }
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoadingAccounts(false)
    }
  }, [showAlert])

  const loadReport = useCallback(
    async (accountId = selectedAccountId): Promise<void> => {
      if (!accountId) {
        showAlert('warning', 'Please select account.')
        return
      }

      if (fromDate && toDate && fromDate > toDate) {
        showAlert('warning', 'From date cannot be after To date.')
        return
      }

      try {
        setLoading(true)
        const data = await window.api.reports.accountLedgerDetails(accountId, {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined
        })
        setReport(data)
      } catch (error) {
        showAlert('error', getFriendlyErrorMessage(error))
      } finally {
        setLoading(false)
      }
    },
    [selectedAccountId, fromDate, toDate, showAlert]
  )

  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  useEffect(() => {
    if (!selectedAccountId) return undefined
    void loadReport(selectedAccountId)
  }, [selectedAccountId, loadReport])

  const handleExportCsv = () => {
    if (!report || filteredRows.length === 0) {
      showAlert('warning', 'No statement entries to export.')
      return
    }
    const headers = ['Sr', 'Date', 'Bill / Voucher No', 'Type', 'Metal', 'Fine Jama (g)', 'Fine Nave (g)', 'Cash Jama (INR)', 'Cash Nave (INR)', 'Bank Jama (INR)', 'Bank Nave (INR)', 'Anamat Jama (INR)', 'Anamat Nave (INR)', 'Run Gold Fine (g)', 'Run Silver Fine (g)', 'Run Cash (INR)', 'Narration']
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const csvRows = filteredRows.map((r) => [
      r.srNo,
      escapeCsv(formatDate(r.entryDate)),
      escapeCsv(r.billNo || r.saleNo || '-'),
      escapeCsv(getLedgerTypeLabel(r.sourceType)),
      escapeCsv(r.metalType || '-'),
      r.fineJama || 0,
      r.fineNave || 0,
      r.cashJama || 0,
      r.cashNave || 0,
      r.bankJama || 0,
      r.bankNave || 0,
      r.anamatJama || 0,
      r.anamatNave || 0,
      r.runningGoldFine || 0,
      r.runningSilverFine || 0,
      r.runningCash || 0,
      escapeCsv(r.narration || '-')
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `party_statement_${report.account.accountName.replace(/\s+/g, '_')}_${fromDate}_to_${toDate}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Party Statement CSV successfully.')
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
            <FiFileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight">Party Ledger Statement</h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Period-wise statement of account with opening/closing balances and complete transaction history
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
          {/* Account Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <FiUser className="w-3.5 h-3.5 text-amber-600" />
              Party:
            </span>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              disabled={loadingAccounts}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-semibold shadow-2xs min-w-[200px]"
            >
              <option value="">-- Choose Party --</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountName} {a.mobileNumber ? `(${a.mobileNumber})` : ''}
                </option>
              ))}
            </select>
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
          <div className="relative min-w-[180px] flex-1 max-w-xs">
            <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search bill, narration..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-amber-500 shadow-2xs font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadReport()}
              disabled={loading || !selectedAccountId}
              className="h-8 px-3 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 text-amber-600 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Loading...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={loading || !report}
              className="h-8 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-amber-600 cursor-pointer disabled:opacity-50"
            >
              <FiDownload className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              disabled={!report}
              className="h-8 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <FiPrinter className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Account Info & Balances */}
        {report && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 shrink-0">
            {/* Account Card */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900">{report.account.accountName}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {report.account.groupName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Mobile</span>
                  <span className="font-mono text-slate-800">{report.account.mobileNumber || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">City</span>
                  <span className="text-slate-800 font-medium">{report.account.city || '-'}</span>
                </div>
              </div>
            </div>

            {/* Opening Balance */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="pb-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Opening Balance (As of {formatDate(fromDate)})
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-2 text-center text-xs">
                <div className="p-1 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[9px] text-slate-500 font-bold block">Gold</span>
                  <strong className="font-mono text-[11px] text-amber-800">{formatFine(report.openingBalance.goldFine)}g</strong>
                </div>
                <div className="p-1 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[9px] text-slate-500 font-bold block">Silver</span>
                  <strong className="font-mono text-[11px] text-slate-800">{formatFine(report.openingBalance.silverFine)}g</strong>
                </div>
                <div className="p-1 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[9px] text-slate-500 font-bold block">Cash</span>
                  <strong className="font-mono text-[11px] text-emerald-700">₹{formatAmount(report.openingBalance.cash)}</strong>
                </div>
              </div>
            </div>

            {/* Closing Balance */}
            <div className="p-3 bg-white rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-2xs">
              <div className="pb-1.5 border-b border-amber-100 text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                Closing Balance (As of {formatDate(toDate)})
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-2 text-center text-xs">
                <div className="p-1 bg-amber-50/60 rounded border border-amber-200">
                  <span className="text-[9px] text-amber-800 font-bold block">Gold</span>
                  <strong className="font-mono text-[11px] text-amber-900">{formatFine(report.closingBalance.goldFine)}g</strong>
                </div>
                <div className="p-1 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[9px] text-slate-700 font-bold block">Silver</span>
                  <strong className="font-mono text-[11px] text-slate-900">{formatFine(report.closingBalance.silverFine)}g</strong>
                </div>
                <div className="p-1 bg-emerald-50/60 rounded border border-emerald-200">
                  <span className="text-[9px] text-emerald-800 font-bold block">Cash</span>
                  <strong className="font-mono text-[11px] text-emerald-800">₹{formatAmount(report.closingBalance.cash)}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          {!report || filteredRows.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                <FiInbox className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 mb-1">
                {!report ? 'Select a Party Account' : 'No Statement Entries Found'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mb-3">
                {!report ? 'Choose a party from the dropdown above.' : 'No transactions recorded for the selected period.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Bill / Ref No</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Metal</th>
                  <th className="py-2.5 px-3 text-right">Fine Jama</th>
                  <th className="py-2.5 px-3 text-right">Fine Nave</th>
                  <th className="py-2.5 px-3 text-right">Cash Jama</th>
                  <th className="py-2.5 px-3 text-right">Cash Nave</th>
                  <th className="py-2.5 px-3 text-right">Run Gold</th>
                  <th className="py-2.5 px-3 text-right">Run Silver</th>
                  <th className="py-2.5 px-3 text-right">Run Cash</th>
                  <th className="py-2.5 px-3">Narration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{row.srNo}</td>
                    <td className="py-2 px-3 font-mono text-[11px]">{formatDate(row.entryDate)}</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">{row.billNo || row.saleNo || '-'}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {getLedgerTypeLabel(row.sourceType)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{row.metalType || '-'}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      {row.fineJama ? `${formatFine(row.fineJama)}g` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                      {row.fineNave ? `${formatFine(row.fineNave)}g` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      {row.cashJama ? `₹${formatAmount(row.cashJama)}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                      {row.cashNave ? `₹${formatAmount(row.cashNave)}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-amber-800">
                      {formatFine(row.runningGoldFine)}g
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-slate-800">
                      {formatFine(row.runningSilverFine)}g
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-slate-900">
                      ₹{formatAmount(row.runningCash)}
                    </td>
                    <td className="py-2 px-3 text-slate-500 max-w-xs truncate">{row.narration || '-'}</td>
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

export default PartyStatementScreen
