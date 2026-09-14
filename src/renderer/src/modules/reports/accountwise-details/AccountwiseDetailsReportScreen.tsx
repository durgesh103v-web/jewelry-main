import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
  FiBookOpen,
  FiCalendar,
  FiDownload,
  FiInbox,
  FiMapPin,
  FiPhone,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiTrendingDown,
  FiTrendingUp,
  FiUser,
  FiX
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'
type DatePreset = 'TODAY' | 'THIS_MONTH' | 'THIS_FY' | 'ALL_TIME'

type Account = {
  id: string
  accountName: string
  mobileNumber: string
  city: string
  active: boolean
}

type AccountLedgerDetailsRecord = {
  account: {
    id: string
    accountName: string
    otherName: string
    mobileNumber: string
    city: string
    groupName: string
  }
  openingBalance: {
    goldFine: number
    silverFine: number
    cash: number
    anamat: number
    bank: number
  }
  rows: Array<{
    id: string
    srNo: number
    sourceType: string
    sourceId: string
    saleNo: string
    billNo: string
    entryDate: string
    metalType: string
    fineJama: number
    fineNave: number
    cashJama: number
    cashNave: number
    bankJama: number
    bankNave: number
    anamatJama: number
    anamatNave: number
    narration: string
    runningGoldFine: number
    runningSilverFine: number
    runningCash: number
    runningBank: number
    runningAnamat: number
  }>
  closingBalance: {
    goldFine: number
    silverFine: number
    cash: number
    anamat: number
    bank: number
  }
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
  if (sourceType === 'OPENING_BALANCE') return 'Opening'
  return sourceType
}

