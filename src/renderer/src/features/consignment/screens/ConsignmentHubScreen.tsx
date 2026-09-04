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

export interface ConsignmentHubScreenProps {
  onClose?: () => void
  onNavigate?: (id: string, label: string, module: 'home' | 'master' | 'transaction' | 'reports' | 'gst' | 'utility') => void
}

type TabFilter = 'ALL' | 'ACTIVE' | 'PARTIALLY_SETTLED' | 'COMPLETED' | 'CLOSED'

export const ConsignmentHubScreen: React.FC<ConsignmentHubScreenProps> = ({
  onClose,
  onNavigate
}) => {
  // Navigation View State
  const [currentView, setCurrentView] = useState<'HUB' | 'INWARD'>('HUB')

  // State
  const [inwards, setInwards] = useState<ConsignmentInwardRecord[]>([])
  const [dashboard, setDashboard] = useState<ConsignmentDashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  // Filters
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [settlementFilter, setSettlementFilter] = useState<string>('ALL')

  // Selected Inward for Read-Only Quick View Modal
  const [selectedInwardId, setSelectedInwardId] = useState<string | null>(null)
  const [selectedInwardDetails, setSelectedInwardDetails] = useState<ConsignmentInwardRecord | null>(null)
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false)

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
      setInwards(list)
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

  // Handle Quick View Details Modal
  const handleOpenDetails = async (id: string) => {
    setSelectedInwardId(id)
    setLoadingDetails(true)
    try {
      const details = await window.api.consignment.getInward(id)
      setSelectedInwardDetails(details)
    } catch (err: unknown) {
      console.error('Error loading consignment details:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleCloseDetails = () => {
    setSelectedInwardId(null)
    setSelectedInwardDetails(null)
  }

  // Physical status badge renderer
  const renderPhysicalStatusBadge = (status: ConsignmentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            ACTIVE (IN SHOWROOM)
          </span>
        )
      case 'PARTIALLY_SETTLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            PARTIAL
          </span>
        )
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            COMPLETED
          </span>
        )
      case 'CLOSED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            CLOSED
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-muted text-muted-foreground">
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
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            SETTLED
          </span>
        )
      case 'PARTIALLY_SETTLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            PARTIALLY PAID
          </span>
        )
      case 'UNSETTLED':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            UNSETTLED
          </span>
        )
    }
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
        onNavigate={onNavigate}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* 1. Header Bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-base shadow-sm">
            💎
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              Vendor Consignment &amp; Memo Hub
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                Phase 21
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Vendor-owned showroom stock custody, POS sales recognition, and supplier settlements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadConsignmentData()}
            disabled={isLoading}
            className="h-8 px-3 text-xs bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors flex items-center gap-1.5 border border-border"
            title="Refresh data"
          >
            <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('INWARD')}
            className="h-8 px-3.5 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>+</span>
            <span>New Consignment Inward</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 text-xs text-muted-foreground hover:text-foreground rounded-lg transition-colors flex items-center justify-center ml-1"
              title="Close Tab"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col p-4 gap-3.5 overflow-hidden">
        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex justify-between items-center shadow-sm">
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
                className="text-xs font-bold px-1.5 py-0.5 rounded hover:bg-destructive/20"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Info Banner */}
        {infoMessage && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs flex justify-between items-center shadow-sm">
            <span className="flex items-center gap-2">
              <span>ℹ️</span>
              <span>{infoMessage}</span>
            </span>
            <button
              type="button"
              onClick={() => setInfoMessage(null)}
              className="text-xs font-bold px-1.5 py-0.5 rounded hover:bg-blue-500/20"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2. KPI Summary Cards */}
        <section className="grid grid-cols-4 gap-3 shrink-0">
          {/* Card 1: Active Memos */}
          <div className="bg-card p-3.5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Memos
              </span>
              <span className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">
                📑
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {isLoading && !dashboard ? '...' : dashboard?.activeConsignmentsCount ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">inwards</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Overdue return:</span>
              <span
                className={`font-semibold font-mono ${
                  (dashboard?.overdueMemosCount ?? 0) > 0
                    ? 'text-amber-600 dark:text-amber-400 font-bold'
                    : 'text-muted-foreground'
                }`}
              >
                {dashboard?.overdueMemosCount ?? 0} Memos
              </span>
            </div>
          </div>

          {/* Card 2: Vendor Stock in Showroom */}
          <div className="bg-card p-3.5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Showroom Custody
              </span>
              <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                🏪
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {isLoading && !dashboard ? '...' : `${dashboard?.piecesInShowroomCount ?? 0} Pcs`}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {formatWeight(dashboard?.totalShowroomGrossWeight ?? 0)}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Vendor Valuation:</span>
              <span className="font-semibold font-mono text-foreground">
                {formatCurrency(dashboard?.totalShowroomVendorValue ?? 0)}
              </span>
            </div>
          </div>

          {/* Card 3: Sold Pieces */}
          <div className="bg-card p-3.5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sold Pieces
              </span>
              <span className="p-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold">
                🏷️
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                {isLoading && !dashboard ? '...' : `${dashboard?.piecesSoldTotal ?? 0} Sold`}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                ({dashboard?.piecesReturnedTotal ?? 0} returned)
              </span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Recognized Cost:</span>
              <span className="font-semibold font-mono text-foreground">
                {formatCurrency(dashboard?.totalSoldVendorValue ?? 0)}
              </span>
            </div>
          </div>

          {/* Card 4: Outstanding Vendor Due */}
          <div className="bg-card p-3.5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Outstanding Vendor Due
              </span>
              <span className="p-1 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold">
                💳
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {isLoading && !dashboard
                  ? '...'
                  : formatCurrency(dashboard?.totalSettlementDueToSuppliers ?? 0)}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Settled Paid:</span>
              <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(dashboard?.totalSettlementPaid ?? 0)}
              </span>
            </div>
          </div>
        </section>

        {/* 3. Filter & Search Toolbar */}
        <section className="bg-card p-3 rounded-xl border border-border shadow-sm flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memo #, supplier, phone..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
              <span className="absolute left-2.5 top-2 text-muted-foreground pointer-events-none text-xs">
                🔍
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Status Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/80">
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
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Settlement Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Settlement:</span>
              <select
                value={settlementFilter}
                onChange={(e) => setSettlementFilter(e.target.value)}
                className="h-8 px-2.5 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
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
                className="h-8 px-2.5 text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg border border-border font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </section>

        {/* 4. Consignment Register Table */}
        <section className="flex-1 overflow-auto border border-border rounded-xl bg-card shadow-sm flex flex-col">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-border select-none">
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
            <tbody className="divide-y divide-border/60">
              {isLoading && inwards.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="animate-spin text-xl">⏳</span>
                      <span className="font-medium text-xs">Loading consignment register...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInwards.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-2xl">📦</span>
                      <span className="font-semibold text-foreground text-sm">
                        No consignment memos found
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {searchQuery || settlementFilter !== 'ALL' || activeTab !== 'ALL'
                          ? 'Try changing or clearing your search query and filters.'
                          : 'No vendor consignment inwards have been recorded yet.'}
                      </span>
                      {!searchQuery && settlementFilter === 'ALL' && activeTab === 'ALL' && (
                        <button
                          type="button"
                          onClick={() => setCurrentView('INWARD')}
                          className="mt-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-1.5"
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
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => void handleOpenDetails(inward.id)}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                        <span className="group-hover:text-primary transition-colors">
                          {inward.consignmentNumber}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground">
                          {inward.supplierName || 'Unknown Supplier'}
                        </div>
                        {inward.supplierMobile && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {inward.supplierMobile}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-muted-foreground">
                        {formatDate(inward.inwardDate)}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                        {inward.expectedReturnDate ? (
                          <span
                            className={
                              isOverdue
                                ? 'text-rose-600 dark:text-rose-400 font-bold'
                                : 'text-muted-foreground'
                            }
                          >
                            {formatDate(inward.expectedReturnDate)}
                            {isOverdue && ' ⚠️'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold font-mono">{inward.totalPieces} Pcs</span>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {formatWeight(inward.totalGrossWeight)}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                        {formatCurrency(inward.totalVendorCost)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-medium text-purple-600 dark:text-purple-400">
                        {formatCurrency(inward.totalSoldVendorCost ?? 0)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(inward.totalSettledAmount ?? 0)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold">
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
                          className="px-2.5 py-1 bg-muted hover:bg-primary hover:text-primary-foreground rounded text-[11px] font-semibold transition-colors shadow-sm"
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
        </section>
      </div>

      {/* 5. Read-Only Memo Quick View Modal */}
      {selectedInwardId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="text-xl">📋</span>
                <div>
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Consignment Memo:</span>
                    <span className="font-mono text-primary">
                      {selectedInwardDetails?.consignmentNumber || 'Loading...'}
                    </span>
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Vendor: {selectedInwardDetails?.supplierName || '-'} (
                    {selectedInwardDetails?.supplierMobile || 'No Mobile'})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedInwardDetails && (
                  <>
                    {renderSettlementStatusBadge(selectedInwardDetails.settlementStatus)}
                    {renderPhysicalStatusBadge(selectedInwardDetails.status)}
                  </>
                )}
                <button
                  type="button"
                  onClick={handleCloseDetails}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg flex items-center justify-center font-bold text-sm ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loadingDetails ? (
                <div className="py-16 text-center text-muted-foreground">
                  <span className="animate-spin text-xl block mb-2">⏳</span>
                  <span>Fetching memo items and settlement details...</span>
                </div>
              ) : selectedInwardDetails ? (
                <>
                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-4 gap-3 bg-muted/40 p-3 rounded-xl border border-border">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Inward Date
                      </div>
                      <div className="font-mono font-semibold text-foreground text-xs mt-0.5">
                        {formatDate(selectedInwardDetails.inwardDate)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Expected Return
                      </div>
                      <div className="font-mono font-semibold text-foreground text-xs mt-0.5">
                        {formatDate(selectedInwardDetails.expectedReturnDate)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Total Items
                      </div>
                      <div className="font-mono font-semibold text-foreground text-xs mt-0.5">
                        {selectedInwardDetails.totalPieces} Pcs (
                        {formatWeight(selectedInwardDetails.totalGrossWeight)})
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Outstanding Due
                      </div>
                      <div className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs mt-0.5">
                        {formatCurrency(selectedInwardDetails.outstandingLiability ?? 0)}
                      </div>
                    </div>
                  </div>

                  {/* Notes if available */}
                  {selectedInwardDetails.notes && (
                    <div className="p-2.5 bg-muted/30 border border-border rounded-lg text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">Memo Notes: </span>
                      {selectedInwardDetails.notes}
                    </div>
                  )}

                  {/* Items List */}
                  <div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Serialized Physical Items ({selectedInwardDetails.items?.length ?? 0})</span>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        Showroom custody status
                      </span>
                    </h3>

                    <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-muted/60 text-muted-foreground font-semibold text-[10px] uppercase border-b border-border">
                          <tr>
                            <th className="py-2 px-3">Barcode / Tag</th>
                            <th className="py-2 px-3">Item Name</th>
                            <th className="py-2 px-2 text-center">Purity</th>
                            <th className="py-2 px-2 text-right">Gross Wt</th>
                            <th className="py-2 px-2 text-right">Net Wt</th>
                            <th className="py-2 px-3 text-right">Vendor Cost</th>
                            <th className="py-2 px-3 text-right">Retail Tag</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {selectedInwardDetails.items?.map((item) => (
                            <tr key={item.id} className="hover:bg-muted/30">
                              <td className="py-2 px-3 font-mono font-bold text-primary">
                                {item.barcode || item.stockItemCode}
                              </td>
                              <td className="py-2 px-3">
                                <div className="font-semibold text-foreground">
                                  {item.itemName || 'Jewellery Piece'}
                                </div>
                                {item.vendorItemCode && (
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    Code: {item.vendorItemCode}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-2 text-center font-mono">
                                {item.purityName} ({item.tunch}%)
                              </td>
                              <td className="py-2 px-2 text-right font-mono">
                                {formatWeight(item.grossWeight)}
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                                {formatWeight(item.netWeight)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-semibold text-foreground">
                                {formatCurrency(item.vendorCost)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                                {formatCurrency(item.retailPrice)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {item.status === 'IN_SHOWROOM' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    IN SHOWROOM
                                  </span>
                                )}
                                {item.status === 'SOLD' && (
                                  <div>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                      SOLD
                                    </span>
                                    {item.salesInvoiceNumber && (
                                      <div className="text-[9px] font-mono text-muted-foreground mt-0.5">
                                        Inv: {item.salesInvoiceNumber}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {item.status === 'RETURNED' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400">
                                    RETURNED
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  Failed to load details.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
              <span className="text-[11px] text-muted-foreground">
                Read-only memo preview. Settlement and Return actions will be active in UI-2.
              </span>
              <button
                type="button"
                onClick={handleCloseDetails}
                className="h-8 px-4 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConsignmentHubScreen
