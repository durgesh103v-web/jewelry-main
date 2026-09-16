import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiLayers,
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
import { formatNumber } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'

type ItemStockReportRecord = {
  itemId: string
  itemName: string
  metalType: string
  groupName: string
  stampId: string
  stampName: string
  designId: string
  designName: string
  pcs: number
  grossWeight: number
  netWeight: number
  fine: number
}


function ItemStockReportScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [records, setRecords] = useState<ItemStockReportRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [metalFilter, setMetalFilter] = useState('All')
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
      const data = await window.api.reports.itemStock()
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

  const filteredRecords = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return records.filter((record) => {
      const metalMatch = metalFilter === 'All' || record.metalType === metalFilter
      const keywordMatch =
        !keyword ||
        record.itemName?.toLowerCase().includes(keyword) ||
        record.groupName?.toLowerCase().includes(keyword) ||
        record.stampName?.toLowerCase().includes(keyword) ||
        record.designName?.toLowerCase().includes(keyword) ||
        record.metalType?.toLowerCase().includes(keyword)

      return metalMatch && keywordMatch
    })
  }, [records, searchText, metalFilter])

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (total, record) => {
        total.pcs += Number(record.pcs || 0)
        total.grossWeight += Number(record.grossWeight || 0)
        total.netWeight += Number(record.netWeight || 0)
        total.fine += Number(record.fine || 0)
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

  const handleExportCsv = () => {
    if (filteredRecords.length === 0) {
      showAlert('warning', 'No stock records to export.')
      return
    }
    const headers = ['Sr', 'Item Name', 'Metal Type', 'Group', 'Stamp / Purity', 'Design', 'Pcs', 'Gross Wt (g)', 'Net Wt (g)', 'Fine Wt (g)']
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const csvRows = [
      ...filteredRecords.map((r, idx) => [
        idx + 1,
        escapeCsv(r.itemName),
        escapeCsv(r.metalType),
        escapeCsv(r.groupName || '-'),
        escapeCsv(r.stampName || '-'),
        escapeCsv(r.designName || '-'),
        r.pcs || 0,
        r.grossWeight || 0,
        r.netWeight || 0,
        r.fine || 0
      ]),
      ['Total', '', '', '', '', '', totals.pcs, totals.grossWeight, totals.netWeight, totals.fine]
    ]

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `item_stock_inventory_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Item Stock CSV successfully.')
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiLayers className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight">Item Stock Inventory</h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Live physical inventory grouped by item, metal, purity stamp and design
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
          {/* Metal Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <FiFilter className="w-3.5 h-3.5 text-slate-400" />
              Metal:
            </span>
            <select
              value={metalFilter}
              onChange={(e) => setMetalFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 font-semibold shadow-2xs"
            >
              <option value="All">All Metals</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Diamond">Diamond</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search item name, group, stamp, design..."
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
          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Quantity</span>
            <span className="text-sm font-extrabold font-mono text-slate-900 mt-0.5">
              {formatNumber(totals.pcs)} Pcs
            </span>
          </div>
          <div className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/40 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Gross Weight</span>
            <span className="text-sm font-extrabold font-mono text-amber-800 mt-0.5">
              {formatNumber(totals.grossWeight)}g
            </span>
          </div>
          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Net Weight</span>
            <span className="text-sm font-extrabold font-mono text-slate-900 mt-0.5">
              {formatNumber(totals.netWeight)}g
            </span>
          </div>
          <div className="p-3 rounded-xl border border-amber-300 bg-amber-100/60 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Total Fine Weight</span>
            <span className="text-sm font-extrabold font-mono text-amber-900 mt-0.5">
              {formatNumber(totals.fine)}g
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
              <h3 className="font-bold text-sm text-slate-800 mb-1">No Stock Items Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-3">
                {searchText ? 'No items matched your search query.' : 'No stock entries currently in the system.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3">Metal</th>
                  <th className="py-2.5 px-3">Group</th>
                  <th className="py-2.5 px-3">Stamp / Purity</th>
                  <th className="py-2.5 px-3">Design</th>
                  <th className="py-2.5 px-3 text-right">Pcs</th>
                  <th className="py-2.5 px-3 text-right">Gross Wt (g)</th>
                  <th className="py-2.5 px-3 text-right">Net Wt (g)</th>
                  <th className="py-2.5 px-3 text-right">Fine Wt (g)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record, index) => (
                  <tr key={`${record.itemId}-${record.stampId}-${record.designId}`} className="hover:bg-amber-50/40 text-slate-700 font-medium">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{index + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{record.itemName}</td>
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
                    <td className="py-2 px-3 text-slate-500">{record.groupName || '-'}</td>
                    <td className="py-2 px-3 font-medium text-slate-800">{record.stampName || '-'}</td>
                    <td className="py-2 px-3 text-slate-600">{record.designName || '-'}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {formatNumber(record.pcs)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {formatNumber(record.grossWeight)}g
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">
                      {formatNumber(record.netWeight)}g
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">
                      {formatNumber(record.fine)}g
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                    Total Stock:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                    {formatNumber(totals.pcs)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                    {formatNumber(totals.grossWeight)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                    {formatNumber(totals.netWeight)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-900">
                    {formatNumber(totals.fine)}g
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

export default ItemStockReportScreen
