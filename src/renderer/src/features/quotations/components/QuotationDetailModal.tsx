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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 max-w-5xl w-full max-h-[90vh] flex flex-col rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Quotation #{quotation?.quotationNumber || '...'}
                </h2>
                {quotation && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                      STATUS_BADGE_MAP[quotation.status]?.className || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {STATUS_BADGE_MAP[quotation.status]?.label || quotation.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed customer estimate breakdown, metal purity rates, and line-item specs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {quotation && (
              <button
                type="button"
                onClick={() => setShowPrintView(true)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-slate-300 shadow-2xs cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Slip
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-lg leading-none p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-xl text-xs flex justify-between items-center shadow-sm">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 font-bold ml-2">
                ✕
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex justify-between items-center shadow-sm">
              <span>✓ {successMessage}</span>
              <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 font-bold ml-2">
                ✕
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 text-center text-sm text-slate-400 animate-pulse">
              Loading quotation details...
            </div>
          ) : !quotation ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Quotation record not found.
            </div>
          ) : (
            <>
              {/* Header Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Customer Details */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Customer Info
                  </span>
                  <div className="mt-2 space-y-1">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      {quotation.customerName || quotation.accountName || 'Counter Customer'}
                    </p>
                    {quotation.customerCode && (
                      <p className="text-xs text-slate-500 font-mono">
                        Code: {quotation.customerCode}
                      </p>
                    )}
                    {quotation.accountName && quotation.customerName && (
                      <p className="text-xs text-slate-500">
                        Account: {quotation.accountName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dates & Validity */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Timeline & Metal
                  </span>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Quotation Date:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(quotation.quotationDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Valid Until:</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                        {formatDate(quotation.validUntil)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Metal Type:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{quotation.metalType || 'Gold'}</span>
                    </div>
                    {quotation.metalRateApplied > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Applied Rate:</span>
                        <span className="font-mono font-bold text-amber-800 dark:text-amber-300">
                          {formatCurrency(quotation.metalRateApplied)}/g
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Conversion & Audit */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Status & Tracking
                  </span>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{quotation.status}</span>
                    </div>
                    {quotation.convertedOrderId && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Order ID:</span>
                        <span className="font-mono text-xs text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 truncate max-w-[140px]">
                          {quotation.convertedOrderId}
                        </span>
                      </div>
                    )}
                    {quotation.createdBy && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Created By:</span>
                        <span className="text-slate-800 dark:text-slate-200">{quotation.createdBy}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Created At:</span>
                      <span className="text-slate-800 dark:text-slate-200">{formatDate(quotation.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Quotation Line Items ({quotation.items?.length || 0})</span>
                  </h3>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    Total Gross: <strong className="text-slate-800 dark:text-slate-200">{formatWeight(quotation.totalGrossWeight)}g</strong> | Net: <strong className="text-slate-800 dark:text-slate-200">{formatWeight(quotation.totalNetWeight)}g</strong>
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold">
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
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {quotation.items && quotation.items.length > 0 ? (
                        quotation.items.map((it, idx) => (
                          <tr key={it.id || idx} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {it.description || it.itemName || 'Jewellery Line Item'}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex gap-2">
                                <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-medium px-1.5 py-0.2 rounded">{it.metalType}</span>
                                {it.barcode && <span className="font-mono text-slate-400">Barcode: {it.barcode}</span>}
                              </div>
                            </td>
                            <td className="p-3 text-center font-mono font-medium">{it.pcs}</td>
                            <td className="p-3 text-right font-mono font-medium">{formatWeight(it.grossWeight)}</td>
                            <td className="p-3 text-right font-mono font-medium">{formatWeight(it.netWeight)}</td>
                            <td className="p-3 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {it.tunch}% {it.wastage > 0 ? `+${it.wastage}%` : ''}
                            </td>
                            <td className="p-3 text-right font-mono font-medium">
                              {it.goldRate > 0 ? formatCurrency(it.goldRate, false) : '-'}
                            </td>
                            <td className="p-3 text-right font-mono font-medium">{formatCurrency(it.metalValue, false)}</td>
                            <td className="p-3 text-right font-mono font-medium">{formatCurrency(it.makingCharges, false)}</td>
                            <td className="p-3 text-right font-mono font-medium">{formatCurrency(it.taxableAmount, false)}</td>
                            <td className="p-3 text-right font-bold font-mono text-slate-900 dark:text-white">
                              {formatCurrency(it.lineTotal)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={11} className="p-6 text-center text-slate-400 italic">
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
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                      Remarks / Terms & Notes
                    </span>
                    <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {quotation.notes || 'No special notes or terms specified.'}
                    </p>
                  </div>

                  {/* Status Lifecycle Control (if not converted) */}
                  {quotation.status !== 'CONVERTED' && (
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2.5">
                        Change Quotation Status
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {(['DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'REJECTED', 'CANCELLED'] as QuotationStatus[]).map(
                          (st) => (
                            <button
                              key={st}
                              type="button"
                              disabled={isUpdatingStatus || quotation.status === st}
                              onClick={() => handleStatusChange(st)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${quotation.status === st
                                  ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-sm cursor-default'
                                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
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
                <div className="p-5 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-transparent space-y-2.5 text-xs shadow-sm">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Total Items / Pieces:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{quotation.totalPcs} pcs</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Total Gross Weight:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatWeight(quotation.totalGrossWeight)} g</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Total Net Weight:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatWeight(quotation.totalNetWeight)} g</span>
                  </div>
                  <div className="border-t border-amber-200/60 dark:border-slate-800 pt-2 flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Metal Value:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(quotation.metalValue)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Total Making Charges:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(quotation.totalMajuri)}</span>
                  </div>
                  {quotation.totalCharges > quotation.totalMajuri && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Other / Stone Charges:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(quotation.totalCharges - quotation.totalMajuri)}
                      </span>
                    </div>
                  )}
                  {quotation.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>Discount Applied:</span>
                      <span className="font-mono">- {formatCurrency(quotation.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 border-t border-amber-200/60 dark:border-slate-800 pt-2">
                    <span>Taxable Amount:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(quotation.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Estimated Tax (GST):</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(quotation.taxAmount)}</span>
                  </div>
                  <div className="border-t-2 border-amber-300 dark:border-amber-800 pt-2.5 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
                    <span className="text-amber-900 dark:text-amber-300">Grand Total Estimate:</span>
                    <span className="text-lg text-amber-700 dark:text-amber-400 font-mono font-black">
                      {formatCurrency(quotation.roundedTotal || quotation.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            {quotation && quotation.status !== 'CONVERTED' && quotation.status !== 'CANCELLED' && quotation.status !== 'REJECTED' && (
              <button
                type="button"
                disabled={isConverting}
                onClick={handleConvertToOrder}
                style={{ color: '#ffffff' }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 !text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Convert to Customer Order
                  </>
                )}
              </button>
            )}

            {quotation?.status === 'CONVERTED' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800">
                ✓ Converted to Order
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
