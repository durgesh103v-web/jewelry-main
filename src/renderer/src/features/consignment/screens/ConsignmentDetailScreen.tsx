import React, { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  ConsignmentInwardRecord,
  ConsignmentItemRecord,
  ConsignmentSettlementRecord,
  ConsignmentStatus,
  ConsignmentSettlementStatus,
  ConsignmentItemStatus
} from '@shared/types/consignment'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { VendorReturnModal } from '../components/VendorReturnModal'
import { VendorSettlementModal } from '../components/VendorSettlementModal'

export interface ConsignmentDetailScreenProps {
  inwardId: string
  onClose?: () => void
  onNavigate?: (id: string, label: string, module: 'home' | 'master' | 'transaction' | 'reports' | 'gst' | 'utility') => void
}

type ItemFilter = 'ALL' | 'IN_SHOWROOM' | 'SOLD' | 'RETURNED'
type DetailTab = 'ITEMS' | 'SETTLEMENTS'

export const ConsignmentDetailScreen: React.FC<ConsignmentDetailScreenProps> = ({
  inwardId,
  onClose,
  onNavigate
}) => {
  // Data state
  const [inward, setInward] = useState<ConsignmentInwardRecord | null>(null)
  const [settlements, setSettlements] = useState<ConsignmentSettlementRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Tab & Filters state
  const [activeTab, setActiveTab] = useState<DetailTab>('ITEMS')
  const [itemStatusFilter, setItemStatusFilter] = useState<ItemFilter>('ALL')
  const [itemSearch, setItemSearch] = useState<string>('')
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null)

  // Vendor Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false)

  // Vendor Settlement Modal State
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState<boolean>(false)

  // Fetch memo detail & settlement history
  const loadConsignmentDetail = useCallback(async () => {
    if (!inwardId) return
    setIsLoading(true)
    setError(null)
    try {
      const [inwardData, settlementsData] = await Promise.all([
        window.api.consignment.getInward(inwardId),
        window.api.consignment.getSettlements(inwardId)
      ])

      setInward(inwardData)
      setSettlements(settlementsData || [])
    } catch (err: unknown) {
      console.error('Failed to load consignment memo details:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [inwardId])

  useEffect(() => {
    void loadConsignmentDetail()
  }, [loadConsignmentDetail])

  // Copy Barcode to Clipboard
  const handleCopyBarcode = (barcode: string) => {
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(barcode)
      setCopiedBarcode(barcode)
      setTimeout(() => setCopiedBarcode(null), 2000)
    }
  }

  // Back Navigation Handler
  const handleBackToHub = () => {
    if (onClose) {
      onClose()
    } else if (onNavigate) {
      onNavigate('consignment-hub', 'Vendor Consignment & Memo Hub', 'transaction')
    }
  }

  // Filter items in the table
  const filteredItems = useMemo(() => {
    if (!inward?.items) return []
    return inward.items.filter((it: ConsignmentItemRecord) => {
      // 1. Status Filter
      if (itemStatusFilter !== 'ALL' && it.status !== itemStatusFilter) {
        return false
      }
      // 2. Search Query
      if (itemSearch.trim()) {
        const query = itemSearch.trim().toLowerCase()
        const matchBarcode = it.barcode?.toLowerCase().includes(query)
        const matchName = it.itemName?.toLowerCase().includes(query)
        const matchCode = it.itemCode?.toLowerCase().includes(query)
        const matchVendorCode = it.vendorItemCode?.toLowerCase().includes(query)
        const matchInvoice = it.salesInvoiceNumber?.toLowerCase().includes(query)
        if (!matchBarcode && !matchName && !matchCode && !matchVendorCode && !matchInvoice) {
          return false
        }
      }
      return true
    })
  }, [inward?.items, itemStatusFilter, itemSearch])

  // Item Status Counts from backend items
  const itemCounts = useMemo(() => {
    if (!inward?.items) return { total: 0, inShowroom: 0, sold: 0, returned: 0 }
    return {
      total: inward.items.length,
      inShowroom: inward.items.filter((i) => i.status === 'IN_SHOWROOM').length,
      sold: inward.items.filter((i) => i.status === 'SOLD').length,
      returned: inward.items.filter((i) => i.status === 'RETURNED').length
    }
  }, [inward?.items])

  // Status Badge Renderers
  const renderPhysicalStatusBadge = (status?: ConsignmentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            ACTIVE (IN SHOWROOM)
          </span>
        )
      case 'PARTIALLY_SETTLED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            PARTIAL
          </span>
        )
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            COMPLETED
          </span>
        )
      case 'CLOSED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20">
            CLOSED
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-muted text-muted-foreground border border-border">
            {status || 'UNKNOWN'}
          </span>
        )
    }
  }

  const renderSettlementStatusBadge = (status?: ConsignmentSettlementStatus) => {
    switch (status) {
      case 'SETTLED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            SETTLED
          </span>
        )
      case 'PARTIALLY_SETTLED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            PARTIALLY SETTLED
          </span>
        )
      case 'UNSETTLED':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            UNSETTLED
          </span>
        )
    }
  }

  const renderItemStatusBadge = (status: ConsignmentItemStatus) => {
    switch (status) {
      case 'IN_SHOWROOM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            IN SHOWROOM
          </span>
        )
      case 'SOLD':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            SOLD AT POS
          </span>
        )
      case 'RETURNED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            RETURNED TO VENDOR
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

  // 1. Loading State
  if (isLoading && !inward) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <span className="animate-spin text-3xl">⏳</span>
          <span className="text-sm font-semibold text-muted-foreground">
            Loading Consignment Memo Details...
          </span>
        </div>
      </div>
    )
  }

  // 2. Error State
  if (error && !inward) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-background text-foreground p-6">
        <div className="bg-card border border-destructive/30 rounded-2xl p-6 max-w-md w-full shadow-lg text-center space-y-4">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-base font-bold text-destructive">Failed to Load Memo Details</h2>
          <p className="text-xs text-muted-foreground">{error}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => void loadConsignmentDetail()}
              className="h-8 px-4 bg-primary text-primary-foreground font-semibold text-xs rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              Retry
            </button>
            {(onClose || onNavigate) && (
              <button
                type="button"
                onClick={handleBackToHub}
                className="h-8 px-4 bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs rounded-lg transition-colors border border-border"
              >
                Back to Hub
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 3. Not Found State
  if (!inward) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-background text-foreground p-6">
        <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-lg text-center space-y-4">
          <span className="text-3xl">📦</span>
          <h2 className="text-base font-bold text-foreground">Consignment Memo Not Found</h2>
          <p className="text-xs text-muted-foreground">
            The requested consignment memo could not be located or has been deleted.
          </p>
          {(onClose || onNavigate) && (
            <button
              type="button"
              onClick={handleBackToHub}
              className="h-8 px-4 bg-primary text-primary-foreground font-semibold text-xs rounded-lg hover:bg-primary/90 transition-colors shadow-sm mt-2"
            >
              Back to Consignment Hub
            </button>
          )}
        </div>
      </div>
    )
  }

  const isOverdue =
    inward.expectedReturnDate &&
    inward.status !== 'CLOSED' &&
    inward.status !== 'COMPLETED' &&
    inward.expectedReturnDate < new Date().toISOString().split('T')[0]

  const outstanding = inward.outstandingLiability ?? 0

  const eligibleReturnCount = useMemo(() => {
    return (inward.items || []).filter((i) => i.status === 'IN_SHOWROOM').length
  }, [inward.items])
  const canReturn = eligibleReturnCount > 0 && inward.status !== 'CLOSED'
  const canSettle =
    outstanding > 0 &&
    inward.status !== 'CLOSED' &&
    inward.settlementStatus !== 'SETTLED'

  return (
    <div className="flex-1 flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Header Bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          {(onClose || onNavigate) && (
            <button
              type="button"
              onClick={handleBackToHub}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg transition-colors flex items-center justify-center border border-border hover:bg-muted"
              title="Back to Consignment Hub"
            >
              ←
            </button>
          )}

          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-base shadow-sm">
            📋
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Consignment Memo:</span>
                <span className="font-mono text-primary font-extrabold">{inward.consignmentNumber}</span>
              </h1>
              {renderPhysicalStatusBadge(inward.status)}
              {renderSettlementStatusBadge(inward.settlementStatus)}
              {isOverdue && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  OVERDUE RETURN ⚠️
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Vendor-owned custody inventory memo and financial settlement tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canSettle && (
            <button
              type="button"
              onClick={() => setIsSettlementModalOpen(true)}
              className="h-8 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
              title="Settle outstanding vendor liability"
            >
              <span>💳</span>
              <span>Settle Vendor ({formatCurrency(outstanding)})</span>
            </button>
          )}

          {canReturn && (
            <button
              type="button"
              onClick={() => setIsReturnModalOpen(true)}
              className="h-8 px-3.5 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
              title="Return unsold pieces to vendor"
            >
              <span>↩️</span>
              <span>Return to Vendor ({eligibleReturnCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void loadConsignmentDetail()}
            disabled={isLoading}
            className="h-8 px-3 text-xs bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors flex items-center gap-1.5 border border-border"
            title="Refresh details"
          >
            <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
            <span>Refresh</span>
          </button>

          {(onClose || onNavigate) && (
            <button
              type="button"
              onClick={handleBackToHub}
              className="h-8 px-3 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              Back to Consignment Hub
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 gap-3.5 overflow-y-auto">
        {/* Error Banner if any refresh error */}
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

        {/* Top 3-Card Information Grid */}
        <section className="grid grid-cols-3 gap-3 shrink-0 text-xs">
          {/* 1. Vendor Information */}
          <div className="bg-card p-3.5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                🏢 Vendor / Consignor
              </span>
              <div className="text-sm font-bold text-foreground">{inward.supplierName || 'Unknown Vendor'}</div>
              {inward.supplierMobile && (
                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                  📞 {inward.supplierMobile}
                </div>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
              <span>Supplier ID: </span>
              <span className="font-mono">{inward.supplierId}</span>
            </div>
          </div>

          {/* 2. Memo Timing & Custody Terms */}
          <div className="bg-card p-3.5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                📅 Dates &amp; Custody Period
              </span>
              <div className="grid grid-cols-2 gap-2 mt-1 font-mono">
                <div>
                  <div className="text-[10px] text-muted-foreground">Inward Date</div>
                  <div className="font-semibold text-foreground">{formatDate(inward.inwardDate)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Return Due Date</div>
                  <div className={`font-semibold ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-foreground'}`}>
                    {inward.expectedReturnDate ? formatDate(inward.expectedReturnDate) : 'Not specified'}
                    {isOverdue && ' ⚠️'}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
              Created on <span className="font-mono">{formatDate(inward.createdAt)}</span> by {inward.createdBy || 'Admin'}
            </div>
          </div>

          {/* 3. Remarks & Terms */}
          <div className="bg-card p-3.5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                📝 Consignment Remarks / Terms
              </span>
              <p className="text-xs text-foreground italic mt-1 line-clamp-2">
                {inward.notes ? `"${inward.notes}"` : 'No special notes recorded for this consignment inward.'}
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-border/60 text-[11px] text-blue-600 dark:text-blue-400 bg-blue-500/5 px-2 py-1 rounded">
              ℹ️ Custody only. Vendor payable recognizes strictly on item sale.
            </div>
          </div>
        </section>

        {/* 4. Financial & Physical Summary KPI Cards */}
        <section className="grid grid-cols-5 gap-3 shrink-0 text-xs">
          {/* Card 1: Piece Custody Breakdown */}
          <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Piece Custody
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-foreground">{inward.totalPieces}</span>
              <span className="text-xs text-muted-foreground">Total Pcs</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/60">
              <span className="text-blue-600 dark:text-blue-400 font-semibold">{itemCounts.inShowroom} Custody</span>
              <span className="text-purple-600 dark:text-purple-400 font-semibold">{itemCounts.sold} Sold</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{itemCounts.returned} Ret</span>
            </div>
          </div>

          {/* Card 2: Total Gross Weight */}
          <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Weight
            </span>
            <div className="mt-1">
              <div className="text-xl font-bold font-mono text-foreground">
                {formatWeight(inward.totalGrossWeight)}
              </div>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground pt-1 border-t border-border/60 truncate">
              Authoritative memo gross weight
            </div>
          </div>

          {/* Card 3: Total Vendor Agreed Valuation */}
          <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Memo Vendor Value
            </span>
            <div className="mt-1">
              <div className="text-xl font-bold font-mono text-foreground">
                {formatCurrency(inward.totalVendorCost)}
              </div>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground pt-1 border-t border-border/60 truncate">
              Total consignment valuation
            </div>
          </div>

          {/* Card 4: Recognized Vendor Payable (Sold items) */}
          <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Recognized Payable (Sold)
            </span>
            <div className="mt-1">
              <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                {formatCurrency(inward.totalSoldVendorCost ?? 0)}
              </div>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground pt-1 border-t border-border/60 truncate">
              Payable from POS sales
            </div>
          </div>

          {/* Card 5: Outstanding Balance Due to Vendor */}
          <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Outstanding Due
            </span>
            <div className="mt-1">
              <div className={`text-xl font-bold font-mono ${outstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatCurrency(outstanding)}
              </div>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground pt-1 border-t border-border/60 flex justify-between">
              <span>Settled:</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(inward.totalSettledAmount ?? 0)}
              </span>
            </div>
          </div>
        </section>

        {/* 5. Tabs Header */}
        <div className="flex items-center justify-between border-b border-border pt-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('ITEMS')}
              className={`h-9 px-4 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'ITEMS'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span>💎 Physical Jewellery Pieces</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-foreground">
                {inward.items?.length ?? 0}
              </span>
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
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-muted text-foreground">
                {settlements.length}
              </span>
            </button>
          </div>

          {/* Copy feedback badge */}
          {copiedBarcode && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
              ✓ Barcode {copiedBarcode} copied to clipboard
            </span>
          )}
        </div>

        {/* Tab 1: Physical Jewellery Pieces Table */}
        {activeTab === 'ITEMS' && (
          <section className="flex-1 flex flex-col gap-2.5 min-h-[300px]">
            {/* Filter and Search Bar */}
            <div className="flex items-center justify-between gap-3 text-xs">
              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border shrink-0">
                {(['ALL', 'IN_SHOWROOM', 'SOLD', 'RETURNED'] as ItemFilter[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setItemStatusFilter(st)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      itemStatusFilter === st
                        ? 'bg-card text-foreground font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {st === 'ALL' && `All Pieces (${itemCounts.total})`}
                    {st === 'IN_SHOWROOM' && `In Showroom (${itemCounts.inShowroom})`}
                    {st === 'SOLD' && `Sold (${itemCounts.sold})`}
                    {st === 'RETURNED' && `Returned (${itemCounts.returned})`}
                  </button>
                ))}
              </div>

              {/* Search Bar & Return Action */}
              <div className="flex items-center gap-2">
                {canReturn && (
                  <button
                    type="button"
                    onClick={() => setIsReturnModalOpen(true)}
                    className="h-8 px-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                    title="Return unsold pieces to vendor"
                  >
                    <span>↩️</span>
                    <span>Return Unsold Pieces ({eligibleReturnCount})</span>
                  </button>
                )}

                <div className="w-80 relative">
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search barcode, design, vendor code, invoice..."
                    className="w-full h-8 pl-8 pr-3 bg-card border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="absolute left-2.5 top-2 text-muted-foreground text-xs">🔍</span>
                  {itemSearch && (
                    <button
                      type="button"
                      onClick={() => setItemSearch('')}
                      className="absolute right-2.5 top-1.5 text-xs text-muted-foreground hover:text-foreground font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto border border-border rounded-xl bg-card shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border select-none">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Barcode / Tag</th>
                    <th className="py-2.5 px-3">Item Design / Master</th>
                    <th className="py-2.5 px-3">Vendor Code</th>
                    <th className="py-2.5 px-2 text-center">Purity</th>
                    <th className="py-2.5 px-3 text-right">Gross Wt</th>
                    <th className="py-2.5 px-3 text-right">Net Wt</th>
                    <th className="py-2.5 px-3 text-right">Fine Wt</th>
                    <th className="py-2.5 px-3 text-right">Vendor Cost</th>
                    <th className="py-2.5 px-3 text-right">Retail Tag Price</th>
                    <th className="py-2.5 px-3 text-center">Custody Status</th>
                    <th className="py-2.5 px-3">POS Sale Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-16 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <span className="text-3xl">🔍</span>
                          <span className="font-semibold text-foreground text-sm">
                            No consignment pieces match the selected filter
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {itemSearch ? 'Try clearing your search term.' : 'No pieces found in this status category.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item: ConsignmentItemRecord, idx: number) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 text-center font-mono text-muted-foreground">
                          {idx + 1}
                        </td>

                        {/* Barcode & Tag with Copy Action */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-foreground">
                              {item.barcode || item.stockItemCode || '-'}
                            </span>
                            {item.barcode && (
                              <button
                                type="button"
                                onClick={() => handleCopyBarcode(item.barcode!)}
                                className="h-5 w-5 text-muted-foreground hover:text-primary hover:bg-muted rounded flex items-center justify-center transition-colors"
                                title="Copy barcode"
                              >
                                📋
                              </button>
                            )}
                          </div>
                          {item.stockItemCode && item.stockItemCode !== item.barcode && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Tag: {item.stockItemCode}
                            </div>
                          )}
                        </td>

                        {/* Item Design */}
                        <td className="py-2 px-3">
                          <div className="font-semibold text-foreground">
                            {item.itemName || 'Jewellery Item'}
                          </div>
                          {item.itemCode && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Master Code: {item.itemCode}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-[10px] text-muted-foreground italic mt-0.5">
                              {item.notes}
                            </div>
                          )}
                        </td>

                        {/* Vendor Code */}
                        <td className="py-2 px-3 font-mono text-muted-foreground">
                          {item.vendorItemCode || '-'}
                        </td>

                        {/* Purity */}
                        <td className="py-2 px-2 text-center font-mono font-medium">
                          {item.purityName} ({item.tunch}%)
                        </td>

                        {/* Weights */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                          {formatWeight(item.grossWeight)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                          {formatWeight(item.netWeight)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                          {formatWeight(item.fineWeight)}
                        </td>

                        {/* Vendor Cost */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                          {formatCurrency(item.vendorCost)}
                        </td>

                        {/* Retail Tag Price */}
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                          {item.retailPrice ? formatCurrency(item.retailPrice) : '-'}
                        </td>

                        {/* Physical Custody Status */}
                        <td className="py-2 px-3 text-center">
                          {renderItemStatusBadge(item.status)}
                        </td>

                        {/* POS Sale Reference */}
                        <td className="py-2 px-3">
                          {item.status === 'SOLD' ? (
                            <div>
                              <div className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                {item.salesInvoiceNumber ? `Invoice #${item.salesInvoiceNumber}` : 'Sold (POS)'}
                              </div>
                              {item.soldAt && (
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {formatDate(item.soldAt)}
                                </div>
                              )}
                            </div>
                          ) : item.status === 'RETURNED' ? (
                            <div className="text-amber-600 dark:text-amber-400 font-medium">
                              Returned to Supplier
                              {item.returnedAt && (
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {formatDate(item.returnedAt)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground font-mono">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tab 2: Settlement History */}
        {activeTab === 'SETTLEMENTS' && (
          <section className="flex-1 flex flex-col gap-3 min-h-[300px]">
            {/* Settlement Summary Banner */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between text-xs">
              <div>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <span>Vendor Payable Settlement Status:</span>
                  {renderSettlementStatusBadge(inward.settlementStatus)}
                </h3>
                <p className="text-muted-foreground mt-0.5">
                  Consignment payables are recognized upon POS sale of items and settled through canonical accounting payments.
                </p>
              </div>

              <div className="flex items-center gap-6 font-mono">
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block">Recognized Payable</span>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(inward.totalSoldVendorCost ?? 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block">Settled to Date</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(inward.totalSettledAmount ?? 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block">Outstanding Balance</span>
                  <span className={`text-sm font-bold ${outstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                    {formatCurrency(outstanding)}
                  </span>
                </div>
                {canSettle && (
                  <button
                    type="button"
                    onClick={() => setIsSettlementModalOpen(true)}
                    className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 shrink-0"
                    title="Open settlement form"
                  >
                    <span>💳</span>
                    <span>Record Settlement</span>
                  </button>
                )}
              </div>
            </div>

            {/* Settlement Records Table */}
            <div className="flex-1 overflow-auto border border-border rounded-xl bg-card shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border select-none">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Settlement #</th>
                    <th className="py-2.5 px-3">Settlement Date</th>
                    <th className="py-2.5 px-3 text-right">Settled Amount</th>
                    <th className="py-2.5 px-3 text-center">Payment Mode</th>
                    <th className="py-2.5 px-3">Reference / Txn ID</th>
                    <th className="py-2.5 px-3">Recorded By</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {settlements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <span className="text-3xl">💳</span>
                          <span className="font-semibold text-foreground text-sm">
                            No settlement payments recorded yet
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Settlements will be recorded via the settlement workflow once consignment items are sold.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    settlements.map((st: ConsignmentSettlementRecord, idx: number) => (
                      <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 text-center font-mono text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-foreground">
                          {st.settlementNumber}
                        </td>
                        <td className="py-2 px-3 font-mono">
                          {formatDate(st.settlementDate)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(st.settledAmount)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-muted font-mono">
                            {st.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-muted-foreground">
                          {st.paymentReference || '-'}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {st.createdBy || 'Admin'}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground italic">
                          {st.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* 6. Vendor Return Modal */}
      {isReturnModalOpen && inward && (
        <VendorReturnModal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          inward={inward}
          onReturnSuccess={async () => {
            await loadConsignmentDetail()
          }}
        />
      )}

      {/* 7. Vendor Settlement Modal */}
      {isSettlementModalOpen && inward && (
        <VendorSettlementModal
          isOpen={isSettlementModalOpen}
          onClose={() => setIsSettlementModalOpen(false)}
          inward={inward}
          onSettlementSuccess={async () => {
            await loadConsignmentDetail()
          }}
        />
      )}
    </div>
  )
}

export default ConsignmentDetailScreen
