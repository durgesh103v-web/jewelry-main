import React, { useEffect, useState } from 'react'
import type { CustomerOrderRecord } from '../types'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'

interface OrderPrintViewProps {
  order: CustomerOrderRecord
  onClose: () => void
}

export const OrderPrintView: React.FC<OrderPrintViewProps> = ({ order, onClose }) => {
  const [firm, setFirm] = useState<any>(null)

  useEffect(() => {
    let active = true
    const loadFirm = async () => {
      try {
        if (window.api.firm && typeof window.api.firm.get === 'function') {
          const data = await window.api.firm.get()
          if (active) setFirm(data)
        }
      } catch (err) {
        console.error('Failed to load firm details for order print:', err)
      }
    }
    void loadFirm()
    return () => {
      active = false
    }
  }, [])

  const items = order.items || []
  const balanceDue = Math.max(0, (order.roundedTotal || order.grandTotal) - (order.advanceAmount || 0))

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex justify-center p-4 print:p-0 print:static print:bg-white select-none">
      {/* Container / Modal Wrapper */}
      <div className="bg-white text-slate-900 max-w-4xl w-full my-auto max-h-[95vh] flex flex-col rounded-2xl shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:p-0 print:my-0 print:max-w-none print:w-full print:max-h-none font-sans">
        {/* Print Header Bar (Screen Only) */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-xl">🧾</span>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Custom Order Docket Preview
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Order Docket #{order.orderNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="h-8 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Order Docket</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs border border-slate-300 transition-colors shadow-2xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Scrollable Document Preview Area */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-100/70 print:bg-white print:p-0">
          {/* Printable Order Docket Voucher Sheet */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm print:border-none print:shadow-none print:p-0 mx-auto max-w-3xl font-sans text-xs leading-relaxed text-zinc-900">
            {/* Shop & Firm Header */}
            <div className="text-center border-b-2 border-zinc-800 pb-3 mb-3">
              <h1 className="text-xl font-extrabold tracking-wider uppercase text-zinc-900">
                {firm?.firmName || 'SHREE JEWELLERY'}
              </h1>
              {firm?.ownerName && (
                <p className="text-[11px] font-medium text-zinc-600">Prop: {firm.ownerName}</p>
              )}
              <p className="text-[11px] text-zinc-600 mt-0.5">
                {[firm?.address, firm?.city, firm?.state, firm?.pincode].filter(Boolean).join(', ')}
              </p>
              <div className="flex justify-center gap-4 text-[11px] text-zinc-600 mt-0.5 font-mono">
                {firm?.mobileNumber && <span>Phone: {firm.mobileNumber}</span>}
                {firm?.gstNo && <span className="font-semibold">GSTIN: {firm.gstNo}</span>}
              </div>
              <div className="mt-2.5 inline-block px-3.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded font-bold text-[10px] tracking-wider uppercase">
                CUSTOMER BESPOKE ORDER DOCKET
              </div>
            </div>

            {/* Order & Customer Details Bar */}
            <div className="grid grid-cols-2 gap-3 border border-zinc-200 rounded-lg p-3 mb-3 bg-zinc-50/60 text-xs">
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Customer Details</p>
                <p className="font-bold text-sm text-zinc-900 mt-0.5">
                  {order.customerName || order.accountName || 'Counter Customer'}
                </p>
                {order.customerCode && (
                  <p className="text-[11px] text-zinc-600 font-mono mt-0.5">
                    Customer Code: <span className="font-semibold">{order.customerCode}</span>
                  </p>
                )}
                {order.accountName && order.customerName && (
                  <p className="text-[11px] text-zinc-500">Account: {order.accountName}</p>
                )}
              </div>
              <div className="text-right space-y-0.5 text-xs">
                <div className="flex justify-end gap-2">
                  <span className="text-zinc-500 font-medium">Order Number:</span>
                  <span className="font-bold font-mono text-zinc-900">{order.orderNumber}</span>
                </div>
                <div className="flex justify-end gap-2">
                  <span className="text-zinc-500 font-medium">Booking Date:</span>
                  <span className="font-semibold text-zinc-900">{formatDate(order.orderDate)}</span>
                </div>
                <div className="flex justify-end gap-2">
                  <span className="text-zinc-500 font-medium">Expected Delivery:</span>
                  <span className="font-bold text-amber-900 font-mono">{formatDate(order.expectedDeliveryDate)}</span>
                </div>
                {order.quotationNumber && (
                  <div className="flex justify-end gap-2">
                    <span className="text-zinc-500 font-medium">Ref Quotation:</span>
                    <span className="font-mono text-zinc-800 font-semibold">{order.quotationNumber}</span>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <span className="text-zinc-500 font-medium">Metal:</span>
                  <span className="font-bold text-zinc-900">{order.metalType || 'Gold'}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto mb-3">
              <table className="w-full border-collapse border border-zinc-200 text-left text-[11px]">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200">
                    <th className="p-2 border-r border-zinc-200 text-center w-8">#</th>
                    <th className="p-2 border-r border-zinc-200">Custom Jewellery Item</th>
                    <th className="p-2 border-r border-zinc-200 text-center w-12">Pcs</th>
                    <th className="p-2 border-r border-zinc-200 text-right">Target Gross</th>
                    <th className="p-2 border-r border-zinc-200 text-right">Net</th>
                    <th className="p-2 border-r border-zinc-200 text-center">Purity / Tunch</th>
                    <th className="p-2 border-r border-zinc-200 text-right">Booked Rate</th>
                    <th className="p-2 border-r border-zinc-200 text-right">Metal Value</th>
                    <th className="p-2 border-r border-zinc-200 text-right">Labour / Making</th>
                    <th className="p-2 text-right">Est. Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-4 text-center text-zinc-500 italic">
                        No items recorded in this order.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-zinc-50">
                        <td className="p-2 border-r border-zinc-200 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border-r border-zinc-200">
                          <div className="font-bold text-zinc-900">{item.description || item.itemName || 'Custom Item'}</div>
                          {item.barcode && <div className="text-[10px] text-zinc-500 font-mono">BC: {item.barcode}</div>}
                        </td>
                        <td className="p-2 border-r border-zinc-200 text-center font-mono">{item.pcs}</td>
                        <td className="p-2 border-r border-zinc-200 text-right font-mono">{formatWeight(item.grossWeight)}</td>
                        <td className="p-2 border-r border-zinc-200 text-right font-mono">{formatWeight(item.netWeight)}</td>
                        <td className="p-2 border-r border-zinc-200 text-center font-mono">
                          {item.tunch}% {item.wastage ? `+ ${item.wastage}%` : ''}
                        </td>
                        <td className="p-2 border-r border-zinc-200 text-right font-mono">
                          {item.goldRate > 0 ? formatCurrency(item.goldRate, false) : '-'}
                        </td>
                        <td className="p-2 border-r border-zinc-200 text-right font-mono">
                          {formatCurrency(item.metalValue, false)}
                        </td>
                        <td className="p-2 border-r border-zinc-200 text-right font-mono">
                          {formatCurrency(item.makingCharges, false)}
                        </td>
                        <td className="p-2 text-right font-bold font-mono text-zinc-900">
                          {formatCurrency(item.lineTotal, false)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-100 font-bold text-zinc-800 border-t border-zinc-300">
                    <td colSpan={2} className="p-2 text-right border-r border-zinc-200">Total:</td>
                    <td className="p-2 text-center border-r border-zinc-200 font-mono">{order.totalPcs}</td>
                    <td className="p-2 text-right border-r border-zinc-200 font-mono">{formatWeight(order.totalGrossWeight)}</td>
                    <td className="p-2 text-right border-r border-zinc-200 font-mono">{formatWeight(order.totalNetWeight)}</td>
                    <td className="p-2 border-r border-zinc-200"></td>
                    <td className="p-2 border-r border-zinc-200"></td>
                    <td className="p-2 text-right border-r border-zinc-200 font-mono">{formatCurrency(order.metalValue, false)}</td>
                    <td className="p-2 text-right border-r border-zinc-200 font-mono">{formatCurrency(order.totalMajuri, false)}</td>
                    <td className="p-2 text-right font-mono font-bold">{formatCurrency(order.grandTotal, false)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pricing Totals & Summary */}
            <div className="grid grid-cols-2 gap-4 items-start">
              <div className="space-y-2">
                <div className="border border-zinc-200 rounded-lg p-2.5 bg-zinc-50/60">
                  <p className="font-bold text-[10px] uppercase text-zinc-600 tracking-wider mb-1">Order Terms &amp; Conditions</p>
                  <ul className="list-disc list-inside text-[10px] text-zinc-600 space-y-0.5">
                    <li>This order docket confirms acceptance of bespoke custom manufacturing.</li>
                    <li>Final weight may vary marginally (±5%) due to handcrafting and finishing.</li>
                    <li>Final bill will be calculated at delivery based on verified finished weights.</li>
                    <li>Delivery date subject to karigar readiness and hallmark certification.</li>
                  </ul>
                  {order.notes && (
                    <div className="mt-1.5 pt-1.5 border-t border-zinc-200 text-[10px]">
                      <span className="font-bold text-zinc-700">Special Instructions / Remarks: </span>
                      <span className="text-zinc-600">{order.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="border border-zinc-200 rounded-lg p-2.5 bg-zinc-50/60 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Estimated Metal Value:</span>
                  <span>{formatCurrency(order.metalValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Making / Labour Charges:</span>
                  <span>{formatCurrency(order.totalMajuri)}</span>
                </div>
                {order.totalCharges > order.totalMajuri && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Stone / Other Charges:</span>
                    <span>{formatCurrency(order.totalCharges - order.totalMajuri)}</span>
                  </div>
                )}
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount:</span>
                    <span>- {formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-zinc-200 pt-1">
                  <span className="text-zinc-600">Estimated Tax (GST):</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-200 pt-1 text-xs font-bold text-zinc-900">
                  <span>ESTIMATED ORDER VALUE:</span>
                  <span>{formatCurrency(order.roundedTotal || order.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold pt-0.5">
                  <span>Advance Paid / Allocated:</span>
                  <span>{formatCurrency(order.advanceAmount || 0)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-zinc-800 pt-1 text-xs font-bold text-amber-900">
                  <span>ESTIMATED BALANCE DUE:</span>
                  <span>{formatCurrency(balanceDue)}</span>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-zinc-300 text-center">
              <div>
                <p className="text-[10px] font-medium text-zinc-500">Customer Signature / Acceptance</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-zinc-500">Authorized Signatory / For {firm?.firmName || 'Jeweller'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
