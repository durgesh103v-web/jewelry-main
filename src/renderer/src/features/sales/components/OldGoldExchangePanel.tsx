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
    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs space-y-2">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 font-bold text-slate-800">
        <span className="flex items-center gap-1.5">
          <span>🔄</span>
          <span>Old Gold / Metal Exchange</span>
        </span>
        {totalSelected > 0 && (
          <span className="text-[11px] font-mono text-emerald-700 font-extrabold">
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
                  ? 'border-amber-400 bg-amber-50/70 text-slate-900 font-semibold'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleExchange(ex.id)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <div>
                  <div className="font-bold text-xs text-slate-900 flex gap-1.5">
                    <span>{ex.exchangeNumber}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({ex.exchangeDate})</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Receipt: {ex.oldGoldReceiptNumber || 'OG'}
                  </div>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-xs text-emerald-700">
                ₹{ex.exchangeAmount.toLocaleString()}
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
