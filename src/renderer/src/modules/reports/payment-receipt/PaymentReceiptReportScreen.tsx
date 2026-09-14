import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
  FiCalendar,
  FiCreditCard,
  FiDollarSign,
  FiDownload,
  FiFilter,
  FiInbox,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiTrendingDown,
  FiTrendingUp,
  FiX
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'
type DatePreset = 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'THIS_FY'

const today = dayjs().format('YYYY-MM-DD')

const emptySummary: PaymentReceiptSummary = {
  totalFineJama: 0,
  totalFineNave: 0,
  totalCashJama: 0,
  totalCashNave: 0,
  totalBankJama: 0,
  totalBankNave: 0,
  totalAnamatJama: 0,
  totalAnamatNave: 0,
  recordCount: 0
}

function formatFine(value: number): string {
  if (!value) return '-'
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })
}

function formatAmount(value: number): string {
  if (!value) return '-'
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

function getSourceTypeLabel(sourceType: string): string {
  if (sourceType === 'CASH_RECEIPT') return 'Cash Receipt'
  if (sourceType === 'CASH_PAYMENT') return 'Cash Payment'
  if (sourceType === 'SALE_PAYMENT') return 'Sale Settlement'
  if (sourceType === 'PURCHASE_PAYMENT') return 'Purchase Settlement'
  return sourceType
}

function getSourceTypeBadge(sourceType: string): string {
  switch (sourceType) {
    case 'CASH_RECEIPT':
    case 'SALE_PAYMENT':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'CASH_PAYMENT':
    case 'PURCHASE_PAYMENT':
      return 'bg-rose-50 text-rose-800 border-rose-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

function PaymentReceiptReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [toDate, setToDate] = useState(today)
  const [activePreset, setActivePreset] = useState<DatePreset>('THIS_MONTH')
  const [rows, setRows] = useState<PaymentReceiptRow[]>([])
  const [summary, setSummary] = useState<PaymentReceiptSummary>(emptySummary)
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
      const result = await window.api.reports.paymentReceipt({ fromDate, toDate })
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
      const typeMatch = typeFilter === 'All' || row.sourceType === typeFilter
      const keywordMatch =
        !keyword ||
        (row.voucherNo || '').toLowerCase().includes(keyword) ||
        (row.accountName || '').toLowerCase().includes(keyword) ||
        (row.narration || '').toLowerCase().includes(keyword) ||
        (row.entryDate || '').toLowerCase().includes(keyword)

      return typeMatch && keywordMatch
    })
  }, [rows, typeFilter, searchText])

  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      showAlert('warning', 'No payment/receipt records to export.')
      return
    }
    const headers = [
      'Sr',
      'Date',
      'Voucher No',
      'Type',
      'Account Name',
      'Metal',
      'Fine Jama (g)',
      'Fine Nave (g)',
      'Cash Jama (INR)',
      'Cash Nave (INR)',
      'Bank Jama (INR)',
      'Bank Nave (INR)',
      'Narration'
    ]
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const csvRows = [
      ...filteredRows.map((r, index) => [
        index + 1,
        escapeCsv(formatDate(r.entryDate)),
        escapeCsv(r.voucherNo),
        escapeCsv(getSourceTypeLabel(r.sourceType)),
        escapeCsv(r.accountName),
        escapeCsv(r.metalType || '-'),
        r.fineJama || 0,
        r.fineNave || 0,
        r.cashJama || 0,
        r.cashNave || 0,
        r.bankJama || 0,
        r.bankNave || 0,
        escapeCsv(r.narration || '-')
      ]),
      [
        'Total',
        '',
        '',
        '',
        '',
        '',
        summary.totalFineJama,
        summary.totalFineNave,
        summary.totalCashJama,
        summary.totalCashNave,
        summary.totalBankJama,
        summary.totalBankNave,
        ''
      ]
    ]

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `payment_receipt_${fromDate}_to_${toDate}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Payment / Receipt CSV successfully.')
  }

  const presets: { id: DatePreset; label: string }[] = [
    { id: 'TODAY', label: 'Today' },
    { id: 'YESTERDAY', label: 'Yesterday' },
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'THIS_FY', label: 'This FY' }
  ]

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiCreditCard className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Payment / Receipt Register</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                {filteredRows.length} Vouchers
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Consolidated audit register of cash, bank, and fine metal settlements across Jama and Nave entries
            </p>
          </div>
        </div>

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
            disabled={loading || filteredRows.length === 0}
            className="h-8 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-amber-600 cursor-pointer disabled:opacity-50"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={filteredRows.length === 0}
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

        {/* Filter Controls Toolbar */}
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 no-print">
          <div className="flex flex-wrap items-center gap-3">
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
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              />
              <span className="text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              />
            </div>

            {/* Voucher Type */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-700 font-bold flex items-center gap-1">
                <FiFilter className="w-3.5 h-3.5 text-amber-600" /> Type:
              </span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-2xs"
              >
                <option value="All">All Vouchers</option>
                <option value="CASH_RECEIPT">Cash Receipt</option>
                <option value="CASH_PAYMENT">Cash Payment</option>
                <option value="SALE_PAYMENT">Sale Settlement</option>
                <option value="PURCHASE_PAYMENT">Purchase Settlement</option>
              </select>
            </div>
          </div>

          <div className="relative w-64">
            <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search voucher, party, note..."
              className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs font-medium"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
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

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Total Cash Jama (Receipts)
              </span>
              <strong className="text-base font-extrabold font-mono text-emerald-800 block mt-0.5">
                ₹{formatAmount(summary.totalCashJama)}
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <FiTrendingDown className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/30 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                Total Cash Nave (Payments)
              </span>
              <strong className="text-base font-extrabold font-mono text-rose-800 block mt-0.5">
                ₹{formatAmount(summary.totalCashNave)}
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200">
              <FiTrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/30 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Total Fine Jama (In)
              </span>
              <strong className="text-base font-extrabold font-mono text-amber-900 block mt-0.5">
                {formatFine(summary.totalFineJama)}g
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
              <FiCreditCard className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/30 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Total Fine Nave (Out)
              </span>
              <strong className="text-base font-extrabold font-mono text-amber-900 block mt-0.5">
                {formatFine(summary.totalFineNave)}g
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
              <FiDollarSign className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block p-3 border-b border-slate-300">
          <h2 className="text-lg font-bold text-slate-900">Payment / Receipt Register</h2>
          <p className="text-xs text-slate-600">Period: {formatDate(fromDate)} to {formatDate(toDate)}</p>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 w-22">Date</th>
                <th className="py-2.5 px-3">Voucher No</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Account Name</th>
                <th className="py-2.5 px-3">Metal</th>
                <th className="py-2.5 px-3 text-right">Fine Jama</th>
                <th className="py-2.5 px-3 text-right">Fine Nave</th>
                <th className="py-2.5 px-3 text-right">Cash Jama</th>
                <th className="py-2.5 px-3 text-right">Cash Nave</th>
                <th className="py-2.5 px-3 text-right">Bank Jama</th>
                <th className="py-2.5 px-3 text-right">Bank Nave</th>
                <th className="py-2.5 px-3">Narration</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 font-medium">
                    <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading payment and receipt records...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2">
                        <FiInbox className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm text-slate-800 mb-0.5">No Vouchers Found</span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {searchText || typeFilter !== 'All'
                          ? 'No matching vouchers for the selected filter criteria.'
                          : 'No settlements recorded in this date range.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, index) => (
                  <tr key={r.id || index} className="hover:bg-amber-50/40 text-slate-700 font-medium transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{index + 1}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-800">{formatDate(r.entryDate)}</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.voucherNo}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${getSourceTypeBadge(r.sourceType)}`}>
                        {getSourceTypeLabel(r.sourceType)}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900">{r.accountName}</td>
                    <td className="py-2 px-3 text-slate-600">{r.metalType || '-'}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      {r.fineJama ? `${formatFine(r.fineJama)}g` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                      {r.fineNave ? `${formatFine(r.fineNave)}g` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      {r.cashJama ? `₹${formatAmount(r.cashJama)}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                      {r.cashNave ? `₹${formatAmount(r.cashNave)}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">
                      {r.bankJama ? `₹${formatAmount(r.bankJama)}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">
                      {r.bankNave ? `₹${formatAmount(r.bankNave)}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-slate-500 italic max-w-xs truncate">{r.narration || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>

            {filteredRows.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0 z-10 shadow-inner">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 text-right text-xs uppercase tracking-wider">
                    Total:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                    {formatFine(summary.totalFineJama)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600">
                    {formatFine(summary.totalFineNave)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                    ₹{formatAmount(summary.totalCashJama)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600">
                    ₹{formatAmount(summary.totalCashNave)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-800">
                    ₹{formatAmount(summary.totalBankJama)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-800">
                    ₹{formatAmount(summary.totalBankNave)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer info note */}
        <div className="px-4 py-2 bg-white rounded-lg border border-slate-200/90 text-[11px] text-slate-500 flex items-center justify-between shrink-0 no-print shadow-2xs">
          <span>* <strong>Jama</strong> (Receipt / Inflow), <strong>Nave</strong> (Payment / Outflow).</span>
          <span className="font-semibold text-slate-600">Jewelry ERP System</span>
        </div>
      </div>
    </div>
  )
}

export default PaymentReceiptReportScreen
