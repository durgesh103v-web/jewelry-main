import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import JSBarcode from 'jsbarcode'
import {
  FiCheckSquare,
  FiDatabase,
  FiDownload,
  FiFilter,
  FiInbox,
  FiLayers,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiSquare,
  FiTag,
  FiX
} from 'react-icons/fi'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { formatNumber } from '../../../utils/formatters'

type AlertType = 'success' | 'error' | 'warning'

type Item = {
  id: string
  itemName: string
  metalType: string
  barcodeType: string
  barcodeValue: string
  defaultTanch: number
  defaultWastage: number
  active: boolean
}

type LabelEntry = {
  key: string
  itemId: string
  itemName: string
  metalType: string
  tunch: number
  wastage: number
  barcodeValue: string
  barcodeFormat: string
}


function resolveBarcodeFormat(barcodeType: string): string {
  if (barcodeType === 'EAN13') return 'EAN13'
  return 'CODE128'
}

function BarcodeLabel({ entry }: { entry: LabelEntry }): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!svgRef.current || !entry.barcodeValue) return

    try {
      JSBarcode(svgRef.current, entry.barcodeValue, {
        format: entry.barcodeFormat,
        displayValue: true,
        fontSize: 10,
        height: 32,
        margin: 2
      })
    } catch {
      // Ignore render errors for values that don't fit the selected barcode format.
    }
  }, [entry.barcodeValue, entry.barcodeFormat])

  return (
    <div className="bg-white border border-slate-300 rounded-lg p-2 flex flex-col items-center justify-between text-center shadow-2xs break-inside-avoid w-full max-w-[200px]">
      <div className="text-[11px] font-bold text-slate-900 truncate w-full">{entry.itemName}</div>
      <div className="text-[9px] font-semibold text-slate-500 mt-0.5">
        {entry.metalType}
        {entry.tunch || entry.wastage
          ? ` • T:${formatNumber(entry.tunch)}% W:${formatNumber(entry.wastage)}%`
          : ''}
      </div>
      <svg ref={svgRef} className="w-full max-h-12 my-1" />
    </div>
  )
}

function BarcodePrintingScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [items, setItems] = useState<Item[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [labelQueue, setLabelQueue] = useState<LabelEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [metalFilter, setMetalFilter] = useState('All')
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

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)

      const [itemData, stockData] = await Promise.all([
        window.api.items.list(),
        window.api.reports.itemStock()
      ])

      const activeItems = (itemData || []).filter((item) => item.active)
      setItems(activeItems)

      const nextStockMap: Record<string, number> = {}
      ;(stockData || []).forEach((record) => {
        nextStockMap[record.itemId] = (nextStockMap[record.itemId] ?? 0) + Number(record.pcs || 0)
      })
      setStockMap(nextStockMap)

      setQuantities((current) => {
        const next = { ...current }
        activeItems.forEach((item) => {
          if (next[item.id] === undefined) {
            const stockPcs = Math.round(nextStockMap[item.id] ?? 0)
            next[item.id] = String(stockPcs > 0 ? stockPcs : 1)
          }
        })
        return next
      })
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    void loadData()

    return () => {
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadData])

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return items.filter((item) => {
      const metalMatch = metalFilter === 'All' || item.metalType === metalFilter
      const keywordMatch =
        !keyword ||
        item.itemName.toLowerCase().includes(keyword) ||
        (item.barcodeValue || '').toLowerCase().includes(keyword)
      return metalMatch && keywordMatch
    })
  }, [items, searchText, metalFilter])

  const selectedCount = useMemo(() => {
    return Object.values(selected).filter(Boolean).length
  }, [selected])

  const totalStockPcs = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + (stockMap[item.id] ?? 0), 0)
  }, [filteredItems, stockMap])

  const toggleSelected = (itemId: string): void => {
    setSelected((current) => ({
      ...current,
      [itemId]: !current[itemId]
    }))
  }

  const handleQuantityChange = (itemId: string, value: string): void => {
    if (!/^\d*$/.test(value)) return

    setQuantities((current) => ({
      ...current,
      [itemId]: value
    }))
  }

  const handleSelectAllVisible = (): void => {
    setSelected((current) => {
      const next = { ...current }
      filteredItems.forEach((item) => {
        next[item.id] = true
      })
      return next
    })
  }

  const handleClearSelection = (): void => {
    setSelected({})
    setLabelQueue([])
  }

  const handleGenerateLabels = async (): Promise<void> => {
    const selectedItems = items.filter((item) => selected[item.id])

    if (selectedItems.length === 0) {
      showAlert('warning', 'Please select at least one item from the table.')
      return
    }

    try {
      setGenerating(true)

      const resolvedItems: Item[] = []

      for (const item of selectedItems) {
        if (item.barcodeValue) {
          resolvedItems.push(item)
          continue
        }

        const updated = await window.api.items.assignBarcode(item.id)
        resolvedItems.push(updated)
      }

      setItems((current) =>
        current.map((item) => resolvedItems.find((updated) => updated.id === item.id) ?? item)
      )

      const queue: LabelEntry[] = []

      resolvedItems.forEach((item) => {
        const copies = Math.max(1, Number(quantities[item.id] || 1) || 1)

        for (let index = 0; index < copies; index += 1) {
          queue.push({
            key: `${item.id}-${index}`,
            itemId: item.id,
            itemName: item.itemName,
            metalType: item.metalType,
            tunch: item.defaultTanch,
            wastage: item.defaultWastage,
            barcodeValue: item.barcodeValue,
            barcodeFormat: resolveBarcodeFormat(item.barcodeType)
          })
        }
      })

      setLabelQueue(queue)
      showAlert(
        'success',
        `Generated ${queue.length} label(s) for ${resolvedItems.length} item(s). Ready to print!`
      )
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setGenerating(false)
    }
  }

  const handleExportCsv = () => {
    if (filteredItems.length === 0) {
      showAlert('warning', 'No items to export.')
      return
    }
    const headers = ['Sr', 'Item Name', 'Metal', 'Tunch (%)', 'Wastage (%)', 'Stock Pcs', 'Barcode', 'Copies']
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const csvRows = [
      ...filteredItems.map((item, idx) => [
        idx + 1,
        escapeCsv(item.itemName),
        escapeCsv(item.metalType),
        item.defaultTanch || 0,
        item.defaultWastage || 0,
        stockMap[item.id] ?? 0,
        escapeCsv(item.barcodeValue || 'Unassigned'),
        Number(quantities[item.id] || 1)
      ]),
      [
        'Total',
        `${filteredItems.length} Items`,
        '',
        '',
        '',
        totalStockPcs,
        '',
        ''
      ]
    ]

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `barcode_items_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert('success', 'Exported barcode items list successfully.')
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiPrinter className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Barcode & Jewellery Tag Printing</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                {items.length} Master Items
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Generate thermal jewellery barcodes, manage print queues, and print tag sheets for stock inventory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="h-8 px-3 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 text-amber-600 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Loading...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || filteredItems.length === 0}
            className="h-8 px-3 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FiDownload className="w-3.5 h-3.5 text-amber-600" />
            <span>Export CSV</span>
          </button>

          {labelQueue.length > 0 && (
            <button
              type="button"
              onClick={() => window.print()}
              className="h-8 px-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-emerald-700 cursor-pointer"
            >
              <FiPrinter className="w-3.5 h-3.5" />
              <span>Print Sheet ({labelQueue.length})</span>
            </button>
          )}

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

        {/* Filter & Selection Actions Toolbar */}
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 no-print">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-700 font-bold flex items-center gap-1">
                <FiFilter className="w-3.5 h-3.5 text-amber-600" /> Metal:
              </span>
              <select
                id="barcode-printing-metal-filter"
                value={metalFilter}
                onChange={(event) => setMetalFilter(event.target.value)}
                className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-2xs"
              >
                <option value="All">All Metals</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Diamond">Diamond</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="relative w-72">
              <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                id="barcode-printing-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search item name or barcode..."
                className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs font-medium"
              />
              {searchText && (
                <button
                  type="button"
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  onClick={() => setSearchText('')}
                >
                  &times;
                </button>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="h-8 px-2.5 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <FiCheckSquare className="w-3.5 h-3.5 text-amber-600" />
                <span>Select All Visible</span>
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                disabled={selectedCount === 0}
                className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
              >
                <FiSquare className="w-3.5 h-3.5" />
                <span>Clear Selection</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-slate-500 font-medium text-xs">
              Selected: <strong className="font-mono font-bold text-amber-900">{selectedCount}</strong> items
            </span>

            <button
              type="button"
              onClick={() => void handleGenerateLabels()}
              disabled={generating || selectedCount === 0}
              className="h-8 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-amber-600 cursor-pointer disabled:opacity-50"
            >
              <FiTag className="w-3.5 h-3.5" />
              <span>{generating ? 'Generating...' : `Generate Labels (${selectedCount})`}</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 no-print">
          <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Master Items
              </span>
              <strong className="text-base font-extrabold font-mono text-slate-900 block mt-0.5">
                {items.length} Items
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <FiDatabase className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Stock in Vault
              </span>
              <strong className="text-base font-extrabold font-mono text-emerald-900 block mt-0.5">
                {totalStockPcs} Pcs
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <FiLayers className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Selected for Print
              </span>
              <strong className="text-base font-extrabold font-mono text-amber-900 block mt-0.5">
                {selectedCount} Selected
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
              <FiCheckSquare className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">
                Queued Barcode Labels
              </span>
              <strong className="text-base font-extrabold font-mono text-indigo-900 block mt-0.5">
                {labelQueue.length} Labels
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200">
              <FiTag className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Master Item Table */}
        <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col no-print">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">Sel</th>
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3">Metal</th>
                <th className="py-2.5 px-3 text-right">Tunch (%)</th>
                <th className="py-2.5 px-3 text-right">Wastage (%)</th>
                <th className="py-2.5 px-3 text-right">Stock Pcs</th>
                <th className="py-2.5 px-3">Barcode</th>
                <th className="py-2.5 px-3 w-24 text-center">Copies</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading master items & inventory...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2">
                        <FiInbox className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm text-slate-800 mb-0.5">No Master Items Found</span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {searchText || metalFilter !== 'All'
                          ? 'No items matching your search criteria.'
                          : 'No master items available for barcode printing.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = Boolean(selected[item.id])
                  const stockPcs = stockMap[item.id] ?? 0
                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggleSelected(item.id)}
                      className={`hover:bg-amber-50/40 text-slate-700 font-medium transition-colors cursor-pointer ${
                        isSelected ? 'bg-amber-50/70' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(item.id)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">{item.itemName}</td>
                      <td className="py-2 px-3 text-slate-600 font-semibold">{item.metalType}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                        {formatNumber(item.defaultTanch)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                        {formatNumber(item.defaultWastage)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        <span className={stockPcs > 0 ? 'text-emerald-700 font-extrabold' : 'text-slate-400'}>
                          {stockPcs}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-amber-900">
                        {item.barcodeValue || (
                          <span className="text-[10px] text-slate-400 font-semibold italic">Auto-assign on generate</span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          className="w-16 h-7 px-2 text-center text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs"
                          value={quantities[item.id] ?? '1'}
                          onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>

            {filteredItems.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0 z-10 shadow-inner">
                <tr>
                  <td colSpan={2} className="py-2.5 px-3 text-left text-xs uppercase tracking-wider">
                    Total: {filteredItems.length} Items
                  </td>
                  <td colSpan={3} className="py-2.5 px-3 text-right text-xs uppercase tracking-wider">
                    Total Stock:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                    {totalStockPcs}
                  </td>
                  <td colSpan={2} className="py-2.5 px-3 text-right text-xs text-slate-600">
                    {selectedCount} Selected
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Generated Label Preview Strip (if queued) */}
        {labelQueue.length > 0 && (
          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col gap-2 shrink-0 no-print">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <FiPrinter className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-slate-800">
                  Label Print Queue Preview ({labelQueue.length} Labels ready to print)
                </span>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <FiPrinter className="w-3 h-3" />
                <span>Print All Labels</span>
              </button>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto py-1">
              {labelQueue.slice(0, 8).map((entry) => (
                <BarcodeLabel key={entry.key} entry={entry} />
              ))}
              {labelQueue.length > 8 && (
                <div className="flex items-center justify-center p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 font-semibold whitespace-nowrap">
                  +{labelQueue.length - 8} more labels...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer info note */}
        <div className="px-4 py-2 bg-white rounded-lg border border-slate-200/90 text-[11px] text-slate-500 flex items-center justify-between shrink-0 no-print shadow-2xs">
          <span>* Select item(s), adjust copies, and click Generate Labels. Missing barcodes are automatically allocated.</span>
          <span className="font-semibold text-slate-600">Jewelry ERP Barcode Master</span>
        </div>
      </div>

      {/* ── Print Label Sheet (Only visible during window.print) ── */}
      {labelQueue.length > 0 && (
        <div className="hidden print:grid print:grid-cols-3 print:gap-3 p-4 bg-white">
          {labelQueue.map((entry) => (
            <BarcodeLabel key={entry.key} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

export default BarcodePrintingScreen
