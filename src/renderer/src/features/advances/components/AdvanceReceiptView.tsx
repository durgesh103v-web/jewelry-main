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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 flex justify-center p-4 print:p-0 print:static print:bg-white">
      {/* Container / Modal Wrapper */}
      <div className="bg-background text-foreground max-w-3xl w-full my-6 p-8 rounded-xl shadow-2xl border border-border print:border-none print:shadow-none print:p-0 print:my-0 print:max-w-none print:w-full">
        {/* Print Header Bar (Screen Only) */}
        <div className="flex items-center justify-between pb-6 border-b border-border print:hidden">
          <div>
            <h2 className="text-xl font-bold">Advance Receipt Preview</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Receipt Voucher #{advance.advanceNumber}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Receipt Voucher
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg text-sm hover:bg-secondary/80 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Advance Receipt Body */}
        <div className="pt-6 print:pt-0 font-sans text-xs leading-relaxed text-zinc-900 bg-white p-6 rounded-lg print:p-0">
          {/* Shop & Firm Header */}
          <div className="text-center border-b-2 border-zinc-800 pb-4 mb-4">
            <h1 className="text-2xl font-bold tracking-wider uppercase text-zinc-900">
              {firm?.firmName || 'JEWELLERY ATELIER'}
            </h1>
            {firm?.ownerName && (
              <p className="text-xs font-medium text-zinc-600">Prop: {firm.ownerName}</p>
            )}
            <p className="text-xs text-zinc-600 mt-1">
              {[firm?.address, firm?.city, firm?.state, firm?.pincode].filter(Boolean).join(', ')}
            </p>
            <div className="flex justify-center gap-4 text-[11px] text-zinc-600 mt-1 font-mono">
              {firm?.mobileNumber && <span>Phone: {firm.mobileNumber}</span>}
              {firm?.gstNo && <span className="font-semibold">GSTIN: {firm.gstNo}</span>}
            </div>
            <div className="mt-3 inline-block px-4 py-0.5 bg-zinc-100 border border-zinc-300 rounded font-semibold text-xs tracking-wide uppercase">
              CUSTOMER ADVANCE RECEIPT VOUCHER
            </div>
          </div>

          {/* Receipt Header Grid */}
          <div className="grid grid-cols-2 gap-4 border border-zinc-200 rounded p-3 mb-4 bg-zinc-50/50">
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-500">Received From</p>
              <p className="font-bold text-sm text-zinc-900 mt-0.5">
                {advance.customerName || advance.accountName || 'Counter Customer'}
              </p>
              {advance.customerCode && (
                <p className="text-xs text-zinc-600 font-mono">Customer Code: {advance.customerCode}</p>
              )}
              {advance.accountName && advance.customerName && (
                <p className="text-xs text-zinc-500">Account: {advance.accountName}</p>
              )}
            </div>
            <div className="text-right space-y-0.5">
              <div className="flex justify-end gap-2">
                <span className="text-zinc-500 font-medium">Receipt No:</span>
                <span className="font-bold font-mono text-zinc-900">{advance.advanceNumber}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span className="text-zinc-500 font-medium">Date:</span>
                <span className="font-medium text-zinc-900">{formatDate(advance.advanceDate)}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span className="text-zinc-500 font-medium">Payment Mode:</span>
                <span className="font-semibold text-zinc-900">{advance.paymentMethod}</span>
              </div>
              {advance.paymentReference && (
                <div className="flex justify-end gap-2">
                  <span className="text-zinc-500 font-medium">Reference / Txn:</span>
                  <span className="font-mono text-zinc-700">{advance.paymentReference}</span>
                </div>
              )}
              {advance.orderNumber && (
                <div className="flex justify-end gap-2">
                  <span className="text-zinc-500 font-medium">Linked Order:</span>
                  <span className="font-mono font-semibold text-zinc-900">{advance.orderNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse border border-zinc-200 text-left text-xs">
              <thead>
                <tr className="bg-zinc-100 text-zinc-700 font-semibold border-b border-zinc-200">
                  <th className="p-2.5 border-r border-zinc-200">Description / Particulars</th>
                  <th className="p-2.5 border-r border-zinc-200 text-center w-32">Payment Mode</th>
                  <th className="p-2.5 text-right w-40">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                <tr>
                  <td className="p-3 border-r border-zinc-200">
                    <div className="font-semibold text-zinc-900">
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
                  <td className="p-3 border-r border-zinc-200 text-center font-semibold text-zinc-800">
                    {advance.paymentMethod}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-sm text-zinc-900">
                    {formatCurrency(advance.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Box */}
          <div className="grid grid-cols-2 gap-6 items-start pt-2">
            {/* Terms */}
            <div className="border border-zinc-200 rounded p-2.5 bg-zinc-50/50 space-y-1">
              <p className="font-bold text-[10px] uppercase text-zinc-600">Terms & Conditions</p>
              <ul className="list-disc list-inside text-[10px] text-zinc-600 space-y-0.5">
                <li>This voucher acknowledges receipt of customer advance credit.</li>
                <li>Advance will be adjusted against final Tax Invoice upon delivery or checkout.</li>
                <li>Cheque and electronic payments are subject to bank clearance.</li>
              </ul>
              {advance.notes && (
                <div className="mt-2 pt-2 border-t border-zinc-200 text-[10px]">
                  <span className="font-semibold text-zinc-700">Remarks: </span>
                  <span className="text-zinc-600">{advance.notes}</span>
                </div>
              )}
            </div>

            {/* Balance Status Card */}
            <div className="border border-zinc-200 rounded p-3 bg-zinc-50/50 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-600">Total Advance Received:</span>
                <span className="font-bold">{formatCurrency(advance.amount)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Allocated to Order(s):</span>
                <span>{formatCurrency(advance.allocatedAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-1.5 font-bold text-emerald-800">
                <span>Available Balance:</span>
                <span>{formatCurrency(advance.unallocatedAmount)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-4 mt-12 pt-6 border-t border-zinc-300 text-center">
            <div>
              <p className="text-[10px] text-zinc-500">Customer Signature / Depositor</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500">Authorized Signatory / For {firm?.firmName || 'Jeweller'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