function getLedgerTypeBadge(sourceType: string): string {
  switch (sourceType) {
    case 'SALE':
      return 'bg-amber-50 text-amber-800 border-amber-200'
    case 'PURCHASE':
      return 'bg-blue-50 text-blue-800 border-blue-200'
    case 'CASH_RECEIPT':
    case 'SALE_PAYMENT':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'CASH_PAYMENT':
    case 'PURCHASE_PAYMENT':
      return 'bg-rose-50 text-rose-800 border-rose-200'
    case 'SALE_RETURN':
    case 'PURCHASE_RETURN':
      return 'bg-purple-50 text-purple-800 border-purple-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

function formatDate(value: string): string {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function AccountwiseDetailsReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [activePreset, setActivePreset] = useState<DatePreset>('ALL_TIME')
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

  // Movement totals during period
  const movementTotals = useMemo(() => {
    if (!filteredRows.length) {
      return { fineJama: 0, fineNave: 0, cashJama: 0, cashNave: 0 }
    }
    return filteredRows.reduce(
      (acc, r) => {
        acc.fineJama += Number(r.fineJama || 0)
        acc.fineNave += Number(r.fineNave || 0)
        acc.cashJama += Number(r.cashJama || 0)
        acc.cashNave += Number(r.cashNave || 0)
        return acc
      },
      { fineJama: 0, fineNave: 0, cashJama: 0, cashNave: 0 }
    )
  }, [filteredRows])

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
        showAlert('warning', 'Please select an account.')
        return
      }

      if (fromDate && toDate && fromDate > toDate) {
        showAlert('warning', 'From date cannot be after to date.')
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
    if (!report) {
      showAlert('warning', 'No ledger report to export.')
      return
    }

    const headers = [
      'Sr',
      'Date',
      'Bill / Ref No',
      'Voucher Type',
      'Metal',
      'Fine Jama (g)',
      'Fine Nave (g)',
      'Cash Jama (INR)',
      'Cash Nave (INR)',
      'Running Gold Fine (g)',
      'Running Silver Fine (g)',
      'Running Cash (INR)',
      'Narration'
    ]
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
      r.runningGoldFine || 0,
      r.runningSilverFine || 0,
      r.runningCash || 0,
      escapeCsv(r.narration || '-')
    ])

    const metadataHeader = [
      `"ACCOUNT LEDGER STATEMENT: ${report.account.accountName} (${report.account.groupName})"`,
      `"Mobile: ${report.account.mobileNumber || '-'} | City: ${report.account.city || '-'}"`,
      `"Period: ${fromDate ? formatDate(fromDate) : 'Opening'} to ${toDate ? formatDate(toDate) : 'Today'}"`,
      `"Opening Balance: Gold: ${report.openingBalance.goldFine}g, Silver: ${report.openingBalance.silverFine}g, Cash: ₹${report.openingBalance.cash}"`,
      `"Closing Balance: Gold: ${report.closingBalance.goldFine}g, Silver: ${report.closingBalance.silverFine}g, Cash: ₹${report.closingBalance.cash}"`,
      ''
    ]

    const csvContent =
      '\uFEFF' + [...metadataHeader, headers.join(','), ...csvRows.map((r) => r.join(','))].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ledger_${report.account.accountName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Account Ledger Details CSV successfully.')
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
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiBookOpen className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Accountwise Ledger Details</span>
              {report && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                  {report.account.accountName}
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Full running balance transaction ledger for individual party accounts
            </p>
          </div>
        </div>

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

        {/* Filter Bar */}
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 no-print">
          <div className="flex flex-wrap items-center gap-3">
            {/* Account Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-700 font-bold flex items-center gap-1">
                <FiUser className="w-3.5 h-3.5 text-amber-600" />
                Select Account:
              </span>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                disabled={loadingAccounts}
                className="h-8 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-2xs min-w-[240px]"
              >
                <option value="">-- Choose Account --</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountName} {a.mobileNumber ? `(${a.mobileNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold flex items-center gap-1">
                <FiCalendar className="w-3.5 h-3.5 text-amber-600" />
                Period:
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

          {/* Search */}
          <div className="relative w-64">
            <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Filter by bill no, narration, type..."
              className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs font-medium"
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

        {/* Account Info & Balances Cards */}
        {report && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 shrink-0">
            {/* Account Card */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                    {report.account.accountName.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">{report.account.accountName}</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {report.account.groupName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <FiPhone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-[11px] font-semibold text-slate-800">
                    {report.account.mobileNumber || 'No mobile'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <FiMapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-[11px] font-medium text-slate-700 truncate">
                    {report.account.city || 'No city'}
                  </span>
                </div>
              </div>
            </div>

            {/* Opening Balance */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <FiTrendingDown className="w-3.5 h-3.5 text-blue-500" /> Opening Balance
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {fromDate ? formatDate(fromDate) : 'Start'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Gold</span>
                  <strong className="font-mono text-xs font-black text-amber-700">
                    {formatFine(report.openingBalance.goldFine)}g
                  </strong>
                </div>
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Silver</span>
                  <strong className="font-mono text-xs font-black text-slate-800">
                    {formatFine(report.openingBalance.silverFine)}g
                  </strong>
                </div>
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Cash</span>
                  <strong className="font-mono text-xs font-black text-emerald-700">
                    ₹{formatAmount(report.openingBalance.cash)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Closing Balance */}
            <div className="p-3.5 bg-white rounded-xl border border-amber-300/80 bg-gradient-to-b from-amber-50/40 to-white shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                  <FiTrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Current Closing Balance
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Active
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-[10px] text-amber-800 font-bold block uppercase">Gold</span>
                  <strong className="font-mono text-xs font-black text-amber-900">
                    {formatFine(report.closingBalance.goldFine)}g
                  </strong>
                </div>
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-300">
                  <span className="text-[10px] text-slate-700 font-bold block uppercase">Silver</span>
                  <strong className="font-mono text-xs font-black text-slate-900">
                    {formatFine(report.closingBalance.silverFine)}g
                  </strong>
                </div>
                <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 font-bold block uppercase">Cash</span>
                  <strong className="font-mono text-xs font-black text-emerald-800">
                    ₹{formatAmount(report.closingBalance.cash)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print Header */}
        <div className="hidden print:block p-3 border-b border-slate-300">
          <h2 className="text-lg font-bold text-slate-900">Accountwise Ledger Statement</h2>
          <p className="text-xs text-slate-600">
            Account: {report?.account.accountName} ({report?.account.groupName}) | Period:{' '}
            {fromDate ? formatDate(fromDate) : 'Beginning'} to {toDate ? formatDate(toDate) : 'Today'}
          </p>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 w-22">Date</th>
                <th className="py-2.5 px-3">Bill / Ref No</th>
                <th className="py-2.5 px-3">Voucher Type</th>
                <th className="py-2.5 px-3">Metal</th>
                <th className="py-2.5 px-3 text-right">Fine Jama</th>
                <th className="py-2.5 px-3 text-right">Fine Nave</th>
                <th className="py-2.5 px-3 text-right">Cash Jama</th>
                <th className="py-2.5 px-3 text-right">Cash Nave</th>
                <th className="py-2.5 px-3 text-right bg-amber-50/40">Run Gold</th>
                <th className="py-2.5 px-3 text-right bg-amber-50/40">Run Silver</th>
                <th className="py-2.5 px-3 text-right bg-amber-50/40">Run Cash</th>
                <th className="py-2.5 px-3">Narration</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 font-medium">
                    <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading account ledger statement...
                  </td>
                </tr>
              ) : !report ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 font-medium">
                    Please select an account above to view ledger details.
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2">
                        <FiInbox className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm text-slate-800 mb-0.5">No Ledger Transactions in Period</span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        No transactions recorded for this period. The opening balance carries forward as current balance.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id || row.srNo} className="hover:bg-amber-50/40 text-slate-700 font-medium transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{row.srNo}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-800">{formatDate(row.entryDate)}</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">{row.billNo || row.saleNo || '-'}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getLedgerTypeBadge(row.sourceType)}`}>
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
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-800 bg-amber-50/20">
                      {formatFine(row.runningGoldFine)}g
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 bg-amber-50/20">
                      {formatFine(row.runningSilverFine)}g
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-amber-50/20">
                      ₹{formatAmount(row.runningCash)}
                    </td>
                    <td className="py-2 px-3 text-slate-500 italic max-w-xs truncate">{row.narration || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>

            {report && filteredRows.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0 z-10 shadow-inner">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 text-right text-xs uppercase tracking-wider">
                    Period Total Movement:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-black">
                    {formatFine(movementTotals.fineJama)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-black">
                    {formatFine(movementTotals.fineNave)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-black">
                    ₹{formatAmount(movementTotals.cashJama)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-black">
                    ₹{formatAmount(movementTotals.cashNave)}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer info note */}
        <div className="px-4 py-2 bg-white rounded-lg border border-slate-200/90 text-[11px] text-slate-500 flex items-center justify-between shrink-0 no-print shadow-2xs">
          <span>
            * <strong>Jama</strong> (Credit / Inflow) reduces receivable or increases metal received. <strong>Nave</strong> (Debit / Outflow) increases receivable debt.
          </span>
          <span className="font-semibold text-slate-600">Jewelry ERP System</span>
        </div>
      </div>
    </div>
  )
}

export default AccountwiseDetailsReportScreen
