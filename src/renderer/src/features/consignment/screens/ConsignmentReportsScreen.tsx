import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import type {
  ConsignmentInwardRecord,
  ConsignmentItemRecord,
  ConsignmentSettlementRecord,
  ConsignmentDashboardSummary,
  ConsignmentStatus,
  ConsignmentSettlementStatus
} from '@shared/types/consignment'
import type { SupplierRecord } from '@shared/types/supplier'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { SupplierSelector } from '../../purchases/components/SupplierSelector'
import { ConsignmentDetailScreen } from './ConsignmentDetailScreen'

export interface ConsignmentReportsScreenProps {
  onClose?: () => void
  onNavigate?: (id: string, label: string, module: 'home' | 'master' | 'transaction' | 'reports' | 'gst' | 'utility') => void
}

type ReportTab = 'REGISTER' | 'STOCK' | 'SOLD' | 'LIABILITY' | 'SETTLEMENTS'

export const ConsignmentReportsScreen: React.FC<ConsignmentReportsScreenProps> = ({
  onClose,
  onNavigate
}) => {
  // Navigation & Drilldown State
  const [drilldownInwardId, setDrilldownInwardId] = useState<string | null>(null)

  // Tab State
  const [activeTab, setActiveTab] = useState<ReportTab>('REGISTER')

  // Filter States
  const [startDate, setStartDate] = useState<string>(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [endDate, setEndDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRecord | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [liabilityOnlyPending, setLiabilityOnlyPending] = useState<boolean>(true)

  // Data States
  const [dashboard, setDashboard] = useState<ConsignmentDashboardSummary | null>(null)
  const [registerRows, setRegisterRows] = useState<ConsignmentInwardRecord[]>([])
  const [stockRows, setStockRows] = useState<ConsignmentItemRecord[]>([])
  const [soldRows, setSoldRows] = useState<ConsignmentItemRecord[]>([])
  const [settlementRows, setSettlementRows] = useState<ConsignmentSettlementRecord[]>([])

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Preset Date Range Setter
  const handleDatePreset = (preset: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_FY' | 'ALL') => {
    const today = dayjs()
    if (preset === 'TODAY') {
      const d = today.format('YYYY-MM-DD')
      setStartDate(d)
      setEndDate(d)
    } else if (preset === 'THIS_WEEK') {
      setStartDate(today.startOf('week').format('YYYY-MM-DD'))
      setEndDate(today.endOf('week').format('YYYY-MM-DD'))
    } else if (preset === 'THIS_MONTH') {
      setStartDate(today.startOf('month').format('YYYY-MM-DD'))
      setEndDate(today.endOf('month').format('YYYY-MM-DD'))
    } else if (preset === 'LAST_MONTH') {
      const lm = today.subtract(1, 'month')
      setStartDate(lm.startOf('month').format('YYYY-MM-DD'))
      setEndDate(lm.endOf('month').format('YYYY-MM-DD'))
    } else if (preset === 'THIS_FY') {
      const currentYear = today.month() >= 3 ? today.year() : today.year() - 1
      setStartDate(`${currentYear}-04-01`)
      setEndDate(`${currentYear + 1}-03-31`)
    } else if (preset === 'ALL') {
      setStartDate('')
      setEndDate('')
    }
  }

  // Load backend authoritative report data
  const loadReportData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. Fetch dashboard KPIs
      const dash = await window.api.consignment.getDashboard()
      setDashboard(dash)

      // 2. Fetch data based on active tab
      const supplierId = selectedSupplier?.id || undefined
      const search = searchQuery.trim() || undefined

      if (activeTab === 'REGISTER') {
        const rows = await window.api.consignment.listInwards({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          settlementStatus: settlementStatusFilter === 'ALL' ? undefined : settlementStatusFilter,
          supplierId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search
        })
        setRegisterRows(rows || [])
      } else if (activeTab === 'STOCK') {
        const rows = await window.api.consignment.listItems({
          status: 'IN_SHOWROOM',
          supplierId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search
        })
        setStockRows(rows || [])
      } else if (activeTab === 'SOLD') {
        const rows = await window.api.consignment.listItems({
          status: 'SOLD',
          supplierId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search
        })
        setSoldRows(rows || [])
      } else if (activeTab === 'LIABILITY') {
        // Query inwards with sold vendor liability
        const rows = await window.api.consignment.listInwards({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          settlementStatus: settlementStatusFilter === 'ALL' ? undefined : settlementStatusFilter,
          supplierId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search
        })
        setRegisterRows(rows || [])
      } else if (activeTab === 'SETTLEMENTS') {
        const rows = await window.api.consignment.getSettlements({
          supplierId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search
        })
        setSettlementRows(rows || [])
      }
    } catch (err: unknown) {
      console.error('Failed to load consignment reports:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [
    activeTab,
    startDate,
    endDate,
    selectedSupplier,
    statusFilter,
    settlementStatusFilter,
    searchQuery
  ])

  useEffect(() => {
    void loadReportData()
  }, [loadReportData])

  // Liability filtered rows (Authoritative filtering)
  const filteredLiabilityRows = useMemo(() => {
    return registerRows.filter((r) => {
      // Must have sold vendor cost recognized
      const hasRecognized = (r.totalSoldVendorCost ?? 0) > 0
      if (!hasRecognized) return false
      if (liabilityOnlyPending) {
        return (r.outstandingLiability ?? 0) > 0
      }
      return true
    })
  }, [registerRows, liabilityOnlyPending])

  // Simple CSV Export of current tab records
  const handleExportCsv = () => {
    let rows: any[] = []
    let filename = `consignment_${activeTab.toLowerCase()}_${startDate || 'all'}_to_${endDate || 'all'}.csv`

    if (activeTab === 'REGISTER') {
      rows = registerRows.map((r) => ({
        'Memo Number': r.consignmentNumber,
        'Vendor Name': r.supplierName || '',
        'Inward Date': r.inwardDate,
        'Return Due Date': r.expectedReturnDate || '',
        'Total Pieces': r.totalPieces,
        'Sold Pieces': r.soldPieces ?? 0,
        'Returned Pieces': r.returnedPieces ?? 0,
        'Total Gross Weight': r.totalGrossWeight,
        'Total Vendor Value': r.totalVendorCost,
        'Recognized Sold Cost': r.totalSoldVendorCost ?? 0,
        'Settled Amount': r.totalSettledAmount ?? 0,
        'Outstanding Liability': r.outstandingLiability ?? 0,
        'Physical Status': r.status,
        'Settlement Status': r.settlementStatus || 'UNSETTLED'
      }))
    } else if (activeTab === 'STOCK') {
      rows = stockRows.map((it) => ({
        Barcode: it.barcode || it.stockItemCode,
        'Item Name': it.itemName,
        'Vendor Code': it.vendorItemCode || '',
        'Vendor Name': it.supplierName || '',
        'Memo Number': it.consignmentNumber || '',
        'Inward Date': it.inwardDate || '',
        'Due Date': it.expectedReturnDate || '',
        Purity: it.purityName,
        Tunch: it.tunch,
        'Gross Weight': it.grossWeight,
        'Net Weight': it.netWeight,
        'Fine Weight': it.fineWeight,
        'Vendor Cost': it.vendorCost,
        'Retail Price': it.retailPrice,
        Status: it.status
      }))
    } else if (activeTab === 'SOLD') {
      rows = soldRows.map((it) => ({
        Barcode: it.barcode || it.stockItemCode,
        'Item Name': it.itemName,
        'Vendor Name': it.supplierName || '',
        'Memo Number': it.consignmentNumber || '',
        'Sale Date': it.saleDate || it.soldAt || '',
        'Sales Invoice': it.salesInvoiceNumber || '',
        'Gross Weight': it.grossWeight,
        'Net Weight': it.netWeight,
        'Recognized Vendor Cost': it.vendorCost,
        'Memo Settlement Status': it.inwardSettlementStatus || ''
      }))
    } else if (activeTab === 'LIABILITY') {
      rows = filteredLiabilityRows.map((r) => ({
        'Memo Number': r.consignmentNumber,
        'Vendor Name': r.supplierName || '',
        'Inward Date': r.inwardDate,
        'Recognized Payable': r.totalSoldVendorCost ?? 0,
        'Settled to Date': r.totalSettledAmount ?? 0,
        'Outstanding Balance': r.outstandingLiability ?? 0,
        'Settlement Status': r.settlementStatus || 'UNSETTLED',
        'Sold Pieces': r.soldPieces ?? 0
      }))
    } else if (activeTab === 'SETTLEMENTS') {
      rows = settlementRows.map((s) => ({
        'Settlement #': s.settlementNumber,
        'Settlement Date': s.settlementDate,
        'Memo Number': s.consignmentNumber || '',
        'Vendor Name': s.supplierName || '',
        'Settled Amount': s.settledAmount,
        'Payment Method': s.paymentMethod,
        'Payment Reference': s.paymentReference || '',
        'Recorded By': s.createdBy || 'Admin',
        Notes: s.notes || ''
      }))
    }

    if (rows.length === 0) return

    const headers = Object.keys(rows[0]).join(',')
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows.map((e) => Object.values(e).map((val) => `"${val}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Physical status badge renderer
  const renderPhysicalStatusBadge = (status: ConsignmentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            ACTIVE
          </span>
        )
      case 'PARTIALLY_SETTLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            PARTIAL
          </span>
        )
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            COMPLETED
          </span>
        )
      case 'CLOSED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            CLOSED
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">
            {status}
          </span>
        )
    }
  }

  // Financial settlement status badge renderer
  const renderSettlementStatusBadge = (status?: ConsignmentSettlementStatus) => {
    switch (status) {
      case 'SETTLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            SETTLED
          </span>
        )
      case 'PARTIALLY_SETTLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            PARTIALLY PAID
          </span>
        )
      case 'UNSETTLED':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            UNSETTLED
          </span>
        )
    }
  }

  // If drilling down into a specific memo detail:
  if (drilldownInwardId) {
    return (
      <ConsignmentDetailScreen
        inwardId={drilldownInwardId}
        onClose={() => {
          setDrilldownInwardId(null)
          void loadReportData()
        }}
        onNavigate={onNavigate}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* 1. Header Bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/70 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          {(onClose || onNavigate) && (
            <button
              type="button"
              onClick={() => {
                if (onClose) onClose()
                else if (onNavigate) onNavigate('consignment-hub', 'Vendor Consignment & Memo Hub', 'transaction')
              }}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg transition-colors flex items-center justify-center border border-border hover:bg-muted"
              title="Back"
            >
              ←
            </button>
          )}

          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-base shadow-sm">
            📊
          </div>

          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Vendor Consignment &amp; Memo Reports</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Authoritative vendor custody stock, POS sales, and settlement tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isLoading}
            className="h-8 px-3 text-xs bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-border"
            title="Export CSV of currently visible report records"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-8 px-3 text-xs bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-border"
            title="Print report"
          >
            <span>🖨️</span>
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={() => void loadReportData()}
            disabled={isLoading}
            className="h-8 px-3 text-xs bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors flex items-center gap-1.5 border border-border"
            title="Refresh report data"
          >
            <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
            <span>Refresh</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 text-xs text-muted-foreground hover:text-foreground rounded-lg transition-colors flex items-center justify-center ml-1"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* 2. Workspace Body */}
      <div className="flex-1 flex flex-col p-4 gap-3.5 overflow-hidden">
        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex justify-between items-center shadow-sm shrink-0">
            <span className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs font-bold px-1.5 py-0.5 rounded hover:bg-destructive/20"
            >
              ✕
            </button>
          </div>
        )}

        {/* 3. Top Authoritative KPI Summary Strip */}
        <section className="grid grid-cols-5 gap-3 shrink-0 text-xs">
          {/* Active Memos */}
          <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Consignment Memos
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-foreground">
                {dashboard?.activeConsignmentsCount ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground pt-1 border-t border-border/60 flex justify-between">
              <span>Overdue:</span>
              <span className={dashboard?.overdueMemosCount ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-foreground'}>
                {dashboard?.overdueMemosCount ?? 0} memos
              </span>
            </div>
          </div>

          {/* Showroom Custody Pieces */}
          <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Showroom Custody Stock
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {dashboard?.piecesInShowroomCount ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">Pieces</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground pt-1 border-t border-border/60 flex justify-between font-mono">
              <span>Gross Wt:</span>
              <span className="font-semibold text-foreground">
                {formatWeight(dashboard?.totalShowroomGrossWeight ?? 0)}
              </span>
            </div>
          </div>

          {/* Total Sold Pieces */}
          <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Sold Consignments (POS)
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                {dashboard?.piecesSoldTotal ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">Sold Pcs</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground pt-1 border-t border-border/60 flex justify-between font-mono">
              <span>Recognized Value:</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {formatCurrency(dashboard?.totalSoldVendorValue ?? 0)}
              </span>
            </div>
          </div>

          {/* Settled to Vendors */}
          <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Settled to Date
            </span>
            <div className="mt-1">
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(dashboard?.totalSettlementPaid ?? 0)}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground pt-1 border-t border-border/60 flex justify-between">
              <span>Returned Pcs:</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                {dashboard?.piecesReturnedTotal ?? 0} Pcs
              </span>
            </div>
          </div>

          {/* Outstanding Due to Vendors */}
          <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Outstanding Liability
            </span>
            <div className="mt-1">
              <span
                className={`text-xl font-bold font-mono ${
                  (dashboard?.totalSettlementDueToSuppliers ?? 0) > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formatCurrency(dashboard?.totalSettlementDueToSuppliers ?? 0)}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground pt-1 border-t border-border/60 truncate">
              Authoritative vendor balance due
            </div>
          </div>
        </section>

        {/* 4. Global Filter Toolbar */}
        <section className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Preset Buttons */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
              {(['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_FY', 'ALL'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleDatePreset(p)}
                  className="px-2 py-0.5 rounded text-[11px] font-medium hover:bg-background transition-colors text-foreground"
                >
                  {p === 'TODAY' && 'Today'}
                  {p === 'THIS_WEEK' && 'This Week'}
                  {p === 'THIS_MONTH' && 'This Month'}
                  {p === 'THIS_FY' && 'This FY'}
                  {p === 'ALL' && 'All Time'}
                </button>
              ))}
            </div>

            {/* Date Range Inputs with Dynamic Semantic Label */}
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-muted-foreground font-sans text-[11px]">
                {activeTab === 'SOLD'
                  ? 'Sale Date:'
                  : activeTab === 'SETTLEMENTS'
                    ? 'Settle Date:'
                    : 'Inward Date:'}
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-7 px-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-7 px-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Supplier / Vendor Filter */}
            <div className="w-56">
              <SupplierSelector
                supplier={selectedSupplier}
                onSelectSupplier={setSelectedSupplier}
              />
            </div>
            {selectedSupplier && (
              <button
                type="button"
                onClick={() => setSelectedSupplier(null)}
                className="text-[11px] text-rose-500 hover:underline font-medium"
                title="Clear selected vendor"
              >
                Clear Vendor
              </button>
            )}

            {/* Physical Status Filter (Applicable to Register & Liability) */}
            {(activeTab === 'REGISTER' || activeTab === 'LIABILITY') && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-7 text-xs bg-background border border-input rounded-lg px-2 text-foreground font-medium"
              >
                <option value="ALL">All Physical Status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PARTIALLY_SETTLED">PARTIALLY SETTLED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            )}

            {/* Settlement Status Filter */}
            {(activeTab === 'REGISTER' || activeTab === 'LIABILITY') && (
              <select
                value={settlementStatusFilter}
                onChange={(e) => setSettlementStatusFilter(e.target.value)}
                className="h-7 text-xs bg-background border border-input rounded-lg px-2 text-foreground font-medium"
              >
                <option value="ALL">All Financial Status</option>
                <option value="UNSETTLED">UNSETTLED</option>
                <option value="PARTIALLY_SETTLED">PARTIALLY PAID</option>
                <option value="SETTLED">SETTLED</option>
              </select>
            )}

            {/* Liability specific toggle */}
            {activeTab === 'LIABILITY' && (
              <label className="flex items-center gap-1 text-[11px] text-foreground font-medium cursor-pointer ml-1 select-none">
                <input
                  type="checkbox"
                  checked={liabilityOnlyPending}
                  onChange={(e) => setLiabilityOnlyPending(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Pending Balance Due Only</span>
              </label>
            )}
          </div>

          {/* Search Box */}
          <div className="w-64 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memo, barcode, vendor..."
              className="w-full h-7 pl-7 pr-3 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="absolute left-2 top-1.5 text-muted-foreground text-xs">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1 text-xs text-muted-foreground hover:text-foreground font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </section>

        {/* 5. Report Tabs Strip */}
        <div className="flex items-center border-b border-border shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('REGISTER')}
              className={`h-9 px-4 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'REGISTER'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span>📋 Consignment Register</span>
              {activeTab === 'REGISTER' && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-foreground">
                  {registerRows.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('STOCK')}
              className={`h-9 px-4 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'STOCK'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span>💎 Vendor-Owned Stock</span>
              {activeTab === 'STOCK' && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-foreground">
                  {stockRows.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SOLD')}
              className={`h-9 px-4 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'SOLD'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span>🏷️ Sold Consignments</span>
              {activeTab === 'SOLD' && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-foreground">
                  {soldRows.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('LIABILITY')}
              className={`h-9 px-4 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'LIABILITY'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span>⚖️ Outstanding Liability</span>
              {activeTab === 'LIABILITY' && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-foreground">
                  {filteredLiabilityRows.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SETTLEMENTS')}
              className={`h-9 px-4 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'SETTLEMENTS'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span>💳 Settlement History</span>
              {activeTab === 'SETTLEMENTS' && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-foreground">
                  {settlementRows.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 6. Active Report Table Container */}
        <div className="flex-1 overflow-auto border border-border rounded-xl bg-card shadow-sm">
          {/* TAB 1: CONSIGNMENT REGISTER */}
          {activeTab === 'REGISTER' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold sticky top-0 z-10 border-b border-border select-none">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Memo #</th>
                  <th className="py-2.5 px-3">Vendor / Consignor</th>
                  <th className="py-2.5 px-3">Inward Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-center">Pieces</th>
                  <th className="py-2.5 px-3 text-right">Gross Wt</th>
                  <th className="py-2.5 px-3 text-right">Memo Value</th>
                  <th className="py-2.5 px-3 text-right">Recognized Cost</th>
                  <th className="py-2.5 px-3 text-right">Settled Amount</th>
                  <th className="py-2.5 px-3 text-right">Outstanding</th>
                  <th className="py-2.5 px-3 text-center">Physical</th>
                  <th className="py-2.5 px-3 text-center">Settlement</th>
                  <th className="py-2.5 px-3 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {registerRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <span className="text-3xl">📋</span>
                        <span className="font-semibold text-foreground text-sm">
                          No consignment records found
                        </span>
                        <span className="text-xs">
                          Try adjusting your date range, status, or vendor filter.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  registerRows.map((r, idx) => {
                    const outstanding = r.outstandingLiability ?? 0
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setDrilldownInwardId(r.id)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="py-2 px-3 text-center font-mono text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-primary">
                          {r.consignmentNumber}
                        </td>
                        <td className="py-2 px-3 font-semibold text-foreground">
                          {r.supplierName || 'Unknown Vendor'}
                        </td>
                        <td className="py-2 px-3 font-mono">{formatDate(r.inwardDate)}</td>
                        <td className="py-2 px-3 font-mono text-muted-foreground">
                          {r.expectedReturnDate ? formatDate(r.expectedReturnDate) : '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-mono">
                          <span className="font-bold">{r.totalPieces}</span>
                          <span className="text-[10px] text-muted-foreground block">
                            {r.soldPieces ?? 0}s • {r.returnedPieces ?? 0}r
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium">
                          {formatWeight(r.totalGrossWeight)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-foreground">
                          {formatCurrency(r.totalVendorCost)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-purple-600 dark:text-purple-400">
                          {formatCurrency(r.totalSoldVendorCost ?? 0)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(r.totalSettledAmount ?? 0)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          <span
                            className={
                              outstanding > 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-muted-foreground'
                            }
                          >
                            {formatCurrency(outstanding)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {renderPhysicalStatusBadge(r.status)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {renderSettlementStatusBadge(r.settlementStatus)}
                        </td>
                        <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setDrilldownInwardId(r.id)}
                            className="px-2 py-0.5 text-[11px] bg-muted hover:bg-primary hover:text-primary-foreground font-semibold rounded transition-colors shadow-sm"
                          >
                            View Memo
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}

          {/* TAB 2: VENDOR-OWNED STOCK (Custody in Showroom) */}
          {activeTab === 'STOCK' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold sticky top-0 z-10 border-b border-border select-none">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Barcode / Tag</th>
                  <th className="py-2.5 px-3">Item Name / Master</th>
                  <th className="py-2.5 px-3">Vendor Code</th>
                  <th className="py-2.5 px-3">Vendor / Consignor</th>
                  <th className="py-2.5 px-3">Memo #</th>
                  <th className="py-2.5 px-3">Inward Date</th>
                  <th className="py-2.5 px-3 text-center">Purity</th>
                  <th className="py-2.5 px-3 text-right">Gross Wt</th>
                  <th className="py-2.5 px-3 text-right">Net Wt</th>
                  <th className="py-2.5 px-3 text-right">Fine Wt</th>
                  <th className="py-2.5 px-3 text-right">Vendor Agreed Cost</th>
                  <th className="py-2.5 px-3 text-right">Retail Tag Price</th>
                  <th className="py-2.5 px-3 text-center">Custody Status</th>
                  <th className="py-2.5 px-3 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {stockRows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <span className="text-3xl">💎</span>
                        <span className="font-semibold text-foreground text-sm">
                          No vendor-owned jewellery currently in showroom custody
                        </span>
                        <span className="text-xs">
                          All consignment items may be sold, returned, or no matching filters found.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  stockRows.map((it, idx) => (
                    <tr
                      key={it.id}
                      onClick={() => setDrilldownInwardId(it.consignmentInwardId)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="py-2 px-3 text-center font-mono text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-foreground">
                        {it.barcode || it.stockItemCode}
                      </td>
                      <td className="py-2 px-3 font-semibold text-foreground">{it.itemName}</td>
                      <td className="py-2 px-3 font-mono text-muted-foreground">
                        {it.vendorItemCode || '-'}
                      </td>
                      <td className="py-2 px-3 text-foreground">{it.supplierName}</td>
                      <td className="py-2 px-3 font-mono font-bold text-primary">
                        {it.consignmentNumber}
                      </td>
                      <td className="py-2 px-3 font-mono text-muted-foreground">
                        {it.inwardDate ? formatDate(it.inwardDate) : '-'}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">
                        {it.purityName} ({it.tunch}%)
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                        {formatWeight(it.grossWeight)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                        {formatWeight(it.netWeight)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                        {formatWeight(it.fineWeight)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                        {formatCurrency(it.vendorCost)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-primary">
                        {formatCurrency(it.retailPrice)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          IN SHOWROOM
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setDrilldownInwardId(it.consignmentInwardId)}
                          className="px-2 py-0.5 text-[11px] bg-muted hover:bg-primary hover:text-primary-foreground font-semibold rounded transition-colors shadow-sm"
                        >
                          View Memo
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 3: SOLD CONSIGNMENTS (Recognized Liabilities) */}
          {activeTab === 'SOLD' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold sticky top-0 z-10 border-b border-border select-none">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Barcode / Tag</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3">Vendor / Consignor</th>
                  <th className="py-2.5 px-3">Memo #</th>
                  <th className="py-2.5 px-3">POS Sale Date</th>
                  <th className="py-2.5 px-3">Sales Invoice #</th>
                  <th className="py-2.5 px-3 text-right">Gross Wt</th>
                  <th className="py-2.5 px-3 text-right">Net Wt</th>
                  <th className="py-2.5 px-3 text-right">Recognized Vendor Cost</th>
                  <th className="py-2.5 px-3 text-center">Memo Settle Status</th>
                  <th className="py-2.5 px-3 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {soldRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <span className="text-3xl">🏷️</span>
                        <span className="font-semibold text-foreground text-sm">
                          No sold consignment records found
                        </span>
                        <span className="text-xs">
                          Consignment pieces appear here automatically once sold through POS billing.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  soldRows.map((it, idx) => (
                    <tr
                      key={it.id}
                      onClick={() => setDrilldownInwardId(it.consignmentInwardId)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="py-2 px-3 text-center font-mono text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-purple-600 dark:text-purple-400">
                        {it.barcode || it.stockItemCode}
                      </td>
                      <td className="py-2 px-3 font-semibold text-foreground">{it.itemName}</td>
                      <td className="py-2 px-3 text-foreground">{it.supplierName}</td>
                      <td className="py-2 px-3 font-mono font-bold text-primary">
                        {it.consignmentNumber}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        {it.saleDate || it.soldAt ? formatDate(it.saleDate || it.soldAt!) : '-'}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-foreground">
                        {it.salesInvoiceNumber || '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        {formatWeight(it.grossWeight)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                        {formatWeight(it.netWeight)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                        {formatCurrency(it.vendorCost)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {renderSettlementStatusBadge(it.inwardSettlementStatus)}
                      </td>
                      <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setDrilldownInwardId(it.consignmentInwardId)}
                          className="px-2 py-0.5 text-[11px] bg-muted hover:bg-primary hover:text-primary-foreground font-semibold rounded transition-colors shadow-sm"
                        >
                          View Memo
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 4: OUTSTANDING VENDOR LIABILITY (Financial Tracking) */}
          {activeTab === 'LIABILITY' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold sticky top-0 z-10 border-b border-border select-none">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Memo #</th>
                  <th className="py-2.5 px-3">Vendor / Consignor</th>
                  <th className="py-2.5 px-3">Inward Date</th>
                  <th className="py-2.5 px-3 text-center">Sold Pcs</th>
                  <th className="py-2.5 px-3 text-right">Recognized Payable</th>
                  <th className="py-2.5 px-3 text-right">Settled to Date</th>
                  <th className="py-2.5 px-3 text-right">Outstanding Balance</th>
                  <th className="py-2.5 px-3 text-center">Settlement Status</th>
                  <th className="py-2.5 px-3 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLiabilityRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <span className="text-3xl">⚖️</span>
                        <span className="font-semibold text-foreground text-sm">
                          No outstanding vendor liability found
                        </span>
                        <span className="text-xs">
                          {liabilityOnlyPending
                            ? 'All sold consignment payables are currently settled.'
                            : 'No sold consignment memos match current filters.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLiabilityRows.map((r, idx) => {
                    const outstanding = r.outstandingLiability ?? 0
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setDrilldownInwardId(r.id)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="py-2 px-3 text-center font-mono text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-primary">
                          {r.consignmentNumber}
                        </td>
                        <td className="py-2 px-3 font-semibold text-foreground">
                          {r.supplierName || 'Unknown Vendor'}
                        </td>
                        <td className="py-2 px-3 font-mono">{formatDate(r.inwardDate)}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold">
                          {r.soldPieces ?? 0} Pcs
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                          {formatCurrency(r.totalSoldVendorCost ?? 0)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(r.totalSettledAmount ?? 0)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-extrabold">
                          <span
                            className={
                              outstanding > 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            {formatCurrency(outstanding)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {renderSettlementStatusBadge(r.settlementStatus)}
                        </td>
                        <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setDrilldownInwardId(r.id)}
                            className="px-2 py-0.5 text-[11px] bg-muted hover:bg-primary hover:text-primary-foreground font-semibold rounded transition-colors shadow-sm"
                          >
                            View Memo
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}

          {/* TAB 5: SETTLEMENT HISTORY (All Payments) */}
          {activeTab === 'SETTLEMENTS' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold sticky top-0 z-10 border-b border-border select-none">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Settlement #</th>
                  <th className="py-2.5 px-3">Settlement Date</th>
                  <th className="py-2.5 px-3">Consignment Memo</th>
                  <th className="py-2.5 px-3">Vendor / Consignor</th>
                  <th className="py-2.5 px-3 text-right">Settled Amount</th>
                  <th className="py-2.5 px-3 text-center">Payment Method</th>
                  <th className="py-2.5 px-3">Payment Reference</th>
                  <th className="py-2.5 px-3">Recorded By</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {settlementRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <span className="text-3xl">💳</span>
                        <span className="font-semibold text-foreground text-sm">
                          No settlement records found
                        </span>
                        <span className="text-xs">
                          Payments recorded through the vendor settlement workflow will appear here.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  settlementRows.map((s, idx) => (
                    <tr
                      key={s.id}
                      onClick={() => setDrilldownInwardId(s.consignmentInwardId)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="py-2 px-3 text-center font-mono text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-foreground">
                        {s.settlementNumber}
                      </td>
                      <td className="py-2 px-3 font-mono">{formatDate(s.settlementDate)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-primary">
                        {s.consignmentNumber}
                      </td>
                      <td className="py-2 px-3 font-semibold text-foreground">{s.supplierName}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(s.settledAmount)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-muted font-mono">
                          {s.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-muted-foreground">
                        {s.paymentReference || '-'}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{s.createdBy || 'Admin'}</td>
                      <td className="py-2 px-3 text-muted-foreground italic truncate max-w-xs">
                        {s.notes || '-'}
                      </td>
                      <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setDrilldownInwardId(s.consignmentInwardId)}
                          className="px-2 py-0.5 text-[11px] bg-muted hover:bg-primary hover:text-primary-foreground font-semibold rounded transition-colors shadow-sm"
                        >
                          View Memo
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConsignmentReportsScreen
