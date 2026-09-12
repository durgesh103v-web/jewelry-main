import React, { useEffect, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import type { CustomerOrderRecord, OrderStatus } from '../types'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { OrderPrintView } from './OrderPrintView'

interface OrderDetailModalProps {
  orderId: string
  onClose: () => void
  onStatusUpdated?: () => void
  onNavigateToQuotation?: (quotationId: string) => void
  onCollectAdvance?: (customerId: string, orderId: string) => void
}

const STATUS_BADGE_MAP: Record<OrderStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-800 border-slate-200 font-bold' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800 border-blue-200 font-bold' },
  IN_PROGRESS: { label: 'In Workshop / Progress', className: 'bg-amber-100 text-amber-800 border-amber-200 font-bold' },
  READY: { label: 'Ready for Delivery', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold' },
  COMPLETED: { label: 'Completed / Invoiced', className: 'bg-purple-100 text-purple-800 border-purple-200 font-bold' },
  CANCELLED: { label: 'Cancelled', className: 'bg-rose-100 text-rose-800 border-rose-200 font-bold' }
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  orderId,
  onClose,
  onStatusUpdated,
  onNavigateToQuotation,
  onCollectAdvance
}) => {
  const [order, setOrder] = useState<CustomerOrderRecord | null>(null)
  const [advanceSummary, setAdvanceSummary] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false)
  const [showPrintView, setShowPrintView] = useState<boolean>(false)

  const loadOrder = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await window.api.orders.getById(orderId)
      setOrder(data)

      // Fetch advance summary if available
      try {
        if (window.api.advances && typeof window.api.advances.getOrderBalance === 'function') {
          const adv = await window.api.advances.getOrderBalance(orderId)
          setAdvanceSummary(adv)
        }
      } catch {
        // Non-fatal if no advance linked
      }
    } catch (err) {
      console.error('Failed to load order details:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    void loadOrder()
  }, [loadOrder])

  const handleStatusTransition = async (newStatus: OrderStatus) => {
    if (!order) return
    setIsUpdatingStatus(true)
    setError(null)
    setSuccessMessage(null)
    try {
      await window.api.orders.updateStatus(order.id, newStatus)
      setSuccessMessage(`Order status updated to "${STATUS_BADGE_MAP[newStatus]?.label || newStatus}"`)
      await loadOrder()
      if (onStatusUpdated) {
        onStatusUpdated()
      }
    } catch (err) {
      console.error('Error updating order status:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!order) return
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel Customer Order #${order.orderNumber}? Cancelled orders cannot be billed at POS.`
    )
    if (!confirmCancel) return

    await handleStatusTransition('CANCELLED')
  }

  // Delivery timing presentation helper
  const getDeliveryTimingBadge = () => {
    if (!order || !order.expectedDeliveryDate || order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      return null
    }

    const today = dayjs().startOf('day')
    const due = dayjs(order.expectedDeliveryDate).startOf('day')
    const diffDays = due.diff(today, 'day')

    if (diffDays < 0) {
      return (
        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold">
          Overdue by {Math.abs(diffDays)} day{Math.abs(diffDays) > 1 ? 's' : ''}
        </span>
      )
    }
    if (diffDays === 0) {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold">
          Due Today
        </span>
      )
    }
    if (diffDays <= 3) {
      return (
        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold">
          Due in {diffDays} day{diffDays > 1 ? 's' : ''}
        </span>
      )
    }
    return null
  }

  if (showPrintView && order) {
    return <OrderPrintView order={order} onClose={() => setShowPrintView(false)} />
  }

  const effectiveAdvance = advanceSummary?.totalAdvanceAllocated ?? (order?.advanceAmount || 0)
  const balanceDue = Math.max(0, (order?.roundedTotal || order?.grandTotal || 0) - effectiveAdvance)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 max-w-5xl w-full max-h-[92vh] flex flex-col rounded-xl shadow-2xl border border-slate-200 overflow-hidden font-sans select-none">
        {/* ── Top Header Bar ── */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">✨</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Order #{order?.orderNumber || '...'}
                </h2>
                {order && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${
                      STATUS_BADGE_MAP[order.status]?.className || 'bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                  >
                    {STATUS_BADGE_MAP[order.status]?.label || order.status}
                  </span>
                )}
                {getDeliveryTimingBadge()}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Custom jewellery bespoke order specifications, pricing snapshot, and lifecycle management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {order && (
              <button
                type="button"
                onClick={() => setShowPrintView(true)}
                className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-slate-300 shadow-2xs cursor-pointer"
                title="Print Order Docket"
              >
                <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print Docket</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-base leading-none p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Main Content Body ── */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex justify-between items-center shadow-2xs">
              <span>⚠️ {error}</span>
              <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer">
                ✕
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex justify-between items-center shadow-2xs">
              <span>✓ {successMessage}</span>
              <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 font-bold cursor-pointer">
                ✕
              </button>
            </div>
          )}

          {/* Ready for Delivery Banner */}
          {order?.status === 'READY' && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <h4 className="font-bold text-xs text-emerald-900 uppercase tracking-wide">
                    Order Ready for Delivery / POS Invoicing
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    This order is verified and ready. You can attach it directly in POS Billing via &quot;Order Selector&quot;.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => handleStatusTransition('COMPLETED')}
                className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 !text-white font-bold text-xs rounded-lg transition-colors shadow-2xs cursor-pointer"
                style={{ color: '#ffffff' }}
              >
                Mark Delivered / Invoiced
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <span className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs font-medium">Loading customer order details...</p>
            </div>
          ) : !order ? (
            <div className="py-16 text-center text-sm text-slate-500">
              Order record not found.
            </div>
          ) : (
            <>
              {/* Header Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Customer Details */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                    👤 Customer Details
                  </span>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-sm text-slate-900">
                      {order.customerName || order.accountName || 'Counter Customer'}
                    </p>
                    {order.customerCode && (
                      <div className="flex justify-between items-center pt-0.5">
                        <span className="text-slate-500">Code:</span>
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {order.customerCode}
                        </span>
                      </div>
                    )}
                    {order.accountName && order.customerName && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Account:</span>
                        <span className="text-slate-700 font-medium truncate max-w-[170px]">
                          {order.accountName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline & Specs */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                    📅 Timeline &amp; Specs
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Booking Date:</span>
                      <span className="font-semibold text-slate-900">{formatDate(order.orderDate)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Expected Due:</span>
                      <span className="font-bold text-amber-800 font-mono">
                        {formatDate(order.expectedDeliveryDate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Metal Type:</span>
                      <span className="font-bold text-slate-900">{order.metalType || 'Gold'}</span>
                    </div>
                    {order.pricingSnapshot?.metal?.ratePerGram ? (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Booked Gold Rate:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(order.pricingSnapshot.metal.ratePerGram)}/g
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Source & Tracking */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                    🔍 Source &amp; Tracking
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Status:</span>
                      <span className="font-bold text-slate-900">{order.status}</span>
                    </div>
                    {order.quotationNumber ? (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Source Quotation:</span>
                        {order.quotationId && onNavigateToQuotation ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToQuotation(order.quotationId!)}
                            className="font-mono text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:underline font-bold cursor-pointer"
                          >
                            {order.quotationNumber} ↗
                          </button>
                        ) : (
                          <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {order.quotationNumber}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Origin:</span>
                        <span className="text-slate-700 font-medium">Direct Order</span>
                      </div>
                    )}
                    {order.createdBy && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Created By:</span>
                        <span className="text-slate-800 font-medium">{order.createdBy}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Booked At:</span>
                      <span className="text-slate-800">{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Specifications Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Custom Jewellery Specifications ({order.items?.length || 0})
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Target Gross: {formatWeight(order.totalGrossWeight)} | Target Net: {formatWeight(order.totalNetWeight)}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px] tracking-tight">
                        <th className="p-2.5 text-center w-10">#</th>
                        <th className="p-2.5">Item / Specifications</th>
                        <th className="p-2.5 text-center">Pcs</th>
                        <th className="p-2.5 text-right">Gross</th>
                        <th className="p-2.5 text-right">Net</th>
                        <th className="p-2.5 text-center">Purity / Tunch</th>
                        <th className="p-2.5 text-right">Booked Rate</th>
                        <th className="p-2.5 text-right">Metal Value</th>
                        <th className="p-2.5 text-right">Making</th>
                        <th className="p-2.5 text-right">Est. Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((it, idx) => (
                          <tr key={it.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900">
                                {it.description || it.itemName || 'Custom Item'}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex gap-2">
                                <span className="font-medium text-amber-800">{it.metalType}</span>
                                {it.barcode && <span className="font-mono">BC: {it.barcode}</span>}
                              </div>
                            </td>
                            <td className="p-2.5 text-center font-mono font-medium">{it.pcs}</td>
                            <td className="p-2.5 text-right font-mono font-medium">{formatWeight(it.grossWeight)}</td>
                            <td className="p-2.5 text-right font-mono font-medium">{formatWeight(it.netWeight)}</td>
                            <td className="p-2.5 text-center font-mono text-[11px]">
                              {it.tunch}% {it.wastage > 0 ? `+${it.wastage}%` : ''}
                            </td>
                            <td className="p-2.5 text-right font-mono">
                              {it.goldRate > 0 ? formatCurrency(it.goldRate, false) : '-'}
                            </td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(it.metalValue, false)}</td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(it.makingCharges, false)}</td>
                            <td className="p-2.5 text-right font-bold font-mono text-slate-900">
                              {formatCurrency(it.lineTotal)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-500 italic">
                            No items recorded in this order.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Summary, Remarks & Workflow Transition Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-1">
                {/* Remarks & Workflow Transitions */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-100 pb-1">
                      📝 Special Instructions / Notes
                    </span>
                    <p className="pt-1 text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                      {order.notes || 'No special design instructions recorded.'}
                    </p>
                  </div>

                  {/* Production & Lifecycle Transitions */}
                  {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-100 pb-1">
                        ⚡ Lifecycle Workflow Transitions
                      </span>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {order.status === 'DRAFT' && (
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => handleStatusTransition('CONFIRMED')}
                            className="h-8 px-4 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 !text-white shadow-2xs transition-colors cursor-pointer"
                            style={{ color: '#ffffff' }}
                          >
                            ✓ Confirm Order
                          </button>
                        )}

                        {order.status === 'CONFIRMED' && (
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => handleStatusTransition('IN_PROGRESS')}
                            className="h-8 px-4 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                            style={{ color: '#ffffff' }}
                          >
                            <span>🔨</span>
                            <span>Send to Workshop / In Progress</span>
                          </button>
                        )}

                        {order.status === 'IN_PROGRESS' && (
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => handleStatusTransition('READY')}
                            className="h-8 px-4 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 !text-white shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                            style={{ color: '#ffffff' }}
                          >
                            <span>✨</span>
                            <span>Mark Ready for Delivery</span>
                          </button>
                        )}

                        {order.status === 'READY' && (
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => handleStatusTransition('COMPLETED')}
                            className="h-8 px-4 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 !text-white shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                            style={{ color: '#ffffff' }}
                          >
                            <span>✓</span>
                            <span>Complete Order / Handover</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={handleCancelOrder}
                          className="h-8 px-3.5 rounded-lg text-xs font-semibold border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          ✕ Cancel Order
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Totals & Advance Summary Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Pieces / Weights:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {order.totalPcs} pcs | {formatWeight(order.totalGrossWeight)} Gross
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Estimated Metal Value:</span>
                    <span className="font-mono font-medium text-slate-900">{formatCurrency(order.metalValue)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total Making Charges:</span>
                    <span className="font-mono font-medium text-slate-900">{formatCurrency(order.totalMajuri)}</span>
                  </div>
                  {order.totalCharges > order.totalMajuri && (
                    <div className="flex justify-between text-slate-600">
                      <span>Other / Stone Charges:</span>
                      <span className="font-mono font-medium text-slate-900">
                        {formatCurrency(order.totalCharges - order.totalMajuri)}
                      </span>
                    </div>
                  )}
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span className="font-mono font-medium">- {formatCurrency(order.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-2">
                    <span>Estimated Tax (GST):</span>
                    <span className="font-mono font-medium text-slate-900">{formatCurrency(order.taxAmount)}</span>
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-sm font-bold text-slate-900">
                    <span>Estimated Grand Total:</span>
                    <span className="text-base text-amber-800 font-mono font-extrabold">
                      {formatCurrency(order.roundedTotal || order.grandTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-emerald-700 font-semibold pt-1">
                    <div className="flex items-center gap-2">
                      <span>Advance Received / Allocated:</span>
                      {onCollectAdvance && order.customerId && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => onCollectAdvance(order.customerId!, order.id)}
                          className="px-2 py-0.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 !text-white rounded font-bold transition-colors shadow-2xs cursor-pointer"
                          style={{ color: '#ffffff' }}
                          title="Collect advance receipt against this order"
                        >
                          + Collect Advance
                        </button>
                      )}
                    </div>
                    <span className="font-mono font-bold">{formatCurrency(effectiveAdvance)}</span>
                  </div>

                  <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg flex justify-between items-center text-amber-900 font-bold">
                    <span>Estimated Balance Due:</span>
                    <span className="text-base font-mono font-extrabold text-amber-800">
                      {formatCurrency(balanceDue)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div>
            {order?.status === 'COMPLETED' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-purple-700 font-bold">
                ✓ Order Completed &amp; Invoiced
              </span>
            )}
            {order?.status === 'CANCELLED' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-rose-700 font-bold">
                ✕ Order Cancelled
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {order && (
              <button
                type="button"
                onClick={() => setShowPrintView(true)}
                className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                style={{ color: '#ffffff' }}
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span className="!text-white" style={{ color: '#ffffff' }}>Print Docket</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs border border-slate-300 transition-colors shadow-2xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
