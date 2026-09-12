import React, { useEffect, useState } from 'react'
import type { QuotationRecord } from '../types'
import { formatDate, formatCurrency, formatWeight } from '../../../utils/formatters'

interface QuotationPrintViewProps {
  quotation: QuotationRecord
  onClose: () => void
}

export const QuotationPrintView: React.FC<QuotationPrintViewProps> = ({ quotation, onClose }) => {
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
        console.error('Failed to load firm details for quotation print:', err)
      }
    }
    void loadFirm()
    return () => {
      active = false
    }
  }, [])

  const items = quotation.items || []

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center p-4 print:p-0 print:static print:bg-white">
      {/* Container / Modal Wrapper */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 max-w-4xl w-full my-6 p-8 rounded-2xl shadow-2xl border border-amber-200/60 dark:border-amber-900/40 print:border-none print:shadow-none print:p-0 print:my-0 print:max-w-none print:w-full">
        {/* Print Header Bar (Screen Only) */}
        <div className="flex items-center justify-between pb-6 border-b border-amber-100 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white font-bold shadow-md shadow-amber-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Quotation Print Preview</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Official Estimate Slip #{quotation.quotationNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              style={{ color: '#ffffff' }}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 !text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Quotation
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Quotation Voucher Body */}
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
              CUSTOMER ESTIMATE / QUOTATION
            </div>
          </div>

          {/* Quotation & Customer Details Bar */}
          <div className="grid grid-cols-2 gap-4 border border-zinc-200 rounded p-3 mb-4 bg-zinc-50/50">
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-500">Customer Details</p>
              <p className="font-bold text-sm text-zinc-900 mt-0.5">
                {quotation.customerName || quotation.accountName || 'Counter Customer'}
              </p>
              {quotation.customerCode && (
                <p className="text-xs text-zinc-600">Code: {quotation.customerCode}</p>
              )}
            </div>
            <div className="text-right space-y-0.5">
              <div className="flex justify-end gap-2">
                <span className="text-zinc-500 font-medium">Estimate No:</span>
                <span className="font-bold font-mono text-zinc-900">{quotation.quotationNumber}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span className="text-zinc-500 font-medium">Date:</span>
                <span className="font-medium text-zinc-900">{formatDate(quotation.quotationDate)}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span className="text-zinc-500 font-medium">Valid Until:</span>
                <span className="font-medium text-amber-800">{formatDate(quotation.validUntil)}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span className="text-zinc-500 font-medium">Metal:</span>
                <span className="font-semibold text-zinc-900">{quotation.metalType || 'Gold'}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse border border-zinc-200 text-left text-[11px]">
              <thead>
                <tr className="bg-zinc-100 text-zinc-700 font-semibold border-b border-zinc-200">
                  <th className="p-2 border-r border-zinc-200 text-center w-8">#</th>
                  <th className="p-2 border-r border-zinc-200">Item Description</th>
                  <th className="p-2 border-r border-zinc-200 text-center w-12">Pcs</th>
                  <th className="p-2 border-r border-zinc-200 text-right">Gross (g)</th>
                  <th className="p-2 border-r border-zinc-200 text-right">Net (g)</th>
                  <th className="p-2 border-r border-zinc-200 text-center">Tunch / Wast%</th>
                  <th className="p-2 border-r border-zinc-200 text-right">Rate (/g)</th>
                  <th className="p-2 border-r border-zinc-200 text-right">Metal Value</th>
                  <th className="p-2 border-r border-zinc-200 text-right">Making Charges</th>
                  <th className="p-2 border-r border-zinc-200 text-right">Taxable</th>
                  <th className="p-2 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-4 text-center text-zinc-500 italic">
                      No items listed on quotation.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-zinc-50">
                      <td className="p-2 border-r border-zinc-200 text-center">{idx + 1}</td>
                      <td className="p-2 border-r border-zinc-200">
                        <div className="font-semibold text-zinc-900">{item.description || item.itemName || 'Jewellery Item'}</div>
                        {item.barcode && <div className="text-[10px] text-zinc-500 font-mono">Barcode: {item.barcode}</div>}
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
                      <td className="p-2 border-r border-zinc-200 text-right font-mono">
                        {formatCurrency(item.taxableAmount, false)}
                      </td>
                      <td className="p-2 text-right font-semibold font-mono text-zinc-900">
                        {formatCurrency(item.lineTotal, false)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-100 font-semibold text-zinc-800 border-t border-zinc-300">
                  <td colSpan={2} className="p-2 text-right border-r border-zinc-200">Total:</td>
                  <td className="p-2 text-center border-r border-zinc-200 font-mono">{quotation.totalPcs}</td>
                  <td className="p-2 text-right border-r border-zinc-200 font-mono">{formatWeight(quotation.totalGrossWeight)}</td>
                  <td className="p-2 text-right border-r border-zinc-200 font-mono">{formatWeight(quotation.totalNetWeight)}</td>
                  <td className="p-2 border-r border-zinc-200"></td>
                  <td className="p-2 border-r border-zinc-200"></td>
                  <td className="p-2 text-right border-r border-zinc-200 font-mono">{formatCurrency(quotation.metalValue, false)}</td>
                  <td className="p-2 text-right border-r border-zinc-200 font-mono">{formatCurrency(quotation.totalMajuri, false)}</td>
                  <td className="p-2 text-right border-r border-zinc-200 font-mono">{formatCurrency(quotation.taxableAmount, false)}</td>
                  <td className="p-2 text-right font-mono font-bold">{formatCurrency(quotation.grandTotal, false)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pricing Totals & Summary */}
          <div className="grid grid-cols-2 gap-6 items-start pt-2">
            <div className="space-y-2">
              <div className="border border-zinc-200 rounded p-2.5 bg-zinc-50/50">
                <p className="font-bold text-[10px] uppercase text-zinc-600 mb-1">Terms & Validity</p>
                <ul className="list-disc list-inside text-[10px] text-zinc-600 space-y-0.5">
                  <li>This is an estimate quotation and not a legal tax invoice.</li>
                  <li>Metal rates are subject to daily market fluctuation unless locked.</li>
                  <li>Quotation is valid until {formatDate(quotation.validUntil)}.</li>
                  <li>Subject to final weight verification at time of order creation.</li>
                </ul>
                {quotation.notes && (
                  <div className="mt-2 pt-2 border-t border-zinc-200 text-[10px]">
                    <span className="font-semibold text-zinc-700">Remarks: </span>
                    <span className="text-zinc-600">{quotation.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="border border-zinc-200 rounded p-3 bg-zinc-50/50 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-zinc-600">Metal Value:</span>
                <span>{formatCurrency(quotation.metalValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Making Charges:</span>
                <span>{formatCurrency(quotation.totalMajuri)}</span>
              </div>
              {quotation.totalCharges > quotation.totalMajuri && (
                <div className="flex justify-between">
                  <span className="text-zinc-600">Other / Stone Charges:</span>
                  <span>{formatCurrency(quotation.totalCharges - quotation.totalMajuri)}</span>
                </div>
              )}
              {quotation.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span>- {formatCurrency(quotation.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-zinc-200 pt-1">
                <span className="text-zinc-600 font-medium">Taxable Amount:</span>
                <span className="font-medium">{formatCurrency(quotation.taxableAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Estimated Tax (GST):</span>
                <span>{formatCurrency(quotation.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-zinc-800 pt-1.5 text-xs font-bold text-zinc-900">
                <span>ESTIMATED GRAND TOTAL:</span>
                <span>{formatCurrency(quotation.roundedTotal || quotation.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-4 mt-12 pt-6 border-t border-zinc-300 text-center">
            <div>
              <p className="text-[10px] text-zinc-500">Customer Signature</p>
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
