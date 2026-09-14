import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiShoppingBag,
  FiX,
  FiRefreshCw,
  FiDownload,
  FiPrinter,
  FiSearch,
  FiInbox,
  FiEye,
  FiTrash2
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import AppConfirmDialog from '../../../components/ui/AppConfirmDialog'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import SalePrintPreview, { type SavedSaleRecord } from '../sale/SalePrintPreview'

type AlertType = 'success' | 'error' | 'warning'

type SaleRegisterRecord = {
  id: string
  sale_no: string
  sale_date: string
  metal_type: string
  item_fine_total: number
  item_majuri_total: number
  payment_fine_jama_total: number
  payment_cash_jama_total: number
  closing_gold_fine: number
  closing_silver_fine: number
  closing_cash: number
  account_name: string
  mobile_number: string
}

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
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

function SaleRegisterScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [sales, setSales] = useState<SaleRegisterRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [selectedSale, setSelectedSale] = useState<SavedSaleRecord | null>(null)
  const [cancelTarget, setCancelTarget] = useState<SaleRegisterRecord | null>(null)

  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const alertTimerRef = useRef<number | null>(null)

  const filteredSales = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return sales

    return sales.filter((sale) => {
      return (
        sale.sale_no?.toLowerCase().includes(keyword) ||
        sale.account_name?.toLowerCase().includes(keyword) ||
        sale.mobile_number?.toLowerCase().includes(keyword) ||
        sale.metal_type?.toLowerCase().includes(keyword) ||
        sale.sale_date?.toLowerCase().includes(keyword)
      )
    })
  }, [sales, searchText])

  const totals = useMemo(() => {
    return filteredSales.reduce(
      (total, sale) => {
        total.fine += Number(sale.item_fine_total || 0)
        total.majuri += Number(sale.item_majuri_total || 0)
        total.fineJama += Number(sale.payment_fine_jama_total || 0)
        total.cashJama += Number(sale.payment_cash_jama_total || 0)
        return total
      },
      {
        fine: 0,
        majuri: 0,
        fineJama: 0,
        cashJama: 0
      }
    )
  }, [filteredSales])

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

  const loadSales = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.sales.list()
      setSales(data || [])
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  const openSale = async (saleId: string): Promise<void> => {
    try {
      setOpening(true)
      const sale = await window.api.sales.getById(saleId)
      setSelectedSale(sale)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  const handleConfirmCancelSale = async (): Promise<void> => {
    if (!cancelTarget) return

    try {
      setCancelling(true)
      const result = await window.api.sales.cancel(cancelTarget.id)

      setCancelTarget(null)
      await loadSales()
      showAlert('success', `Sale bill ${result.saleNo} cancelled successfully.`)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setCancelling(false)
    }
  }

  const handleCancelDialogClose = (): void => {
    if (cancelling) return
    setCancelTarget(null)
  }

  useEffect(() => {
    void loadSales()
  }, [loadSales])

  const handleExportCsv = () => {
    if (filteredSales.length === 0) {
      showAlert('warning', 'No sale records to export.')
      return
    }
    const headers = ['Sr', 'Bill No', 'Date', 'Account Name', 'Mobile', 'Metal', 'Item Fine (g)', 'Majuri (INR)', 'Fine Jama (g)', 'Cash Jama (INR)', 'Closing Fine (g)', 'Closing Cash (INR)']
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const csvRows = [
      ...filteredSales.map((sale, idx) => {
        const closingFine = sale.metal_type === 'Gold' ? sale.closing_gold_fine : sale.closing_silver_fine
        return [
          idx + 1,
          escapeCsv(sale.sale_no),
          escapeCsv(formatDate(sale.sale_date)),
          escapeCsv(sale.account_name),
          escapeCsv(sale.mobile_number || '-'),
          escapeCsv(sale.metal_type),
          sale.item_fine_total || 0,
          sale.item_majuri_total || 0,
          sale.payment_fine_jama_total || 0,
          sale.payment_cash_jama_total || 0,
          closingFine || 0,
          sale.closing_cash || 0
        ]
      }),
      ['Total', '', '', '', '', '', totals.fine, totals.majuri, totals.fineJama, totals.cashJama, '', '']
    ]

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sale_register_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported Sale Register CSV successfully.')
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight">Wholesale Sale Register</h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Live ledger of all saved wholesale sales, customer fine jama, majuri and closing positions
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
          {/* Search */}
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search bill no, account, mobile, metal..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-amber-500 shadow-2xs font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadSales()}
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
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Item Fine</span>
            <span className="text-sm font-extrabold font-mono text-slate-900 mt-0.5">
              {formatNumber(totals.fine)}g
            </span>
          </div>
          <div className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/40 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Majuri</span>
            <span className="text-sm font-extrabold font-mono text-amber-800 mt-0.5">
              ₹{formatAmount(totals.majuri)}
            </span>
          </div>
          <div className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Fine Jama Received</span>
            <span className="text-sm font-extrabold font-mono text-emerald-700 mt-0.5">
              {formatNumber(totals.fineJama)}g
            </span>
          </div>
          <div className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 shadow-2xs flex flex-col justify-center">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Cash Jama Received</span>
            <span className="text-sm font-extrabold font-mono text-emerald-700 mt-0.5">
              ₹{formatAmount(totals.cashJama)}
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          {filteredSales.length === 0 && !loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                <FiInbox className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 mb-1">No Sale Bills Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-3">
                {searchText ? 'No sale bills matching your search.' : 'No sale bills created yet.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Bill No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Metal</th>
                  <th className="py-2.5 px-3 text-right">Item Fine (g)</th>
                  <th className="py-2.5 px-3 text-right">Majuri (₹)</th>
                  <th className="py-2.5 px-3 text-right">Fine Jama (g)</th>
                  <th className="py-2.5 px-3 text-right">Cash Jama (₹)</th>
                  <th className="py-2.5 px-3 text-right">Closing Fine</th>
                  <th className="py-2.5 px-3 text-right">Closing Cash</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale, index) => {
                  const closingFine =
                    sale.metal_type === 'Gold' ? sale.closing_gold_fine : sale.closing_silver_fine

                  return (
                    <tr
                      key={sale.id}
                      className="hover:bg-amber-50/40 text-slate-700 font-medium cursor-pointer"
                      onDoubleClick={() => void openSale(sale.id)}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{index + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{sale.sale_no}</td>
                      <td className="py-2 px-3 font-mono text-[11px]">{formatDate(sale.sale_date)}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{sale.account_name}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{sale.mobile_number || '-'}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sale.metal_type === 'Gold'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-800 border border-slate-300'
                          }`}
                        >
                          {sale.metal_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatNumber(sale.item_fine_total)}g
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{formatAmount(sale.item_majuri_total)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatNumber(sale.payment_fine_jama_total)}g
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        ₹{formatAmount(sale.payment_cash_jama_total)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">
                        {formatNumber(closingFine)}g
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">
                        ₹{formatAmount(sale.closing_cash)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div
                          className="flex items-center justify-center gap-1.5"
                          onDoubleClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => void openSale(sale.id)}
                            disabled={opening || cancelling}
                            title="Open & Print Bill"
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <FiEye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelTarget(sale)}
                            disabled={opening || cancelling}
                            title="Cancel Bill"
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <FiTrash2 className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                    Total:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                    {formatNumber(totals.fine)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                    ₹{formatAmount(totals.majuri)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                    {formatNumber(totals.fineJama)}g
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                    ₹{formatAmount(totals.cashJama)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {selectedSale && (
        <SalePrintPreview sale={selectedSale} onClose={() => setSelectedSale(null)} />
      )}
      <AppConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel Sale Bill?"
        message={
          cancelTarget
            ? `Are you sure you want to cancel bill "${cancelTarget.sale_no}" for "${cancelTarget.account_name}"? This will reverse all ledger and inventory entries.`
            : ''
        }
        confirmText="Cancel Bill"
        cancelText="Close"
        type="danger"
        loading={cancelling}
        onConfirm={() => void handleConfirmCancelSale()}
        onCancel={handleCancelDialogClose}
      />
    </div>
  )
}

export default SaleRegisterScreen
