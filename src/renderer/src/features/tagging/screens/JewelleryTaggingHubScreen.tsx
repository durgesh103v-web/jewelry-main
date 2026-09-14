import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiDatabase,
  FiDownload,
  FiEye,
  FiFilter,
  FiInbox,
  FiLayers,
  FiPlay,
  FiPrinter,
  FiRadio,
  FiRefreshCw,
  FiSearch,
  FiTag,
  FiX,
  FiXCircle
} from 'react-icons/fi'
import type {
  JewelleryStockItemRecord,
  ScanResult,
  StockTakeSummary,
  TagPrintItem,
  ItemTimelineEvent
} from '@shared/types/tagging'

type TaggingTab = 'TAG_PRINTING' | 'SCANNER_LOOKUP' | 'STOCK_TAKE' | 'RFID_CONSOLE'

interface JewelleryTaggingHubScreenProps {
  onClose?: () => void
  initialTab?: TaggingTab
}

function formatWeight(value: number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })
}

export const JewelleryTaggingHubScreen: React.FC<JewelleryTaggingHubScreenProps> = ({
  onClose,
  initialTab = 'TAG_PRINTING'
}) => {
  const [activeTab, setActiveTab] = useState<TaggingTab>(initialTab)
  const [stockItems, setStockItems] = useState<JewelleryStockItemRecord[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Scanner state
  const [scanInput, setScanInput] = useState<string>('')
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<ItemTimelineEvent[]>([])
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<JewelleryStockItemRecord | null>(null)
  const scanInputRef = useRef<HTMLInputElement>(null)

  // Stock Take state
  const [activeSessionSummary, setActiveSessionSummary] = useState<StockTakeSummary | null>(null)
  const [stockTakeInput, setStockTakeInput] = useState<string>('')
  const stockTakeInputRef = useRef<HTMLInputElement>(null)

  // RFID Simulated Events
  const [rfidLogs, setRfidLogs] = useState<{ epc: string; timestamp: string; rssi: number; resolvedName?: string }[]>([])
  const [isRfidSimulating, setIsRfidSimulating] = useState<boolean>(false)

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setError(msg)
      setSuccessMessage(null)
    } else {
      setSuccessMessage(msg)
      setError(null)
    }
    setTimeout(() => {
      setError(null)
      setSuccessMessage(null)
    }, 3500)
  }

  // Load stock items
  const loadStockItems = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const items = await window.api.itemIdentification.listStockItems({ search })
      setStockItems(items || [])
    } catch (err: any) {
      console.error('Error fetching stock items:', err)
      showNotification(err.message || 'Failed to load stock items', true)
    } finally {
      setIsLoading(false)
    }
  }, [search])

  // Load active stock take session
  const loadActiveStockTake = useCallback(async () => {
    try {
      const active = await window.api.stockTake.getActiveSession()
      if (active) {
        const summary = await window.api.stockTake.getSessionSummary(active.id)
        setActiveSessionSummary(summary)
      } else {
        setActiveSessionSummary(null)
      }
    } catch (err: any) {
      console.error('Error loading stock take:', err)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'TAG_PRINTING') {
      void loadStockItems()
    } else if (activeTab === 'STOCK_TAKE') {
      void loadActiveStockTake()
    }
  }, [activeTab, loadStockItems, loadActiveStockTake])

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return stockItems.filter((item) => {
      if (statusFilter === 'IN_STOCK' && item.status !== 'IN_STOCK') return false
      if (statusFilter === 'SOLD' && item.status !== 'SOLD') return false
      if (!keyword) return true
      return (
        item.stockItemCode.toLowerCase().includes(keyword) ||
        item.itemName.toLowerCase().includes(keyword) ||
        (item.barcode && item.barcode.toLowerCase().includes(keyword)) ||
        (item.purityName && item.purityName.toLowerCase().includes(keyword)) ||
        item.status.toLowerCase().includes(keyword)
      )
    })
  }, [stockItems, search, statusFilter])

  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        acc.grossWeight += Number(item.grossWeight || 0)
        acc.netWeight += Number(item.netWeight || 0)
        acc.fineWeight += Number(item.fineWeight || 0)
        if (item.status === 'IN_STOCK') acc.inStockCount += 1
        if (item.status === 'SOLD') acc.soldCount += 1
        return acc
      },
      { grossWeight: 0, netWeight: 0, fineWeight: 0, inStockCount: 0, soldCount: 0 }
    )
  }, [filteredItems])

  // Handle Scanner Resolution
  const handleScannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scanInput.trim()) return

    try {
      const res: ScanResult = await window.api.itemIdentification.resolveIdentifier({
        identifier: scanInput.trim(),
        operationType: 'GENERAL'
      })
      setLastScanResult(res)
      if (res.stockItem) {
        const events = await window.api.itemIdentification.getTimeline(res.stockItem.id)
        setTimelineEvents(events || [])
        setSelectedTimelineItem(res.stockItem)
        showNotification(`Resolved: ${res.stockItem.itemName} (${res.stockItem.stockItemCode})`)
      } else {
        showNotification('No item mapped to this identifier', true)
      }
      setScanInput('')
    } catch (err: any) {
      showNotification(err.message || 'Scan error', true)
    }
  }

  // Handle Stock Take Scan
  const handleStockTakeScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockTakeInput.trim() || !activeSessionSummary) return

    try {
      const { summary } = await window.api.stockTake.scanItem({
        sessionId: activeSessionSummary.session.id,
        identifier: stockTakeInput.trim(),
        operator: 'Store Manager'
      })
      setActiveSessionSummary(summary)
      setStockTakeInput('')
      showNotification('Tag verified and logged in session.')
    } catch (err: any) {
      showNotification(err.message || 'Stock take scan error', true)
    }
  }

  // Start Stock Take
  const handleStartStockTake = async () => {
    try {
      const session = await window.api.stockTake.startSession({ location: 'MAIN_STORE', createdBy: 'Admin' })
      const summary = await window.api.stockTake.getSessionSummary(session.id)
      setActiveSessionSummary(summary)
      showNotification(`Started Stock Take Session: ${session.sessionNumber}`)
    } catch (err: any) {
      showNotification(err.message || 'Failed to start stock take', true)
    }
  }

  // Complete Stock Take
  const handleCompleteStockTake = async () => {
    if (!activeSessionSummary) return
    try {
      const summary = await window.api.stockTake.completeSession({
        sessionId: activeSessionSummary.session.id,
        notes: 'Physical verification audit completed'
      })
      setActiveSessionSummary(summary)
      showNotification('Stock Take Session completed successfully.')
    } catch (err: any) {
      showNotification(err.message || 'Failed to complete stock take', true)
    }
  }

  // Handle Tag Selection
  const toggleSelect = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedItemIds.size === filteredItems.length) {
      setSelectedItemIds(new Set())
    } else {
      setSelectedItemIds(new Set(filteredItems.map((i) => i.id)))
    }
  }

  // Print Tags
  const handlePrintSelected = async () => {
    const ids = Array.from(selectedItemIds)
    if (ids.length === 0) {
      showNotification('Please select at least one item to print tags.', true)
      return
    }
    try {
      const models: TagPrintItem[] = await window.api.itemIdentification.preparePrintModel(ids)
      console.log('Prepared Tag Print Models:', models)
      window.print()
      showNotification(`Printing ${models.length} jewellery tags...`)
    } catch (err: any) {
      showNotification(err.message || 'Print error', true)
    }
  }

  // Export CSV
  const handleExportCsv = () => {
    if (filteredItems.length === 0) {
      showNotification('No stock items to export.', true)
      return
    }
    const headers = [
      'Sr',
      'Stock Code',
      'Item Name',
      'Barcode',
      'Gross Wt (g)',
      'Net Wt (g)',
      'Fine Wt (g)',
      'Purity',
      'Status',
      'Tag Status'
    ]
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const csvRows = [
      ...filteredItems.map((item, idx) => [
        idx + 1,
        escapeCsv(item.stockItemCode),
        escapeCsv(item.itemName),
        escapeCsv(item.barcode || 'Unassigned'),
        formatWeight(item.grossWeight),
        formatWeight(item.netWeight),
        formatWeight(item.fineWeight),
        escapeCsv(item.purityName || `${item.tunch}%`),
        escapeCsv(item.status),
        escapeCsv(item.tagStatus)
      ]),
      [
        'Total',
        '',
        `${filteredItems.length} Items`,
        '',
        formatWeight(totals.grossWeight),
        formatWeight(totals.netWeight),
        formatWeight(totals.fineWeight),
        '',
        `${totals.inStockCount} In Stock`,
        ''
      ]
    ]

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `jewellery_tags_stock_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showNotification('Exported Jewellery Stock Tag List successfully.')
  }

  // Simulate RFID scan
  const handleSimulateRfid = async () => {
    setIsRfidSimulating(true)
    const randomEpc = `E200001722${Math.floor(10000000000000 + Math.random() * 90000000000000).toString(16).toUpperCase()}`
    const rssi = Math.floor(-70 + Math.random() * 30)
    const now = new Date().toLocaleTimeString()

    let resolvedName: string | undefined = undefined
    try {
      const res = await window.api.itemIdentification.resolveIdentifier({ identifier: randomEpc })
      if (res.stockItem) resolvedName = res.stockItem.itemName
    } catch {
      // ignore
    }

    setRfidLogs((prev) => [{ epc: randomEpc, timestamp: now, rssi, resolvedName }, ...prev.slice(0, 19)])
    setIsRfidSimulating(false)
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* ── Top Header Bar ── */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiTag className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Jewellery Tagging & RFID Hub</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                {stockItems.length} Stock Units
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Automated barcode generation, thermal jewellery tag printing, live USB scanner resolution & RFID verification
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'TAG_PRINTING' && (
            <>
              <button
                type="button"
                onClick={() => void loadStockItems()}
                disabled={isLoading}
                className="h-8 px-3 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <FiRefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={isLoading || filteredItems.length === 0}
                className="h-8 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-amber-600 cursor-pointer disabled:opacity-50"
              >
                <FiDownload className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </>
          )}

          {onClose && (
            <>
              <div className="h-4 w-px bg-slate-200 mx-1" />
              <button
                type="button"
                onClick={onClose}
                title="Close"
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
              >
                <FiX className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Sub-Header Navigation Tab Bar ── */}
      <div className="px-4 py-2 bg-white/80 border-b border-slate-200/90 flex items-center justify-between shrink-0 no-print">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('TAG_PRINTING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'TAG_PRINTING'
                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-amber-900 hover:bg-amber-50/70 font-semibold'
            }`}
          >
            <FiPrinter className="w-3.5 h-3.5" />
            <span>Tag Generation & Print</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('SCANNER_LOOKUP')
              setTimeout(() => scanInputRef.current?.focus(), 100)
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'SCANNER_LOOKUP'
                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-amber-900 hover:bg-amber-50/70 font-semibold'
            }`}
          >
            <FiSearch className="w-3.5 h-3.5" />
            <span>Live Scanner & Item Lookup</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STOCK_TAKE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'STOCK_TAKE'
                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-amber-900 hover:bg-amber-50/70 font-semibold'
            }`}
          >
            <FiCheckCircle className="w-3.5 h-3.5" />
            <span>Stock Take Verification</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RFID_CONSOLE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'RFID_CONSOLE'
                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-amber-900 hover:bg-amber-50/70 font-semibold'
            }`}
          >
            <FiRadio className="w-3.5 h-3.5" />
            <span>RFID Reader Console</span>
          </button>
        </div>

        {activeTab === 'TAG_PRINTING' && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Selection: <strong className="font-mono font-bold text-amber-900">{selectedItemIds.size}</strong> of {filteredItems.length} items
            </span>
            <button
              type="button"
              onClick={handlePrintSelected}
              disabled={selectedItemIds.size === 0}
              className="h-7.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-amber-600 cursor-pointer disabled:opacity-50"
            >
              <FiPrinter className="w-3 h-3" />
              <span>Print Tags ({selectedItemIds.size})</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Main Workspace ── */}
      <div className="flex-1 flex flex-col p-3 gap-2.5 overflow-hidden">
        {/* Notifications */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between shadow-2xs shrink-0 no-print animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4 text-rose-600" />
              <span className="font-semibold">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer">
              &times;
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-2xs shrink-0 no-print animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <FiCheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer">
              &times;
            </button>
          </div>
        )}

        {/* ── 1. TAG GENERATION & PRINT TAB ── */}
        {activeTab === 'TAG_PRINTING' && (
          <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
            {/* Filter Toolbar */}
            <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 no-print">
              <div className="flex items-center gap-3">
                <div className="relative w-80">
                  <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by stock code, barcode, item name..."
                    className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs font-medium"
                  />
                  {search && (
                    <button
                      type="button"
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                      onClick={() => setSearch('')}
                    >
                      &times;
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-700 font-bold flex items-center gap-1">
                    <FiFilter className="w-3.5 h-3.5 text-amber-600" /> Status:
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-2xs"
                  >
                    <option value="ALL">All Items</option>
                    <option value="IN_STOCK">In Stock Only</option>
                    <option value="SOLD">Sold Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-semibold">
                  Showing <strong className="font-mono text-slate-800">{filteredItems.length}</strong> items
                </span>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div className="p-3.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                    Total In Stock
                  </span>
                  <strong className="text-base font-extrabold font-mono text-amber-900 block mt-0.5">
                    {totals.inStockCount} Units
                  </strong>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
                  <FiCheckCircle className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total Net Weight
                  </span>
                  <strong className="text-base font-extrabold font-mono text-slate-900 block mt-0.5">
                    {formatWeight(totals.netWeight)}g
                  </strong>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                  <FiDatabase className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                    Total Fine Purity
                  </span>
                  <strong className="text-base font-extrabold font-mono text-amber-900 block mt-0.5">
                    {formatWeight(totals.fineWeight)}g
                  </strong>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
                  <FiTag className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50/50 to-white shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                    Sold / Dispatched
                  </span>
                  <strong className="text-base font-extrabold font-mono text-rose-900 block mt-0.5">
                    {totals.soldCount} Units
                  </strong>
                </div>
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200">
                  <FiXCircle className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Stock Items Table */}
            <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredItems.length > 0 && selectedItemIds.size === filteredItems.length}
                        onChange={selectAll}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3">Stock Code</th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Barcode</th>
                    <th className="py-2.5 px-3 text-right">Gross (g)</th>
                    <th className="py-2.5 px-3 text-right">Net (g)</th>
                    <th className="py-2.5 px-3 text-right text-amber-900">Fine (g)</th>
                    <th className="py-2.5 px-3 text-center">Purity</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Tag Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                        <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                        Loading jewellery stock units...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2">
                            <FiInbox className="w-6 h-6" />
                          </div>
                          <span className="font-bold text-sm text-slate-800 mb-0.5">No Jewellery Stock Items Found</span>
                          <p className="text-xs text-slate-500 max-w-sm">
                            {search || statusFilter !== 'ALL'
                              ? 'No items matching your search/filter criteria.'
                              : 'No tagged stock items registered yet.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isSelected = selectedItemIds.has(item.id)
                      const inStock = item.status === 'IN_STOCK'
                      return (
                        <tr
                          key={item.id}
                          onClick={() => toggleSelect(item.id)}
                          className={`hover:bg-amber-50/40 text-slate-700 font-medium transition-colors cursor-pointer ${
                            isSelected ? 'bg-amber-50/70' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(item.id)}
                              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{item.stockItemCode}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{item.itemName}</td>
                          <td className="py-2 px-3 font-mono text-amber-800 font-semibold">{item.barcode || 'Unassigned'}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatWeight(item.grossWeight)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatWeight(item.netWeight)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-900 bg-amber-50/20">{formatWeight(item.fineWeight)}</td>
                          <td className="py-2 px-3 text-center font-mono font-semibold text-slate-800">
                            {item.purityName || `${item.tunch}%`}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                                inStock
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {inStock ? 'IN_STOCK' : 'SOLD'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-[11px] font-bold text-slate-600">
                            <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] uppercase font-bold text-slate-700">
                              {item.tagStatus}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>

                {filteredItems.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 sticky bottom-0 z-10 shadow-inner">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right text-xs uppercase tracking-wider">
                        Total:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                        {formatWeight(totals.grossWeight)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                        {formatWeight(totals.netWeight)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-amber-900 bg-amber-100/50">
                        {formatWeight(totals.fineWeight)}
                      </td>
                      <td colSpan={3} className="py-2.5 px-3 text-left text-xs text-slate-600">
                        {totals.inStockCount} In Stock / {totals.soldCount} Sold
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ── 2. LIVE SCANNER & ITEM LOOKUP TAB ── */}
        {activeTab === 'SCANNER_LOOKUP' && (
          <div className="flex-1 flex gap-3 overflow-hidden">
            {/* Left Panel: Scanner Feed & Result */}
            <div className="w-1/2 flex flex-col gap-2.5">
              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3 shrink-0">
                <div className="flex items-center gap-2 text-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <FiSearch className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs">Barcode / QR / RFID Input Box</span>
                </div>
                <form onSubmit={handleScannerSubmit} className="flex gap-2">
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Scan barcode with USB scanner or type code..."
                    className="flex-1 h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs font-mono font-medium"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="h-9 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-lg text-xs shadow-xs border border-amber-600 cursor-pointer flex items-center gap-1.5"
                  >
                    <FiEye className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                </form>
              </div>

              {/* Resolved Item Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex-1 overflow-auto flex flex-col">
                {lastScanResult?.stockItem ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">
                          {lastScanResult.stockItem.itemName}
                        </h2>
                        <div className="font-mono text-xs text-amber-700 font-bold mt-0.5">
                          {lastScanResult.stockItem.stockItemCode}
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                          lastScanResult.stockItem.status === 'IN_STOCK'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {lastScanResult.stockItem.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-500 block text-[11px] font-semibold">Barcode:</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">{lastScanResult.stockItem.barcode}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-500 block text-[11px] font-semibold">Gross Weight:</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {formatWeight(lastScanResult.stockItem.grossWeight)} g
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-500 block text-[11px] font-semibold">Net Weight:</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {formatWeight(lastScanResult.stockItem.netWeight)} g
                        </span>
                      </div>
                      <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-200/60">
                        <span className="text-amber-800 block text-[11px] font-semibold">Fine Weight:</span>
                        <span className="font-mono font-bold text-amber-950 text-xs">
                          {formatWeight(lastScanResult.stockItem.fineWeight)} g
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-500 block text-[11px] font-semibold">Purity / Tunch:</span>
                        <span className="font-bold text-slate-900 text-xs">
                          {lastScanResult.stockItem.purityName || `${lastScanResult.stockItem.tunch}%`}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-500 block text-[11px] font-semibold">Store Location:</span>
                        <span className="font-bold text-slate-900 text-xs">{lastScanResult.stockItem.location || 'Main Vault'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                      <FiSearch className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-slate-700">Ready to Scan</span>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      Scan any barcode, RFID EPC tag, or type a stock code in the box above to resolve item specifications.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Item Lifecycle Timeline */}
            <div className="w-1/2 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200/90 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <FiClock className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Item Lifecycle & Audit Timeline {selectedTimelineItem ? `(${selectedTimelineItem.stockItemCode})` : ''}
                  </h3>
                </div>
                {timelineEvents.length > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                    {timelineEvents.length} Events
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-auto space-y-3">
                {timelineEvents.map((ev, idx) => (
                  <div key={idx} className="border-l-2 border-amber-500 pl-3 py-1 space-y-0.5 text-xs">
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span className="font-mono text-slate-600">{ev.date}</span>
                      <span className="font-bold px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 uppercase">{ev.eventType}</span>
                    </div>
                    <div className="text-slate-800 font-medium">{ev.description}</div>
                  </div>
                ))}
                {timelineEvents.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-2">
                      <FiLayers className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm text-slate-700">No Timeline Data</span>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      Scan or resolve a tagged item to view its complete fabrication, movement, and audit log history.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 3. STOCK TAKE VERIFICATION TAB ── */}
        {activeTab === 'STOCK_TAKE' && (
          <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
            {/* Session Controller Toolbar */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between shrink-0 no-print">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Verification Audit Session:</div>
                <div className="font-mono font-extrabold text-sm text-slate-900 mt-0.5">
                  {activeSessionSummary ? activeSessionSummary.session.sessionNumber : 'No Active Session'}
                </div>
              </div>

              {!activeSessionSummary ? (
                <button
                  type="button"
                  onClick={handleStartStockTake}
                  className="h-8.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-lg text-xs shadow-xs border border-amber-600 cursor-pointer flex items-center gap-1.5"
                >
                  <FiPlay className="w-3.5 h-3.5" />
                  <span>Start Stock Take Session</span>
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <form onSubmit={handleStockTakeScan} className="flex gap-2">
                    <input
                      ref={stockTakeInputRef}
                      type="text"
                      value={stockTakeInput}
                      onChange={(e) => setStockTakeInput(e.target.value)}
                      placeholder="Scan barcode or RFID tag to verify..."
                      className="h-8.5 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono w-72 shadow-2xs font-medium"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="h-8.5 px-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs shadow-2xs cursor-pointer"
                    >
                      Verify
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={handleCompleteStockTake}
                    className="h-8.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <FiCheckCircle className="w-3.5 h-3.5" />
                    <span>Finish Session</span>
                  </button>
                </div>
              )}
            </div>

            {/* Counter Cards */}
            {activeSessionSummary && (
              <div className="grid grid-cols-4 gap-3 text-xs shrink-0">
                <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs text-center">
                  <div className="text-slate-500 font-bold uppercase text-[11px] tracking-wide">Expected In Stock</div>
                  <div className="text-xl font-black font-mono text-slate-900 mt-1">
                    {activeSessionSummary.session.totalExpected}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs text-center">
                  <div className="text-amber-800 font-bold uppercase text-[11px] tracking-wide">Total Scanned</div>
                  <div className="text-xl font-black font-mono text-amber-900 mt-1">
                    {activeSessionSummary.session.totalScanned}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white shadow-2xs text-center">
                  <div className="text-emerald-800 font-bold uppercase text-[11px] tracking-wide">Matched (Verified)</div>
                  <div className="text-xl font-black font-mono text-emerald-900 mt-1">
                    {activeSessionSummary.session.totalMatched}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50/50 to-white shadow-2xs text-center">
                  <div className="text-rose-800 font-bold uppercase text-[11px] tracking-wide">Missing Items</div>
                  <div className="text-xl font-black font-mono text-rose-900 mt-1">
                    {activeSessionSummary.session.totalMissing}
                  </div>
                </div>
              </div>
            )}

            {/* Scans Table */}
            {activeSessionSummary && (
              <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Tag Identifier</th>
                      <th className="py-2.5 px-3">Stock Code</th>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3 text-center">Scan Result</th>
                      <th className="py-2.5 px-3">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {activeSessionSummary.scans.map((s) => (
                      <tr key={s.id} className="hover:bg-amber-50/40 text-slate-700 transition-colors">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{s.scannedAt}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{s.identifierValue}</td>
                        <td className="py-2 px-3 font-mono text-amber-800 font-bold">{s.stockItemCode || '-'}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{s.itemName || 'Unrecognized'}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                              s.scanResult === 'MATCHED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {s.scanResult}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-medium">{s.operator}</td>
                      </tr>
                    ))}
                    {activeSessionSummary.scans.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400">
                          Scan barcode or RFID tags to begin stock verification audit.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 4. RFID CONSOLE TAB ── */}
        {activeTab === 'RFID_CONSOLE' && (
          <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between text-xs shrink-0 no-print">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <span className="font-bold text-slate-900">RFID Antenna 1 (Connected / Ready)</span>
                  <span className="text-[11px] text-slate-500 ml-2">UHF EPC Gen2 Reader • 865-867 MHz</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSimulateRfid}
                disabled={isRfidSimulating}
                className="h-8.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-lg text-xs shadow-xs border border-amber-600 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <FiRadio className="w-3.5 h-3.5" />
                <span>Simulate RFID Tag Read</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs p-3 flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs uppercase tracking-wider text-amber-800">
                  Live RFID EPC Tag Stream
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">Real-time signal & identification feed</span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-3">EPC (Electronic Product Code)</th>
                    <th className="py-2 px-3 text-right">RSSI Signal</th>
                    <th className="py-2 px-3">Resolved Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rfidLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/40 text-slate-700 transition-colors">
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{log.timestamp}</td>
                      <td className="py-2 px-3 font-mono font-bold text-amber-800">{log.epc}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 font-bold">{log.rssi} dBm</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{log.resolvedName || 'New / Untagged Tag'}</td>
                    </tr>
                  ))}
                  {rfidLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        Waiting for RFID reader antenna tag events...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Info Note */}
        <div className="px-4 py-2 bg-white rounded-lg border border-slate-200/90 text-[11px] text-slate-500 flex items-center justify-between shrink-0 no-print shadow-2xs">
          <span>* High-frequency RFID & Barcode operations sync directly with the Jewellery Stock Master.</span>
          <span className="font-semibold text-slate-600">Jewelry ERP Tagging & Verification Hub</span>
        </div>
      </div>
    </div>
  )
}

export default JewelleryTaggingHubScreen
