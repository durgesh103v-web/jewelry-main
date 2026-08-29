import React, { useState, useEffect, useRef, useCallback } from 'react'
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

export const JewelleryTaggingHubScreen: React.FC<JewelleryTaggingHubScreenProps> = ({
  onClose,
  initialTab = 'TAG_PRINTING'
}) => {
  const [activeTab, setActiveTab] = useState<TaggingTab>(initialTab)
  const [stockItems, setStockItems] = useState<JewelleryStockItemRecord[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

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

  // Load stock items
  const loadStockItems = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const items = await window.api.itemIdentification.listStockItems({ search })
      setStockItems(items)
    } catch (err: any) {
      console.error('Error fetching stock items:', err)
      setError(err.message || 'Failed to load stock items')
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
      loadStockItems()
    } else if (activeTab === 'STOCK_TAKE') {
      loadActiveStockTake()
    }
  }, [activeTab, loadStockItems, loadActiveStockTake])

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
        setTimelineEvents(events)
        setSelectedTimelineItem(res.stockItem)
      }
      setScanInput('')
    } catch (err: any) {
      setError(err.message || 'Scan error')
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
    } catch (err: any) {
      setError(err.message || 'Stock take scan error')
    }
  }

  // Start Stock Take
  const handleStartStockTake = async () => {
    try {
      const session = await window.api.stockTake.startSession({ location: 'MAIN_STORE', createdBy: 'Admin' })
      const summary = await window.api.stockTake.getSessionSummary(session.id)
      setActiveSessionSummary(summary)
    } catch (err: any) {
      setError(err.message || 'Failed to start stock take')
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
    } catch (err: any) {
      setError(err.message || 'Failed to complete stock take')
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
    if (selectedItemIds.size === stockItems.length) {
      setSelectedItemIds(new Set())
    } else {
      setSelectedItemIds(new Set(stockItems.map((i) => i.id)))
    }
  }

  // Print Tags
  const handlePrintSelected = async () => {
    const ids = Array.from(selectedItemIds)
    if (ids.length === 0) return
    try {
      const models: TagPrintItem[] = await window.api.itemIdentification.preparePrintModel(ids)
      console.log('Prepared Tag Print Models:', models)
      window.print()
    } catch (err: any) {
      setError(err.message || 'Print error')
    }
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
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="h-13 px-4 border-b border-border bg-card flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏷️</span>
          <div>
            <h1 className="font-bold text-sm text-foreground tracking-tight">
              Jewellery Tagging, Barcode & Stock Verification
            </h1>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('TAG_PRINTING')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'TAG_PRINTING'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tag Generation & Print
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('SCANNER_LOOKUP')
              setTimeout(() => scanInputRef.current?.focus(), 100)
            }}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'SCANNER_LOOKUP'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Live Scanner & Item Lookup
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STOCK_TAKE')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'STOCK_TAKE'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Stock Take Verification
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RFID_CONSOLE')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'RFID_CONSOLE'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            RFID Reader Console
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-2.5 py-1.5 text-muted-foreground hover:text-foreground rounded-lg"
          >
            ✕
          </button>
        )}
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex justify-between items-center">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-xs font-bold">✕</button>
          </div>
        )}

        {/* 1. Tag Printing & Generation Tab */}
        {activeTab === 'TAG_PRINTING' && (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* Toolbar */}
            <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by code, barcode, item name..."
                  className="w-full h-8 px-3 text-xs bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  Selected: <strong className="text-foreground">{selectedItemIds.size}</strong> items
                </span>
                <button
                  type="button"
                  onClick={handlePrintSelected}
                  disabled={selectedItemIds.size === 0}
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  <span>🖨️</span>
                  <span>Print Jewellery Tags</span>
                </button>
              </div>
            </div>

            {/* Stock Items Table */}
            <div className="flex-1 overflow-auto border border-border rounded-xl bg-card shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={stockItems.length > 0 && selectedItemIds.size === stockItems.length}
                        onChange={selectAll}
                        className="rounded border-input"
                      />
                    </th>
                    <th className="py-2.5 px-3">Stock Code</th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Barcode</th>
                    <th className="py-2.5 px-2 text-right">Gross (g)</th>
                    <th className="py-2.5 px-2 text-right">Net (g)</th>
                    <th className="py-2.5 px-2 text-right">Fine (g)</th>
                    <th className="py-2.5 px-3 text-center">Purity</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Tag Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {stockItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className={`hover:bg-muted/30 cursor-pointer ${
                        selectedItemIds.has(item.id) ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedItemIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded border-input"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-foreground">{item.stockItemCode}</td>
                      <td className="py-2 px-3 font-semibold">{item.itemName}</td>
                      <td className="py-2 px-3 font-mono text-primary font-medium">{item.barcode || 'Unassigned'}</td>
                      <td className="py-2 px-2 text-right font-mono">{item.grossWeight.toFixed(3)}</td>
                      <td className="py-2 px-2 text-right font-mono">{item.netWeight.toFixed(3)}</td>
                      <td className="py-2 px-2 text-right font-mono">{item.fineWeight.toFixed(3)}</td>
                      <td className="py-2 px-3 text-center font-mono">{item.purityName || `${item.tunch}%`}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            item.status === 'IN_STOCK'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : item.status === 'SOLD'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-[11px] text-muted-foreground">
                        {item.tagStatus}
                      </td>
                    </tr>
                  ))}
                  {stockItems.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-muted-foreground">
                        No jewellery stock items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Live Scanner & Item Lookup Tab */}
        {activeTab === 'SCANNER_LOOKUP' && (
          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* Left Panel: Scanner Feed */}
            <div className="w-1/2 flex flex-col gap-4">
              <div className="bg-card p-4 rounded-xl border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔍</span>
                  <span className="font-bold text-xs">Barcode / QR / RFID Input Box</span>
                </div>
                <form onSubmit={handleScannerSubmit} className="flex gap-2">
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Scan barcode with USB scanner or type JWL00000001..."
                    className="flex-1 h-9 px-3 text-xs bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary font-mono"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="h-9 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 text-xs"
                  >
                    Resolve
                  </button>
                </form>
              </div>

              {/* Resolved Item Card */}
              {lastScanResult?.stockItem && (
                <div className="bg-card p-4 rounded-xl border border-border space-y-3 flex-1 overflow-auto">
                  <div className="flex justify-between items-start border-b border-border pb-2">
                    <div>
                      <h2 className="text-sm font-bold text-foreground">
                        {lastScanResult.stockItem.itemName}
                      </h2>
                      <div className="font-mono text-xs text-primary font-semibold">
                        {lastScanResult.stockItem.stockItemCode}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                        lastScanResult.stockItem.status === 'IN_STOCK'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {lastScanResult.stockItem.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Barcode:</span>
                      <span className="font-mono font-bold text-foreground">{lastScanResult.stockItem.barcode}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Gross Weight:</span>
                      <span className="font-mono font-bold text-foreground">
                        {lastScanResult.stockItem.grossWeight.toFixed(3)} g
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Net Weight:</span>
                      <span className="font-mono font-bold text-foreground">
                        {lastScanResult.stockItem.netWeight.toFixed(3)} g
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Fine Weight:</span>
                      <span className="font-mono font-bold text-foreground">
                        {lastScanResult.stockItem.fineWeight.toFixed(3)} g
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Purity / Tunch:</span>
                      <span className="font-medium text-foreground">
                        {lastScanResult.stockItem.purityName || `${lastScanResult.stockItem.tunch}%`}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Location:</span>
                      <span className="font-medium text-foreground">{lastScanResult.stockItem.location}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel: Item Lifecycle Timeline */}
            <div className="w-1/2 bg-card p-4 rounded-xl border border-border flex flex-col overflow-hidden">
              <h3 className="font-bold text-xs uppercase text-primary border-b border-border pb-2 mb-3">
                Item Identity & Lifecycle Audit Timeline {selectedTimelineItem ? `(${selectedTimelineItem.stockItemCode})` : ''}
              </h3>
              <div className="flex-1 overflow-auto space-y-3">
                {timelineEvents.map((ev, idx) => (
                  <div key={idx} className="border-l-2 border-primary/40 pl-3 py-1 space-y-0.5 text-xs">
                    <div className="flex justify-between text-muted-foreground text-[10px]">
                      <span className="font-mono">{ev.date}</span>
                      <span className="font-bold text-foreground">{ev.eventType}</span>
                    </div>
                    <div className="text-foreground">{ev.description}</div>
                  </div>
                ))}
                {timelineEvents.length === 0 && (
                  <div className="text-center text-muted-foreground text-xs py-8">
                    Scan an item to view its lifecycle history.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. Stock Take Verification Tab */}
        {activeTab === 'STOCK_TAKE' && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Session Controller */}
            <div className="bg-card p-4 rounded-xl border border-border flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Verification Session:</div>
                <div className="font-mono font-bold text-sm text-foreground">
                  {activeSessionSummary ? activeSessionSummary.session.sessionNumber : 'No Active Session'}
                </div>
              </div>

              {!activeSessionSummary ? (
                <button
                  type="button"
                  onClick={handleStartStockTake}
                  className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 text-xs"
                >
                  Start Stock Take Session
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <form onSubmit={handleStockTakeScan} className="flex gap-2">
                    <input
                      ref={stockTakeInputRef}
                      type="text"
                      value={stockTakeInput}
                      onChange={(e) => setStockTakeInput(e.target.value)}
                      placeholder="Scan tag to verify..."
                      className="h-8 px-3 text-xs bg-background border border-input rounded-lg focus:ring-1 focus:ring-primary font-mono w-60"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="h-8 px-3 bg-secondary text-secondary-foreground font-semibold rounded-lg text-xs"
                    >
                      Verify
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={handleCompleteStockTake}
                    className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs"
                  >
                    Finish Session
                  </button>
                </div>
              )}
            </div>

            {/* Counter Cards */}
            {activeSessionSummary && (
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div className="bg-muted/40 p-3 rounded-xl border border-border text-center">
                  <div className="text-muted-foreground font-semibold text-[11px]">Expected In Stock</div>
                  <div className="text-xl font-bold font-mono text-foreground mt-1">
                    {activeSessionSummary.session.totalExpected}
                  </div>
                </div>
                <div className="bg-muted/40 p-3 rounded-xl border border-border text-center">
                  <div className="text-muted-foreground font-semibold text-[11px]">Total Scanned</div>
                  <div className="text-xl font-bold font-mono text-primary mt-1">
                    {activeSessionSummary.session.totalScanned}
                  </div>
                </div>
                <div className="bg-muted/40 p-3 rounded-xl border border-border text-center">
                  <div className="text-muted-foreground font-semibold text-[11px]">Matched (Verified)</div>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {activeSessionSummary.session.totalMatched}
                  </div>
                </div>
                <div className="bg-muted/40 p-3 rounded-xl border border-border text-center">
                  <div className="text-muted-foreground font-semibold text-[11px]">Missing Items</div>
                  <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                    {activeSessionSummary.session.totalMissing}
                  </div>
                </div>
              </div>
            )}

            {/* Scans Table */}
            {activeSessionSummary && (
              <div className="flex-1 overflow-auto border border-border rounded-xl bg-card">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Tag Identifier</th>
                      <th className="py-2.5 px-3">Stock Code</th>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3 text-center">Scan Result</th>
                      <th className="py-2.5 px-3">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {activeSessionSummary.scans.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30">
                        <td className="py-2 px-3 font-mono text-[11px]">{s.scannedAt}</td>
                        <td className="py-2 px-3 font-mono font-semibold">{s.identifierValue}</td>
                        <td className="py-2 px-3 font-mono text-primary">{s.stockItemCode || '-'}</td>
                        <td className="py-2 px-3 font-semibold">{s.itemName || 'Unrecognized'}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              s.scanResult === 'MATCHED'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {s.scanResult}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{s.operator}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. RFID Console Tab */}
        {activeTab === 'RFID_CONSOLE' && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="bg-card p-4 rounded-xl border border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-foreground">RFID Antenna 1 (Connected / Ready)</span>
              </div>

              <button
                type="button"
                onClick={handleSimulateRfid}
                disabled={isRfidSimulating}
                className="h-8 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 text-xs flex items-center gap-1.5"
              >
                <span>📡</span>
                <span>Simulate RFID Tag Read</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto border border-border rounded-xl bg-card p-4 space-y-2">
              <h3 className="font-bold text-xs uppercase text-primary border-b border-border pb-2 mb-2">
                Live RFID Tag Stream
              </h3>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="py-1.5 px-2">Time</th>
                    <th className="py-1.5 px-2">EPC (Electronic Product Code)</th>
                    <th className="py-1.5 px-2 text-right">RSSI</th>
                    <th className="py-1.5 px-2">Resolved Item</th>
                  </tr>
                </thead>
                <tbody>
                  {rfidLogs.map((log, idx) => (
                    <tr key={idx} className="border-t border-border/40 hover:bg-muted/20">
                      <td className="py-1.5 px-2 font-mono text-[11px]">{log.timestamp}</td>
                      <td className="py-1.5 px-2 font-mono font-bold text-primary">{log.epc}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-muted-foreground">{log.rssi} dBm</td>
                      <td className="py-1.5 px-2 font-semibold text-foreground">{log.resolvedName || 'New / Untagged Tag'}</td>
                    </tr>
                  ))}
                  {rfidLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground text-xs">
                        Waiting for RFID reader tag events...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default JewelleryTaggingHubScreen
