import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import type { CustomerOrderRecord, OrderStatus } from '../types'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { NewOrderModal } from '../components/NewOrderModal'
import { OrderDetailModal } from '../components/OrderDetailModal'
import { OrderPrintView } from '../components/OrderPrintView'
import { NewAdvanceModal } from '../../advances/components/NewAdvanceModal'

export interface CustomerOrdersScreenProps {
  onClose?: () => void
  onNavigate?: (
    id: string,
    label: string,
    module: 'home' | 'master' | 'transaction' | 'reports' | 'gst' | 'utility'
  ) => void
}

type TabFilter = 'ALL' | OrderStatus

const STATUS_BADGE_MAP: Record<OrderStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-medium' },
  IN_PROGRESS: { label: 'In Workshop', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-medium' },
  READY: { label: 'Ready', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold' },
  COMPLETED: { label: 'Completed', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  CANCELLED: { label: 'Cancelled', className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' }
}

export const CustomerOrdersScreen: React.FC<CustomerOrdersScreenProps> = ({
  onClose,
  onNavigate
}) => {
  // Orders List State
  const [orders, setOrders] = useState<CustomerOrderRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Filters State
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Modals State
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [printOrder, setPrintOrder] = useState<CustomerOrderRecord | null>(null)
  const [advanceOrderContext, setAdvanceOrderContext] = useState<{ customerId: string; orderId: string } | null>(null)

  // Load Orders from Backend
  const loadOrders = useCallback(async () => {
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
      if (startDate) {
        filter.startDate = startDate
      }
      if (endDate) {
        filter.endDate = endDate
      }

      const list = await window.api.orders.list(filter)
      setOrders(list || [])
    } catch (err) {
      console.error('Failed to load customer orders:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, searchQuery, startDate, endDate])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  // Computed KPIs
  const metrics = useMemo(() => {
    const today = dayjs().startOf('day')
    const total = orders.length
    let active = 0
    let ready = 0
    let overdue = 0
    let totalPipelineValue = 0

    orders.forEach((o) => {
      if (o.status === 'CONFIRMED' || o.status === 'IN_PROGRESS') {
        active++
      }
      if (o.status === 'READY') {
        ready++
      }
      if (
        o.expectedDeliveryDate &&
        o.status !== 'COMPLETED' &&
        o.status !== 'CANCELLED' &&
        dayjs(o.expectedDeliveryDate).startOf('day').isBefore(today)
      ) {
        overdue++
      }
      if (o.status !== 'CANCELLED') {
        totalPipelineValue += o.grandTotal || 0
      }
    })

    return { total, active, ready, overdue, totalPipelineValue }
  }, [orders])

  // Quick transition action from table row
  const handleQuickTransition = async (order: CustomerOrderRecord, nextStatus: OrderStatus) => {
    try {
      await window.api.orders.updateStatus(order.id, nextStatus)
      setToastMessage(`✓ Order #${order.orderNumber} updated to "${STATUS_BADGE_MAP[nextStatus]?.label || nextStatus}"`)
      await loadOrders()
    } catch (err) {
      console.error('Failed to update status:', err)
      setError(getFriendlyErrorMessage(err))
    }
  }

  // Delivery timing badge helper
  const renderDeliveryBadge = (deliveryDate?: string | null, status?: OrderStatus) => {
    if (!deliveryDate) return '-'
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      return <span className="font-mono text-muted-foreground">{formatDate(deliveryDate)}</span>
    }

    const today = dayjs().startOf('day')
    const due = dayjs(deliveryDate).startOf('day')
    const diffDays = due.diff(today, 'day')

    if (diffDays < 0) {
      return (
        <div>
          <span className="font-mono font-medium text-rose-600 dark:text-rose-400">{formatDate(deliveryDate)}</span>
          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
            Overdue ({Math.abs(diffDays)}d)
          </div>
        </div>
      )
    }
    if (diffDays === 0) {
      return (
        <div>
          <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">{formatDate(deliveryDate)}</span>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Due Today</div>
        </div>
      )
    }
    if (diffDays <= 3) {
      return (
        <div>
          <span className="font-mono text-foreground">{formatDate(deliveryDate)}</span>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Due in {diffDays}d</div>
        </div>
      )
    }

    return <span className="font-mono text-foreground">{formatDate(deliveryDate)}</span>
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Top Banner & Header */}
      <div className="px-6 py-4 border-b border-border bg-card/60 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">Customer Custom Order Desk</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Phase 22 UI-2
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bespoke jewellery orders, expected delivery tracking, workshop progress, and POS billing integration
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadOrders()}
            disabled={isLoading}
            className="p-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Refresh Orders"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Custom Order
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Close Screen"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-medium flex justify-between items-center animate-fade-in">
            <span>{toastMessage}</span>
            <button type="button" onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg text-xs flex justify-between items-center">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
            <span className="text-xs font-medium text-muted-foreground">Total Customer Orders</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-foreground">{metrics.total}</span>
              <span className="text-xs text-muted-foreground">All orders</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
            <span className="text-xs font-medium text-muted-foreground">Active (In Workshop)</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {metrics.active}
              </span>
              <span className="text-xs text-muted-foreground">Confirmed / Progress</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
            <span className="text-xs font-medium text-muted-foreground">Ready for Delivery</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {metrics.ready}
              </span>
              <span className="text-xs text-muted-foreground">POS billing ready</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
            <span className="text-xs font-medium text-muted-foreground">Overdue Orders</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {metrics.overdue}
              </span>
              <span className="text-xs text-muted-foreground">Past due date</span>
            </div>
          </div>
        </div>

        {/* Filter Controls & Tabs */}
        <div className="space-y-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border text-xs">
            {(
              [
                'ALL',
                'CONFIRMED',
                'IN_PROGRESS',
                'READY',
                'COMPLETED',
                'CANCELLED',
                'DRAFT'
              ] as TabFilter[]
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {tab === 'ALL' ? 'All Orders' : STATUS_BADGE_MAP[tab]?.label || tab}
              </button>
            ))}
          </div>

          {/* Search and Date Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
            <div className="flex-1 min-w-[240px]">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Order #, Customer Name, Account, Quotation #..."
                  className="w-full h-9 pl-9 pr-3 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <svg
                  className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 px-2.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-muted-foreground">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 px-2.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {(startDate || endDate || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                    setSearchQuery('')
                  }}
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg border border-border transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Order Register Table */}
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                  <th className="p-3">Order #</th>
                  <th className="p-3">Booked Date</th>
                  <th className="p-3">Customer / Party</th>
                  <th className="p-3">Expected Due</th>
                  <th className="p-3">Ref Quotation</th>
                  <th className="p-3 text-center">Items</th>
                  <th className="p-3 text-right">Gross Wt (g)</th>
                  <th className="p-3 text-right">Estimated Total</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-muted-foreground animate-pulse">
                      Loading customer order register...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-muted-foreground">
                      <div className="max-w-sm mx-auto space-y-2">
                        <p className="text-sm font-semibold text-foreground">No customer orders found</p>
                        <p className="text-xs">
                          {searchQuery || activeTab !== 'ALL'
                            ? 'No orders match your active filter criteria.'
                            : 'Create bespoke orders manually or convert approved quotations from the Quotation Desk.'}
                        </p>
                        {!searchQuery && activeTab === 'ALL' && (
                          <button
                            type="button"
                            onClick={() => setIsNewModalOpen(true)}
                            className="mt-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg text-xs"
                          >
                            + New Custom Order
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-accent/40 transition-colors">
                      {/* Order Number */}
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(o.id)}
                          className="font-mono font-bold text-primary hover:underline text-left"
                        >
                          {o.orderNumber}
                        </button>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{o.metalType}</div>
                      </td>

                      {/* Booked Date */}
                      <td className="p-3 font-mono text-foreground whitespace-nowrap">
                        {formatDate(o.orderDate)}
                      </td>

                      {/* Customer */}
                      <td className="p-3">
                        <div className="font-semibold text-foreground">
                          {o.customerName || o.accountName || 'Counter Customer'}
                        </div>
                        {o.customerCode && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {o.customerCode}
                          </div>
                        )}
                      </td>

                      {/* Expected Due Date */}
                      <td className="p-3 whitespace-nowrap">
                        {renderDeliveryBadge(o.expectedDeliveryDate, o.status)}
                      </td>

                      {/* Source Quotation */}
                      <td className="p-3 font-mono text-xs">
                        {o.quotationNumber ? (
                          <span className="text-muted-foreground">{o.quotationNumber}</span>
                        ) : (
                          <span className="text-muted-foreground/60 italic">Direct</span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="p-3 text-center font-mono">{o.totalPcs}</td>

                      {/* Gross Wt */}
                      <td className="p-3 text-right font-mono text-foreground">
                        {formatWeight(o.totalGrossWeight)}
                      </td>

                      {/* Estimated Total */}
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        {formatCurrency(o.roundedTotal || o.grandTotal)}
                        {o.advanceAmount > 0 && (
                          <div className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                            Adv: {formatCurrency(o.advanceAmount)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            STATUS_BADGE_MAP[o.status]?.className || 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {STATUS_BADGE_MAP[o.status]?.label || o.status}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Detail */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(o.id)}
                            className="px-2.5 py-1 text-xs border border-border rounded-md hover:bg-accent text-foreground transition-colors"
                          >
                            View
                          </button>

                          {/* Print Docket */}
                          <button
                            type="button"
                            onClick={() => setPrintOrder(o)}
                            className="p-1 border border-border rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            title="Print Docket"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>

                          {/* Quick Lifecycle Action */}
                          {o.status === 'CONFIRMED' && (
                            <button
                              type="button"
                              onClick={() => handleQuickTransition(o, 'IN_PROGRESS')}
                              className="px-2 py-1 text-xs bg-amber-600/10 text-amber-700 dark:text-amber-400 border border-amber-600/20 hover:bg-amber-600/20 rounded-md transition-colors font-medium"
                              title="Send to Workshop / In Progress"
                            >
                              Workshop
                            </button>
                          )}

                          {o.status === 'IN_PROGRESS' && (
                            <button
                              type="button"
                              onClick={() => handleQuickTransition(o, 'READY')}
                              className="px-2 py-1 text-xs bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-600/20 hover:bg-emerald-600/20 rounded-md transition-colors font-medium"
                              title="Mark Ready for Delivery"
                            >
                              Ready
                            </button>
                          )}

                          {o.status === 'READY' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigate) {
                                  onNavigate('pos-billing', 'POS Billing', 'transaction')
                                } else {
                                  handleQuickTransition(o, 'COMPLETED')
                                }
                              }}
                              className="px-2 py-1 text-xs bg-purple-600/10 text-purple-700 dark:text-purple-400 border border-purple-600/20 hover:bg-purple-600/20 rounded-md transition-colors font-medium"
                              title="Open in POS or Complete"
                            >
                              POS Deliver
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Order Modal */}
      <NewOrderModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={(newOrder) => {
          setToastMessage(`✓ Customer Order #${newOrder.orderNumber} booked successfully!`)
          void loadOrders()
          setSelectedOrderId(newOrder.id)
        }}
      />

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onStatusUpdated={() => void loadOrders()}
          onNavigateToQuotation={() => {
            if (onNavigate) {
              onNavigate('customer-quotation', 'Customer Quotation / Estimate Desk', 'transaction')
            }
          }}
          onCollectAdvance={(customerId, orderId) => {
            setAdvanceOrderContext({ customerId, orderId })
          }}
        />
      )}

      {/* Collect Advance Modal against Order */}
      {advanceOrderContext && (
        <NewAdvanceModal
          isOpen={Boolean(advanceOrderContext)}
          initialCustomerId={advanceOrderContext.customerId}
          initialOrderId={advanceOrderContext.orderId}
          onClose={() => setAdvanceOrderContext(null)}
          onSuccess={(_adv) => {
            setToastMessage('Advance receipt recorded and linked to order successfully!')
            void loadOrders()
          }}
        />
      )}

      {/* Print View Modal */}
      {printOrder && (
        <OrderPrintView
          order={printOrder}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </div>
  )
}

export default CustomerOrdersScreen
