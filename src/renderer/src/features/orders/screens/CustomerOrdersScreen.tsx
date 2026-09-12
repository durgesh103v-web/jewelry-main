import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import type { CustomerOrderRecord, OrderStatus } from '../types'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { CreateOrderScreen } from './CreateOrderScreen'
import { OrderDetailModal } from '../components/OrderDetailModal'
import { OrderPrintView } from '../components/OrderPrintView'
import { NewAdvanceModal } from '../../advances/components/NewAdvanceModal'
import { StatusPill, MetalRatesStrip } from '../../../components/ui'

export interface CustomerOrdersScreenProps {
  onClose?: () => void
  onNavigate?: (
    id: string,
    label: string,
    module: 'home' | 'master' | 'transaction' | 'reports' | 'gst' | 'utility'
  ) => void
}

type TabFilter = 'ALL' | OrderStatus
type ViewMode = 'list' | 'create'

const STATUS_BADGE_MAP: Record<OrderStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-zinc-100 text-zinc-800' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800 font-bold' },
  IN_PROGRESS: { label: 'In Workshop', className: 'bg-amber-100 text-amber-900 font-bold' },
  READY: { label: 'Ready', className: 'bg-emerald-100 text-emerald-800 font-bold' },
  COMPLETED: { label: 'Completed', className: 'bg-purple-100 text-purple-800 font-bold' },
  CANCELLED: { label: 'Cancelled', className: 'bg-rose-100 text-rose-800 font-bold' }
}

