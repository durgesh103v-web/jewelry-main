import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiAward,
  FiBarChart2,
  FiDownload,
  FiFilter,
  FiInbox,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiShoppingBag,
  FiShoppingCart,
  FiX
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })
}

function ItemwiseSalePurchaseReportScreen({
  onClose
}: {
  onClose: () => void
}): React.JSX.Element {
  const [records, setRecords] = useState<ItemwiseSalePurchaseRecord[]>([])
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
      const data = await window.api.reports.itemwiseSalePurchase()
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

  const filteredRecords = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return records.filter((record) => {
      const metalMatch = metalFilter === 'All' || record.metalType === metalFilter
      const keywordMatch =
        !keyword ||
        (record.itemName || '').toLowerCase().includes(keyword) ||
        (record.groupName || '').toLowerCase().includes(keyword) ||
        (record.metalType || '').toLowerCase().includes(keyword)

      return metalMatch && keywordMatch
    })
  }, [records, metalFilter, searchText])

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (total, record) => {
        total.salePcs += Number(record.salePcs || 0)
        total.saleNetWeight += Number(record.saleNetWeight || 0)
        total.saleFine += Number(record.saleFine || 0)
        total.purchasePcs += Number(record.purchasePcs || 0)
        total.purchaseNetWeight += Number(record.purchaseNetWeight || 0)
        total.purchaseFine += Number(record.purchaseFine || 0)
        return total
      },
      {
        salePcs: 0,
        saleNetWeight: 0,
        saleFine: 0,
        purchasePcs: 0,
        purchaseNetWeight: 0,
        purchaseFine: 0
      }
    )
  }, [filteredRecords])

  const handleExportCsv = () => {
    if (filteredRecords.length === 0) {
      showAlert('warning', 'No itemwise records to export.')
      return
    }
    const headers = [
      'Sr',
      'Item Name',
      'Group',
      'Metal',
      'Sale Pcs',
      'Sale Net Wt (g)',
      'Sale Fine (g)',
      'Purchase Pcs',
      'Purchase Net Wt (g)',
      'Purchase Fine (g)'
    ]
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const csvRows = [
      ...filteredRecords.map((record, idx) => [
        idx + 1,
        escapeCsv(record.itemName),
        escapeCsv(record.groupName || '-'),
        escapeCsv(record.metalType),
        record.salePcs || 0,
        formatNumber(record.saleNetWeight),
        formatNumber(record.saleFine),
        record.purchasePcs || 0,
        formatNumber(record.purchaseNetWeight),
        formatNumber(record.purchaseFine)
      ]),
      [
        'Total',
        '',
        '',
        '',
        totals.salePcs,
        formatNumber(totals.saleNetWeight),
        formatNumber(totals.saleFine),
        totals.purchasePcs,
        formatNumber(totals.purchaseNetWeight),
        formatNumber(totals.purchaseFine)
      ]
    ]

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `itemwise_sale_purchase_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Itemwise Sale Purchase CSV successfully.')
  }

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
              <span>Itemwise Sale Purchase</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                {filteredRecords.length} Items
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Lifetime comparative analysis of sold vs purchased volume, net weight, and fine purity per item
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

          <div className="relative w-80">
            <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search item, group, metal..."
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
          <div className="p-3.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Total Sale Net Wt
              </span>
              <strong className="text-base font-extrabold font-mono text-amber-900 block mt-0.5">
                {formatNumber(totals.saleNetWeight)}g
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
              <FiShoppingBag className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Total Sale Fine
              </span>
              <strong className="text-base font-extrabold font-mono text-amber-900 block mt-0.5">
                {formatNumber(totals.saleFine)}g
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
              <FiAward className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                Total Purchase Net Wt
              </span>
              <strong className="text-base font-extrabold font-mono text-blue-900 block mt-0.5">
                {formatNumber(totals.purchaseNetWeight)}g
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200">
              <FiShoppingCart className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                Total Purchase Fine
              </span>
              <strong className="text-base font-extrabold font-mono text-blue-900 block mt-0.5">
                {formatNumber(totals.purchaseFine)}g
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200">
              <FiAward className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Printable Title */}
        <div className="hidden print:block p-3 border-b border-slate-300">
          <h2 className="text-lg font-bold text-slate-900">Itemwise Sale Purchase Report</h2>
          <p className="text-xs text-slate-600">Metal Filter: {metalFilter}</p>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3">Group</th>
                <th className="py-2.5 px-3">Metal</th>
                <th className="py-2.5 px-3 text-right bg-amber-50/40">Sale Pcs</th>
                <th className="py-2.5 px-3 text-right bg-amber-50/40">Sale Net Wt (g)</th>
                <th className="py-2.5 px-3 text-right bg-amber-50/40 text-amber-900">Sale Fine (g)</th>
                <th className="py-2.5 px-3 text-right bg-blue-50/40">Purch. Pcs</th>
                <th className="py-2.5 px-3 text-right bg-blue-50/40">Purch. Net Wt (g)</th>
                <th className="py-2.5 px-3 text-right bg-blue-50/40 text-blue-900">Purch. Fine (g)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading itemwise sale purchase...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2">
                        <FiInbox className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm text-slate-800 mb-0.5">No Item Movements Found</span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {searchText || metalFilter !== 'All'
                          ? 'No items matching your search criteria.'
                          : 'No sale or purchase transactions recorded yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <tr key={record.itemId || index} className="hover:bg-amber-50/40 text-slate-700 font-medium transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{index + 1}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{record.itemName}</td>
                    <td className="py-2 px-3 text-slate-600">{record.groupName || '-'}</td>
                    <td className="py-2 px-3 text-slate-600">{record.metalType}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-amber-50/20">
                      {record.salePcs || 0}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-amber-50/20">
                      {formatNumber(record.saleNetWeight)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-800 bg-amber-50/30">
                      {formatNumber(record.saleFine)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-blue-50/20">
                      {record.purchasePcs || 0}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-blue-50/20">
                      {formatNumber(record.purchaseNetWeight)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-800 bg-blue-50/30">
                      {formatNumber(record.purchaseFine)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {filteredRecords.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0 z-10 shadow-inner">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3 text-right text-xs uppercase tracking-wider">
                    Total:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 bg-amber-100/50">
                    {totals.salePcs}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 bg-amber-100/50">
                    {formatNumber(totals.saleNetWeight)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-amber-900 bg-amber-100/60">
                    {formatNumber(totals.saleFine)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 bg-blue-100/50">
                    {totals.purchasePcs}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 bg-blue-100/50">
                    {formatNumber(totals.purchaseNetWeight)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-blue-900 bg-blue-100/60">
                    {formatNumber(totals.purchaseFine)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer info note */}
        <div className="px-4 py-2 bg-white rounded-lg border border-slate-200/90 text-[11px] text-slate-500 flex items-center justify-between shrink-0 no-print shadow-2xs">
          <span>* Itemwise Sale Purchase compares total pcs / net weight / fine sold vs purchased for each item across all bills.</span>
          <span className="font-semibold text-slate-600">Jewelry ERP System</span>
        </div>
      </div>
    </div>
  )
}

export default ItemwiseSalePurchaseReportScreen
