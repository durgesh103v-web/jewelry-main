import React, { useState, useEffect, useCallback, useMemo } from 'react'
import type { CustomerAdvanceRecord, AdvanceStatus } from '../types'
import { formatDate, formatCurrency } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { CreateAdvanceScreen } from './CreateAdvanceScreen'
import { AdvanceDetailModal } from '../components/AdvanceDetailModal'
import { AdvanceReceiptView } from '../components/AdvanceReceiptView'
import { StatusPill } from '../../../components/ui'

export interface CustomerAdvancesScreenProps {
  onClose?: () => void
  onNavigate?: (
    id: string,
    label: string,
    module: 'home' | 'master' | 'transaction' | 'reports' | 'gst' | 'utility'
  ) => void
  initialCustomerId?: string
  initialOrderId?: string
}

type TabFilter = 'ALL' | AdvanceStatus
type LinkageFilter = 'ALL' | 'ORDER_LINKED' | 'UNLINKED'
type ViewMode = 'list' | 'create'

const STATUS_BADGE_MAP: Record<AdvanceStatus, { label: string; className: string }> = {
  RECEIVED: {
    label: 'Available',
    className: 'bg-emerald-100 text-emerald-800 font-semibold border-emerald-300'
  },
  PARTIALLY_ALLOCATED: {
    label: 'Partially Used',
    className: 'bg-amber-100 text-amber-800 font-medium border-amber-300'
  },
  FULLY_ALLOCATED: {
    label: 'Fully Used',
    className: 'bg-blue-100 text-blue-800 font-medium border-blue-300'
  },
  REFUNDED: {
    label: 'Refunded',
    className: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-zinc-200 text-zinc-600 border-zinc-300'
  }
}

