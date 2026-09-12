import React, { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  ConsignmentInwardRecord,
  ConsignmentDashboardSummary,
  ConsignmentStatus,
  ConsignmentSettlementStatus
} from '@shared/types/consignment'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

import { ConsignmentInwardScreen } from './ConsignmentInwardScreen'
import { ConsignmentDetailScreen } from './ConsignmentDetailScreen'
import { ConsignmentReportsScreen } from './ConsignmentReportsScreen'

export interface ConsignmentHubScreenProps {
  onClose?: () => void
  onNavigate?: (id: string, label: string, module: 'home' | 'master' | 'transaction' | 'reports' | 'gst' | 'utility') => void
}

type TabFilter = 'ALL' | 'ACTIVE' | 'PARTIALLY_SETTLED' | 'COMPLETED' | 'CLOSED'

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

export const ConsignmentHubScreen: React.FC<ConsignmentHubScreenProps> = ({
  onClose,
  onNavigate
}) => {
  // Navigation View State
  const [currentView, setCurrentView] = useState<'HUB' | 'INWARD' | 'DETAIL' | 'REPORTS'>('HUB')

  // State
  const [inwards, setInwards] = useState<ConsignmentInwardRecord[]>([])
  const [dashboard, setDashboard] = useState<ConsignmentDashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Filters
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [settlementFilter, setSettlementFilter] = useState<string>('ALL')

  // Selected Inward for Detail View
  const [selectedInwardId, setSelectedInwardId] = useState<string | null>(null)

  // Load dashboard & consignment list
  const loadConsignmentData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [dash, list] = await Promise.all([
        window.api.consignment.getDashboard(),
        window.api.consignment.listInwards({
          status: activeTab === 'ALL' ? undefined : activeTab,
          search: searchQuery.trim() || undefined
        })
      ])
      setDashboard(dash)
      setInwards(list || [])
    } catch (err: unknown) {
      console.error('Error fetching consignment data:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, searchQuery])

  useEffect(() => {
    void loadConsignmentData()
  }, [loadConsignmentData])

  // Filter inwards client-side for secondary filters like settlement status
  const filteredInwards = useMemo(() => {
    return inwards.filter((item) => {
      if (settlementFilter !== 'ALL' && item.settlementStatus !== settlementFilter) {
        return false
      }
      return true
    })
  }, [inwards, settlementFilter])

  // Handle Opening Detail View
  const handleOpenDetails = (id: string) => {
    setSelectedInwardId(id)
    setCurrentView('DETAIL')
  }

  // Physical status badge renderer
  const renderPhysicalStatusBadge = (status: ConsignmentStatus) => {
    const cfg = STATUS_CONFIG[status] || {
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

  // Financial settlement status badge renderer
  const renderSettlementStatusBadge = (status?: ConsignmentSettlementStatus) => {
    const key = status || 'UNSETTLED'
    const cfg = SETTLEMENT_CONFIG[key] || {
      label: key,
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

  if (currentView === 'INWARD') {
    return (
      <ConsignmentInwardScreen
        onClose={() => {
          setCurrentView('HUB')
          void loadConsignmentData()
        }}
        onSuccess={() => {
          void loadConsignmentData()
        }}
        onViewMemo={(memoId) => {
          setSelectedInwardId(memoId)
          setCurrentView('DETAIL')
          void loadConsignmentData()
        }}
        onNavigate={onNavigate}
      />
    )
  }

  if (currentView === 'DETAIL' && selectedInwardId) {
    return (
      <ConsignmentDetailScreen
        inwardId={selectedInwardId}
        onClose={() => {
          setCurrentView('HUB')
          setSelectedInwardId(null)
          void loadConsignmentData()
        }}
        onNavigate={onNavigate}
      />
    )
  }

  if (currentView === 'REPORTS') {
    return (
      <ConsignmentReportsScreen
        onClose={() => {
          setCurrentView('HUB')
          void loadConsignmentData()
        }}
        onNavigate={onNavigate}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-app,#f8fafc)] text-slate-900 overflow-hidden select-none font-sans">
      {/* 1. Header Bar */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-3 shadow-2xs shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">💎</span>
            <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Vendor Consignment &amp; Memo Hub</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono font-bold">
                MEMO DESK
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Vendor-owned showroom stock custody, POS sales recognition, and supplier settlements
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (onNavigate) {
                onNavigate('consignment-reports', 'Vendor Consignment & Memo Reports', 'reports')
              } else {
                setCurrentView('REPORTS')
              }
            }}
            className="h-8 px-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Consignment Reports & Analytics"
          >
            <span>📊</span>
            <span>Reports</span>
          </button>

          <button
            type="button"
            onClick={() => void loadConsignmentData()}
            disabled={isLoading}
            className="h-8 px-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Refresh data"
          >
            <svg
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-500' : 'text-slate-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reload</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('INWARD')}
            className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            style={{ color: '#ffffff' }}
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="!text-white font-bold" style={{ color: '#ffffff' }}>New Consignment Inward</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              title="Close Tab"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 flex flex-col min-h-0">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs">
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-emerald-700 hover:bg-emerald-100 px-2 py-0.5 rounded font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs">
            <span className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadConsignmentData()}
                className="underline font-semibold hover:opacity-80 text-xs"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-xs font-bold px-1.5 py-0.5 rounded hover:bg-rose-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 2. KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          {/* Card 1: Active Memos */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active Consignment Memos
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-slate-900">
                {isLoading && !dashboard ? '...' : dashboard?.activeConsignmentsCount ?? 0}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">inward batches</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Overdue return:</span>
              <span
                className={`font-semibold ${
                  (dashboard?.overdueMemosCount ?? 0) > 0
                    ? 'text-rose-600 font-bold'
                    : 'text-slate-500'
                }`}
              >
                {dashboard?.overdueMemosCount ?? 0} Memos
              </span>
            </div>
          </div>

          {/* Card 2: Showroom Custody */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Showroom Custody Stock
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-emerald-700">
                {isLoading && !dashboard ? '...' : `${dashboard?.piecesInShowroomCount ?? 0} Pcs`}
              </span>
              <span className="text-xs text-slate-600 font-semibold">
                {formatWeight(dashboard?.totalShowroomGrossWeight ?? 0)}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Vendor Valuation:</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(dashboard?.totalShowroomVendorValue ?? 0)}
              </span>
            </div>
          </div>

          {/* Card 3: Sold Pieces */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Sold Pieces &amp; Cost
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-purple-700">
                {isLoading && !dashboard ? '...' : `${dashboard?.piecesSoldTotal ?? 0} Sold`}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                ({dashboard?.piecesReturnedTotal ?? 0} returned)
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Recognized Cost:</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(dashboard?.totalSoldVendorValue ?? 0)}
              </span>
            </div>
          </div>

          {/* Card 4: Outstanding Vendor Due */}
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/70 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">
              Outstanding Vendor Liability
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black text-rose-900">
                {isLoading && !dashboard
                  ? '...'
                  : formatCurrency(dashboard?.totalSettlementDueToSuppliers ?? 0)}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-rose-800 flex items-center justify-between font-medium">
              <span>Settled Paid:</span>
              <span className="font-bold text-emerald-800">
                {formatCurrency(dashboard?.totalSettlementPaid ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Filter & Search Toolbar */}
        <div className="flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {(
              [
                { key: 'ALL', label: 'All Memos' },
                { key: 'ACTIVE', label: 'Active In Showroom' },
                { key: 'PARTIALLY_SETTLED', label: 'Partially Settled' },
                { key: 'COMPLETED', label: 'Completed' },
                { key: 'CLOSED', label: 'Closed' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-amber-500 !text-white shadow-2xs font-bold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memo #, supplier, phone..."
                className="w-64 h-8 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-700 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium text-xs">Settlement:</span>
              <select
                value={settlementFilter}
                onChange={(e) => setSettlementFilter(e.target.value)}
                className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500"
              >
                <option value="ALL">All Settlement States</option>
                <option value="UNSETTLED">Unsettled Only</option>
                <option value="PARTIALLY_SETTLED">Partially Paid Only</option>
                <option value="SETTLED">Fully Settled Only</option>
              </select>
            </div>

            {(searchQuery || settlementFilter !== 'ALL' || activeTab !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSettlementFilter('ALL')
                  setActiveTab('ALL')
                }}
                className="h-8 px-2.5 text-xs bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-300 font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* 4. Consignment Register Table */}
        <div className="flex-1 flex flex-col min-h-0 border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 uppercase text-[11px] font-extrabold sticky top-0 z-10 border-b border-slate-200 tracking-tight">
                <tr>
                  <th className="py-2.5 px-3">Memo No.</th>
                  <th className="py-2.5 px-3">Vendor / Supplier</th>
                  <th className="py-2.5 px-3 text-center">Inward Date</th>
                  <th className="py-2.5 px-3 text-center">Return Due</th>
                  <th className="py-2.5 px-3 text-center">Pcs &amp; Weight</th>
                  <th className="py-2.5 px-3 text-right">Vendor Value</th>
                  <th className="py-2.5 px-3 text-right">Sold Cost</th>
                  <th className="py-2.5 px-3 text-right">Settled</th>
                  <th className="py-2.5 px-3 text-right">Outstanding Due</th>
                  <th className="py-2.5 px-3 text-center">Settlement Status</th>
                  <th className="py-2.5 px-3 text-center">Memo Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && inwards.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="animate-spin text-xl">⏳</span>
                        <span className="font-medium text-xs">Loading consignment register...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredInwards.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl">📦</span>
                        <span className="font-semibold text-slate-800 text-sm">
                          No consignment memos found
                        </span>
                        <span className="text-xs text-slate-500">
                          {searchQuery || settlementFilter !== 'ALL' || activeTab !== 'ALL'
                            ? 'Try changing or clearing your search query and filters.'
                            : 'No vendor consignment inwards have been recorded yet.'}
                        </span>
                        {!searchQuery && settlementFilter === 'ALL' && activeTab === 'ALL' && (
                          <button
                            type="button"
                            onClick={() => setCurrentView('INWARD')}
                            className="mt-2 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                            style={{ color: '#ffffff' }}
                          >
                            <span>+</span>
                            <span>Create Consignment Inward</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInwards.map((inward) => {
                    const isOverdue =
                      inward.expectedReturnDate &&
                      inward.status !== 'CLOSED' &&
                      inward.status !== 'COMPLETED' &&
                      inward.expectedReturnDate < new Date().toISOString().split('T')[0]

                    const outstanding = inward.outstandingLiability ?? 0

                    return (
                      <tr
                        key={inward.id}
                        className="hover:bg-amber-50/30 transition-colors cursor-pointer group"
                        onClick={() => void handleOpenDetails(inward.id)}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          <span className="group-hover:text-amber-700 transition-colors">
                            {inward.consignmentNumber}
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">
                            {inward.supplierName || 'Unknown Supplier'}
                          </div>
                          {inward.supplierMobile && (
                            <div className="text-[11px] text-slate-500">
                              {inward.supplierMobile}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                          {formatDate(inward.inwardDate)}
                        </td>

                        <td className="py-2.5 px-3 text-center font-medium">
                          {inward.expectedReturnDate ? (
                            isOverdue ? (
                              <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 inline-block text-[11px]">
                                {formatDate(inward.expectedReturnDate)} ⚠️ Overdue
                              </span>
                            ) : (
                              <span className="text-slate-600 text-[11px]">
                                {formatDate(inward.expectedReturnDate)}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <span className="font-semibold text-slate-900">{inward.totalPieces} Pcs</span>
                          <div className="text-[11px] text-slate-500">
                            {formatWeight(inward.totalGrossWeight)}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                          {formatCurrency(inward.totalVendorCost)}
                        </td>

                        <td className="py-2.5 px-3 text-right font-bold text-purple-700">
                          {formatCurrency(inward.totalSoldVendorCost ?? 0)}
                        </td>

                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {formatCurrency(inward.totalSettledAmount ?? 0)}
                        </td>

                        <td className="py-2.5 px-3 text-right font-bold">
                          <span
                            className={
                              outstanding > 0
                                ? 'text-rose-700'
                                : 'text-slate-500'
                            }
                          >
                            {formatCurrency(outstanding)}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {renderSettlementStatusBadge(inward.settlementStatus)}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {renderPhysicalStatusBadge(inward.status)}
                        </td>

                        <td
                          className="py-2.5 px-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => void handleOpenDetails(inward.id)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConsignmentHubScreen
