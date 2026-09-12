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
    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs space-y-2">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 font-bold text-slate-800">
        <span className="flex items-center gap-1.5">
          <span>💰</span>
          <span>Customer Advances</span>
        </span>
        {totalSelected > 0 && (
          <span className="text-[11px] font-mono text-emerald-700 font-extrabold">
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
                  ? 'border-amber-400 bg-amber-50/70 text-slate-900 font-semibold'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleAdvance(adv.id)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <div>
                  <div className="font-bold text-xs text-slate-900 flex gap-1.5">
                    <span>{adv.advanceNumber}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({adv.advanceDate})</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Method: {adv.paymentMethod} {adv.paymentReference ? `(${adv.paymentReference})` : ''}
                  </div>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-xs text-emerald-700">
                ₹{adv.unallocatedAmount.toLocaleString()}
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
