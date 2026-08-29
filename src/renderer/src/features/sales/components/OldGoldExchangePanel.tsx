import React from 'react'
import type { MetalExchangeRecord } from '../../../../../shared/types/metalExchange'

interface OldGoldExchangePanelProps {
  exchanges: MetalExchangeRecord[]
  selectedExchangeIds: string[]
  onToggleExchange: (id: string) => void
}

export const OldGoldExchangePanel: React.FC<OldGoldExchangePanelProps> = ({
  exchanges,
  selectedExchangeIds,
  onToggleExchange
}) => {
  if (exchanges.length === 0) return null

  const totalSelected = exchanges
    .filter((e) => selectedExchangeIds.includes(e.id))
    .reduce((sum, e) => sum + e.exchangeAmount, 0)

  return (
    <div className="p-3 bg-card border border-border rounded-xl shadow-sm text-xs space-y-2">
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5 font-semibold text-foreground">
        <span className="flex items-center gap-1.5">
          <span>🔄</span>
          <span>Old Gold / Metal Exchange</span>
        </span>
        {totalSelected > 0 && (
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
            -₹{totalSelected.toLocaleString()}
          </span>
        )}
      </div>

      <div className="space-y-1.5 max-h-36 overflow-y-auto">
        {exchanges.map((ex) => {
          const isChecked = selectedExchangeIds.includes(ex.id)
          return (
            <label
              key={ex.id}
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
                  onChange={() => onToggleExchange(ex.id)}
                  className="rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
                />
                <div>
                  <div className="font-semibold text-xs text-foreground flex gap-1.5">
                    <span>{ex.exchangeNumber}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">({ex.exchangeDate})</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Receipt: {ex.oldGoldReceiptNumber || 'OG'}
                  </div>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-xs text-foreground">
                ₹{ex.exchangeAmount.toLocaleString()}
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
