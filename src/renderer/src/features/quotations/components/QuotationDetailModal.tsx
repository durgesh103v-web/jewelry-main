import React, { useEffect, useState, useCallback } from 'react'
import type { QuotationRecord, QuotationStatus } from '../types'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'
import { QuotationPrintView } from './QuotationPrintView'
import {
  FiPrinter,
  FiX,
  FiCheckCircle,
  FiFileText,
  FiUser,
  FiCalendar,
  FiActivity,
  FiCheck,
  FiAlertCircle
} from 'react-icons/fi'

interface QuotationDetailModalProps {
  quotationId: string
  onClose: () => void
  onConverted?: (orderId: string, orderNumber: string) => void
  onStatusUpdated?: () => void
}

const STATUS_BADGE_MAP: Record<QuotationStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-700 border border-slate-300' },
  SENT: { label: 'Sent', className: 'bg-blue-100 text-blue-800 border border-blue-300' },
  ACCEPTED: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
  CONVERTED: { label: 'Converted to Order', className: 'bg-purple-100 text-purple-800 border border-purple-300 font-bold' },
  EXPIRED: { label: 'Expired', className: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold' },
  REJECTED: { label: 'Rejected', className: 'bg-rose-100 text-rose-800 border border-rose-300' },
  CANCELLED: { label: 'Cancelled', className: 'bg-slate-100 text-slate-600 border border-slate-300' }
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 max-w-5xl w-full max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-lg shadow-2xs font-bold">
              <FiFileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Quotation #{quotation?.quotationNumber || '...'}
                </h2>
                {quotation && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      STATUS_BADGE_MAP[quotation.status]?.className || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {STATUS_BADGE_MAP[quotation.status]?.label || quotation.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Detailed customer estimate breakdown, metal purity rates, and line-item specs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {quotation && (
              <button
                type="button"
                onClick={() => setShowPrintView(true)}
                className="h-8 px-3.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-slate-300 hover:border-amber-300 shadow-2xs cursor-pointer active:scale-95"
              >
                <FiPrinter size={13} className="text-slate-600" />
                <span>Print Slip</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
              title="Close"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 bg-slate-50/40">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex justify-between items-center shadow-2xs font-medium">
              <span className="flex items-center gap-1.5">
                <FiAlertCircle size={14} className="text-rose-600 shrink-0" />
                {error}
              </span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-600 hover:text-rose-800 font-bold ml-2 cursor-pointer"
              >
                <FiX size={14} />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs">
              <span className="flex items-center gap-1.5">
                <FiCheckCircle size={14} className="text-emerald-600 shrink-0" />
                {successMessage}
              </span>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-600 hover:text-emerald-800 font-bold ml-2 cursor-pointer"
              >
                <FiX size={14} />
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 text-center text-xs text-amber-800 font-semibold flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
              Loading quotation details...
            </div>
          ) : !quotation ? (
            <div className="py-16 text-center text-xs text-slate-500 font-medium">
              Quotation record not found.
            </div>
          ) : (
            <>
              {/* Header Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Customer Details */}
                <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase tracking-wider pb-1.5 border-b border-slate-100">
                    <FiUser size={13} className="text-amber-600" />
                    <span>Customer Info</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-slate-900">
                      {quotation.customerName || quotation.accountName || 'Counter Customer'}
                    </p>
                    {quotation.customerCode && (
                      <p className="text-xs text-slate-500 font-mono font-medium">
                        Code: <span className="text-slate-800 font-semibold">{quotation.customerCode}</span>
                      </p>
                    )}
                    {quotation.accountName && quotation.customerName && (
                      <p className="text-xs text-slate-500">
                        Account: <span className="text-slate-800 font-medium">{quotation.accountName}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Dates & Validity */}
                <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase tracking-wider pb-1.5 border-b border-slate-100">
                    <FiCalendar size={13} className="text-amber-600" />
                    <span>Timeline & Metal</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Quotation Date:</span>
                      <span className="font-semibold text-slate-800">{formatDate(quotation.quotationDate)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Valid Until:</span>
                      <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[11px] border border-amber-300 font-mono">
                        {formatDate(quotation.validUntil)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Metal Type:</span>
                      <span className="font-bold text-slate-900">{quotation.metalType || 'Gold'}</span>
                    </div>
                    {quotation.metalRateApplied > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Applied Rate:</span>
                        <span className="font-mono font-bold text-amber-900">
                          {formatCurrency(quotation.metalRateApplied)}/g
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Conversion & Audit */}
                <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase tracking-wider pb-1.5 border-b border-slate-100">
                    <FiActivity size={13} className="text-amber-600" />
                    <span>Status & Tracking</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Status:</span>
                      <span className="font-bold text-slate-900">{quotation.status}</span>
                    </div>
                    {quotation.convertedOrderId && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Order ID:</span>
                        <span className="font-mono text-xs text-purple-800 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 truncate max-w-[140px]">
                          {quotation.convertedOrderId}
                        </span>
                      </div>
                    )}
                    {quotation.createdBy && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Created By:</span>
                        <span className="text-slate-800 font-medium">{quotation.createdBy}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Created At:</span>
                      <span className="text-slate-800 font-medium">{formatDate(quotation.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-amber-500 rounded-full inline-block" />
                    <span>Quotation Line Items ({quotation.items?.length || 0})</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg shadow-2xs">
                    Total Gross: <strong className="text-amber-950 font-mono">{formatWeight(quotation.totalGrossWeight)} g</strong> | Net: <strong className="text-amber-950 font-mono">{formatWeight(quotation.totalNetWeight)} g</strong>
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold text-[11px] uppercase">
                        <th className="py-2.5 px-3 text-center w-10">#</th>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3 text-center">Pcs</th>
                        <th className="py-2.5 px-3 text-right">Gross (g)</th>
                        <th className="py-2.5 px-3 text-right">Net (g)</th>
                        <th className="py-2.5 px-3 text-center">Tunch / Wast</th>
                        <th className="py-2.5 px-3 text-right">Rate (/g)</th>
                        <th className="py-2.5 px-3 text-right">Metal Value</th>
                        <th className="py-2.5 px-3 text-right">Making</th>
                        <th className="py-2.5 px-3 text-right">Taxable</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quotation.items && quotation.items.length > 0 ? (
                        quotation.items.map((it, idx) => (
                          <tr key={it.id || idx} className="hover:bg-amber-50/40 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">
                                {it.description || it.itemName || 'Jewellery Line Item'}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex gap-2">
                                <span className="bg-amber-100 text-amber-900 font-semibold px-1.5 py-0.2 rounded border border-amber-200 text-[10px]">
                                  {it.metalType}
                                </span>
                                {it.barcode && <span className="font-mono text-slate-500">Barcode: {it.barcode}</span>}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-medium">{it.pcs}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium">{formatWeight(it.grossWeight)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium">{formatWeight(it.netWeight)}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-700 font-semibold">
                              {it.tunch}% {it.wastage > 0 ? `+${it.wastage}%` : ''}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium">
                              {it.goldRate > 0 ? formatCurrency(it.goldRate, false) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium">{formatCurrency(it.metalValue, false)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium">{formatCurrency(it.makingCharges, false)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium">{formatCurrency(it.taxableAmount, false)}</td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                              {formatCurrency(it.lineTotal)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-400 italic">
                            No items recorded in this quotation.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Summary & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-1">
                {/* Notes & Status Action Pills */}
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1.5 pb-1 border-b border-slate-100">
                      Remarks / Terms & Notes
                    </span>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                      {quotation.notes || 'No special notes or terms specified.'}
                    </p>
                  </div>

                  {/* Status Lifecycle Control (if not converted) */}
                  {quotation.status !== 'CONVERTED' && (
                    <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2.5 pb-1 border-b border-slate-100">
                        Change Quotation Status
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(['DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'REJECTED', 'CANCELLED'] as QuotationStatus[]).map(
                          (st) => {
                            const isCurrent = quotation.status === st
                            return (
                              <button
                                key={st}
                                type="button"
                                disabled={isUpdatingStatus || isCurrent}
                                onClick={() => handleStatusChange(st)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer active:scale-95 ${
                                  isCurrent
                                    ? 'bg-amber-500 text-white shadow-2xs border-amber-600 font-bold cursor-default'
                                    : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border-slate-300 hover:border-amber-300'
                                }`}
                              >
                                {STATUS_BADGE_MAP[st]?.label || st}
                              </button>
                            )
                          }
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Totals Card */}
                <div className="p-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-amber-100/30 to-white space-y-2 text-xs shadow-2xs">
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Total Items / Pieces:</span>
                    <span className="font-mono font-bold text-slate-900">{quotation.totalPcs} pcs</span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Total Gross Weight:</span>
                    <span className="font-mono font-bold text-slate-900">{formatWeight(quotation.totalGrossWeight)} g</span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Total Net Weight:</span>
                    <span className="font-mono font-bold text-slate-900">{formatWeight(quotation.totalNetWeight)} g</span>
                  </div>
                  <div className="border-t border-amber-200/80 pt-2 flex justify-between text-slate-600 font-medium">
                    <span>Metal Value:</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(quotation.metalValue)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Total Making Charges:</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(quotation.totalMajuri)}</span>
                  </div>
                  {quotation.totalCharges > quotation.totalMajuri && (
                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Other / Stone Charges:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(quotation.totalCharges - quotation.totalMajuri)}
                      </span>
                    </div>
                  )}
                  {quotation.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Discount Applied:</span>
                      <span className="font-mono">- {formatCurrency(quotation.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 font-medium border-t border-amber-200/80 pt-2">
                    <span>Taxable Amount:</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(quotation.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Estimated Tax (GST):</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(quotation.taxAmount)}</span>
                  </div>
                  <div className="border-t-2 border-amber-300 pt-2 flex justify-between items-center text-sm font-bold text-slate-900">
                    <span className="text-amber-950 font-bold">Grand Total Estimate:</span>
                    <span className="text-lg text-amber-900 font-mono font-black">
                      {formatCurrency(quotation.roundedTotal || quotation.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            {quotation && quotation.status !== 'CONVERTED' && quotation.status !== 'CANCELLED' && quotation.status !== 'REJECTED' && (
              <button
                type="button"
                disabled={isConverting}
                onClick={handleConvertToOrder}
                className="h-9 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
              >
                {isConverting ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Converting to Order...</span>
                  </>
                ) : (
                  <>
                    <FiCheck size={14} />
                    <span>Convert to Customer Order</span>
                  </>
                )}
              </button>
            )}

            {quotation?.status === 'CONVERTED' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-purple-800 font-bold bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
                <FiCheckCircle size={14} className="text-purple-600" />
                <span>Converted to Order</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs transition-colors border border-slate-300 shadow-2xs cursor-pointer active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
