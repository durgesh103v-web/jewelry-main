import React from 'react'
import type { ReturnType } from '@shared/types/returnTransaction'

interface ReturnSummaryPanelProps {
  returnType: ReturnType
  summary: {
    totalPcs: number
    totalGrossWeight: number
    returnTotal: number
    totalRefund: number
    adjustmentAmount: number
  }
  onOpenCompleteDialog: () => void
  disabled?: boolean
}

export const ReturnSummaryPanel: React.FC<ReturnSummaryPanelProps> = ({
  returnType,
  summary,
  onOpenCompleteDialog,
  disabled = false
}) => {
  const isSaleReturn = returnType === 'SALES_RETURN'

  return (
    <div className="erp-card-panel gap-3">
      {/* Items to Return */}
      <div className="flex justify-between text-xs text-slate-500">
        <span>Items to Return:</span>
        <span className="font-mono font-bold text-slate-800">
          {summary.totalPcs} pcs ({summary.totalGrossWeight.toFixed(3)}g)
        </span>
      </div>

      {/* Total Return Value Hero */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-0.5">
          {isSaleReturn ? 'Total Credit Note Value' : 'Total Debit Note Value'}
        </div>
        <div className="text-2xl font-black font-mono text-amber-800 tracking-tight">
          ₹{summary.returnTotal.toLocaleString()}
        </div>
      </div>

      {/* Refund & Ledger Breakdown */}
      <div className="grid grid-cols-2 gap-2 text-xs text-center">
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">
            {isSaleReturn ? 'Immediate Refund' : 'Refund Received'}
          </div>
          <div className="text-sm font-bold font-mono text-slate-800 mt-0.5">
            ₹{summary.totalRefund.toLocaleString()}
          </div>
        </div>

        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="text-[10px] text-emerald-700 uppercase font-semibold tracking-wide">
            {isSaleReturn ? 'Customer Credit' : 'Supplier Offset'}
          </div>
          <div className="text-sm font-bold font-mono text-emerald-800 mt-0.5">
            ₹{summary.adjustmentAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Primary Submit Button */}
      <button
        type="button"
        onClick={onOpenCompleteDialog}
        disabled={disabled || summary.returnTotal <= 0}
        className={`w-full h-10 px-4 font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
          disabled || summary.returnTotal <= 0
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
            : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 !text-white shadow-amber-500/20 active:scale-[0.98]'
        }`}
        style={!(disabled || summary.returnTotal <= 0) ? { color: '#ffffff' } : {}}
      >
        <span>🔄</span>
        <span>
          {isSaleReturn ? 'Post Sales Return & Credit Note' : 'Post Purchase Return & Debit Note'}
        </span>
        {!(disabled || summary.returnTotal <= 0) && (
          <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 rounded text-white border border-white/20">
            F8
          </kbd>
        )}
      </button>
    </div>
  )
}
