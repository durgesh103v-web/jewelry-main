import React, { useEffect, useState } from 'react'
import type { CustomerAdvanceRecord } from '../types'
import { formatDate, formatCurrency } from '../../../utils/formatters'

interface AdvanceReceiptViewProps {
  advance: CustomerAdvanceRecord
  onClose: () => void
}

export const AdvanceReceiptView: React.FC<AdvanceReceiptViewProps> = ({ advance, onClose }) => {
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
        console.error('Failed to load firm details for advance receipt:', err)
      }
    }
    void loadFirm()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex justify-center p-4 print:p-0 print:static print:bg-white select-none">
      {/* Container / Modal Wrapper */}
      <div className="bg-white text-slate-900 max-w-3xl w-full my-auto max-h-[95vh] flex flex-col rounded-2xl shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:p-0 print:my-0 print:max-w-none print:w-full print:max-h-none font-sans">
        {/* Print Header Bar (Screen Only) */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-xl">🧾</span>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Advance Receipt Preview
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official Receipt Voucher #{advance.advanceNumber}
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
              <span>Print Receipt Voucher</span>
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
          {/* Printable Advance Receipt Sheet */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm print:border-none print:shadow-none print:p-0 mx-auto max-w-2xl font-sans text-xs leading-relaxed text-zinc-900">
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
                CUSTOMER ADVANCE RECEIPT VOUCHER
              </div>
            </div>

            {/* Receipt Header Grid */}
            <div className="grid grid-cols-2 gap-3 border border-zinc-200 rounded-lg p-3 mb-3 bg-zinc-50/60 text-xs">
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Received From</p>
                <p className="font-bold text-sm text-zinc-900 mt-0.5">
                  {advance.customerName || advance.accountName || 'Counter Customer'}
                </p>
                {advance.customerCode && (
                  <p className="text-[11px] text-zinc-600 font-mono mt-0.5">
                    Customer Code: <span className="font-semibold">{advance.customerCode}</span>
                  </p>
                )}
                {advance.accountName && advance.customerName && (
                  <p className="text-[11px] text-zinc-500">Account: {advance.accountName}</p>
                )}
              </div>
              <div className="text-right space-y-0.5 text-xs">
                <div className="flex justify-end gap-2">
                  <span className="text-zinc-500 font-medium">Receipt No:</span>
                  <span className="font-bold font-mono text-zinc-900">{advance.advanceNumber}</span>
                </div>
                <div className="flex justify-end gap-2">
                  <span className="text-zinc-500 font-medium">Date:</span>
                  <span className="font-semibold text-zinc-900">{formatDate(advance.advanceDate)}</span>
                </div>
                <div className="flex justify-end gap-2">
                  <span className="text-zinc-500 font-medium">Payment Mode:</span>
                  <span className="font-bold text-zinc-900">{advance.paymentMethod}</span>
                </div>
                {advance.paymentReference && (
                  <div className="flex justify-end gap-2">
                    <span className="text-zinc-500 font-medium">Reference / Txn:</span>
                    <span className="font-mono text-zinc-800 font-semibold">{advance.paymentReference}</span>
                  </div>
                )}
                {advance.orderNumber && (
                  <div className="flex justify-end gap-2">
                    <span className="text-zinc-500 font-medium">Linked Order:</span>
                    <span className="font-mono font-bold text-amber-900">{advance.orderNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Breakdown Table */}
            <div className="overflow-x-auto mb-3">
              <table className="w-full border-collapse border border-zinc-200 text-left text-xs">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200">
                    <th className="p-2.5 border-r border-zinc-200">Description / Particulars</th>
                    <th className="p-2.5 border-r border-zinc-200 text-center w-28">Payment Mode</th>
                    <th className="p-2.5 text-right w-36">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  <tr>
                    <td className="p-2.5 border-r border-zinc-200">
                      <div className="font-bold text-zinc-900">
                        Customer Advance Deposit
                      </div>
                      <div className="text-[11px] text-zinc-600 mt-0.5">
                        {advance.orderNumber
                          ? `Received specifically against Custom Order #${advance.orderNumber}`
                          : 'General customer ledger advance deposit towards future billing'}
                      </div>
                      {advance.paymentReference && (
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          Ref: {advance.paymentReference}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 text-center font-bold text-zinc-800">
                      {advance.paymentMethod}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-sm text-zinc-900">
                      {formatCurrency(advance.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary & Terms Box */}
            <div className="grid grid-cols-2 gap-3 items-start">
              {/* Terms */}
              <div className="border border-zinc-200 rounded-lg p-2.5 bg-zinc-50/60 space-y-1">
                <p className="font-bold text-[10px] uppercase text-zinc-600 tracking-wider">Terms &amp; Conditions</p>
                <ul className="list-disc list-inside text-[10px] text-zinc-600 space-y-0.5">
                  <li>This voucher acknowledges receipt of customer advance credit.</li>
                  <li>Advance will be adjusted against final Tax Invoice upon delivery or checkout.</li>
                  <li>Cheque and electronic payments are subject to bank clearance.</li>
                </ul>
                {advance.notes && (
                  <div className="mt-1.5 pt-1.5 border-t border-zinc-200 text-[10px]">
                    <span className="font-bold text-zinc-700">Remarks: </span>
                    <span className="text-zinc-600">{advance.notes}</span>
                  </div>
                )}
              </div>

              {/* Balance Status Card */}
              <div className="border border-zinc-200 rounded-lg p-2.5 bg-zinc-50/60 space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Total Advance Received:</span>
                  <span className="font-bold">{formatCurrency(advance.amount)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Allocated to Order(s):</span>
                  <span>{formatCurrency(advance.allocatedAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-200 pt-1 font-bold text-emerald-800">
                  <span>Available Balance:</span>
                  <span>{formatCurrency(advance.unallocatedAmount)}</span>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-zinc-300 text-center">
              <div>
                <p className="text-[10px] font-medium text-zinc-500">Customer Signature / Depositor</p>
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
