import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
  FiAward,
  FiCalendar,
  FiCreditCard,
  FiDollarSign,
  FiDownload,
  FiEye,
  FiFilter,
  FiInbox,
  FiLayers,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiShoppingCart,
  FiTrash2,
  FiX
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import PurchasePrintPreview from '../purchase/PurchasePrintPreview'
import { formatDate, formatAmount, formatNumber } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'
type DatePreset = 'TODAY' | 'THIS_MONTH' | 'THIS_FY' | 'ALL_TIME'




function PurchaseRegisterScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [records, setRecords] = useState<PurchaseRegisterRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [metalFilter, setMetalFilter] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [activePreset, setActivePreset] = useState<DatePreset>('ALL_TIME')
  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<SavedPurchaseRecord | null>(null)
  const [purchaseToCancel, setPurchaseToCancel] = useState<PurchaseRegisterRecord | null>(null)
  const [cancelling, setCancelling] = useState(false)
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

  const loadPurchases = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.purchases.list()
      setRecords(data || [])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const openPurchase = async (id: string): Promise<void> => {
    try {
      setOpening(true)
      const data = await window.api.purchases.getById(id)
      setSelectedPurchase(data)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleCancelPurchase = async (): Promise<void> => {
    if (!purchaseToCancel) return

    try {
      setCancelling(true)
      const result = await window.api.purchases.cancel(purchaseToCancel.id)
      showAlert('success', `Purchase bill ${result.purchaseNo} cancelled successfully.`)
      setPurchaseToCancel(null)
      await loadPurchases()
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setCancelling(false)
    }
  }

  useEffect(() => {
    void loadPurchases()
  }, [loadPurchases])

  const filteredRecords = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return records.filter((record) => {
      const metalMatch = metalFilter === 'All' || record.metalType === metalFilter
      const dateMatch =
        (!fromDate || record.purchaseDate >= fromDate) &&
        (!toDate || record.purchaseDate <= toDate)
      const keywordMatch =
        !keyword ||
        record.purchaseNo?.toLowerCase().includes(keyword) ||
        record.accountName?.toLowerCase().includes(keyword) ||
        record.mobileNumber?.toLowerCase().includes(keyword) ||
        record.metalType?.toLowerCase().includes(keyword) ||
        record.purchaseDate?.toLowerCase().includes(keyword)

      return metalMatch && dateMatch && keywordMatch
    })
  }, [records, searchText, metalFilter, fromDate, toDate])

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (total, record) => {
        total.itemFineTotal += Number(record.itemFineTotal || 0)
        total.itemMajuriTotal += Number(record.itemMajuriTotal || 0)
        total.paymentFineNaveTotal += Number(record.paymentFineNaveTotal || 0)
        total.paymentCashNaveTotal += Number(record.paymentCashNaveTotal || 0)
        return total
      },
      {
        itemFineTotal: 0,
        itemMajuriTotal: 0,
        paymentFineNaveTotal: 0,
        paymentCashNaveTotal: 0
      }
    )
  }, [filteredRecords])

  const handleExportCsv = () => {
    if (filteredRecords.length === 0) {
      showAlert('warning', 'No purchase records to export.')
      return
    }
    const headers = [
      'Sr',
      'Purchase No',
      'Date',
      'Supplier Name',
      'Mobile',
      'Metal',
      'Item Fine (g)',
      'Majuri (INR)',
      'Fine Nave Paid (g)',
      'Cash Nave Paid (INR)',
      'Closing Fine (g)',
      'Closing Cash (INR)'
    ]
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const csvRows = [
      ...filteredRecords.map((record, idx) => {
        const closingFine =
          record.metalType === 'Gold' ? record.closingGoldFine : record.closingSilverFine
        return [
          idx + 1,
          escapeCsv(record.purchaseNo),
          escapeCsv(formatDate(record.purchaseDate)),
          escapeCsv(record.accountName),
          escapeCsv(record.mobileNumber || '-'),
          escapeCsv(record.metalType),
          record.itemFineTotal || 0,
          record.itemMajuriTotal || 0,
          record.paymentFineNaveTotal || 0,
          record.paymentCashNaveTotal || 0,
          closingFine || 0,
          record.closingCash || 0
        ]
      }),
      [
        'Total',
        '',
        '',
        '',
        '',
        '',
        totals.itemFineTotal,
        totals.itemMajuriTotal,
        totals.paymentFineNaveTotal,
        totals.paymentCashNaveTotal,
        '',
        ''
      ]
    ]

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `purchase_register_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Purchase Register CSV successfully.')
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
            <FiShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Wholesale Purchase Register</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                {filteredRecords.length} Bills
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Live ledger of all supplier purchase bills, fine nave payments and closing balances
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadPurchases()}
            disabled={loading}
            className="h-8 px-3 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 text-amber-600 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Loading...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || filteredRecords.length === 0}
            className="h-8 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-amber-600 cursor-pointer disabled:opacity-50"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={filteredRecords.length === 0}
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
            {/* Metal Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-700 font-bold flex items-center gap-1">
                <FiFilter className="w-3.5 h-3.5 text-amber-600" />
                Metal:
              </span>
              <select
                value={metalFilter}
                onChange={(e) => setMetalFilter(e.target.value)}
                className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-2xs"
              >
                <option value="All">All Metals</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
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
              placeholder="Search purchase bill, supplier, mobile..."
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

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Purchase Fine (In)
              </span>
              <strong className="text-base font-extrabold font-mono text-slate-900 block mt-0.5">
                {formatNumber(totals.itemFineTotal)}g
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <FiAward className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/40 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                Purchase Majuri
              </span>
              <strong className="text-base font-extrabold font-mono text-blue-900 block mt-0.5">
                ₹{formatAmount(totals.itemMajuriTotal)}
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center border border-blue-200">
              <FiLayers className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/40 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                Fine Nave Paid
              </span>
              <strong className="text-base font-extrabold font-mono text-rose-700 block mt-0.5">
                {formatNumber(totals.paymentFineNaveTotal)}g
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-100/70 text-rose-700 flex items-center justify-center border border-rose-200">
              <FiCreditCard className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/40 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                Cash Nave Paid
              </span>
              <strong className="text-base font-extrabold font-mono text-rose-700 block mt-0.5">
                ₹{formatAmount(totals.paymentCashNaveTotal)}
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-100/70 text-rose-700 flex items-center justify-center border border-rose-200">
              <FiDollarSign className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block p-3 border-b border-slate-300">
          <h2 className="text-lg font-bold text-slate-900">Wholesale Purchase Register</h2>
          <p className="text-xs text-slate-600">
            Period: {fromDate ? formatDate(fromDate) : 'All Time'} {toDate ? `to ${formatDate(toDate)}` : ''} | Metal: {metalFilter}
          </p>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Purchase No</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Supplier Name</th>
                <th className="py-2.5 px-3">Mobile</th>
                <th className="py-2.5 px-3">Metal</th>
                <th className="py-2.5 px-3 text-right">Item Fine (g)</th>
                <th className="py-2.5 px-3 text-right">Majuri (₹)</th>
                <th className="py-2.5 px-3 text-right">Fine Nave (g)</th>
                <th className="py-2.5 px-3 text-right">Cash Nave (₹)</th>
                <th className="py-2.5 px-3 text-right">Closing Fine</th>
                <th className="py-2.5 px-3 text-right">Closing Cash</th>
                <th className="py-2.5 px-3 text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 font-medium">
                    <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading purchase register...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2">
                        <FiInbox className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm text-slate-800 mb-0.5">No Purchase Bills Found</span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {searchText ? 'No purchase bills matching your search filters.' : 'No purchase bills recorded in this period.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => {
                  const closingFine =
                    record.metalType === 'Gold' ? record.closingGoldFine : record.closingSilverFine

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-amber-50/40 text-slate-700 font-medium cursor-pointer transition-colors"
                      onDoubleClick={() => void openPurchase(record.id)}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{index + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{record.purchaseNo}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-800">{formatDate(record.purchaseDate)}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{record.accountName}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{record.mobileNumber || '-'}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            record.metalType === 'Gold'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-800 border border-slate-300'
                          }`}
                        >
                          {record.metalType}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatNumber(record.itemFineTotal)}g
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                        ₹{formatAmount(record.itemMajuriTotal)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                        {formatNumber(record.paymentFineNaveTotal)}g
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                        ₹{formatAmount(record.paymentCashNaveTotal)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-amber-800">
                        {formatNumber(closingFine)}g
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-slate-900">
                        ₹{formatAmount(record.closingCash)}
                      </td>
                      <td className="py-2 px-3 text-center no-print">
                        <div
                          className="flex items-center justify-center gap-1.5"
                          onDoubleClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => void openPurchase(record.id)}
                            disabled={opening || cancelling}
                            title="Open & Print Bill"
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <FiEye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPurchaseToCancel(record)}
                            disabled={opening || cancelling}
                            title="Cancel Bill"
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <FiTrash2 className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>

            {filteredRecords.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0 z-10 shadow-inner">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                    Total:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-black">
                    {formatNumber(totals.itemFineTotal)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-blue-800 font-black">
                    ₹{formatAmount(totals.itemMajuriTotal)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-black">
                    {formatNumber(totals.paymentFineNaveTotal)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-black">
                    ₹{formatAmount(totals.paymentCashNaveTotal)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer info note */}
        <div className="px-4 py-2 bg-white rounded-lg border border-slate-200/90 text-[11px] text-slate-500 flex items-center justify-between shrink-0 no-print shadow-2xs">
          <span>* Double-click any row to open the complete purchase bill print preview.</span>
          <span className="font-semibold text-slate-600">Jewelry ERP System</span>
        </div>
      </div>

      <AppConfirmDialog
        open={Boolean(purchaseToCancel)}
        title="Cancel Purchase Bill?"
        message={
          purchaseToCancel
            ? `Purchase bill ${purchaseToCancel.purchaseNo} will be cancelled. Stock and supplier ledger effects will be reversed.`
            : ''
        }
        confirmText="Cancel Purchase"
        cancelText="Close"
        type="danger"
        loading={cancelling}
        onConfirm={() => void handleCancelPurchase()}
        onCancel={() => {
          if (!cancelling) {
            setPurchaseToCancel(null)
          }
        }}
      />

      {selectedPurchase && (
        <PurchasePrintPreview
          purchase={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
        />
      )}
    </div>
  )
}

export default PurchaseRegisterScreen
