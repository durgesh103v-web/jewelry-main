import React from 'react'

interface InvoiceSummaryPanelProps {
  summary: {
    grandTotal: number
    advanceDeducted: number
    exchangeDeducted: number
    netPayable: number
    totalPaid: number
    balanceDue: number
  }
  invoiceDiscount?: number
  onUpdateInvoiceDiscount?: (val: number) => void
  onOpenCompleteDialog: () => void
  disabled?: boolean
}

export const InvoiceSummaryPanel: React.FC<InvoiceSummaryPanelProps> = ({
  summary,
  invoiceDiscount = 0,
  onUpdateInvoiceDiscount,
  onOpenCompleteDialog,
  disabled = false
}) => {
  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3.5 flex flex-col">
      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-slate-600 font-medium">
          <span>Invoice Grand Total</span>
          <span className="font-mono font-bold text-slate-900">
            ₹{summary.grandTotal.toLocaleString()}
          </span>
        </div>

        {/* Flat Bill Discount */}
        <div className="flex items-center justify-between text-slate-600">
          <span className="font-medium text-[11px] uppercase tracking-wider text-rose-700">Invoice Discount (₹)</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-xs">-₹</span>
            <input
              type="number"
              min="0"
              step="1"
              value={invoiceDiscount === 0 ? '' : invoiceDiscount}
              onChange={(e) => onUpdateInvoiceDiscount && onUpdateInvoiceDiscount(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              className="w-20 h-6 text-right px-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-rose-600 focus:bg-white focus:border-rose-400"
            />
          </div>
        </div>

        {summary.advanceDeducted > 0 && (
          <div className="flex justify-between text-emerald-700 font-medium">
            <span>Customer Advance Deducted</span>
            <span className="font-mono font-bold">
              -₹{summary.advanceDeducted.toLocaleString()}
            </span>
          </div>
        )}

        {summary.exchangeDeducted > 0 && (
          <div className="flex justify-between text-emerald-700 font-medium">
            <span>Old Gold Exchange Credit</span>
            <span className="font-mono font-bold">
              -₹{summary.exchangeDeducted.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Primary Net Payable Hero Card */}
      <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
          Net Amount Payable
        </div>
        <div className="text-2xl font-black font-mono text-amber-900 mt-0.5 tracking-tight">
          ₹{summary.netPayable.toLocaleString()}
        </div>
      </div>

      {/* Payment & Balance Status */}
      <div className="grid grid-cols-2 gap-2 text-xs text-center">
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Paid Amount</div>
          <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
            ₹{summary.totalPaid.toLocaleString()}
          </div>
        </div>

        <div
          className={`p-2 border rounded-lg ${
            summary.balanceDue > 0
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          <div className="text-[10px] uppercase font-bold">
            {summary.balanceDue > 0 ? 'Balance Due' : 'Fully Paid'}
          </div>
          <div className="text-sm font-extrabold font-mono mt-0.5">
            ₹{summary.balanceDue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Primary Checkout Button */}
      <button
        type="button"
        onClick={onOpenCompleteDialog}
        disabled={disabled || summary.grandTotal <= 0}
        className="w-full h-11 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 !text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
        style={{ color: '#ffffff' }}
      >
        <span>⚡</span>
        <span className="!text-white font-bold" style={{ color: '#ffffff' }}>
          Complete Sale & Bill (F8)
        </span>
      </button>
    </div>
  )
}
