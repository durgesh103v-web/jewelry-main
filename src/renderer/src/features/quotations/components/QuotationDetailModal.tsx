import React, { useEffect, useState, useCallback } from 'react'
import type { QuotationRecord, QuotationStatus } from '../types'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { QuotationPrintView } from './QuotationPrintView'

interface QuotationDetailModalProps {
  quotationId: string
  onClose: () => void
  onConverted?: (orderId: string, orderNumber: string) => void
  onStatusUpdated?: () => void
}

const STATUS_BADGE_MAP: Record<QuotationStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200' },
  SENT: { label: 'Sent', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  ACCEPTED: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  CONVERTED: { label: 'Converted to Order', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 font-semibold' },
  EXPIRED: { label: 'Expired', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  REJECTED: { label: 'Rejected', className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' },
  CANCELLED: { label: 'Cancelled', className: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' }
}

export const QuotationDetailModal: React.FC<QuotationDetailModalProps> = ({
  quotationId,
  onClose,
  onConverted,
  onStatusUpdated
}) => {
  const [quotation, setQuotation] = useState<QuotationRecord | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isConverting, setIsConverting] = useState<boolean>(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false)
  const [showPrintView, setShowPrintView] = useState<boolean>(false)

  const loadQuotation = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await window.api.quotations.getById(quotationId)
      setQuotation(data)
    } catch (err) {
      console.error('Failed to load quotation details:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [quotationId])

  useEffect(() => {
    void loadQuotation()
  }, [loadQuotation])

  const handleConvertToOrder = async () => {
    if (!quotation) return
    if (quotation.status === 'CONVERTED') {
      setError('This quotation has already been converted to an order.')
      return
    }
    if (quotation.status === 'CANCELLED' || quotation.status === 'REJECTED') {
      setError(`Cannot convert a ${quotation.status.toLowerCase()} quotation.`)
      return
    }

    const confirmConvert = window.confirm(
      `Are you sure you want to convert Quotation #${quotation.quotationNumber} to a Customer Order? This will generate a confirmed order in the system.`
    )
    if (!confirmConvert) return

    setIsConverting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const order = await window.api.quotations.convertToOrder(quotation.id)
      setSuccessMessage(`Quotation converted successfully to Order #${order.orderNumber}!`)
      await loadQuotation()
      if (onConverted && order) {
        onConverted(order.id, order.orderNumber)
      }
      if (onStatusUpdated) {
        onStatusUpdated()
      }
    } catch (err) {
      console.error('Error converting quotation to order:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsConverting(false)
    }
  }

  const handleStatusChange = async (newStatus: QuotationStatus) => {
    if (!quotation) return
    setIsUpdatingStatus(true)
    setError(null)
    try {
      await window.api.quotations.updateStatus(quotation.id, newStatus)
      await loadQuotation()
      if (onStatusUpdated) {
        onStatusUpdated()
      }
    } catch (err) {
      console.error('Error updating quotation status:', err)
      setError(getFriendlyErrorMessage(err))
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (showPrintView && quotation) {
    return <QuotationPrintView quotation={quotation} onClose={() => setShowPrintView(false)} />
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
      <div className="bg-background text-foreground max-w-5xl w-full max-h-[90vh] flex flex-col rounded-xl shadow-2xl border border-border overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">
                  Quotation #{quotation?.quotationNumber || '...'}
                </h2>
                {quotation && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_BADGE_MAP[quotation.status]?.className || 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {STATUS_BADGE_MAP[quotation.status]?.label || quotation.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Detailed customer estimate breakdown and line-item specs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {quotation && (
              <button
                type="button"
                onClick={() => setShowPrintView(true)}
                className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Voucher
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-lg leading-none p-1 rounded-md hover:bg-accent"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg text-xs flex justify-between items-center">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
                ✕
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-medium flex justify-between items-center">
              <span>✓ {successMessage}</span>
              <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
                ✕
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
              Loading quotation details...
            </div>
          ) : !quotation ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Quotation record not found.
            </div>
          ) : (
            <>
              {/* Header Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Customer Details */}
                <div className="p-4 rounded-xl border border-border bg-card">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Customer Info
                  </span>
                  <div className="mt-2 space-y-1">
                    <p className="font-semibold text-sm text-foreground">
                      {quotation.customerName || quotation.accountName || 'Counter Customer'}
                    </p>
                    {quotation.customerCode && (
                      <p className="text-xs text-muted-foreground font-mono">
                        Code: {quotation.customerCode}
                      </p>
                    )}
                    {quotation.accountName && quotation.customerName && (
                      <p className="text-xs text-muted-foreground">
                        Account: {quotation.accountName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dates & Validity */}
                <div className="p-4 rounded-xl border border-border bg-card">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Timeline & Metal
                  </span>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quotation Date:</span>
                      <span className="font-medium text-foreground">{formatDate(quotation.quotationDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valid Until:</span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {formatDate(quotation.validUntil)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Metal Type:</span>
                      <span className="font-semibold text-foreground">{quotation.metalType || 'Gold'}</span>
                    </div>
                    {quotation.metalRateApplied > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Applied Rate:</span>
                        <span className="font-mono font-medium text-foreground">
                          {formatCurrency(quotation.metalRateApplied)}/g
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Conversion & Audit */}
                <div className="p-4 rounded-xl border border-border bg-card">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Status & Tracking
                  </span>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-semibold text-foreground">{quotation.status}</span>
                    </div>
                    {quotation.convertedOrderId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order ID:</span>
                        <span className="font-mono text-xs text-primary font-medium truncate max-w-[140px]">
                          {quotation.convertedOrderId}
                        </span>
                      </div>
                    )}
                    {quotation.createdBy && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created By:</span>
                        <span className="text-foreground">{quotation.createdBy}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created At:</span>
                      <span className="text-foreground">{formatDate(quotation.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold tracking-wide text-foreground flex items-center justify-between">
                  <span>Quotation Line Items ({quotation.items?.length || 0})</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Total Gross: {formatWeight(quotation.totalGrossWeight)}g | Net: {formatWeight(quotation.totalNetWeight)}g
                  </span>
                </h3>

                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                        <th className="p-3 text-center w-10">#</th>
                        <th className="p-3">Item Description</th>
                        <th className="p-3 text-center">Pcs</th>
                        <th className="p-3 text-right">Gross (g)</th>
                        <th className="p-3 text-right">Net (g)</th>
                        <th className="p-3 text-center">Tunch / Wast</th>
                        <th className="p-3 text-right">Rate (/g)</th>
                        <th className="p-3 text-right">Metal Value</th>
                        <th className="p-3 text-right">Making</th>
                        <th className="p-3 text-right">Taxable</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {quotation.items && quotation.items.length > 0 ? (
                        quotation.items.map((it, idx) => (
                          <tr key={it.id || idx} className="hover:bg-accent/40 transition-colors">
                            <td className="p-3 text-center font-mono text-muted-foreground">{idx + 1}</td>
                            <td className="p-3">
                              <div className="font-semibold text-foreground">
                                {it.description || it.itemName || 'Jewellery Line Item'}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5 flex gap-2">
                                <span>{it.metalType}</span>
                                {it.barcode && <span className="font-mono">Barcode: {it.barcode}</span>}
                              </div>
                            </td>
                            <td className="p-3 text-center font-mono">{it.pcs}</td>
                            <td className="p-3 text-right font-mono">{formatWeight(it.grossWeight)}</td>
                            <td className="p-3 text-right font-mono">{formatWeight(it.netWeight)}</td>
                            <td className="p-3 text-center font-mono text-[11px]">
                              {it.tunch}% {it.wastage > 0 ? `+${it.wastage}%` : ''}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {it.goldRate > 0 ? formatCurrency(it.goldRate, false) : '-'}
                            </td>
                            <td className="p-3 text-right font-mono">{formatCurrency(it.metalValue, false)}</td>
                            <td className="p-3 text-right font-mono">{formatCurrency(it.makingCharges, false)}</td>
                            <td className="p-3 text-right font-mono">{formatCurrency(it.taxableAmount, false)}</td>
                            <td className="p-3 text-right font-semibold font-mono text-foreground">
                              {formatCurrency(it.lineTotal)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={11} className="p-6 text-center text-muted-foreground italic">
                            No items recorded in this quotation.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Summary & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2">
                {/* Notes & Status Action Pills */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-border bg-card">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Remarks / Notes
                    </span>
                    <p className="mt-2 text-xs text-foreground whitespace-pre-wrap">
                      {quotation.notes || 'No special notes or terms specified.'}
                    </p>
                  </div>

                  {/* Status Lifecycle Control (if not converted) */}
                  {quotation.status !== 'CONVERTED' && (
                    <div className="p-4 rounded-xl border border-border bg-card">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                        Update Status
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {(['DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'REJECTED', 'CANCELLED'] as QuotationStatus[]).map(
                          (st) => (
                            <button
                              key={st}
                              type="button"
                              disabled={isUpdatingStatus || quotation.status === st}
                              onClick={() => handleStatusChange(st)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                                quotation.status === st
                                  ? 'border-primary bg-primary/10 text-primary cursor-default'
                                  : 'border-border hover:bg-accent text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {STATUS_BADGE_MAP[st]?.label || st}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Totals Card */}
                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Items / Pieces:</span>
                    <span className="font-mono font-medium text-foreground">{quotation.totalPcs} pcs</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Gross Weight:</span>
                    <span className="font-mono font-medium text-foreground">{formatWeight(quotation.totalGrossWeight)} g</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Net Weight:</span>
                    <span className="font-mono font-medium text-foreground">{formatWeight(quotation.totalNetWeight)} g</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between text-muted-foreground">
                    <span>Metal Value:</span>
                    <span className="font-mono font-medium text-foreground">{formatCurrency(quotation.metalValue)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Making Charges:</span>
                    <span className="font-mono font-medium text-foreground">{formatCurrency(quotation.totalMajuri)}</span>
                  </div>
                  {quotation.totalCharges > quotation.totalMajuri && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Other / Stone Charges:</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(quotation.totalCharges - quotation.totalMajuri)}
                      </span>
                    </div>
                  )}
                  {quotation.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Discount:</span>
                      <span className="font-mono font-medium">- {formatCurrency(quotation.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground border-t border-border pt-2">
                    <span>Taxable Amount:</span>
                    <span className="font-mono font-medium text-foreground">{formatCurrency(quotation.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Estimated Tax (GST):</span>
                    <span className="font-mono font-medium text-foreground">{formatCurrency(quotation.taxAmount)}</span>
                  </div>
                  <div className="border-t-2 border-border pt-2 flex justify-between items-center text-sm font-bold text-foreground">
                    <span>Grand Total:</span>
                    <span className="text-base text-primary font-mono">
                      {formatCurrency(quotation.roundedTotal || quotation.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            {quotation && quotation.status !== 'CONVERTED' && quotation.status !== 'CANCELLED' && quotation.status !== 'REJECTED' && (
              <button
                type="button"
                disabled={isConverting}
                onClick={handleConvertToOrder}
                className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg text-xs hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConverting ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Converting to Order...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Convert to Customer Order
                  </>
                )}
              </button>
            )}

            {quotation?.status === 'CONVERTED' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 font-medium">
                ✓ Converted to Order
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg text-xs hover:bg-secondary/80 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
