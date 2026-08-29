import React from 'react'
import type { CustomerAdvanceRecord } from '../../../../../shared/types/advance'

interface AdvancePanelProps {
  advances: CustomerAdvanceRecord[]
  selectedAdvanceIds: string[]
  onToggleAdvance: (id: string) => void
}

export const AdvancePanel: React.FC<AdvancePanelProps> = ({
  advances,
  selectedAdvanceIds,
  onToggleAdvance
}) => {
  if (advances.length === 0) return null

  const totalSelected = advances
    .filter((a) => selectedAdvanceIds.includes(a.id))
    .reduce((sum, a) => sum + a.unallocatedAmount, 0)

  return (
    <div className="p-3 bg-card border border-border rounded-xl shadow-sm text-xs space-y-2">
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5 font-semibold text-foreground">
        <span className="flex items-center gap-1.5">
          <span>💰</span>
          <span>Customer Advances</span>
        </span>
        {totalSelected > 0 && (
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
            -₹{totalSelected.toLocaleString()}
          </span>
        )}
      </div>

      <div className="space-y-1.5 max-h-36 overflow-y-auto">
        {advances.map((adv) => {
          const isChecked = selectedAdvanceIds.includes(adv.id)
          return (
            <label
              key={adv.id}
              className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                isChecked
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleAdvance(adv.id)}
                  className="rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
                />
                <div>
                  <div className="font-semibold text-xs text-foreground flex gap-1.5">
                    <span>{adv.advanceNumber}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">({adv.advanceDate})</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Method: {adv.paymentMethod} {adv.paymentReference ? `(${adv.paymentReference})` : ''}
                  </div>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-xs text-foreground">
                ₹{adv.unallocatedAmount.toLocaleString()}
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
