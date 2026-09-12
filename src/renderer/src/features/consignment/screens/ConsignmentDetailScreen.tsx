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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  ACTIVE: { label: 'Active In Showroom', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  PARTIALLY_SETTLED: { label: 'Partially Settled', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CLOSED: { label: 'Closed / Returned', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' }
}

const SETTLEMENT_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  UNSETTLED: { label: 'Unsettled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  PARTIALLY_SETTLED: { label: 'Partially Paid', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  SETTLED: { label: 'Fully Settled', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
}

const ITEM_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  IN_SHOWROOM: { label: 'In Showroom', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  SOLD: { label: 'Sold at POS', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  RETURNED: { label: 'Returned to Vendor', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
}

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
    const key = status || 'ACTIVE'
    const cfg = STATUS_CONFIG[key] || {
      label: key,
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
        {cfg.label}
      </span>
    )
  }

  const renderSettlementStatusBadge = (status?: ConsignmentSettlementStatus) => {
    const key = status || 'UNSETTLED'
    const cfg = SETTLEMENT_CONFIG[key] || {
      label: key,
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
        {cfg.label}
      </span>
    )
  }

  const renderItemStatusBadge = (status: ConsignmentItemStatus) => {
    const cfg = ITEM_STATUS_CONFIG[status] || {
      label: status,
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200'
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
        {cfg.label}
      </span>
    )
  }

  // 1. Loading State
  if (isLoading && !inward) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[var(--color-background-app,#f8fafc)] text-slate-900">
        <div className="flex flex-col items-center gap-3">
          <span className="animate-spin text-3xl">⏳</span>
          <span className="text-sm font-semibold text-slate-500">
            Loading Consignment Memo Details...
          </span>
        </div>
      </div>
    )
  }

  // 2. Error State
  if (error && !inward) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[var(--color-background-app,#f8fafc)] text-slate-900 p-6">
        <div className="bg-white border border-rose-200 rounded-2xl p-6 max-w-md w-full shadow-2xs text-center space-y-4">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-base font-bold text-rose-700">Failed to Load Memo Details</h2>
          <p className="text-xs text-slate-500">{error}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => void loadConsignmentDetail()}
              className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold text-xs rounded-lg shadow-2xs cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              Retry
            </button>
            {(onClose || onNavigate) && (
              <button
                type="button"
                onClick={handleBackToHub}
                className="h-8 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 shadow-2xs cursor-pointer"
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
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[var(--color-background-app,#f8fafc)] text-slate-900 p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xs text-center space-y-4">
          <span className="text-3xl">📦</span>
          <h2 className="text-base font-bold text-slate-900">Consignment Memo Not Found</h2>
          <p className="text-xs text-slate-500">
            The requested consignment memo could not be located or has been deleted.
          </p>
          {(onClose || onNavigate) && (
            <button
              type="button"
              onClick={handleBackToHub}
              className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold text-xs rounded-lg shadow-2xs cursor-pointer mt-2"
              style={{ color: '#ffffff' }}
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

  const eligibleReturnCount = (inward.items || []).filter((i) => i.status === 'IN_SHOWROOM').length
  const canReturn = eligibleReturnCount > 0 && inward.status !== 'CLOSED'
  const canSettle =
    outstanding > 0 &&
    inward.status !== 'CLOSED' &&
    inward.settlementStatus !== 'SETTLED'

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-app,#f8fafc)] text-slate-900 overflow-hidden select-none font-sans">
      {/* Header Bar */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-3 shadow-2xs shrink-0">
        <div className="flex items-center gap-3">
          {(onClose || onNavigate) && (
            <button
              type="button"
              onClick={handleBackToHub}
              className="h-8 w-8 text-slate-500 hover:text-slate-800 rounded-lg transition-colors flex items-center justify-center border border-slate-300 hover:bg-slate-50 cursor-pointer shadow-2xs font-bold"
              title="Back to Consignment Hub"
            >
              ←
            </button>
          )}

          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold text-base shadow-2xs">
            📋
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>Consignment Memo:</span>
                <span className="font-bold text-slate-900">{inward.consignmentNumber}</span>
              </h1>
              {renderPhysicalStatusBadge(inward.status)}
              {renderSettlementStatusBadge(inward.settlementStatus)}
              {isOverdue && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                  OVERDUE RETURN ⚠️
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Vendor-owned custody inventory memo and financial settlement tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {canSettle && (
            <button
              type="button"
              onClick={() => setIsSettlementModalOpen(true)}
              className="h-8 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 !text-white font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
              style={{ color: '#ffffff' }}
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
              className="h-8 px-3.5 text-xs bg-amber-500 hover:bg-amber-600 !text-white font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
              style={{ color: '#ffffff' }}
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
            className="h-8 px-3 text-xs bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-300 shadow-2xs cursor-pointer"
            title="Refresh details"
          >
            <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
            <span>Reload</span>
          </button>

          {(onClose || onNavigate) && (
            <button
              type="button"
              onClick={handleBackToHub}
              className="h-8 px-3.5 text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg shadow-2xs cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              Back to Hub
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 gap-3.5 overflow-y-auto">
        {/* Error Banner if any refresh error */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex justify-between items-center shadow-2xs shrink-0">
            <span className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs font-bold px-1.5 py-0.5 rounded hover:bg-rose-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top 3-Card Information Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0 text-xs">
          {/* 1. Vendor Information */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                🏢 Vendor / Consignor
              </span>
              <div className="text-sm font-bold text-slate-900">{inward.supplierName || 'Unknown Vendor'}</div>
              {inward.supplierMobile && (
                <div className="text-xs text-slate-600 font-medium mt-0.5">
                  📞 {inward.supplierMobile}
                </div>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <span>Supplier ID: </span>
              <span className="font-semibold text-slate-700">{inward.supplierId}</span>
            </div>
          </div>

          {/* 2. Memo Timing & Custody Terms */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                📅 Dates &amp; Custody Period
              </span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <div className="text-[10px] text-slate-500">Inward Date</div>
                  <div className="font-semibold text-slate-900">{formatDate(inward.inwardDate)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Return Due Date</div>
                  <div className={`font-semibold ${isOverdue ? 'text-rose-700 font-bold' : 'text-slate-900'}`}>
                    {inward.expectedReturnDate ? formatDate(inward.expectedReturnDate) : 'Not specified'}
                    {isOverdue && ' ⚠️'}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              Created on <span className="font-semibold text-slate-700">{formatDate(inward.createdAt)}</span> by {inward.createdBy || 'Admin'}
            </div>
          </div>

          {/* 3. Remarks & Terms */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                📝 Consignment Remarks / Terms
              </span>
              <p className="text-xs text-slate-800 italic mt-1 line-clamp-2">
                {inward.notes ? `"${inward.notes}"` : 'No special notes recorded for this consignment inward.'}
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">
              ℹ️ Custody only. Vendor payable recognizes strictly on item sale.
            </div>
          </div>
        </section>

        {/* 4. Financial & Physical Summary KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shrink-0 text-xs">
          {/* Card 1: Piece Custody Breakdown */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Piece Custody
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-slate-900">{inward.totalPieces}</span>
              <span className="text-xs text-slate-500 font-medium">Total Pcs</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100 font-medium">
              <span className="text-blue-700 font-bold">{itemCounts.inShowroom} Showroom</span>
              <span className="text-purple-700 font-bold">{itemCounts.sold} Sold</span>
              <span className="text-amber-700 font-bold">{itemCounts.returned} Ret</span>
            </div>
          </div>

          {/* Card 2: Total Gross Weight */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Weight
            </span>
            <div className="mt-1">
              <div className="text-xl font-extrabold text-slate-900">
                {formatWeight(inward.totalGrossWeight)}
              </div>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100 truncate">
              Memo gross weight
            </div>
          </div>

          {/* Card 3: Total Vendor Agreed Valuation */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Memo Vendor Value
            </span>
            <div className="mt-1">
              <div className="text-xl font-extrabold text-slate-900">
                {formatCurrency(inward.totalVendorCost)}
              </div>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100 truncate">
              Total consignment valuation
            </div>
          </div>

          {/* Card 4: Recognized Vendor Payable (Sold items) */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Recognized Payable (Sold)
            </span>
            <div className="mt-1">
              <div className="text-xl font-extrabold text-purple-700">
                {formatCurrency(inward.totalSoldVendorCost ?? 0)}
              </div>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100 truncate">
              Payable from POS sales
            </div>
          </div>

          {/* Card 5: Outstanding Balance Due to Vendor */}
          <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider">
              Outstanding Due
            </span>
            <div className="mt-1">
              <div className={`text-xl font-black ${outstanding > 0 ? 'text-rose-900' : 'text-emerald-700'}`}>
                {formatCurrency(outstanding)}
              </div>
            </div>
            <div className="mt-1 text-[11px] text-rose-800 pt-1 border-t border-rose-200 flex justify-between font-medium">
              <span>Settled:</span>
              <span className="font-bold text-emerald-800">
                {formatCurrency(inward.totalSettledAmount ?? 0)}
              </span>
            </div>
          </div>
        </section>

        {/* 5. Tabs Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pt-1">
          <div className="flex items-center gap-1.5 pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('ITEMS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'ITEMS'
                  ? 'bg-amber-500 !text-white shadow-2xs font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>💎 Physical Jewellery Pieces</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'ITEMS' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {inward.items?.length ?? 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SETTLEMENTS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'SETTLEMENTS'
                  ? 'bg-amber-500 !text-white shadow-2xs font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>💳 Settlement History</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'SETTLEMENTS' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {settlements.length}
              </span>
            </button>
          </div>

          {/* Copy feedback badge */}
          {copiedBarcode && (
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ✓ Barcode {copiedBarcode} copied to clipboard
            </span>
          )}
        </div>

        {/* Tab 1: Physical Jewellery Pieces Table */}
        {activeTab === 'ITEMS' && (
          <section className="flex-1 flex flex-col gap-2.5 min-h-[300px]">
            {/* Filter and Search Bar */}
            <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5">
                {(['ALL', 'IN_SHOWROOM', 'SOLD', 'RETURNED'] as ItemFilter[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setItemStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      itemStatusFilter === st
                        ? 'bg-amber-500 !text-white shadow-2xs font-bold'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
                    className="h-8 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
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
                    className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500 font-medium"
                  />
                  {itemSearch && (
                    <button
                      type="button"
                      onClick={() => setItemSearch('')}
                      className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 text-slate-700 uppercase text-[11px] font-extrabold sticky top-0 z-10 border-b border-slate-200 tracking-tight">
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
                    <th className="py-2.5 px-3 text-right">Retail Price</th>
                    <th className="py-2.5 px-3 text-center">Custody Status</th>
                    <th className="py-2.5 px-3">POS Sale Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <span className="text-3xl">🔍</span>
                          <span className="font-semibold text-slate-800 text-sm">
                            No consignment pieces match the selected filter
                          </span>
                          <span className="text-xs text-slate-500">
                            {itemSearch ? 'Try clearing your search term.' : 'No pieces found in this status category.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item: ConsignmentItemRecord, idx: number) => (
                      <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-2 px-3 text-center text-slate-500">
                          {idx + 1}
                        </td>

                        {/* Barcode & Tag with Copy Action */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">
                              {item.barcode || item.stockItemCode || '-'}
                            </span>
                            {item.barcode && (
                              <button
                                type="button"
                                onClick={() => handleCopyBarcode(item.barcode!)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                                title="Copy barcode"
                              >
                                📋
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Item Design / Master */}
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900">{item.itemName}</div>
                          {item.itemCode && (
                            <div className="text-[11px] text-slate-500">
                              {item.itemCode}
                            </div>
                          )}
                        </td>

                        {/* Vendor Code */}
                        <td className="py-2 px-3 text-slate-700 font-medium">
                          {item.vendorItemCode || '-'}
                        </td>

                        {/* Purity */}
                        <td className="py-2 px-2 text-center text-slate-700 font-medium">
                          {item.purityName}
                        </td>

                        {/* Weights */}
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {formatWeight(item.grossWeight)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700">
                          {formatWeight(item.netWeight)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700">
                          {formatWeight(item.fineWeight)}
                        </td>

                        {/* Vendor Cost */}
                        <td className="py-2 px-3 text-right font-semibold text-slate-900">
                          {formatCurrency(item.vendorCost)}
                        </td>

                        {/* Retail Tag Price */}
                        <td className="py-2 px-3 text-right text-slate-700 font-medium">
                          {item.retailPrice ? formatCurrency(item.retailPrice) : '-'}
                        </td>

                        {/* Custody Status */}
                        <td className="py-2 px-3 text-center">
                          {renderItemStatusBadge(item.status)}
                        </td>

                        {/* POS Sale Reference */}
                        <td className="py-2 px-3 text-[11px]">
                          {item.status === 'SOLD' ? (
                            <div>
                              <div className="font-bold text-purple-700">
                                {item.salesInvoiceNumber || 'POS Sold'}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {item.soldAt ? formatDate(item.soldAt) : 'Sold'}
                              </div>
                            </div>
                          ) : item.status === 'RETURNED' ? (
                            <div className="text-amber-800 font-medium">
                              Returned on {item.returnedAt ? formatDate(item.returnedAt) : '-'}
                            </div>
                          ) : (
                            <span className="text-slate-400">In Showroom</span>
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
          <section className="flex-1 flex flex-col gap-2.5 min-h-[300px]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">
                Payment &amp; Settlement Vouchers ({settlements.length})
              </span>

              {canSettle && (
                <button
                  type="button"
                  onClick={() => setIsSettlementModalOpen(true)}
                  className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 !text-white font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  style={{ color: '#ffffff' }}
                >
                  <span>💳</span>
                  <span>Record Supplier Payment</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 text-slate-700 uppercase text-[11px] font-extrabold sticky top-0 z-10 border-b border-slate-200 tracking-tight">
                  <tr>
                    <th className="py-2.5 px-3">Voucher #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Payment Method</th>
                    <th className="py-2.5 px-3">Reference / UTR</th>
                    <th className="py-2.5 px-3 text-right">Settled Amount</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-3">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {settlements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <span className="text-3xl">💳</span>
                          <span className="font-semibold text-slate-800 text-sm">
                            No supplier settlement payments recorded yet
                          </span>
                          <span className="text-xs text-slate-500">
                            When pieces from this memo are sold at POS, payments to the vendor are logged here.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    settlements.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {st.settlementNumber}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {formatDate(st.settlementDate)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {st.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {st.paymentReference || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {formatCurrency(st.settledAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 italic">
                          {st.notes || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {st.createdBy || 'Admin'}
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

      {/* Modals */}
      {inward && (
        <>
          <VendorReturnModal
            isOpen={isReturnModalOpen}
            onClose={() => setIsReturnModalOpen(false)}
            inward={inward}
            onReturnSuccess={() => void loadConsignmentDetail()}
          />

          <VendorSettlementModal
            isOpen={isSettlementModalOpen}
            onClose={() => setIsSettlementModalOpen(false)}
            inward={inward}
            onSettlementSuccess={() => void loadConsignmentDetail()}
          />
        </>
      )}
    </div>
  )
}

export default ConsignmentDetailScreen
