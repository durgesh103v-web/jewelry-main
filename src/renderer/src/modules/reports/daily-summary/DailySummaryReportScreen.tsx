import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiDollarSign,
  FiDownload,
  FiLayers,
  FiPrinter,
  FiRefreshCw,
  FiRotateCcw,
  FiShoppingBag,
  FiShoppingCart,
  FiTrendingDown,
  FiTrendingUp,
  FiX
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatDate, formatAmount } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'

const emptySummary: DailySummaryResult = {
  date: '',
  sales: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0, amountTotal: 0 },
  purchases: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0, amountTotal: 0 },
  saleReturns: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0 },
  purchaseReturns: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0 },
  cashReceipts: { count: 0, amountTotal: 0 },
  cashPayments: { count: 0, amountTotal: 0 },
  approvals: { count: 0, itemFineTotal: 0, itemMajuriTotal: 0 },
  cash: { openingBalance: 0, totalReceipt: 0, totalPayment: 0, closingBalance: 0, netMovement: 0 },
  fine: { goldIn: 0, goldOut: 0, goldNet: 0, silverIn: 0, silverOut: 0, silverNet: 0 }
}

function formatFine(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })
}



function DailySummaryReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [summary, setSummary] = useState<DailySummaryResult>(emptySummary)
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
      const result = await window.api.dailyReport.summary({ date: date || undefined })
      setSummary(result || emptySummary)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [date, showAlert])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const navigateDate = (days: number) => {
    const current = dayjs(date || undefined)
    const nextDate = current.add(days, 'day').format('YYYY-MM-DD')
    setDate(nextDate)
  }

  const handleExportCsv = () => {
    const lines = [
      `"DAILY BUSINESS SUMMARY REPORT"`,
      `"Date: ${formatDate(date)}"`,
      `""`,
      `"Module / Activity","Bills / Count","Fine Wt (g)","Majuri (INR)","Total Amount (INR)"`,
      `"Sales",${summary.sales.count},${summary.sales.itemFineTotal},${summary.sales.itemMajuriTotal},${summary.sales.amountTotal}`,
      `"Purchases",${summary.purchases.count},${summary.purchases.itemFineTotal},${summary.purchases.itemMajuriTotal},${summary.purchases.amountTotal}`,
      `"Sale Returns",${summary.saleReturns.count},${summary.saleReturns.itemFineTotal},${summary.saleReturns.itemMajuriTotal},0`,
      `"Purchase Returns",${summary.purchaseReturns.count},${summary.purchaseReturns.itemFineTotal},${summary.purchaseReturns.itemMajuriTotal},0`,
      `"Cash Receipts",${summary.cashReceipts.count},0,0,${summary.cashReceipts.amountTotal}`,
      `"Cash Payments",${summary.cashPayments.count},0,0,${summary.cashPayments.amountTotal}`,
      `"Approvals Out",${summary.approvals.count},${summary.approvals.itemFineTotal},${summary.approvals.itemMajuriTotal},0`,
      `""`,
      `"Cash in Hand Summary","Amount (INR)"`,
      `"Opening Cash",${summary.cash.openingBalance}`,
      `"Total Receipts",${summary.cash.totalReceipt}`,
      `"Total Payments",${summary.cash.totalPayment}`,
      `"Closing Cash",${summary.cash.closingBalance}`,
      `"Net Movement",${summary.cash.netMovement}`,
      `""`,
      `"Fine Metal Movement","Fine In (g)","Fine Out (g)","Net Fine (g)"`,
      `"Gold Fine",${summary.fine.goldIn},${summary.fine.goldOut},${summary.fine.goldNet}`,
      `"Silver Fine",${summary.fine.silverIn},${summary.fine.silverOut},${summary.fine.silverNet}`
    ]

    const csvContent = '\uFEFF' + lines.join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `daily_summary_${date}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Daily Summary CSV successfully.')
  }

  const isToday = date === dayjs().format('YYYY-MM-DD')
  const isYesterday = date === dayjs().subtract(1, 'day').format('YYYY-MM-DD')

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiBarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Daily Summary Report</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                {formatDate(date)} {isToday ? '(Today)' : isYesterday ? '(Yesterday)' : ''}
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Comprehensive 360° day snapshot of sales, purchases, cash flows & metal fine movements
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

        {/* Date Filter Bar */}
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 no-print">
          <div className="flex items-center gap-2">
            {/* Quick Navigation Controls */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => navigateDate(-1)}
                title="Previous Day"
                className="h-7 px-2 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors font-semibold"
              >
                <FiChevronLeft className="w-3.5 h-3.5" />
                <span className="text-[11px] ml-0.5">Prev</span>
              </button>
              <button
                type="button"
                onClick={() => setDate(dayjs().format('YYYY-MM-DD'))}
                className={`h-7 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer border ${
                  isToday
                    ? 'bg-amber-500 text-white font-bold border-amber-600 shadow-2xs'
                    : 'text-slate-700 hover:text-amber-900 hover:bg-white border-transparent font-medium'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDate(dayjs().subtract(1, 'day').format('YYYY-MM-DD'))}
                className={`h-7 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer border ${
                  isYesterday
                    ? 'bg-amber-500 text-white font-bold border-amber-600 shadow-2xs'
                    : 'text-slate-700 hover:text-amber-900 hover:bg-white border-transparent font-medium'
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => navigateDate(1)}
                title="Next Day"
                className="h-7 px-2 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors font-semibold"
              >
                <span className="text-[11px] mr-0.5">Next</span>
                <FiChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Date Input */}
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-slate-700 font-bold flex items-center gap-1">
                <FiCalendar className="w-3.5 h-3.5 text-amber-600" />
                Date:
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-2xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <span>Day Snapshot for: <strong className="text-slate-800 font-bold">{formatDate(date)}</strong></span>
          </div>
        </div>

        {/* Printable Title */}
        <div className="hidden print:block p-3 border-b border-slate-300">
          <h2 className="text-lg font-bold text-slate-900">Daily Business Summary Report</h2>
          <p className="text-xs text-slate-600">Date: {formatDate(date)}</p>
        </div>

        {/* Content Workspace */}
        <div className="flex-1 overflow-auto space-y-3">
          {/* Top Row: Sales & Purchases */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Sales Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <FiShoppingBag className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Sales Overview</h3>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  {summary.sales.count} Bills
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 mt-3 text-center">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center justify-center gap-1">
                    <FiAward className="w-3 h-3 text-amber-600" /> Item Fine
                  </span>
                  <strong className="text-sm font-mono font-black text-slate-900 mt-1">
                    {formatFine(summary.sales.itemFineTotal)}g
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center justify-center gap-1">
                    <FiLayers className="w-3 h-3 text-indigo-600" /> Majuri
                  </span>
                  <strong className="text-sm font-mono font-black text-slate-900 mt-1">
                    ₹{formatAmount(summary.sales.itemMajuriTotal)}
                  </strong>
                </div>
                <div className="p-2.5 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-300 flex flex-col justify-between shadow-2xs">
                  <span className="text-[10px] text-amber-800 font-bold uppercase flex items-center justify-center gap-1">
                    <FiDollarSign className="w-3 h-3 text-amber-700" /> Total Sales
                  </span>
                  <strong className="text-sm font-mono font-black text-amber-900 mt-1">
                    ₹{formatAmount(summary.sales.amountTotal)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Purchases Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                    <FiShoppingCart className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Purchases Overview</h3>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  {summary.purchases.count} Bills
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 mt-3 text-center">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center justify-center gap-1">
                    <FiAward className="w-3 h-3 text-blue-600" /> Item Fine
                  </span>
                  <strong className="text-sm font-mono font-black text-slate-900 mt-1">
                    {formatFine(summary.purchases.itemFineTotal)}g
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center justify-center gap-1">
                    <FiLayers className="w-3 h-3 text-indigo-600" /> Majuri
                  </span>
                  <strong className="text-sm font-mono font-black text-slate-900 mt-1">
                    ₹{formatAmount(summary.purchases.itemMajuriTotal)}
                  </strong>
                </div>
                <div className="p-2.5 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-300 flex flex-col justify-between shadow-2xs">
                  <span className="text-[10px] text-blue-800 font-bold uppercase flex items-center justify-center gap-1">
                    <FiDollarSign className="w-3 h-3 text-blue-700" /> Total Purchases
                  </span>
                  <strong className="text-sm font-mono font-black text-blue-900 mt-1">
                    ₹{formatAmount(summary.purchases.amountTotal)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Second Row: Returns & Approvals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Sale Returns */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FiRotateCcw className="w-3.5 h-3.5 text-rose-500" />
                  Sale Returns
                </span>
                <span className="text-[11px] font-bold text-slate-500">{summary.saleReturns.count} Bills</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2.5 text-center">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Fine In</span>
                  <strong className="text-xs font-mono font-bold text-slate-900 block mt-0.5">
                    {formatFine(summary.saleReturns.itemFineTotal)}g
                  </strong>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Majuri Reversed</span>
                  <strong className="text-xs font-mono font-bold text-slate-900 block mt-0.5">
                    ₹{formatAmount(summary.saleReturns.itemMajuriTotal)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Purchase Returns */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FiRotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                  Purchase Returns
                </span>
                <span className="text-[11px] font-bold text-slate-500">{summary.purchaseReturns.count} Bills</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2.5 text-center">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Fine Out</span>
                  <strong className="text-xs font-mono font-bold text-slate-900 block mt-0.5">
                    {formatFine(summary.purchaseReturns.itemFineTotal)}g
                  </strong>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Majuri</span>
                  <strong className="text-xs font-mono font-bold text-slate-900 block mt-0.5">
                    ₹{formatAmount(summary.purchaseReturns.itemMajuriTotal)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Approvals */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FiCheckCircle className="w-3.5 h-3.5 text-amber-500" />
                  Approvals Out (Jangad)
                </span>
                <span className="text-[11px] font-bold text-slate-500">{summary.approvals.count} Vouchers</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2.5 text-center">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Custody Fine</span>
                  <strong className="text-xs font-mono font-bold text-slate-900 block mt-0.5">
                    {formatFine(summary.approvals.itemFineTotal)}g
                  </strong>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Est. Majuri</span>
                  <strong className="text-xs font-mono font-bold text-slate-900 block mt-0.5">
                    ₹{formatAmount(summary.approvals.itemMajuriTotal)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Third Row: Overall Cash Flow & Receipts/Payments */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <FiDollarSign className="w-4 h-4 text-emerald-600" />
                Cash in Hand & Ledger Movements
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                Receipts: <strong className="text-slate-800">{summary.cashReceipts.count}</strong> | Payments: <strong className="text-slate-800">{summary.cashPayments.count}</strong>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-3 text-center">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-bold uppercase block flex items-center justify-center gap-1">
                  <FiTrendingDown className="w-3 h-3 text-blue-500" /> Opening Cash
                </span>
                <strong className="text-xs font-mono font-black text-slate-800 block mt-1">
                  ₹{formatAmount(summary.cash.openingBalance)}
                </strong>
              </div>
              <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-800 font-bold uppercase block flex items-center justify-center gap-1">
                  <FiTrendingUp className="w-3 h-3 text-emerald-600" /> Cash Receipts (+)
                </span>
                <strong className="text-xs font-mono font-black text-emerald-700 block mt-1">
                  ₹{formatAmount(summary.cash.totalReceipt)}
                </strong>
              </div>
              <div className="p-2.5 bg-rose-50/70 rounded-xl border border-rose-200">
                <span className="text-[10px] text-rose-800 font-bold uppercase block flex items-center justify-center gap-1">
                  <FiTrendingDown className="w-3 h-3 text-rose-600" /> Cash Payments (-)
                </span>
                <strong className="text-xs font-mono font-black text-rose-700 block mt-1">
                  ₹{formatAmount(summary.cash.totalPayment)}
                </strong>
              </div>
              <div className="p-2.5 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-300 shadow-2xs">
                <span className="text-[10px] text-amber-800 font-bold uppercase block">Closing Cash</span>
                <strong className="text-xs font-mono font-black text-amber-900 block mt-1">
                  ₹{formatAmount(summary.cash.closingBalance)}
                </strong>
              </div>
              <div
                className={`p-2.5 rounded-xl border ${
                  summary.cash.netMovement >= 0
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50/70 border-rose-200 text-rose-800'
                }`}
              >
                <span className="text-[10px] font-bold uppercase block">Net Day Movement</span>
                <strong className="text-xs font-mono font-black block mt-1">
                  ₹{formatAmount(summary.cash.netMovement)}
                </strong>
              </div>
            </div>
          </div>

          {/* Fourth Row: Fine Metal Movements */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <FiActivity className="w-4 h-4 text-amber-600" />
                Pure Metal Fine Movement (Day Ledger)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 mt-3 text-center">
              <div className="p-2.5 bg-amber-50/40 rounded-xl border border-amber-200/80">
                <span className="text-[10px] text-amber-800 font-bold uppercase block">Gold Fine In</span>
                <strong className="text-xs font-mono font-black text-slate-900 block mt-1">
                  {formatFine(summary.fine.goldIn)}g
                </strong>
              </div>
              <div className="p-2.5 bg-amber-50/40 rounded-xl border border-amber-200/80">
                <span className="text-[10px] text-amber-800 font-bold uppercase block">Gold Fine Out</span>
                <strong className="text-xs font-mono font-black text-slate-900 block mt-1">
                  {formatFine(summary.fine.goldOut)}g
                </strong>
              </div>
              <div className="p-2.5 bg-amber-100/70 rounded-xl border border-amber-300">
                <span className="text-[10px] text-amber-900 font-bold uppercase block">Net Gold Movement</span>
                <strong className="text-xs font-mono font-black text-amber-900 block mt-1">
                  {formatFine(summary.fine.goldNet)}g
                </strong>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-600 font-bold uppercase block">Silver Fine In</span>
                <strong className="text-xs font-mono font-black text-slate-900 block mt-1">
                  {formatFine(summary.fine.silverIn)}g
                </strong>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-600 font-bold uppercase block">Silver Fine Out</span>
                <strong className="text-xs font-mono font-black text-slate-900 block mt-1">
                  {formatFine(summary.fine.silverOut)}g
                </strong>
              </div>
              <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-300">
                <span className="text-[10px] text-slate-700 font-bold uppercase block">Net Silver Movement</span>
                <strong className="text-xs font-mono font-black text-slate-800 block mt-1">
                  {formatFine(summary.fine.silverNet)}g
                </strong>
              </div>
            </div>
          </div>

          {/* Consolidated Day Audit Table */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Day Audit Summary by Module
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Consolidated Totals</span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Activity Module</th>
                  <th className="py-2.5 px-3 text-center">Vouchers / Bills</th>
                  <th className="py-2.5 px-3 text-right">Fine Weight (g)</th>
                  <th className="py-2.5 px-3 text-right">Majuri (₹)</th>
                  <th className="py-2.5 px-3 text-right">Cash / Invoice Value (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                <tr className="hover:bg-amber-50/40">
                  <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Sales
                  </td>
                  <td className="py-2 px-3 text-center font-bold">{summary.sales.count}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">{formatFine(summary.sales.itemFineTotal)}g</td>
                  <td className="py-2 px-3 text-right font-mono">{formatAmount(summary.sales.itemMajuriTotal)}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">₹{formatAmount(summary.sales.amountTotal)}</td>
                </tr>
                <tr className="hover:bg-blue-50/40">
                  <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Purchases
                  </td>
                  <td className="py-2 px-3 text-center font-bold">{summary.purchases.count}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-blue-800">{formatFine(summary.purchases.itemFineTotal)}g</td>
                  <td className="py-2 px-3 text-right font-mono">{formatAmount(summary.purchases.itemMajuriTotal)}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">₹{formatAmount(summary.purchases.amountTotal)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-semibold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Sale Returns
                  </td>
                  <td className="py-2 px-3 text-center">{summary.saleReturns.count}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatFine(summary.saleReturns.itemFineTotal)}g</td>
                  <td className="py-2 px-3 text-right font-mono">{formatAmount(summary.saleReturns.itemMajuriTotal)}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">-</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-semibold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Purchase Returns
                  </td>
                  <td className="py-2 px-3 text-center">{summary.purchaseReturns.count}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatFine(summary.purchaseReturns.itemFineTotal)}g</td>
                  <td className="py-2 px-3 text-right font-mono">{formatAmount(summary.purchaseReturns.itemMajuriTotal)}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">-</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-semibold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" /> Cash Receipts
                  </td>
                  <td className="py-2 px-3 text-center">{summary.cashReceipts.count}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">-</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">-</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">₹{formatAmount(summary.cashReceipts.amountTotal)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-semibold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-600" /> Cash Payments
                  </td>
                  <td className="py-2 px-3 text-center">{summary.cashPayments.count}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">-</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">-</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">₹{formatAmount(summary.cashPayments.amountTotal)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-semibold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-600" /> Approvals Out (Trial)
                  </td>
                  <td className="py-2 px-3 text-center">{summary.approvals.count}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatFine(summary.approvals.itemFineTotal)}g</td>
                  <td className="py-2 px-3 text-right font-mono">{formatAmount(summary.approvals.itemMajuriTotal)}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info note */}
        <div className="px-4 py-2 bg-white rounded-lg border border-slate-200/90 text-[11px] text-slate-500 flex items-center justify-between shrink-0 no-print shadow-2xs">
          <span>* Summary calculated from real-time database registers for the selected date.</span>
          <span className="font-semibold text-slate-600">Jewelry ERP System</span>
        </div>
      </div>
    </div>
  )
}

export default DailySummaryReportScreen
