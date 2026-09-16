import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiBookOpen,
  FiCalendar,
  FiDownload,
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
import { formatDate } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'

type Item = {
  id: string
  itemName: string
  metalType: string
  active: boolean
}

function formatWeight(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })
}

function formatPcs(value: number): string {
  return String(Number(value || 0))
}

function getLedgerTypeLabel(sourceType: string): string {
  if (sourceType === 'OPENING_STOCK') return 'Opening Stock'
  if (sourceType === 'SALE') return 'Sale'
  if (sourceType === 'SALE_RETURN') return 'Sale Return'
  if (sourceType === 'PURCHASE') return 'Purchase'
  if (sourceType === 'PURCHASE_RETURN') return 'Purchase Return'
  return sourceType
}

function getLedgerTypeClass(sourceType: string): string {
  switch (sourceType) {
    case 'SALE':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'PURCHASE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'OPENING_STOCK':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'SALE_RETURN':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'PURCHASE_RETURN':
      return 'bg-purple-50 text-purple-700 border-purple-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}


function StockLedgerScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [items, setItems] = useState<Item[]>([])
  const [selectedItemId, setSelectedItemId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [report, setReport] = useState<ItemStockLedgerResult | null>(null)
  const [searchText, setSearchText] = useState('')

  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const activeItems = useMemo(() => {
    return items.filter((item) => item.active)
  }, [items])

  const filteredRows = useMemo(() => {
    if (!report) return []
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return report.rows

    return report.rows.filter((row) => {
      return (
        (row.sourceType || '').toLowerCase().includes(keyword) ||
        (row.billNo || '').toLowerCase().includes(keyword) ||
        (row.metalType || '').toLowerCase().includes(keyword) ||
        (row.stampName || '').toLowerCase().includes(keyword) ||
        (row.designName || '').toLowerCase().includes(keyword) ||
        (row.narration || '').toLowerCase().includes(keyword) ||
        (row.entryDate || '').toLowerCase().includes(keyword)
      )
    })
  }, [report, searchText])

  const setDatePreset = (preset: 'today' | 'thisMonth' | 'financialYear' | 'all'): void => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const formatYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

    if (preset === 'today') {
      const todayStr = formatYMD(now)
      setFromDate(todayStr)
      setToDate(todayStr)
    } else if (preset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setFromDate(formatYMD(start))
      setToDate(formatYMD(end))
    } else if (preset === 'financialYear') {
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      const startYear = currentMonth >= 4 ? currentYear : currentYear - 1
      setFromDate(`${startYear}-04-01`)
      setToDate(`${startYear + 1}-03-31`)
    } else {
      setFromDate('')
      setToDate('')
    }
  }

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

  const loadItems = useCallback(async (): Promise<void> => {
    try {
      setLoadingItems(true)
      const data = await window.api.items.list()
      setItems(data || [])

      const firstItem = (data || []).find((item) => item.active)
      if (firstItem) {
        setSelectedItemId(firstItem.id)
      }
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoadingItems(false)
    }
  }, [showAlert])

  const loadReport = useCallback(
    async (itemId = selectedItemId): Promise<void> => {
      if (!itemId) {
        showAlert('warning', 'Please select an item.')
        return
      }

      if (fromDate && toDate && fromDate > toDate) {
        showAlert('warning', 'From date cannot be after To date.')
        return
      }

      try {
        setLoading(true)
        const data = await window.api.reports.itemStockLedger(itemId, {
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
    [selectedItemId, fromDate, toDate, showAlert]
  )

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadItems()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadItems])

  useEffect(() => {
    if (!selectedItemId) return undefined

    const loadTimer = window.setTimeout(() => {
      void loadReport(selectedItemId)
    }, 0)

    return () => window.clearTimeout(loadTimer)
  }, [selectedItemId, loadReport])

  const exportCsv = useCallback((): void => {
    if (!report || filteredRows.length === 0) {
      showAlert('warning', 'No ledger entries to export')
      return
    }

    const headers = [
      'Sr',
      'Date',
      'Bill No',
      'Type',
      'Stamp',
      'Design',
      'Pcs Delta',
      'Gross Delta (g)',
      'Net Delta (g)',
      'Fine Delta (g)',
      'Running Pcs',
      'Running Net Wt (g)',
      'Running Fine (g)',
      'Narration'
    ]

    const rows = filteredRows.map((r) => [
      r.srNo,
      formatDate(r.entryDate),
      r.billNo || '',
      getLedgerTypeLabel(r.sourceType),
      `"${(r.stampName || '').replace(/"/g, '""')}"`,
      `"${(r.designName || '').replace(/"/g, '""')}"`,
      r.pcsDelta || 0,
      formatWeight(r.grossWeightDelta),
      formatWeight(r.netWeightDelta),
      formatWeight(r.fineDelta),
      r.runningPcs || 0,
      formatWeight(r.runningNetWeight),
      formatWeight(r.runningFine),
      `"${(r.narration || '').replace(/"/g, '""')}"`
    ])

    const csvContent =
      '\uFEFF' +
      [
        `"STOCK LEDGER REPORT: ${report.item.itemName} (${report.item.metalType})"`,
        `"Period: ${fromDate ? formatDate(fromDate) : 'Beginning'} to ${toDate ? formatDate(toDate) : 'Today'}"`,
        `"Opening Balance: Pcs: ${report.openingBalance.pcs}, Gross: ${report.openingBalance.grossWeight}g, Net: ${report.openingBalance.netWeight}g, Fine: ${report.openingBalance.fine}g"`,
        `"Closing Balance: Pcs: ${report.closingBalance.pcs}, Gross: ${report.closingBalance.grossWeight}g, Net: ${report.closingBalance.netWeight}g, Fine: ${report.closingBalance.fine}g"`,
        '',
        headers.join(','),
        ...rows.map((row) => row.join(','))
      ].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute(
      'download',
      `Stock_Ledger_${(report.item.itemName || 'Item').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showAlert('success', 'Stock ledger exported successfully')
  }, [report, filteredRows, fromDate, toDate, showAlert])

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
              <span>Stock Ledger</span>
              {report?.item && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                  {report.item.itemName} ({report.item.metalType})
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Item-specific running balance statement across opening stock, purchases, sales & returns
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={loading || !selectedItemId}
            className="h-8 px-3 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 text-amber-600 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Loading...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={exportCsv}
            disabled={loading || !report || filteredRows.length === 0}
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

        {/* Filter Controls Toolbar */}
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 no-print">
          <div className="flex flex-wrap items-center gap-3">
            {/* Item selector */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="stock-ledger-item-select" className="text-slate-700 font-bold">
                Item:
              </label>
              <select
                id="stock-ledger-item-select"
                className="h-8 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-2xs min-w-[200px]"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                disabled={loadingItems}
              >
                <option value="">Select Item</option>
                {activeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.itemName} ({item.metalType})
                  </option>
                ))}
              </select>
            </div>

            {/* Date inputs */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold flex items-center gap-1">
                <FiCalendar className="w-3.5 h-3.5 text-amber-600" /> Period:
              </span>
              <input
                type="date"
                className="h-8 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <span className="text-slate-400 font-bold">to</span>
              <input
                type="date"
                className="h-8 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            {/* Quick date presets */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-amber-800 hover:bg-white rounded-md transition-all cursor-pointer"
                onClick={() => setDatePreset('today')}
              >
                Today
              </button>
              <button
                type="button"
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-amber-800 hover:bg-white rounded-md transition-all cursor-pointer"
                onClick={() => setDatePreset('thisMonth')}
              >
                This Month
              </button>
              <button
                type="button"
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-amber-800 hover:bg-white rounded-md transition-all cursor-pointer"
                onClick={() => setDatePreset('financialYear')}
              >
                FY
              </button>
              <button
                type="button"
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-amber-800 hover:bg-white rounded-md transition-all cursor-pointer"
                onClick={() => setDatePreset('all')}
              >
                All Time
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-64">
            <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search bill, stamp, design..."
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

        {/* Dual Balance Cards: Opening vs Closing */}
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
            {/* Opening Balance Card */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FiTrendingDown className="w-3.5 h-3.5 text-blue-500" /> Opening Stock Balance
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                  {fromDate ? formatDate(fromDate) : 'Start'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Pcs</span>
                  <span className="text-sm font-black font-mono text-slate-800">{formatPcs(report.openingBalance.pcs)}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Gross Wt</span>
                  <span className="text-sm font-black font-mono text-slate-800">{formatWeight(report.openingBalance.grossWeight)}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Net Wt</span>
                  <span className="text-sm font-black font-mono text-slate-800">{formatWeight(report.openingBalance.netWeight)}</span>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg text-center border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Fine Wt</span>
                  <span className="text-sm font-black font-mono text-amber-800">{formatWeight(report.openingBalance.fine)}</span>
                </div>
              </div>
            </div>

            {/* Closing Balance Card */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-300/80 bg-gradient-to-b from-amber-50/30 to-white shadow-2xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-200/60">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <FiTrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Closing Stock Balance
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Active
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Pcs</span>
                  <span className="text-sm font-black font-mono text-slate-800">{formatPcs(report.closingBalance.pcs)}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Gross Wt</span>
                  <span className="text-sm font-black font-mono text-slate-800">{formatWeight(report.closingBalance.grossWeight)}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Net Wt</span>
                  <span className="text-sm font-black font-mono text-slate-800">{formatWeight(report.closingBalance.netWeight)}</span>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg text-center border border-amber-300">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Fine Wt</span>
                  <span className="text-sm font-black font-mono text-amber-900">{formatWeight(report.closingBalance.fine)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print Header */}
        <div className="hidden print:block p-3 border-b border-slate-300">
          <h2 className="text-lg font-bold text-slate-900">Stock Ledger Statement</h2>
          <p className="text-xs text-slate-600">
            Item: {report ? report.item.itemName : 'Not selected'} ({report?.item?.metalType}) | Period:{' '}
            {fromDate ? formatDate(fromDate) : 'Beginning'} to {toDate ? formatDate(toDate) : 'Today'}
          </p>
        </div>

        {/* Ledger Table */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 w-22">Date</th>
                <th className="py-2.5 px-3">Bill No</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Stamp</th>
                <th className="py-2.5 px-3">Design</th>
                <th className="py-2.5 px-3 text-right">Pcs +/-</th>
                <th className="py-2.5 px-3 text-right">Gross +/- (g)</th>
                <th className="py-2.5 px-3 text-right">Net +/- (g)</th>
                <th className="py-2.5 px-3 text-right">Fine +/- (g)</th>
                <th className="py-2.5 px-3 text-right bg-amber-50/40">Run Pcs</th>
                <th className="py-2.5 px-3 text-right bg-amber-50/40">Run Net</th>
                <th className="py-2.5 px-3 text-right bg-amber-50/40">Run Fine</th>
                <th className="py-2.5 px-3">Narration</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400 font-medium">
                    <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading stock ledger entries...
                  </td>
                </tr>
              ) : !report ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400 font-medium">
                    Please select an item above to view its stock ledger.
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2">
                        <FiInbox className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm text-slate-800 mb-0.5">No Stock Transactions Recorded</span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {searchText ? 'No entries matching your search filter.' : 'No stock transactions recorded in this period.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id || row.srNo} className="hover:bg-amber-50/40 text-slate-700 font-medium transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{row.srNo}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-800">{formatDate(row.entryDate)}</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">{row.billNo || '-'}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${getLedgerTypeClass(row.sourceType)}`}>
                        {getLedgerTypeLabel(row.sourceType)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{row.stampName || '-'}</td>
                    <td className="py-2 px-3 text-slate-600">{row.designName || '-'}</td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${row.pcsDelta < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {row.pcsDelta > 0 ? `+${row.pcsDelta}` : row.pcsDelta}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${row.grossWeightDelta < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {row.grossWeightDelta > 0 ? `+${formatWeight(row.grossWeightDelta)}` : formatWeight(row.grossWeightDelta)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${row.netWeightDelta < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {row.netWeightDelta > 0 ? `+${formatWeight(row.netWeightDelta)}` : formatWeight(row.netWeightDelta)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${row.fineDelta < 0 ? 'text-rose-600' : 'text-amber-700'}`}>
                      {row.fineDelta > 0 ? `+${formatWeight(row.fineDelta)}` : formatWeight(row.fineDelta)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 bg-amber-50/20">{formatPcs(row.runningPcs)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 bg-amber-50/20">{formatWeight(row.runningNetWeight)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-800 bg-amber-50/30">{formatWeight(row.runningFine)}</td>
                    <td className="py-2 px-3 text-slate-500 italic max-w-xs truncate">{row.narration || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info note */}
        <div className="px-4 py-2 bg-white rounded-lg border border-slate-200/90 text-[11px] text-slate-500 flex items-center justify-between shrink-0 no-print shadow-2xs">
          <span>* Running stock balances reflect item changes progressively. Positive indicates stock increase, negative indicates reduction.</span>
          <span className="font-semibold text-slate-600">Jewelry ERP System</span>
        </div>
      </div>
    </div>
  )
}

export default StockLedgerScreen