export const CustomerAdvancesScreen: React.FC<CustomerAdvancesScreenProps> = ({
  onClose,
  onNavigate,
  initialCustomerId,
  initialOrderId
}) => {
  // Navigation / View State ('list' = Register, 'create' = Full Page Create Desk)
  const [viewMode, setViewMode] = useState<ViewMode>(
    initialCustomerId || initialOrderId ? 'create' : 'list'
  )

  // Advances Register State
  const [advances, setAdvances] = useState<CustomerAdvanceRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Filter States
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL')
  const [linkageFilter, setLinkageFilter] = useState<LinkageFilter>('ALL')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Modals State
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string | null>(null)
  const [printAdvance, setPrintAdvance] = useState<CustomerAdvanceRecord | null>(null)

  // Load Advances from Authoritative Backend
  const loadAdvances = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const filter: any = {}
      if (activeTab !== 'ALL') {
        filter.status = activeTab
      }
      if (searchQuery.trim()) {
        filter.search = searchQuery.trim()
      }
      if (paymentMethodFilter !== 'ALL') {
        filter.paymentMethod = paymentMethodFilter
      }
      if (startDate) {
        filter.startDate = startDate
      }
      if (endDate) {
        filter.endDate = endDate
      }

      if (window.api.advances && typeof window.api.advances.list === 'function') {
        const list = await window.api.advances.list(filter)
        setAdvances(list || [])
      }
    } catch (err) {
      console.error('Failed to load customer advances:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, searchQuery, paymentMethodFilter, startDate, endDate])

  useEffect(() => {
    void loadAdvances()
  }, [loadAdvances])

  // Clear toast after 4 seconds
  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [toastMessage])

  // Client-side filtering for linkage
  const filteredAdvances = useMemo(() => {
    return advances.filter((adv) => {
      if (linkageFilter === 'ORDER_LINKED') {
        return Boolean(adv.orderId || adv.orderNumber)
      }
      if (linkageFilter === 'UNLINKED') {
        return !adv.orderId && !adv.orderNumber
      }
      return true
    })
  }, [advances, linkageFilter])

  // Computed Operational KPIs
  const metrics = useMemo(() => {
    let totalCollected = 0
    let totalAvailable = 0
    let totalAllocated = 0
    let activeCount = 0

    advances.forEach((a) => {
      if (a.status !== 'CANCELLED') {
        totalCollected += a.amount
        totalAllocated += a.allocatedAmount
        if (a.status !== 'REFUNDED') {
          totalAvailable += a.unallocatedAmount
        }
      }
      if (a.status === 'RECEIVED' || a.status === 'PARTIALLY_ALLOCATED') {
        activeCount++
      }
    })

    return {
      totalCollected,
      totalAvailable,
      totalAllocated,
      activeCount
    }
  }, [advances])

  const handleAdvanceCreated = (newAdv: CustomerAdvanceRecord) => {
    setToastMessage(`✓ Advance receipt #${newAdv.advanceNumber} recorded successfully!`)
    void loadAdvances()
    setPrintAdvance(newAdv)
  }

  // Render Full Page Create Desk
  if (viewMode === 'create') {
    return (
      <CreateAdvanceScreen
        onBack={() => setViewMode('list')}
        onSuccess={(adv) => {
          setViewMode('list')
          handleAdvanceCreated(adv)
        }}
        initialCustomerId={initialCustomerId}
        initialOrderId={initialOrderId}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-app,#f8fafc)] text-slate-900 overflow-hidden select-none font-sans">
      {/* Top Banner & Header */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-3 shadow-2xs shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">💰</span>
            <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Customer Advances &amp; Receipts Desk</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono font-bold">
                ADVANCES
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Issue customer advance deposit vouchers, track bespoke order adjustments, and inspect available balances
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadAdvances()}
            disabled={isLoading}
            className="h-8 px-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Refresh Register"
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
            onClick={() => setViewMode('create')}
            className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            style={{ color: '#ffffff' }}
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="!text-white font-bold" style={{ color: '#ffffff' }}>New Customer Advance</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              title="Close Screen"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Toast / Notification Banner */}
        {toastMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs">
            <span>{toastMessage}</span>
            <button type="button" onClick={() => setToastMessage(null)} className="text-emerald-700 hover:bg-emerald-100 px-2 py-0.5 rounded font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs">
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => setError(null)} className="text-rose-700 hover:bg-rose-100 px-2 py-0.5 rounded font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Received</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold font-mono text-slate-900">{formatCurrency(metrics.totalCollected)}</span>
              <span className="text-[11px] text-slate-500 font-medium">Lifetime collected</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Available Balance</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold font-mono text-emerald-700">
                {formatCurrency(metrics.totalAvailable)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Usable in POS / Orders</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Allocated to Orders</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold font-mono text-blue-700">
                {formatCurrency(metrics.totalAllocated)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Consumed deposits</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Active Receipts</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black font-mono text-amber-900">
                {metrics.activeCount}
              </span>
              <span className="text-[11px] text-amber-700 font-semibold">Open with balance</span>
            </div>
          </div>
        </div>

        {/* Filter Controls & Tabs */}
        <div className="space-y-2.5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {(
              [
                'ALL',
                'RECEIVED',
                'PARTIALLY_ALLOCATED',
                'FULLY_ALLOCATED',
                'CANCELLED'
              ] as TabFilter[]
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-amber-500 !text-white shadow-2xs font-bold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                style={activeTab === tab ? { color: '#ffffff' } : undefined}
              >
                {tab === 'ALL'
                  ? 'All Advances'
                  : tab === 'RECEIVED'
                  ? 'Available'
                  : tab === 'PARTIALLY_ALLOCATED'
                  ? 'Partially Used'
                  : tab === 'FULLY_ALLOCATED'
                  ? 'Fully Consumed'
                  : 'Cancelled'}
              </button>
            ))}
          </div>

          {/* Search, Payment Method, Linkage & Date Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search receipt #, customer name, mobile, reference..."
                  className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800 transition-all font-medium"
                />
                <div className="absolute left-2.5 top-2 text-slate-400 text-xs">
                  🔍
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="min-w-[140px]">
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="CASH">Cash Desk</option>
                <option value="UPI">UPI / QR</option>
                <option value="BANK">Bank Transfer</option>
                <option value="CARD">Card Swipe</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other Mode</option>
              </select>
            </div>

            {/* Linkage Selector */}
            <div className="min-w-[130px]">
              <select
                value={linkageFilter}
                onChange={(e) => setLinkageFilter(e.target.value as LinkageFilter)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 font-medium"
              >
                <option value="ALL">All Linkages</option>
                <option value="ORDER_LINKED">Order Linked</option>
                <option value="UNLINKED">General Unlinked</option>
              </select>
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold text-[11px]">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 text-slate-800"
              />
              <span className="text-slate-500 font-semibold text-[11px]">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 text-slate-800"
              />
              {(startDate || endDate || searchQuery || paymentMethodFilter !== 'ALL' || linkageFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                    setSearchQuery('')
                    setPaymentMethodFilter('ALL')
                    setLinkageFilter('ALL')
                  }}
                  className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors font-semibold cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Advances Register Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px] tracking-tight">
                  <th className="p-3">Receipt #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer / Party</th>
                  <th className="p-3">Linked Order</th>
                  <th className="p-3">Method &amp; Ref</th>
                  <th className="p-3 text-right">Original Amount</th>
                  <th className="p-3 text-right">Utilized</th>
                  <th className="p-3 text-right">Available Balance</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400 animate-pulse font-semibold">
                      Loading customer advances register...
                    </td>
                  </tr>
                ) : filteredAdvances.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-500">
                      <div className="max-w-sm mx-auto space-y-2">
                        <p className="text-sm font-bold text-slate-900">No customer advances found</p>
                        <p className="text-xs text-slate-500">
                          {searchQuery || activeTab !== 'ALL' || paymentMethodFilter !== 'ALL' || linkageFilter !== 'ALL'
                            ? 'No records match your active search and filter criteria.'
                            : 'Issue customer advance deposit vouchers by clicking "+ New Customer Advance".'}
                        </p>
                        {!searchQuery && activeTab === 'ALL' && (
                          <button
                            type="button"
                            onClick={() => setViewMode('create')}
                            className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs shadow-2xs cursor-pointer"
                            style={{ color: '#ffffff' }}
                          >
                            + New Customer Advance
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAdvances.map((adv) => {
                    const statusBadge = STATUS_BADGE_MAP[adv.status] || {
                      label: adv.status,
                      className: 'bg-zinc-100 text-zinc-800'
                    }

                    return (
                      <tr
                        key={adv.id}
                        className="hover:bg-amber-50/30 transition-colors"
                      >
                        {/* Receipt # */}
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => setSelectedAdvanceId(adv.id)}
                            className="font-mono font-bold text-amber-700 hover:text-amber-900 hover:underline text-left cursor-pointer"
                          >
                            {adv.advanceNumber}
                          </button>
                        </td>

                        {/* Date */}
                        <td className="p-3 font-mono text-slate-800 whitespace-nowrap font-medium">
                          {formatDate(adv.advanceDate)}
                        </td>

                        {/* Customer */}
                        <td className="p-3">
                          <div className="font-bold text-slate-900">
                            {adv.customerName || 'General Customer'}
                          </div>
                          {adv.customerCode && (
                            <div className="text-[10px] text-slate-500 font-mono font-semibold">
                              [{adv.customerCode}] {adv.accountName || ''}
                            </div>
                          )}
                        </td>

                        {/* Linked Order */}
                        <td className="p-3">
                          {adv.orderId ? (
                            <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {adv.orderNumber || adv.orderId.slice(0, 8)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium italic">Unlinked</span>
                          )}
                        </td>

                        {/* Method & Ref */}
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{adv.paymentMethod}</div>
                          {adv.paymentReference && (
                            <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                              {adv.paymentReference}
                            </div>
                          )}
                        </td>

                        {/* Original Amount */}
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(adv.amount)}
                        </td>

                        {/* Utilized */}
                        <td className="p-3 text-right font-mono font-bold text-blue-700">
                          {formatCurrency(adv.allocatedAmount)}
                        </td>

                        {/* Available Balance */}
                        <td className="p-3 text-right font-mono font-extrabold text-emerald-700">
                          {formatCurrency(adv.unallocatedAmount)}
                        </td>

                        {/* Status */}
                        <td className="p-3 text-center">
                          <StatusPill statusText={statusBadge.label} />
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedAdvanceId(adv.id)}
                              className="px-2.5 py-1 text-xs border border-slate-300 rounded-md hover:bg-slate-100 text-slate-700 font-semibold transition-colors cursor-pointer"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrintAdvance(adv)}
                              className="p-1 border border-slate-300 rounded-md hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors cursor-pointer"
                              title="Print Receipt Voucher"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            </button>
                          </div>
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

      {/* Advance Detail Modal */}
      {selectedAdvanceId && (
        <AdvanceDetailModal
          isOpen={Boolean(selectedAdvanceId)}
          advanceId={selectedAdvanceId}
          onClose={() => setSelectedAdvanceId(null)}
          onPrint={(adv) => setPrintAdvance(adv)}
          onRefresh={loadAdvances}
          onNavigateToOrder={(_orderId) => {
            setSelectedAdvanceId(null)
            if (onNavigate) {
              onNavigate('customer-orders', 'Customer Custom Orders', 'transaction')
            }
          }}
        />
      )}

      {/* Advance Receipt Print Modal */}
      {printAdvance && (
        <AdvanceReceiptView
          advance={printAdvance}
          onClose={() => setPrintAdvance(null)}
        />
      )}
    </div>
  )
}

export default CustomerAdvancesScreen
