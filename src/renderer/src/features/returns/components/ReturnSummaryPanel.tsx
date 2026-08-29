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
    <div className="p-4 bg-card border border-border rounded-xl shadow-lg space-y-3.5 flex flex-col">
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Items to Return:</span>
          <span className="font-mono font-semibold text-foreground">
            {summary.totalPcs} pcs ({summary.totalGrossWeight.toFixed(3)}g)
          </span>
        </div>
      </div>

      {/* Return Total Hero Card */}
      <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          {isSaleReturn ? 'Total Credit Note Value' : 'Total Debit Note Value'}
        </div>
        <div className="text-2xl font-black font-mono text-primary mt-0.5 tracking-tight">
          ₹{summary.returnTotal.toLocaleString()}
        </div>
      </div>

      {/* Refund & Ledger Adjustment Breakdown */}
      <div className="grid grid-cols-2 gap-2 text-xs text-center">
        <div className="p-2 bg-muted/40 border border-border/60 rounded-lg">
          <div className="text-[10px] text-muted-foreground uppercase font-medium">
            {isSaleReturn ? 'Immediate Refund' : 'Refund Received'}
          </div>
          <div className="text-sm font-bold font-mono text-foreground mt-0.5">
            ₹{summary.totalRefund.toLocaleString()}
          </div>
        </div>

        <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
          <div className="text-[10px] uppercase font-medium">
            {isSaleReturn ? 'Customer Credit' : 'Supplier Offset'}
          </div>
          <div className="text-sm font-bold font-mono mt-0.5">
            ₹{summary.adjustmentAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Primary Submit Button */}
      <button
        type="button"
        onClick={onOpenCompleteDialog}
        disabled={disabled || summary.returnTotal <= 0}
        className="w-full h-11 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
      >
        <span>🔄</span>
        <span>
          {isSaleReturn ? 'Post Sales Return & Credit Note' : 'Post Purchase Return & Debit Note'}
        </span>
      </button>
    </div>
  )
}
