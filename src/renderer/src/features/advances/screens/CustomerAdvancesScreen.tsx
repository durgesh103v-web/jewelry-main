import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import type { CustomerAdvanceRecord, AdvanceStatus } from '../types'
import { formatDate, formatCurrency } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { NewAdvanceModal } from '../components/NewAdvanceModal'
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

const STATUS_BADGE_MAP: Record<AdvanceStatus, { label: string; className: string }> = {
  RECEIVED: {
    label: 'Available',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold border-emerald-300 dark:border-emerald-700'
  },
  PARTIALLY_ALLOCATED: {
    label: 'Partially Used',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-medium border-amber-300 dark:border-amber-700'
  },
  FULLY_ALLOCATED: {
    label: 'Fully Used',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-medium border-blue-300 dark:border-blue-700'
  },
  REFUNDED: {
    label: 'Refunded',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300 dark:border-purple-700'
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300 dark:border-rose-700'
  }
}

export const CustomerAdvancesScreen: React.FC<CustomerAdvancesScreenProps> = ({
  onClose,
  onNavigate,
  initialCustomerId,
  initialOrderId
}) => {
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
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(Boolean(initialOrderId || initialCustomerId))
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

  // Client-side filtering for linkage filter (or additional refined criteria)
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

  // Date Presets Handler
  const handleDatePreset = (preset: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL') => {
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
    } else {
      setStartDate('')
      setEndDate('')
    }
  }

  const handleAdvanceCreated = (newAdv: CustomerAdvanceRecord) => {
    setToastMessage(`Advance receipt #${newAdv.advanceNumber} successfully recorded!`)
    void loadAdvances()
    // Open print preview directly for immediate receipt issuance
    setPrintAdvance(newAdv)
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Top Bar / Header */}
      <div className="flex-none px-6 py-4 border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Customer Advances & Receipts</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary font-medium text-secondary-foreground">
                  Register
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Issue advance deposit vouchers, track custom order adjustments, and inspect available balances
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadAdvances()}
              disabled={isLoading}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-input bg-background hover:bg-muted transition-colors flex items-center gap-1.5"
              title="Refresh Register"
            >
              <svg
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>

            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              + New Customer Advance
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent text-sm"
                title="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Operational KPIs Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Received</span>
              <span className="text-xs">💰</span>
            </div>
            <div className="text-lg font-bold text-foreground">
              {formatCurrency(metrics.totalCollected)}
            </div>
            <div className="text-[11px] text-muted-foreground">Lifetime collected</div>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm space-y-1">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Available Balance</span>
              <span className="text-xs">✨</span>
            </div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(metrics.totalAvailable)}
            </div>
            <div className="text-[11px] text-muted-foreground">Usable in POS / Orders</div>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm space-y-1">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Allocated to Orders</span>
              <span className="text-xs">📋</span>
            </div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(metrics.totalAllocated)}
            </div>
            <div className="text-[11px] text-muted-foreground">Consumed deposits</div>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm space-y-1">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Active Receipts</span>
              <span className="text-xs">🧾</span>
            </div>
            <div className="text-lg font-bold text-foreground">
              {metrics.activeCount}
            </div>
            <div className="text-[11px] text-muted-foreground">Open with remaining balance</div>
          </div>
        </div>

        {/* Toast / Notification Banner */}
        {toastMessage && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 rounded-lg text-xs flex justify-between items-center transition-all animate-fadeIn">
            <div className="flex items-center gap-2">
              <span>✓</span>
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg text-xs flex justify-between items-center">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-600 hover:text-rose-800 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex-none px-6 py-3 border-b border-border bg-muted/20 space-y-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'RECEIVED', 'PARTIALLY_ALLOCATED', 'FULLY_ALLOCATED', 'CANCELLED'] as TabFilter[]).map(
            (tab) => {
              const isSelected = activeTab === tab
              const label =
                tab === 'ALL'
                  ? 'All Advances'
                  : tab === 'RECEIVED'
                  ? 'Available'
                  : tab === 'PARTIALLY_ALLOCATED'
                  ? 'Partially Used'
                  : tab === 'FULLY_ALLOCATED'
                  ? 'Fully Consumed'
                  : 'Cancelled'

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-background hover:bg-muted text-muted-foreground border border-input'
                  }`}
                >
                  {label}
                </button>
              )
            }
          )}
        </div>

        {/* Filters Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <input
              type="text"
              placeholder="Search receipt #, customer, order #, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <svg
              className="w-4 h-4 absolute left-2.5 top-2 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank Transfer</option>
              <option value="UPI">UPI / QR</option>
              <option value="CARD">Card</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Linkage Filter */}
          <div>
            <select
              value={linkageFilter}
              onChange={(e) => setLinkageFilter(e.target.value as LinkageFilter)}
              className="w-full h-8 px-2.5 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Linkages</option>
              <option value="ORDER_LINKED">Order Linked</option>
              <option value="UNLINKED">Unlinked Advances</option>
            </select>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleDatePreset('TODAY')}
              className="px-2 py-1 text-[11px] font-medium rounded border border-input bg-background hover:bg-muted"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('THIS_MONTH')}
              className="px-2 py-1 text-[11px] font-medium rounded border border-input bg-background hover:bg-muted"
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('ALL')}
              className="px-2 py-1 text-[11px] font-medium rounded border border-input bg-background hover:bg-muted"
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Main Register Table */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <svg className="animate-spin h-7 w-7 mb-2 text-primary" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs">Loading customer advances register...</p>
          </div>
        ) : filteredAdvances.length === 0 ? (
          <div className="h-72 border border-dashed border-border rounded-xl flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-foreground">No customer advances found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {searchQuery || activeTab !== 'ALL' || paymentMethodFilter !== 'ALL'
                ? 'No advance records match the active search or filters.'
                : 'No customer advances recorded yet. Issue a new advance receipt to get started.'}
            </p>
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 transition-all shadow-sm"
            >
              + Issue Customer Advance Receipt
            </button>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/80 text-muted-foreground border-b border-border select-none">
                <tr>
                  <th className="py-2.5 px-3.5 font-semibold">Receipt #</th>
                  <th className="py-2.5 px-3.5 font-semibold">Date</th>
                  <th className="py-2.5 px-3.5 font-semibold">Customer</th>
                  <th className="py-2.5 px-3.5 font-semibold">Linked Order</th>
                  <th className="py-2.5 px-3.5 font-semibold">Method & Ref</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">Original Amount</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">Utilized</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">Available Balance</th>
                  <th className="py-2.5 px-3.5 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAdvances.map((adv) => {
                  const statusBadge = STATUS_BADGE_MAP[adv.status] || {
                    label: adv.status,
                    className: 'bg-zinc-100 text-zinc-800'
                  }

                  return (
                    <tr
                      key={adv.id}
                      className="hover:bg-muted/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedAdvanceId(adv.id)}
                    >
                      {/* Receipt # */}
                      <td className="py-3 px-3.5 font-mono font-bold text-foreground">
                        {adv.advanceNumber}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3.5 font-mono text-muted-foreground whitespace-nowrap">
                        {formatDate(adv.advanceDate)}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-foreground">
                          {adv.customerName || 'General Customer'}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {adv.customerCode ? `[${adv.customerCode}] ` : ''}
                          {adv.accountName || ''}
                        </div>
                      </td>

                      {/* Linked Order */}
                      <td className="py-3 px-3.5">
                        {adv.orderId ? (
                          <span className="font-mono text-xs font-medium text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                            {adv.orderNumber || adv.orderId.slice(0, 8)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">Unlinked</span>
                        )}
                      </td>

                      {/* Method & Ref */}
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-foreground">{adv.paymentMethod}</div>
                        {adv.paymentReference && (
                          <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[120px]">
                            {adv.paymentReference}
                          </div>
                        )}
                      </td>

                      {/* Original Amount */}
                      <td className="py-3 px-3.5 text-right font-semibold text-foreground">
                        {formatCurrency(adv.amount)}
                      </td>

                      {/* Utilized */}
                      <td className="py-3 px-3.5 text-right font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(adv.allocatedAmount)}
                      </td>

                      {/* Available Balance */}
                      <td className="py-3 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(adv.unallocatedAmount)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center">
                        <StatusPill statusText={statusBadge.label} />
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-3.5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedAdvanceId(adv.id)}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-input bg-background hover:bg-muted transition-colors"
                            title="View Details"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrintAdvance(adv)}
                            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent transition-colors"
                            title="Print Voucher Receipt"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Advance Modal */}
      {isNewModalOpen && (
        <NewAdvanceModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onSuccess={handleAdvanceCreated}
          initialCustomerId={initialCustomerId}
          initialOrderId={initialOrderId}
        />
      )}

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
