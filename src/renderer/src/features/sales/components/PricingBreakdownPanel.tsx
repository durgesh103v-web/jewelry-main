import React from 'react'

interface PricingBreakdownPanelProps {
  summary: {
    totalPcs: number
    totalGrossWeight: number
    totalNetWeight: number
    totalFineWeight: number
    subtotal: number
    totalDiscount: number
    totalTaxable: number
    totalTax: number
    grandTotal: number
  }
}

export const PricingBreakdownPanel: React.FC<PricingBreakdownPanelProps> = ({ summary }) => {
  return (
    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs space-y-2.5">
      <div className="font-bold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="flex items-center gap-1.5">
          <span>⚖️</span>
          <span>Weight & Metal Breakdown</span>
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
          {summary.totalPcs} Item(s)
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Gross Wt</div>
          <div className="text-xs font-extrabold font-mono text-slate-900 mt-0.5">
            {summary.totalGrossWeight.toFixed(3)} g
          </div>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Net Wt</div>
          <div className="text-xs font-extrabold font-mono text-slate-900 mt-0.5">
            {summary.totalNetWeight.toFixed(3)} g
          </div>
        </div>
        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
          <div className="text-[10px] text-amber-800 uppercase font-bold tracking-wider">Fine Wt</div>
          <div className="text-xs font-black font-mono text-amber-900 mt-0.5">
            {summary.totalFineWeight.toFixed(3)} g
          </div>
        </div>
      </div>

      <div className="space-y-1 pt-1 text-[11px]">
        <div className="flex justify-between text-slate-600 font-medium">
          <span>Metal + Making Subtotal</span>
          <span className="font-mono font-bold text-slate-900">₹{summary.subtotal.toLocaleString()}</span>
        </div>
        {summary.totalDiscount > 0 && (
          <div className="flex justify-between text-rose-700 font-semibold">
            <span>Item Level Discount</span>
            <span className="font-mono font-bold">-₹{summary.totalDiscount.toLocaleString()}</span>
          </div>
        )}
        {summary.totalTax > 0 && (
          <div className="flex justify-between text-slate-600 font-medium">
            <span>GST / Tax</span>
            <span className="font-mono font-bold text-slate-900">+₹{summary.totalTax.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}
