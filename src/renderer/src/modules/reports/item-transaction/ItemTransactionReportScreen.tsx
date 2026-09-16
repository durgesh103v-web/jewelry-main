import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiActivity,
  FiAward,
  FiDatabase,
  FiDownload,
  FiFilter,
  FiInbox,
  FiLayers,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiTrendingUp,
  FiX
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatDate, formatNumber } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'

type ItemTransactionReportRecord = {
  id: string
  sourceType: string
  sourceId: string
  entryDate: string
  metalType: string
  pcsDelta: number
  grossWeightDelta: number
  netWeightDelta: number
  fineDelta: number
  narration: string
  createdAt: string
  itemId: string
  itemName: string
  groupName: string
  stampName: string
  designName: string
  saleNo: string
}



function getSourceLabel(sourceType: string): string {
  if (sourceType === 'OPENING_STOCK') return 'Opening Stock'
  if (sourceType === 'SALE') return 'Sale'
  if (sourceType === 'PURCHASE') return 'Purchase'
  if (sourceType === 'SALE_RETURN') return 'Sale Return'
  if (sourceType === 'PURCHASE_RETURN') return 'Purchase Return'
  return sourceType
}

function getSourceBadgeClass(sourceType: string): string {
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

function ItemTransactionReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [records, setRecords] = useState<ItemTransactionReportRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [metalFilter, setMetalFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [loading, setLoading] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const filteredRecords = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return records.filter((record) => {
      const metalMatch = metalFilter === 'All' || record.metalType === metalFilter
      const sourceMatch = sourceFilter === 'All' || record.sourceType === sourceFilter
      const keywordMatch =
        !keyword ||
        (record.itemName || '').toLowerCase().includes(keyword) ||
        (record.groupName || '').toLowerCase().includes(keyword) ||
        (record.stampName || '').toLowerCase().includes(keyword) ||
        (record.designName || '').toLowerCase().includes(keyword) ||
        (record.saleNo || '').toLowerCase().includes(keyword) ||
        (record.narration || '').toLowerCase().includes(keyword) ||
        (record.entryDate || '').toLowerCase().includes(keyword)

      return metalMatch && sourceMatch && keywordMatch
    })
  }, [records, searchText, metalFilter, sourceFilter])

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (total, record) => {
        total.pcs += Number(record.pcsDelta || 0)
        total.grossWeight += Number(record.grossWeightDelta || 0)
        total.netWeight += Number(record.netWeightDelta || 0)
        total.fine += Number(record.fineDelta || 0)
        return total
      },
      {
        pcs: 0,
        grossWeight: 0,
        netWeight: 0,
        fine: 0
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
      const data = await window.api.reports.itemTransactions()
      setRecords(data || [])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadReport()
    }, 0)

    return () => {
      window.clearTimeout(loadTimer)
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadReport])

  const exportCsv = useCallback((): void => {
    if (filteredRecords.length === 0) {
      showAlert('warning', 'No transactions to export')
      return
    }

    const headers = [
      'Sr',
      'Date',
      'Type',
      'Bill No',
      'Item Name',
      'Metal',
      'Group',
      'Stamp',
      'Design',
      'Pcs Delta',
      'Gross Wt Delta (g)',
      'Net Wt Delta (g)',
      'Fine Delta (g)',
      'Narration'
    ]

    const rows = filteredRecords.map((r, idx) => [
      idx + 1,
      formatDate(r.entryDate),
      getSourceLabel(r.sourceType),
      r.saleNo || '',
      `"${(r.itemName || '').replace(/"/g, '""')}"`,
      r.metalType || '',
      `"${(r.groupName || '').replace(/"/g, '""')}"`,
      `"${(r.stampName || '').replace(/"/g, '""')}"`,
      `"${(r.designName || '').replace(/"/g, '""')}"`,
      r.pcsDelta || 0,
      formatNumber(r.grossWeightDelta),
      formatNumber(r.netWeightDelta),
      formatNumber(r.fineDelta),
      `"${(r.narration || '').replace(/"/g, '""')}"`
    ])

    const totalRow = [
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totals.pcs,
      formatNumber(totals.grossWeight),
      formatNumber(totals.netWeight),
      formatNumber(totals.fine),
      ''
    ]

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(',')), totalRow.join(',')].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `Item_Transactions_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showAlert('success', 'Item transaction report exported successfully')
  }, [filteredRecords, totals, showAlert])

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiActivity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Item Transaction History</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                {filteredRecords.length} entries
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Detailed audit trail of stock movements across sales, purchases & opening balances
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
            onClick={exportCsv}
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

        {/* Filter Controls Toolbar */}
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 no-print">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-700 font-bold flex items-center gap-1">
                <FiFilter className="w-3.5 h-3.5 text-amber-600" /> Metal:
              </span>
              <select
                className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-2xs"
                value={metalFilter}
                onChange={(e) => setMetalFilter(e.target.value)}
              >
                <option value="All">All Metals</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Diamond">Diamond</option>
                <option value="Platinum">Platinum</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-700 font-bold">Type:</span>
              <select
                className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-2xs"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <option value="All">All Types</option>
                <option value="OPENING_STOCK">Opening Stock</option>
                <option value="SALE">Sale</option>
                <option value="PURCHASE">Purchase</option>
                <option value="SALE_RETURN">Sale Return</option>
                <option value="PURCHASE_RETURN">Purchase Return</option>
              </select>
            </div>
          </div>

          <div className="relative w-72">
            <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search item, bill no, group, stamp..."
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

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Net Pcs Change</p>
              <p className={`text-base font-extrabold font-mono mt-0.5 ${totals.pcs >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {totals.pcs > 0 ? `+${totals.pcs}` : totals.pcs}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <FiLayers className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Net Gross Wt</p>
              <p className={`text-base font-extrabold font-mono mt-0.5 ${totals.grossWeight >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {totals.grossWeight > 0 ? `+${formatNumber(totals.grossWeight)}` : formatNumber(totals.grossWeight)}g
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <FiDatabase className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Net Wt Delta</p>
              <p className={`text-base font-extrabold font-mono mt-0.5 ${totals.netWeight >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {totals.netWeight > 0 ? `+${formatNumber(totals.netWeight)}` : formatNumber(totals.netWeight)}g
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <FiTrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Net Fine Delta</p>
              <p className={`text-base font-extrabold font-mono mt-0.5 ${totals.fine >= 0 ? 'text-amber-800' : 'text-rose-600'}`}>
                {totals.fine > 0 ? `+${formatNumber(totals.fine)}` : formatNumber(totals.fine)}g
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100/70 text-amber-700 flex items-center justify-center border border-amber-200">
              <FiAward className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Records</p>
              <p className="text-base font-extrabold font-mono text-slate-900 mt-0.5">{filteredRecords.length}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
              <FiActivity className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 w-22">Date</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Bill No</th>
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3">Metal</th>
                <th className="py-2.5 px-3">Group</th>
                <th className="py-2.5 px-3">Stamp</th>
                <th className="py-2.5 px-3">Design</th>
                <th className="py-2.5 px-3 text-right">Pcs +/-</th>
                <th className="py-2.5 px-3 text-right">Gross +/- (g)</th>
                <th className="py-2.5 px-3 text-right">Net +/- (g)</th>
                <th className="py-2.5 px-3 text-right">Fine +/- (g)</th>
                <th className="py-2.5 px-3">Narration</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400 font-medium">
                    <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading item transactions...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2">
                        <FiInbox className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm text-slate-800 mb-0.5">No Item Transactions Found</span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {searchText ? 'No transactions matching your search filters.' : 'No stock transactions recorded yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-amber-50/40 text-slate-700 font-medium transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-800">{formatDate(r.entryDate)}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${getSourceBadgeClass(r.sourceType)}`}>
                        {getSourceLabel(r.sourceType)}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-700">{r.saleNo || '-'}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{r.itemName}</td>
                    <td className="py-2 px-3 text-slate-600">{r.metalType || '-'}</td>
                    <td className="py-2 px-3 text-slate-600">{r.groupName || '-'}</td>
                    <td className="py-2 px-3 text-slate-600">{r.stampName || '-'}</td>
                    <td className="py-2 px-3 text-slate-600">{r.designName || '-'}</td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${r.pcsDelta < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {r.pcsDelta > 0 ? `+${r.pcsDelta}` : r.pcsDelta}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${r.grossWeightDelta < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {r.grossWeightDelta > 0 ? `+${formatNumber(r.grossWeightDelta)}` : formatNumber(r.grossWeightDelta)}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${r.netWeightDelta < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {r.netWeightDelta > 0 ? `+${formatNumber(r.netWeightDelta)}` : formatNumber(r.netWeightDelta)}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${r.fineDelta < 0 ? 'text-rose-600' : 'text-amber-700'}`}>
                      {r.fineDelta > 0 ? `+${formatNumber(r.fineDelta)}` : formatNumber(r.fineDelta)}
                    </td>
                    <td className="py-2 px-3 text-slate-500 italic max-w-xs truncate">{r.narration || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>

            {filteredRecords.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0 z-10 shadow-inner">
                <tr>
                  <td colSpan={9} className="py-2.5 px-3 text-right text-xs uppercase tracking-wider">
                    Total Movement:
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-black text-xs ${totals.pcs < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {totals.pcs > 0 ? `+${totals.pcs}` : totals.pcs}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-xs text-slate-900">
                    {formatNumber(totals.grossWeight)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-xs text-slate-900">
                    {formatNumber(totals.netWeight)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-xs text-amber-800">
                    {formatNumber(totals.fine)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer info note */}
        <div className="px-4 py-2 bg-white rounded-lg border border-slate-200/90 text-[11px] text-slate-500 flex items-center justify-between shrink-0 no-print shadow-2xs">
          <span>* Positive values indicate stock addition (Purchase, Opening). Negative values indicate stock deduction (Sale).</span>
          <span className="font-semibold text-slate-600">Jewelry ERP System</span>
        </div>
      </div>
    </div>
  )
}

export default ItemTransactionReportScreen
