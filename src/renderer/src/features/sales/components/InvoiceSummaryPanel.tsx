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
  onOpenCompleteDialog: () => void
  disabled?: boolean
}

export const InvoiceSummaryPanel: React.FC<InvoiceSummaryPanelProps> = ({
  summary,
  onOpenCompleteDialog,
  disabled = false
}) => {
  return (
    <div className="p-4 bg-card border border-border rounded-xl shadow-lg space-y-3.5 flex flex-col">
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Invoice Grand Total</span>
          <span className="font-mono font-semibold text-foreground">
            ₹{summary.grandTotal.toLocaleString()}
          </span>
        </div>

        {summary.advanceDeducted > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Customer Advance Deducted</span>
            <span className="font-mono font-medium">
              -₹{summary.advanceDeducted.toLocaleString()}
            </span>
          </div>
        )}

        {summary.exchangeDeducted > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Old Gold Exchange Credit</span>
            <span className="font-mono font-medium">
              -₹{summary.exchangeDeducted.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Primary Net Payable Hero Card */}
      <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          Net Amount Payable
        </div>
        <div className="text-2xl font-black font-mono text-primary mt-0.5 tracking-tight">
          ₹{summary.netPayable.toLocaleString()}
        </div>
      </div>

      {/* Payment & Balance Status */}
      <div className="grid grid-cols-2 gap-2 text-xs text-center">
        <div className="p-2 bg-muted/40 border border-border/60 rounded-lg">
          <div className="text-[10px] text-muted-foreground uppercase font-medium">Paid Amount</div>
          <div className="text-sm font-bold font-mono text-foreground mt-0.5">
            ₹{summary.totalPaid.toLocaleString()}
          </div>
        </div>

        <div
          className={`p-2 border rounded-lg ${
            summary.balanceDue > 0
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          <div className="text-[10px] uppercase font-medium">
            {summary.balanceDue > 0 ? 'Balance Due' : 'Fully Paid'}
          </div>
          <div className="text-sm font-bold font-mono mt-0.5">
            ₹{summary.balanceDue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Primary Checkout Button */}
      <button
        type="button"
        onClick={onOpenCompleteDialog}
        disabled={disabled || summary.grandTotal <= 0}
        className="w-full h-11 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
      >
        <span>⚡</span>
        <span>Complete Sale & Bill (F8)</span>
      </button>
    </div>
  )
}
