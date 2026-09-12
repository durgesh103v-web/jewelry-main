import React, { useState, useEffect } from 'react'
import type { CustomerAdvanceRecord, AdvanceStatus } from '../types'
import { formatDate, formatCurrency } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

interface AdvanceDetailModalProps {
  isOpen: boolean
  advanceId: string | null
  onClose: () => void
  onPrint: (advance: CustomerAdvanceRecord) => void
  onRefresh?: () => void
  onNavigateToOrder?: (orderId: string) => void
}

const STATUS_BADGE_MAP: Record<AdvanceStatus, { label: string; className: string }> = {
  RECEIVED: {
    label: 'Available',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold'
  },
  PARTIALLY_ALLOCATED: {
    label: 'Partially Consumed',
    className: 'bg-amber-100 text-amber-800 border-amber-200 font-bold'
  },
  FULLY_ALLOCATED: {
    label: 'Fully Consumed',
    className: 'bg-blue-100 text-blue-800 border-blue-200 font-bold'
  },
  REFUNDED: {
    label: 'Refunded',
    className: 'bg-purple-100 text-purple-800 border-purple-200 font-bold'
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-rose-100 text-rose-800 border-rose-200 font-bold'
  }
}

export const AdvanceDetailModal: React.FC<AdvanceDetailModalProps> = ({
  isOpen,
  advanceId,
  onClose,
  onPrint,
  onRefresh,
  onNavigateToOrder
}) => {
  const [advance, setAdvance] = useState<CustomerAdvanceRecord | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Cancellation State
  const [isConfirmingCancel, setIsConfirmingCancel] = useState<boolean>(false)
  const [isCancelling, setIsCancelling] = useState<boolean>(false)

  const loadAdvance = async () => {
    if (!advanceId) return
    setIsLoading(true)
    setError(null)
    try {
      if (window.api.advances && typeof window.api.advances.getById === 'function') {
        const data = await window.api.advances.getById(advanceId)
        setAdvance(data)
      }
    } catch (err) {
      console.error('Failed to load advance details:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen || !advanceId) {
      setAdvance(null)
      setError(null)
      setIsConfirmingCancel(false)
      setIsCancelling(false)
      return
    }

    void loadAdvance()
  }, [isOpen, advanceId])

  const handleCancelAdvance = async () => {
    if (!advance) return
    setIsCancelling(true)
    setError(null)
    try {
      await window.api.advances.cancel(advance.id)
      setIsConfirmingCancel(false)
      await loadAdvance()
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to cancel customer advance:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsCancelling(false)
    }
  }

  if (!isOpen) return null

  const statusBadge = advance
    ? STATUS_BADGE_MAP[advance.status] || { label: advance.status, className: 'bg-slate-100 text-slate-800 border-slate-200 font-bold' }
    : null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 max-w-3xl w-full max-h-[92vh] flex flex-col rounded-xl shadow-2xl border border-slate-200 overflow-hidden font-sans select-none">
        {/* ── Top Header Bar ── */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">💰</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Advance Receipt Voucher
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200">
                  {advance?.advanceNumber || '...'}
                </span>
                {statusBadge && (
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full border ${statusBadge.className}`}>
                    {statusBadge.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Receipt Date: {advance ? formatDate(advance.advanceDate) : '...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {advance && (
              <button
                type="button"
                onClick={() => onPrint(advance)}
                className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-slate-300 shadow-2xs cursor-pointer"
                title="Print Receipt Voucher"
              >
                <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print</span>
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

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <span className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs font-medium">Loading advance details...</p>
            </div>
          ) : advance ? (
            <>
              {/* 3 KPI Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                    Original Received
                  </span>
                  <div className="text-xl font-bold font-mono text-slate-900">
                    {formatCurrency(advance.amount)}
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Via {advance.paymentMethod}
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider block">
                    Allocated / Utilized
                  </span>
                  <div className="text-xl font-bold font-mono text-blue-700">
                    {formatCurrency(advance.allocatedAmount)}
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Adjusted against orders
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider block">
                    Available Balance
                  </span>
                  <div className="text-xl font-bold font-mono text-emerald-700">
                    {formatCurrency(advance.unallocatedAmount)}
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Usable for future orders/billing
                  </span>
                </div>
              </div>

              {/* Customer & Order Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Customer Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                    👤 Customer Details
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Customer Name:</span>
                      <span className="font-bold text-slate-900">
                        {advance.customerName || 'N/A'}
                      </span>
                    </div>
                    {advance.customerCode && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Customer Code:</span>
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {advance.customerCode}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Ledger Account:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[180px]">
                        {advance.accountName || advance.accountId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Linkage & Payment Details Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                    💳 Order Linkage &amp; Payment
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Linked Order:</span>
                      {advance.orderId ? (
                        onNavigateToOrder ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToOrder(advance.orderId!)}
                            className="font-mono font-bold text-amber-800 hover:text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>{advance.orderNumber || advance.orderId}</span>
                            <span>↗</span>
                          </button>
                        ) : (
                          <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {advance.orderNumber || advance.orderId}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 italic">
                          None (General Advance)
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Payment Method:</span>
                      <span className="font-bold text-slate-900">{advance.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Reference / UTR:</span>
                      <span className="font-mono font-semibold text-slate-900 truncate max-w-[180px]">
                        {advance.paymentReference || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes & Remarks */}
              {advance.notes && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs space-y-1 shadow-2xs">
                  <span className="font-bold text-amber-900 block text-[11px] uppercase tracking-wider">
                    📝 Notes &amp; Remarks:
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">{advance.notes}</p>
                </div>
              )}

              {/* Allocation History Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Utilization / Allocation History
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {advance.allocations && advance.allocations.length > 0
                      ? `${advance.allocations.length} allocation event(s)`
                      : 'No allocations recorded'}
                  </span>
                </div>

                {advance.allocations && advance.allocations.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px] tracking-tight">
                        <tr>
                          <th className="py-2.5 px-3">Allocation Date</th>
                          <th className="py-2.5 px-3">Target Order</th>
                          <th className="py-2.5 px-3 text-right">Allocated Amount</th>
                          <th className="py-2.5 px-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {advance.allocations.map((alloc) => (
                          <tr key={alloc.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 font-mono text-slate-700 font-medium">
                              {formatDate(alloc.allocationDate)}
                            </td>
                            <td className="py-2 px-3">
                              {alloc.orderNumber ? (
                                onNavigateToOrder ? (
                                  <button
                                    type="button"
                                    onClick={() => onNavigateToOrder(alloc.orderId)}
                                    className="font-mono font-bold text-amber-800 hover:text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:underline cursor-pointer"
                                  >
                                    {alloc.orderNumber} ↗
                                  </button>
                                ) : (
                                  <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    {alloc.orderNumber}
                                  </span>
                                )
                              ) : (
                                <span className="font-mono text-slate-600">
                                  {alloc.orderId}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(alloc.allocatedAmount)}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {alloc.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500 bg-white">
                    No order allocations recorded for this receipt. Full balance of{' '}
                    <strong className="text-slate-900 font-mono font-bold">{formatCurrency(advance.unallocatedAmount)}</strong>{' '}
                    is currently available for POS checkout or custom order adjustment.
                  </div>
                )}
              </div>

              {/* Audit Timestamps */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
                <div>
                  Created: {formatDate(advance.createdAt)}
                  {advance.createdBy ? ` by ${advance.createdBy}` : ''}
                </div>
                <div>Last Updated: {formatDate(advance.updatedAt)}</div>
              </div>
            </>
          ) : null}
        </div>

        {/* ── Footer Action Bar ── */}
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div>
            {advance && advance.status !== 'CANCELLED' && (
              <>
                {isConfirmingCancel ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-600">
                      Confirm void advance?
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCancelAdvance()}
                      disabled={isCancelling}
                      className="h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      {isCancelling ? 'Voiding...' : 'Yes, Void Advance'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingCancel(false)}
                      disabled={isCancelling}
                      className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingCancel(true)}
                    className="h-8 px-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors border border-rose-200 cursor-pointer"
                  >
                    Void / Cancel Advance
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {advance && (
              <button
                type="button"
                onClick={() => onPrint(advance)}
                className="h-8 px-4 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                style={{ color: '#ffffff' }}
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span className="!text-white" style={{ color: '#ffffff' }}>Print Receipt</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