export const CustomerOrdersScreen: React.FC<CustomerOrdersScreenProps> = ({
  onClose,
  onNavigate
}) => {
  // Navigation / View State ('list' = Orders Register, 'create' = Full Page Create Desk)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

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
      return <span className="font-mono text-slate-500 font-medium">{formatDate(deliveryDate)}</span>
    }

    const today = dayjs().startOf('day')
    const due = dayjs(deliveryDate).startOf('day')
    const diffDays = due.diff(today, 'day')

    if (diffDays < 0) {
      return (
        <div>
          <span className="font-mono font-bold text-rose-600">{formatDate(deliveryDate)}</span>
          <div className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1 py-0.2 rounded mt-0.5 inline-block">
            Overdue ({Math.abs(diffDays)}d)
          </div>
        </div>
      )
    }
    if (diffDays === 0) {
      return (
        <div>
          <span className="font-mono font-bold text-amber-700">{formatDate(deliveryDate)}</span>
          <div className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1 py-0.2 rounded mt-0.5 inline-block">
            Due Today
          </div>
        </div>
      )
    }
    if (diffDays <= 3) {
      return (
        <div>
          <span className="font-mono font-medium text-slate-800">{formatDate(deliveryDate)}</span>
          <div className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1 py-0.2 rounded mt-0.5 inline-block">
            Due in {diffDays}d
          </div>
        </div>
      )
    }

    return <span className="font-mono font-medium text-slate-800">{formatDate(deliveryDate)}</span>
  }

  // Render Full Page Create Order Desk
  if (viewMode === 'create') {
    return (
      <CreateOrderScreen
        onBack={() => setViewMode('list')}
        onSuccess={(newOrder) => {
          setToastMessage(`✓ Custom Order #${newOrder.orderNumber} created and booked successfully!`)
          setViewMode('list')
          void loadOrders()
          setSelectedOrderId(newOrder.id)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-app,#f8fafc)] text-slate-900 overflow-hidden select-none font-sans">
      {/* Top Banner & Header */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-3 shadow-2xs shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✨</span>
            <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Customer Custom Order Desk</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono font-bold">
                BESPOKE ORDERS
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Bespoke jewellery orders, workshop progress tracking, advance payments, and 1-click POS delivery
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadOrders()}
            disabled={isLoading}
            className="h-8 px-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Refresh Orders"
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
            <span className="!text-white font-bold" style={{ color: '#ffffff' }}>New Custom Order</span>
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
        {/* Toast Notification Banner */}
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

        {/* Live Showroom Metal Rates Reference */}
        <MetalRatesStrip />

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Customer Orders</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold font-mono text-slate-900">{metrics.total}</span>
              <span className="text-[11px] text-slate-500 font-medium">All orders</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active (In Workshop)</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold font-mono text-blue-700">
                {metrics.active}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Confirmed / Progress</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ready for Delivery</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold font-mono text-emerald-700">
                {metrics.ready}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">POS billing ready</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Orders Pipeline Value</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-black font-mono text-amber-900">
                {formatCurrency(metrics.totalPipelineValue)}
              </span>
              <span className="text-[11px] text-amber-700 font-semibold">
                {metrics.overdue > 0 ? `${metrics.overdue} Overdue` : 'On schedule'}
              </span>
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-amber-500 !text-white shadow-2xs font-bold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'All Orders' : STATUS_BADGE_MAP[tab]?.label || tab}
              </button>
            ))}
          </div>

          {/* Search and Date Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex-1 min-w-[240px]">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Order #, Customer Name, Account, Quotation #..."
                  className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-800 transition-all font-medium"
                />
                <div className="absolute left-2.5 top-2 text-slate-400 text-xs">
                  🔍
                </div>
              </div>
            </div>

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
              {(startDate || endDate || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                    setSearchQuery('')
                  }}
                  className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors font-semibold cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Order Register Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px] tracking-tight">
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
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400 animate-pulse font-semibold">
                      Loading customer order register...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-500">
                      <div className="max-w-sm mx-auto space-y-2">
                        <p className="text-sm font-bold text-slate-900">No customer orders found</p>
                        <p className="text-xs text-slate-500">
                          {searchQuery || activeTab !== 'ALL'
                            ? 'No orders match your active filter criteria.'
                            : 'Create bespoke orders manually or convert approved quotations from the Quotation Desk.'}
                        </p>
                        {!searchQuery && activeTab === 'ALL' && (
                          <button
                            type="button"
                            onClick={() => setViewMode('create')}
                            className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs shadow-2xs cursor-pointer"
                            style={{ color: '#ffffff' }}
                          >
                            + New Custom Order
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-amber-50/30 transition-colors">
                      {/* Order Number */}
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(o.id)}
                          className="font-mono font-bold text-amber-700 hover:text-amber-900 hover:underline text-left cursor-pointer"
                        >
                          {o.orderNumber}
                        </button>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{o.metalType}</div>
                      </td>

                      {/* Booked Date */}
                      <td className="p-3 font-mono text-slate-800 whitespace-nowrap font-medium">
                        {formatDate(o.orderDate)}
                      </td>

                      {/* Customer */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900">
                          {o.customerName || o.accountName || 'Counter Customer'}
                        </div>
                        {o.customerCode && (
                          <div className="text-[10px] text-slate-500 font-mono font-semibold">
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
                          <span className="text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {o.quotationNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium italic">Direct</span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="p-3 text-center font-mono font-bold text-slate-800">{o.totalPcs}</td>

                      {/* Gross Wt */}
                      <td className="p-3 text-right font-mono text-slate-900 font-bold">
                        {formatWeight(o.totalGrossWeight)}
                      </td>

                      {/* Estimated Total */}
                      <td className="p-3 text-right font-mono font-extrabold text-amber-900 text-xs">
                        {formatCurrency(o.roundedTotal || o.grandTotal)}
                        {o.advanceAmount > 0 && (
                          <div className="text-[10px] font-bold text-emerald-700">
                            Adv: {formatCurrency(o.advanceAmount)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <StatusPill statusText={STATUS_BADGE_MAP[o.status]?.label || o.status} />
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Detail */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(o.id)}
                            className="px-2.5 py-1 text-xs border border-slate-300 rounded-md hover:bg-slate-100 text-slate-700 font-semibold transition-colors cursor-pointer"
                          >
                            View
                          </button>

                          {/* Print Docket */}
                          <button
                            type="button"
                            onClick={() => setPrintOrder(o)}
                            className="p-1 border border-slate-300 rounded-md hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors cursor-pointer"
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
                              className="px-2 py-1 text-xs bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 rounded-md transition-colors font-bold cursor-pointer"
                              title="Send to Workshop / In Progress"
                            >
                              Workshop
                            </button>
                          )}

                          {o.status === 'IN_PROGRESS' && (
                            <button
                              type="button"
                              onClick={() => handleQuickTransition(o, 'READY')}
                              className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded-md transition-colors font-bold cursor-pointer"
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
                              className="px-2.5 py-1 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-300 rounded-md transition-colors font-bold cursor-pointer"
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
