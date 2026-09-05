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
    label: 'Available (Unadjusted)',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold border-emerald-300 dark:border-emerald-700'
  },
  PARTIALLY_ALLOCATED: {
    label: 'Partially Consumed',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-medium border-amber-300 dark:border-amber-700'
  },
  FULLY_ALLOCATED: {
    label: 'Fully Utilized',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-medium border-blue-300 dark:border-blue-700'
  },
  REFUNDED: {
    label: 'Refunded',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300 dark:border-purple-700'
  },
  CANCELLED: {
    label: 'Cancelled (Reversed)',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300 dark:border-rose-700'
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
    ? STATUS_BADGE_MAP[advance.status] || { label: advance.status, className: 'bg-zinc-100 text-zinc-800' }
    : null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
      <div className="bg-background text-foreground max-w-3xl w-full max-h-[92vh] flex flex-col rounded-xl shadow-2xl border border-border overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Advance Receipt Voucher</h2>
                <span className="font-mono text-sm px-2.5 py-0.5 rounded bg-primary/10 text-primary font-bold border border-primary/20">
                  {advance?.advanceNumber || '...'}
                </span>
                {statusBadge && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border ${statusBadge.className}`}>
                    {statusBadge.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receipt Date: {advance ? formatDate(advance.advanceDate) : '...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {advance && (
              <button
                type="button"
                onClick={() => onPrint(advance)}
                className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 font-medium rounded-lg text-xs transition-colors flex items-center gap-1 border border-primary/20"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Receipt
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-lg leading-none p-1.5 rounded-md hover:bg-accent"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg text-xs flex justify-between items-center">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 font-bold">
                ✕
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <svg className="animate-spin h-6 w-6 mb-2 text-primary" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs">Loading advance details...</p>
            </div>
          ) : advance ? (
            <>
              {/* Authoritative Financial Balance Summary Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-border bg-gradient-to-br from-card to-muted/20">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Original Received
                  </span>
                  <div className="text-xl font-bold text-foreground">
                    {formatCurrency(advance.amount)}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Via {advance.paymentMethod}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Allocated / Utilized
                  </span>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(advance.allocatedAmount)}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Adjusted against orders/invoices
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Available Balance
                  </span>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(advance.unallocatedAmount)}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Authoritative unadjusted liability
                  </span>
                </div>
              </div>

              {/* Customer & Order Context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Information */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider block border-b border-border pb-1">
                    Customer Details
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer Name:</span>
                      <span className="font-semibold text-foreground">
                        {advance.customerName || 'N/A'}
                      </span>
                    </div>
                    {advance.customerCode && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Customer Code:</span>
                        <span className="font-mono text-foreground">{advance.customerCode}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Financial Account:</span>
                      <span className="text-foreground">{advance.accountName || advance.accountId}</span>
                    </div>
                  </div>
                </div>

                {/* Linked Order & Payment Info */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider block border-b border-border pb-1">
                    Order Linkage & Payment
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Linked Order:</span>
                      {advance.orderId ? (
                        onNavigateToOrder ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToOrder(advance.orderId!)}
                            className="font-mono font-semibold text-primary hover:underline"
                          >
                            {advance.orderNumber || advance.orderId} ↗
                          </button>
                        ) : (
                          <span className="font-mono font-semibold text-foreground">
                            {advance.orderNumber || advance.orderId}
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground italic">
                          None (General Unlinked Advance)
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Method:</span>
                      <span className="font-medium text-foreground">{advance.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference / UTR / Cheque:</span>
                      <span className="font-mono text-foreground">
                        {advance.paymentReference || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remarks / Notes */}
              {advance.notes && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs">
                  <span className="font-semibold text-foreground block mb-0.5">Notes & Remarks:</span>
                  <p className="text-muted-foreground leading-relaxed">{advance.notes}</p>
                </div>
              )}

              {/* Allocation History */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Utilization / Allocation History
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    {advance.allocations && advance.allocations.length > 0
                      ? `${advance.allocations.length} allocation event(s)`
                      : 'No allocations recorded'}
                  </span>
                </div>

                {advance.allocations && advance.allocations.length > 0 ? (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/70 text-muted-foreground border-b border-border">
                        <tr>
                          <th className="py-2 px-3 font-semibold">Allocation Date</th>
                          <th className="py-2 px-3 font-semibold">Target Order</th>
                          <th className="py-2 px-3 font-semibold text-right">Allocated Amount</th>
                          <th className="py-2 px-3 font-semibold">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {advance.allocations.map((alloc) => (
                          <tr key={alloc.id} className="hover:bg-muted/30">
                            <td className="py-2 px-3 font-mono">
                              {formatDate(alloc.allocationDate)}
                            </td>
                            <td className="py-2 px-3">
                              {alloc.orderNumber ? (
                                onNavigateToOrder ? (
                                  <button
                                    type="button"
                                    onClick={() => onNavigateToOrder(alloc.orderId)}
                                    className="font-mono font-medium text-primary hover:underline"
                                  >
                                    {alloc.orderNumber} ↗
                                  </button>
                                ) : (
                                  <span className="font-mono font-medium text-foreground">
                                    {alloc.orderNumber}
                                  </span>
                                )
                              ) : (
                                <span className="font-mono text-muted-foreground">
                                  {alloc.orderId}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-foreground">
                              {formatCurrency(alloc.allocatedAmount)}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {alloc.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground">
                    No order allocations recorded for this receipt. Full balance of{' '}
                    <strong className="text-foreground">{formatCurrency(advance.unallocatedAmount)}</strong>{' '}
                    is currently available for POS checkout or custom order adjustment.
                  </div>
                )}
              </div>

              {/* Audit Timestamps */}
              <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between text-[11px] text-muted-foreground">
                <div>
                  Created: {formatDate(advance.createdAt)}
                  {advance.createdBy ? ` by ${advance.createdBy}` : ''}
                </div>
                <div>Last Updated: {formatDate(advance.updatedAt)}</div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/40">
          <div>
            {advance && advance.status !== 'CANCELLED' && (
              <>
                {isConfirmingCancel ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      Confirm cancellation? Reverses accounting & allocations:
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCancelAdvance()}
                      disabled={isCancelling}
                      className="px-3 py-1 bg-rose-600 text-white rounded text-xs font-medium hover:bg-rose-700 disabled:opacity-50"
                    >
                      {isCancelling ? 'Cancelling...' : 'Yes, Cancel Advance'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingCancel(false)}
                      disabled={isCancelling}
                      className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded text-xs hover:bg-secondary/80"
                    >
                      Back
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingCancel(true)}
                    className="px-3 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-medium transition-colors border border-rose-200 dark:border-rose-900"
                  >
                    Cancel / Void Advance
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
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Receipt
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-input bg-background hover:bg-muted transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
