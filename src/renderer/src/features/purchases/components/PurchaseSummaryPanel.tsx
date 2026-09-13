import React from 'react'

interface PurchaseSummaryPanelProps {
  summary: {
    grandTotal: number
    totalPaid: number
    balanceDue: number
  }
  onOpenCompleteDialog: () => void
  disabled?: boolean
}

export const PurchaseSummaryPanel: React.FC<PurchaseSummaryPanelProps> = ({
  summary,
  onOpenCompleteDialog,
  disabled = false
}) => {
  const isCompleteDisabled = disabled || summary.grandTotal <= 0

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3.5 flex flex-col">
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between text-slate-500">
          <span>Purchase Invoice Total</span>
          <span className="font-mono font-semibold text-slate-800">
            ₹{summary.grandTotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Primary Payable Hero Card */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
          Total Inward Cost
        </div>
        <div className="text-2xl font-black font-mono text-amber-800 mt-0.5 tracking-tight">
          ₹{summary.grandTotal.toLocaleString()}
        </div>
      </div>

      {/* Payment & Supplier Outstanding Status */}
      <div className="grid grid-cols-2 gap-2 text-xs text-center">
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">Paid Outflow</div>
          <div className="text-sm font-bold font-mono text-slate-800 mt-0.5">
            ₹{summary.totalPaid.toLocaleString()}
          </div>
        </div>

        <div
          className={`p-2 border rounded-lg ${
            summary.balanceDue > 0
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="text-[10px] uppercase font-semibold tracking-wide">
            {summary.balanceDue > 0 ? 'Supplier Payable' : 'Fully Paid'}
          </div>
          <div className="text-sm font-bold font-mono mt-0.5">
            ₹{summary.balanceDue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Primary Submit Button */}
      <button
        type="button"
        onClick={onOpenCompleteDialog}
        disabled={isCompleteDisabled}
        className={`w-full h-10 px-4 font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
          isCompleteDisabled
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
            : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 !text-white shadow-amber-500/20 active:scale-[0.98]'
        }`}
        style={!isCompleteDisabled ? { color: '#ffffff' } : {}}
      >
        <span>📥</span>
        <span>Complete Purchase & Inward</span>
        {!isCompleteDisabled && (
          <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 rounded text-white border border-white/20">
            F8
          </kbd>
        )}
      </button>
    </div>
  )
}
