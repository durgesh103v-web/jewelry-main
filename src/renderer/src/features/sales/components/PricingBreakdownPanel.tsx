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
    <div className="p-3.5 bg-card border border-border rounded-xl shadow-sm text-xs space-y-2.5">
      <div className="font-semibold text-foreground flex items-center justify-between border-b border-border/60 pb-2">
        <span className="flex items-center gap-1.5">
          <span>⚖️</span>
          <span>Weight & Metal Breakdown</span>
        </span>
        <span className="text-[11px] font-mono text-muted-foreground">
          {summary.totalPcs} Item(s)
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
          <div className="text-[10px] text-muted-foreground uppercase font-medium">Gross Wt</div>
          <div className="text-sm font-bold font-mono text-foreground mt-0.5">
            {summary.totalGrossWeight.toFixed(3)} g
          </div>
        </div>
        <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
          <div className="text-[10px] text-muted-foreground uppercase font-medium">Net Wt</div>
          <div className="text-sm font-bold font-mono text-foreground mt-0.5">
            {summary.totalNetWeight.toFixed(3)} g
          </div>
        </div>
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-medium">Fine Wt</div>
          <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
            {summary.totalFineWeight.toFixed(3)} g
          </div>
        </div>
      </div>

      <div className="space-y-1.5 pt-1 text-[11px]">
        <div className="flex justify-between text-muted-foreground">
          <span>Metal + Making Subtotal</span>
          <span className="font-mono font-medium text-foreground">₹{summary.subtotal.toLocaleString()}</span>
        </div>
        {summary.totalDiscount > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Special Discount</span>
            <span className="font-mono font-medium">-₹{summary.totalDiscount.toLocaleString()}</span>
          </div>
        )}
        {summary.totalTax > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Tax / GST</span>
            <span className="font-mono font-medium text-foreground">+₹{summary.totalTax.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}
